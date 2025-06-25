import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { Typography, Card, Button, Input } from '@tradax/ui';
import { useTheme } from '@tradax/theme';
import { huggingFaceApi } from '@tradax/utils';

export default function ChatScreen() {
  const { theme } = useTheme();
  const [messages, setMessages] = useState([
    {
      id: '1',
      text: "Hello! I'm your crypto trading assistant. I can help you understand cryptocurrency concepts, market analysis, and trading strategies. How can I assist you today?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const sendMessage = async () => {
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

    try {
      const response = await huggingFaceApi.sendMessage(inputText.trim());
      
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        text: response,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI Chat error:', error);
      
      let errorMessage = 'I apologize, but I\'m experiencing technical difficulties right now. ';
      
      if (error.message?.includes('rate limit')) {
        errorMessage += 'I\'ve reached my rate limit. Please try again in a few minutes.';
      } else if (error.message?.includes('API key')) {
        errorMessage += 'There\'s an issue with my configuration. Please contact support.';
      } else {
        errorMessage += 'Please try again later or contact support if the issue persists.';
      }

      const errorAiMessage = {
        id: (Date.now() + 1).toString(),
        text: errorMessage,
        isUser: false,
        timestamp: new Date(),
        isError: true,
      };

      setMessages(prev => [...prev, errorAiMessage]);

      Toast.show({
        type: 'error',
        text1: 'AI Assistant Error',
        text2: 'Failed to get response from AI assistant',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }) => (
    <View style={[
      styles.messageContainer,
      item.isUser ? styles.userMessageContainer : styles.aiMessageContainer,
    ]}>
      <Card style={[
        styles.messageCard,
        {
          backgroundColor: item.isUser 
            ? theme.colors.primary 
            : item.isError 
              ? theme.colors.error + '20'
              : theme.colors.surface,
        },
      ]}>
        <Typography
          variant="body1"
          style={{
            color: item.isUser ? '#ffffff' : theme.colors.text,
            lineHeight: 20,
          }}
        >
          {item.text}
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

  const quickQuestions = [
    "What is Bitcoin?",
    "How does cryptocurrency trading work?",
    "What are the risks of crypto investing?",
    "Explain DeFi to me",
    "What is market cap?",
  ];

  const sendQuickQuestion = (question) => {
    setInputText(question);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Disclaimer */}
        <Card style={[styles.disclaimerCard, { backgroundColor: theme.colors.warning + '20' }]}>
          <Typography variant="caption" style={{ color: theme.colors.text, textAlign: 'center' }}>
            ⚠️ This is an AI assistant for educational purposes only. Not financial advice.
          </Typography>
        </Card>

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
        />

        {/* Quick Questions */}
        {messages.length <= 1 && (
          <View style={styles.quickQuestionsContainer}>
            <Typography variant="body2" style={[styles.quickQuestionsTitle, { color: theme.colors.textSecondary }]}>
              Quick Questions:
            </Typography>
            <View style={styles.quickQuestionsGrid}>
              {quickQuestions.map((question, index) => (
                <Button
                  key={index}
                  title={question}
                  variant="outline"
                  onPress={() => sendQuickQuestion(question)}
                  style={styles.quickQuestionButton}
                />
              ))}
            </View>
          </View>
        )}

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <Typography variant="body2" style={{ color: theme.colors.textSecondary }}>
              AI is thinking...
            </Typography>
          </View>
        )}

        {/* Input Area */}
        <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface }]}>
          <Input
            placeholder="Ask me about cryptocurrency..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            style={styles.textInput}
            onSubmitEditing={sendMessage}
          />
          <Button
            title="Send"
            onPress={sendMessage}
            disabled={!inputText.trim() || loading}
            style={styles.sendButton}
          />
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
  quickQuestionsContainer: {
    padding: 16,
  },
  quickQuestionsTitle: {
    marginBottom: 8,
  },
  quickQuestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickQuestionButton: {
    marginBottom: 8,
    marginRight: 8,
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  textInput: {
    flex: 1,
    marginRight: 12,
    maxHeight: 100,
  },
  sendButton: {
    minWidth: 80,
  },
});
