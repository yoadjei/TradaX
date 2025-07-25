import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { Typography, Card, Button } from '@tradax/ui';
import { useTheme } from '@tradax/theme';
import { chatApi } from '@tradax/utils';

export default function ChatScreen() {
  const { theme } = useTheme();

  // ---------- state ----------
  const [messages, setMessages] = useState([
    {
      id: '1',
      text: "Hello! I'm your crypto trading assistant. Ask me anything about cryptocurrency, trading, or blockchain.",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [showTyping, setShowTyping] = useState(false);

  const [lastUserMessage, setLastUserMessage] = useState(null);
  const [isNearBottom, setIsNearBottom] = useState(true);

  // ---------- refs ----------
  const flatListRef = useRef(null);
  const cancelStreamRef = useRef(false);

  // typing dots
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  // ---------- effects ----------
  useEffect(() => {
    if (messages.length > 0 && isNearBottom) {
      requestAnimationFrame(() => flatListRef.current?.scrollToEnd({ animated: true }));
    }
  }, [messages, streamedText, isNearBottom]);

  useEffect(() => {
    const makeAnim = (dot, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot, { toValue: 1, duration: 250, delay, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 250, useNativeDriver: true }),
        ])
      );

    const a1 = makeAnim(dot1, 0);
    const a2 = makeAnim(dot2, 120);
    const a3 = makeAnim(dot3, 240);

    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [dot1, dot2, dot3]);

  // ---------- helpers ----------
  const formatTime = date =>
    new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const stopStreaming = () => {
    cancelStreamRef.current = true;
    setIsStreaming(false);
    setShowTyping(false);
    setLoading(false);
  };

  const clearChat = () => {
    Alert.alert('Clear chat?', 'This will remove all messages.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          setMessages(prev => [prev[0]]); // keep first system message
          setStreamedText('');
          stopStreaming();
        },
      },
    ]);
  };

  const regenerate = async () => {
    if (!lastUserMessage) return;
    await sendChatMessage(lastUserMessage.text, true);
  };

  const sendChatMessage = async (overrideText, isRegenerate = false) => {
    const text = (overrideText ?? inputText).trim();
    if (!text) return;

    const userMsg = {
      id: Date.now().toString(),
      text,
      isUser: true,
      timestamp: new Date(),
    };

    if (!isRegenerate) {
      setMessages(prev => [...prev, userMsg]);
      setLastUserMessage(userMsg);
    }

    setInputText('');
    setLoading(true);
    setShowTyping(false);

    try {
      cancelStreamRef.current = false;

      const response = await chatApi.sendMessage(text);

      setIsStreaming(true);
      setStreamedText('');
      setShowTyping(true);

      const aiMessageId = (Date.now() + 1).toString();
      // If regenerate, don't push a duplicate user message, only replace the last assistant response.
      setMessages(prev =>
        isRegenerate
          ? [
              ...prev,
              {
                id: aiMessageId,
                text: '',
                isUser: false,
                timestamp: new Date(),
              },
            ]
          : [
              ...prev,
              {
                id: aiMessageId,
                text: '',
                isUser: false,
                timestamp: new Date(),
              },
            ]
      );

      const full = response ?? '';
      const step = Math.max(1, Math.floor(full.length / 150)); // a bit faster
      for (let i = 0; i <= full.length; i += step) {
        if (cancelStreamRef.current) break;
        await new Promise(resolve => setTimeout(resolve, 8));
        setStreamedText(full.slice(0, i));
      }

      if (!cancelStreamRef.current) {
        setMessages(prev =>
          prev.map(msg => (msg.id === aiMessageId ? { ...msg, text: full } : msg))
        );
      }
    } catch (error) {
      console.error('AI Chat error:', error);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: 'Sorry, something went wrong. Please try again later.',
          isUser: false,
          timestamp: new Date(),
          isError: true,
        },
      ]);

      Toast.show({
        type: 'error',
        text1: 'AI Assistant Error',
        text2: 'Failed to get response from AI assistant',
      });
    } finally {
      setShowTyping(false);
      setLoading(false);
      setIsStreaming(false);
      cancelStreamRef.current = false;
    }
  };

  const onScroll = useCallback(e => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const nearBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 40;
    setIsNearBottom(nearBottom);
  }, []);

  const scrollToBottom = () => flatListRef.current?.scrollToEnd({ animated: true });

  // ---------- render ----------
  const renderMessage = ({ item, index }) => {
    const isLast = index === messages.length - 1;
    const isUser = item.isUser;

    const bg = isUser
      ? theme.colors.primary
      : item.isError
      ? theme.colors.error + '20'
      : theme.colors.surface;

    const color = isUser ? '#fff' : theme.colors.text;

    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.aiMessageContainer,
        ]}
      >
        <Card style={[styles.messageCard, { backgroundColor: bg }]}>
          <Typography variant="body1" style={{ color, lineHeight: 21 }}>
            {isLast && isStreaming && !isUser ? streamedText : item.text}
          </Typography>

          <Typography
            variant="caption"
            style={{
              color: isUser ? 'rgba(255,255,255,0.7)' : theme.colors.textSecondary,
              marginTop: 4,
              textAlign: isUser ? 'right' : 'left',
            }}
          >
            {formatTime(item.timestamp)}
          </Typography>
        </Card>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        {/* header actions */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>
            Model: gpt-lite (mock)
          </Typography>
          <Button
            size="xs"
            variant="outline"
            onPress={clearChat}
            title="Clear"
            style={{ height: 26, paddingHorizontal: 10 }}
          />
        </View>

        {/* disclaimer */}
        <Card
          style={[
            styles.disclaimerCard,
            { backgroundColor: theme.colors.warning + '20' },
          ]}
        >
          <Typography
            variant="caption"
            style={{ color: theme.colors.text, textAlign: 'center' }}
          >
            ⚠️ This is an AI assistant for educational purposes only. Not financial advice.
          </Typography>
        </Card>

        {/* chat list */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
        />

        {/* tools row */}
        {(isStreaming || loading) && (
          <View style={styles.toolsRow}>
            {isStreaming && (
              <Button
                title="Stop"
                variant="outline"
                onPress={stopStreaming}
                style={{ marginRight: 8 }}
              />
            )}
            {!isStreaming && lastUserMessage && (
              <Button title="Regenerate" variant="outline" onPress={regenerate} />
            )}
          </View>
        )}

        {/* typing indicator */}
        {showTyping && (
          <View style={styles.typingIndicator}>
            <Text style={{ color: theme.colors.textSecondary, marginRight: 6 }}>
              AI is typing
            </Text>
            <Animated.Text style={{ opacity: dot1, fontSize: 18 }}>.</Animated.Text>
            <Animated.Text style={{ opacity: dot2, fontSize: 18 }}>.</Animated.Text>
            <Animated.Text style={{ opacity: dot3, fontSize: 18 }}>.</Animated.Text>
          </View>
        )}

        {/* loading (thinking) */}
        {loading && !isStreaming && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Typography
              variant="body2"
              style={{ color: theme.colors.textSecondary, marginTop: 8 }}
            >
              Thinking...
            </Typography>
          </View>
        )}

        {/* input */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.border,
            },
          ]}
        >
          <TextInput
            style={[
              styles.nativeTextInput,
              {
                borderColor: theme.colors.border,
                color: theme.colors.text,
                backgroundColor: theme.colors.background,
              },
            ]}
            placeholder="Type your message..."
            placeholderTextColor={theme.colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            editable={!loading && !isStreaming}
            multiline
            maxLength={4000}
            onSubmitEditing={() => {
              if (Platform.OS !== 'ios') sendChatMessage();
            }}
            blurOnSubmit={Platform.OS !== 'ios'}
          />
          <TouchableOpacity
            onPress={() => sendChatMessage()}
            disabled={!inputText.trim() || loading || isStreaming}
            style={[
              styles.sendButton,
              {
                backgroundColor:
                  inputText.trim() && !loading && !isStreaming
                    ? theme.colors.primary
                    : theme.colors.textSecondary + '55',
              },
            ]}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Send</Text>
          </TouchableOpacity>
        </View>

        {/* scroll-to-bottom FAB */}
        {!isNearBottom && (
          <TouchableOpacity
            onPress={scrollToBottom}
            style={[
              styles.scrollToBottom,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={{ color: theme.colors.text }}>↓</Text>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  disclaimerCard: {
    margin: 16,
    marginBottom: 8,
    padding: 12,
  },

  messagesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
  },

  messageContainer: {
    marginVertical: 4,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  aiMessageContainer: {
    alignItems: 'flex-start',
  },

  messageCard: {
    padding: 12,
    maxWidth: '90%',
    borderRadius: 12,
  },

  toolsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },

  loadingContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingBottom: 8,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
  },
  nativeTextInput: {
    flex: 1,
    marginRight: 8,
    maxHeight: 140,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
  },
  sendButton: {
    minWidth: 64,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },

  scrollToBottom: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
});
