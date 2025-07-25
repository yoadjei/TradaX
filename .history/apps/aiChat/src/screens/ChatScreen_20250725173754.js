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

const INITIAL_SYSTEM = {
  id: 'sys-0',
  role: 'assistant',
  text:
    "Hello! I'm your crypto trading assistant. Ask me anything about cryptocurrency, trading, or blockchain.",
  timestamp: new Date(),
};

export default function ChatScreen() {
  const { theme } = useTheme();

  const [messages, setMessages] = useState([INITIAL_SYSTEM]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [lastUserMessage, setLastUserMessage] = useState(null);

  const flatListRef = useRef(null);
  const cancelStreamRef = useRef(false);
  const [isNearBottom, setIsNearBottom] = useState(true);

  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (messages.length > 0 && isNearBottom) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [messages, streamedText, isNearBottom]);

  useEffect(() => {
    let anims = [dot1, dot2, dot3].map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            delay: i * 150,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      )
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, [dot1, dot2, dot3]);

  const formatTime = date =>
    new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const clearChat = () => {
    Alert.alert('Clear chat?', 'This will remove all messages.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          setMessages([INITIAL_SYSTEM]);
          setStreamedText('');
          setIsStreaming(false);
          setLoading(false);
        },
      },
    ]);
  };

  const stopStreaming = () => {
    cancelStreamRef.current = true;
    setIsStreaming(false);
    setShowTyping(false);
    setLoading(false);
  };

  const regenerate = async () => {
    if (!lastUserMessage) return;
    await sendChatMessage(lastUserMessage.text, true);
  };

  const sendChatMessage = async (overrideText, isRegenerate = false) => {
    const textToSend = overrideText ?? inputText.trim();
    if (!textToSend) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend,
      timestamp: new Date(),
    };

    if (!isRegenerate) {
      setMessages(prev => [...prev, userMessage]);
      setLastUserMessage(userMessage);
    }

    setInputText('');
    setLoading(true);
    setShowTyping(false);

    try {
      cancelStreamRef.current = false;

      const response = await chatApi.sendMessage(textToSend);

      setIsStreaming(true);
      setStreamedText('');
      setShowTyping(true);

      const aiMessageId = (Date.now() + 1).toString();
      const assistantMsg = {
        id: aiMessageId,
        role: 'assistant',
        text: '',
        timestamp: new Date(),
      };
      setMessages(prev => (isRegenerate ? [...prev] : [...prev, assistantMsg]));

      const full = response ?? '';
      for (let i = 0; i <= full.length; i++) {
        if (cancelStreamRef.current) break;
        await new Promise(resolve => setTimeout(resolve, 8));
        setStreamedText(full.slice(0, i));
      }

      if (!cancelStreamRef.current) {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === aiMessageId
              ? { ...msg, text: full }
              : msg
          )
        );
      }
    } catch (error) {
      console.error('AI Chat error:', error);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: 'Sorry, something went wrong. Please try again later.',
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

  const onLongPressMessage = (msg) => {
    Alert.alert('Message actions', '', [
      {
        text: 'Copy',
        onPress: () => {
          Toast.show({
            type: 'success',
            text1: 'Copied!',
            text2: 'Message copied (use manual copy on device)',
          });
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const renderMessage = ({ item, index }) => {
    const isAssistant = item.role !== 'user';
    const isLastMessage = index === messages.length - 1;

    const bgColor = isAssistant
      ? item.isError
        ? theme.colors.error + '20'
        : theme.colors.surface
      : theme.colors.primary;

    const textColor = isAssistant ? theme.colors.text : '#ffffff';

    return (
      <View
        style={[
          styles.messageWrapper,
          {
            backgroundColor: bgColor,
            alignSelf: 'stretch',
            borderColor: theme.colors.border,
          },
        ]}
        onStartShouldSetResponder={() => true}
        onResponderGrant={() => onLongPressMessage(item)}
      >
        <View style={styles.messageHeader}>
          <Typography
            variant="caption"
            style={{ color: theme.colors.textSecondary }}
          >
            {isAssistant ? 'Assistant' : 'You'} • {formatTime(item.timestamp)}
          </Typography>
        </View>

        <Text style={[styles.messageText, { color: textColor }]}>
          {isLastMessage && isStreaming && isAssistant ? streamedText : item.text}
        </Text>
      </View>
    );
  };

  const keyExtractor = item => item.id;

  const onScroll = useCallback(
    (e) => {
      const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
      const paddingToBottom = 40;
      const nearBottom =
        layoutMeasurement.height + contentOffset.y >=
        contentSize.height - paddingToBottom;
      setIsNearBottom(nearBottom);
    },
    [setIsNearBottom]
  );

  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
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
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <Typography
            variant="caption"
            style={{ color: theme.colors.textSecondary }}
          >
            Model: gpt-4o-mini
          </Typography>

          <Button
            size="xs"
            variant="outline"
            onPress={clearChat}
            style={{ height: 28, paddingHorizontal: 10 }}
            title="Clear"
          />
        </View>

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

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={keyExtractor}
          renderItem={renderMessage}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
        />

        {(isStreaming || loading) && (
          <View style={styles.toolsRow}>
            {isStreaming && (
              <Button
                title="Stop generating"
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

        {showTyping && (
          <View style={styles.typingIndicator}>
            <Text style={{ color: theme.colors.textSecondary, marginRight: 6 }}>Assistant is typing</Text>
            <Animated.Text style={{ opacity: dot1 }}>.</Animated.Text>
            <Animated.Text style={{ opacity: dot2 }}>.</Animated.Text>
            <Animated.Text style={{ opacity: dot3 }}>.</Animated.Text>
          </View>
        )}

        <View
          style={[
            styles.inputContainer,
            { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border },
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
            placeholder="Send a message..."
            placeholderTextColor={theme.colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            editable={!loading && !isStreaming}
            multiline
            maxLength={4000}
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

        {!isNearBottom && (
          <TouchableOpacity
            style={[styles.scrollToBottom, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={scrollToBottom}
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
  disclaimerCard: { marginHorizontal: 16, marginTop: 12, padding: 12 },
  messagesContainer: { paddingHorizontal: 0, paddingBottom: 16, paddingTop: 8 },
  messageWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  messageText: { fontSize: 15, lineHeight: 22 },
  toolsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
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
