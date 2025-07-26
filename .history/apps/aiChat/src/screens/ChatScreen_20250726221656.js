import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, FlatList, KeyboardAvoidingView, Platform,
  TextInput, TouchableOpacity, Text, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Typography, Card } from '@tradax/ui';
import { useTheme } from '@tradax/theme';
import { chatApi } from '@tradax/utils';
import { Ionicons } from '@expo/vector-icons';

export default function ChatScreen() {
  const { theme } = useTheme();

  const [messages, setMessages] = useState([{
    id: '1', text: "Hi! I'm your crypto AI assistant. Ask me anything about crypto or trading.",
    isUser: false, timestamp: new Date()
  }]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [showTyping, setShowTyping] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState(null);
  const [isNearBottom, setIsNearBottom] = useState(true);

  const flatListRef = useRef(null);
  const cancelStreamRef = useRef(false);
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (messages.length > 0 && isNearBottom) {
      requestAnimationFrame(() => flatListRef.current?.scrollToEnd({ animated: true }));
    }
  }, [messages, streamedText, isNearBottom]);

  useEffect(() => {
    const anim = (dot, delay) =>
      Animated.loop(Animated.sequence([
        Animated.timing(dot, { toValue: 1, duration: 350, delay, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0.2, duration: 350, useNativeDriver: true }),
      ]));
    const a = anim(dot1, 0), b = anim(dot2, 200), c = anim(dot3, 400);
    a.start(); b.start(); c.start();
    return () => { a.stop(); b.stop(); c.stop(); };
  }, []);

  const formatTime = date => new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const onScroll = useCallback(e => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    setIsNearBottom(layoutMeasurement.height + contentOffset.y >= contentSize.height - 60);
  }, []);

  const stopStreaming = () => {
    cancelStreamRef.current = true;
    setIsStreaming(false);
    setShowTyping(false);
    setLoading(false);
  };

  const sendChatMessage = async (overrideText) => {
    const text = (overrideText ?? inputText).trim();
    if (!text) return;
    const userMsg = { id: Date.now().toString(), text, isUser: true, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLastUserMessage(userMsg);
    setInputText('');
    setShowTyping(false);
    setLoading(true);

    try {
      cancelStreamRef.current = false;
      const response = await chatApi.sendMessage(text);
      setStreamedText('');
      setIsStreaming(true);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), text: '', isUser: false, timestamp: new Date() }]);
      const full = response || '';
      const step = Math.max(1, Math.floor(full.length / 120));
      for (let i = step; i <= full.length; i += step) {
        if (cancelStreamRef.current) break;
        await new Promise(r => setTimeout(r, 12));
        setStreamedText(full.slice(0, i));
      }
      if (!cancelStreamRef.current) {
        setMessages(prev => prev.map(m => m.text === '' && !m.isUser ? { ...m, text: full } : m));
      }
    } catch (e) {
      setMessages(prev => [...prev, { id: (Date.now()+2).toString(), text: 'Error: failed to get response', isUser: false, isError: true, timestamp: new Date() }]);
      Toast.show({ type: 'error', text1: 'Assistant Error', text2: 'Something went wrong' });
    } finally {
      setShowTyping(false);
      setLoading(false);
      setIsStreaming(false);
      cancelStreamRef.current = false;
    }
  };

  const regenerate = async () => lastUserMessage && sendChatMessage(lastUserMessage.text);

  const renderMessage = ({ item, index }) => {
    const isLast = index === messages.length - 1;
    const bg = item.isUser ? theme.colors.primary : item.isError ? theme.colors.error + '20' : theme.colors.surface;
    const color = item.isUser ? '#fff' : theme.colors.text;
    return (
      <View style={[styles.msgRow, item.isUser ? styles.alignRight : styles.alignLeft]}>
        <Card style={[styles.msgCard, { backgroundColor: bg }]}>
          <Typography variant="body1" style={{ color }}>{isLast && isStreaming && !item.isUser ? streamedText : item.text}</Typography>
          <Typography variant="caption" style={{ color: item.isUser ? 'rgba(255,255,255,0.7)' : theme.colors.textSecondary, marginTop: 4, textAlign: item.isUser ? 'right' : 'left' }}>
            {formatTime(item.timestamp)}
          </Typography>
        </Card>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}>
        {/* Header like OKX Chat */}
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          <Typography variant="h2" style={{ color: theme.colors.text }}>Crypto AI Assistant</Typography>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={m => m.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll} scrollEventThrottle={16}
        />

        {showTyping && (
          <View style={styles.typingRow}>
            <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>Assistant is typing</Typography>
            <Animated.Text style={[styles.dot, { opacity: dot1 }]}>.</Animated.Text>
            <Animated.Text style={[styles.dot, { opacity: dot2 }]}>.</Animated.Text>
            <Animated.Text style={[styles.dot, { opacity: dot3 }]}>.</Animated.Text>
          </View>
        )}

        <View style={[styles.inputRow, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
          <TextInput
            style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
            placeholder="Type your message..."
            placeholderTextColor={theme.colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            editable={!loading && !isStreaming}
            multiline
            maxLength={2000}
          />

          {isStreaming ? (
            <TouchableOpacity onPress={stopStreaming} style={[styles.btn, { backgroundColor: theme.colors.error }]}>
              <Ionicons name="square" size={22} color="#fff" />
            </TouchableOpacity>
          ) : lastUserMessage ? (
            <TouchableOpacity onPress={regenerate} style={[styles.btn, { backgroundColor: theme.colors.primary }]}>
              <Ionicons name="refresh" size={22} color="#fff" />
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            onPress={() => sendChatMessage()}
            disabled={!inputText.trim() || loading || isStreaming}
            style={[styles.btn, { backgroundColor: inputText.trim() ? theme.colors.primary : theme.colors.textSecondary + '55' }]}
          >
            <Ionicons name="arrow-up" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {!isNearBottom && (
          <TouchableOpacity onPress={() => flatListRef.current?.scrollToEnd({ animated: true })} style={[styles.scrollBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Ionicons name="arrow-down" size={20} color={theme.colors.text} />
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, borderBottomWidth: 1 },
  messagesContainer: { padding: 16, paddingBottom: 80 },
  msgRow: { marginVertical: 4 },
  alignRight: { alignItems: 'flex-end' },
  alignLeft: { alignItems: 'flex-start' },
  msgCard: { padding: 12, maxWidth: '85%', borderRadius: 14 },
  typingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  dot: { marginHorizontal: 2, fontSize: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1 },
  input: { flex: 1, marginRight: 8, maxHeight: 120, minHeight: 40, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 12, fontSize: 16 },
  btn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginLeft: 6 },
  scrollBtn: { position: 'absolute', right: 16, bottom: 90, width: 36, height: 36, borderRadius: 18, borderWidth: 1, justifyContent: 'center', alignItems: 'center', elevation: 2 },
});
