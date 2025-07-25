import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { Typography, Card } from '@tradax/ui';
import { useTheme } from '@tradax/theme';
import { chatApi } from '@tradax/utils';

export default function ChatScreen() {
  const { theme } = useTheme();
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
  const flatListRef = useRef(null);

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages, streamedText]);

  const sendChatMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);
    setShowTyping(false);

    try {
      const response = await chatApi.sendMessage(userMessage.text);

      setIsStreaming(true);
      setStreamedText('');
      setShowTyping(true);

      const aiMessageId = (Date.now() + 1).toString();
      setMessages(prev => [
        ...prev,
        {
          id: aiMessageId,
          text: '',
          isUser: false,
          timestamp: new Date(),
        },
      ]);

      for (let i = 0; i <= response.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 15));
        setStreamedText(response.slice(0, i));
      }

      setMessages(prev =>
        prev.map(msg =>
          msg.id === aiMessageId ? { ...msg, text: response } : msg
        )
      );
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
    }
  };

  const formatTime = date =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const renderMessage = ({ item, index }) => {
    const isLastMessage = index === messages.length - 1;

    return (
      <View
        style={[
          styles.messageContainer,
          item.isUser ? styles.userMessageContainer : styles.aiMessageContainer,
        ]}
      >
        <Card
          style={[
            styles.messageCard,
            {
              backgroundColor: item.isUser
                ? theme.colors.primary
                : item.isError
                ? theme.colors.error + '20'
                : theme.colors.surface,
            },
          ]}
        >
          <Typography
            variant="body1"
            style={{
              color: item.isUser ? '#ffffff' : theme.colors.text,
              lineHeight: 20,
            }}
          >
            {isLastMessage && isStreaming ? streamedText : item.text}
          </Typography>
          <Typography
            variant="caption"
            style={{
              color: item.isUser
                ? 'rgba(255, 255, 255, 0.7)'
                : theme.colors.textSecondary,
              marginTop: 4,
              textAlign: item.isUser ? 'right' : 'left',
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
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
            ⚠️ This is an AI assistant for educational purposes only. Not
            financial advice.
          </Typography>
        </Card>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
        />

        {loading && !isStreaming && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Typography
              variant="body2"
              style={{ color: theme.colors.textSecondary, marginTop: 8 }}
            >
              AI is thinking...
            </Typography>
          </View>
        )}

        {showTyping && (
          <View style={styles.typingIndicator}>
            <Text style={{ color: theme.colors.textSecondary }}>AI is typing</Text>
            <Text style={{ fontSize: 20 }}>.</Text>
            <Text style={{ fontSize: 20 }}>.</Text>
            <Text style={{ fontSize: 20 }}>.</Text>
          </View>
        )}

        <View
          style={[styles.inputContainer, { backgroundColor: theme.colors.surface }]}
        >
          <TextInput
            style={styles.nativeTextInput}
            placeholder="Type your message..."
            placeholderTextColor={theme.colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            editable={!loading}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            onPress={sendChatMessage}
            disabled={!inputText.trim() || loading}
            style={[
              styles.sendButton,
              {
                backgroundColor:
                  inputText.trim() && !loading
                    ? theme.colors.primary
                    : '#ccc',
              },
            ]}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    maxWidth: '80%',
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: 16,
    paddingBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  nativeTextInput: {
    flex: 1,
    marginRight: 12,
    maxHeight: 100,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    color: '#000',
    backgroundColor: '#fff',
  },
  sendButton: {
    minWidth: 60,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
});
