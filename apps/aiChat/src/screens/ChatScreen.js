// chatscreen.js
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  memo,
} from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  Animated,
  Text,
  Linking,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Typography, Card } from '@tradax/ui';
import { useTheme } from '@tradax/theme';
import { chatApi } from '@tradax/utils';
import { Ionicons } from '@expo/vector-icons';

/**
 * Lightweight Markdown renderer (no deps).
 * Supports:
 *  - Headings: #, ##, ### (H1-H3)
 *  - **bold**, *italic*, `inline code`
 *  - ``` fenced code blocks ```
 *  - [link](https://...)
 *  - Unordered lists: -, *, +
 *  - Ordered lists: 1. 2. ...
 *  - Blockquotes: >
 *  - Horizontal rules: --- or ***
 *
 * It's intentionally simple and fast for chat messages.
 */

const Md = memo(function Md({ text, theme, isUser }) {
  const parsed = useMemo(() => parseMarkdown(text), [text]);
  return (
    <View>
      {parsed.map((block, idx) => (
        <MarkdownBlock
          key={idx}
          block={block}
          theme={theme}
          isUser={isUser}
        />
      ))}
    </View>
  );
});

function parseMarkdown(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let i = 0;
  let inCode = false;
  let codeLang = '';
  let codeBuffer = [];

  const pushParagraph = (paragraphLines) => {
    if (paragraphLines.length) {
      blocks.push({ type: 'p', content: paragraphLines.join(' ') });
      paragraphLines.length = 0;
    }
  };

  let paragraph = [];
  while (i < lines.length) {
    let line = lines[i];

    // fenced code blocks
    const codeFenceMatch = line.match(/^```(\w+)?/);
    if (codeFenceMatch) {
      if (!inCode) {
        // entering code block
        pushParagraph(paragraph);
        inCode = true;
        codeLang = codeFenceMatch[1] || '';
        codeBuffer = [];
      } else {
        // leaving code block
        blocks.push({ type: 'code', lang: codeLang, content: codeBuffer.join('\n') });
        inCode = false;
        codeLang = '';
        codeBuffer = [];
      }
      i++;
      continue;
    }

    if (inCode) {
      codeBuffer.push(line);
      i++;
      continue;
    }

    // hr
    if (/^(\s*)(---|\*\*\*)(\s*)$/.test(line)) {
      pushParagraph(paragraph);
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // heading
    const headingMatch = line.match(/^(\#{1,3})\s+(.*)$/);
    if (headingMatch) {
      pushParagraph(paragraph);
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      blocks.push({ type: `h${level}`, content });
      i++;
      continue;
    }

    // blockquote
    const bqMatch = line.match(/^\s*>\s?(.*)$/);
    if (bqMatch) {
      pushParagraph(paragraph);
      const content = bqMatch[1];
      blocks.push({ type: 'blockquote', content });
      i++;
      continue;
    }

    // unordered list
    const ulMatch = line.match(/^\s*[-*+]\s+(.*)$/);
    if (ulMatch) {
      pushParagraph(paragraph);
      const items = [];
      while (i < lines.length) {
        const m = lines[i].match(/^\s*[-*+]\s+(.*)$/);
        if (!m) break;
        items.push(m[1]);
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    // ordered list
    const olMatch = line.match(/^\s*\d+\.\s+(.*)$/);
    if (olMatch) {
      pushParagraph(paragraph);
      const items = [];
      while (i < lines.length) {
        const m = lines[i].match(/^\s*(\d+)\.\s+(.*)$/);
        if (!m) break;
        items.push(m[2]);
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    // empty line => paragraph break
    if (/^\s*$/.test(line)) {
      pushParagraph(paragraph);
      i++;
      continue;
    }

    // otherwise, paragraph text
    paragraph.push(line.trim());
    i++;
  }

  pushParagraph(paragraph);
  return blocks;
}

function renderInline(text, theme, isUser) {
  const segments = [];
  const regex =
    /(\*\*.+?\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  const matches = [...text.matchAll(regex)];

  matches.forEach((m, idx) => {
    const matchStart = m.index || 0;
    if (matchStart > lastIndex) {
      segments.push({ type: 'text', text: text.slice(lastIndex, matchStart) });
    }
    const token = m[0];

    if (token.startsWith('**')) {
      segments.push({ type: 'bold', text: token.slice(2, -2) });
    } else if (token.startsWith('*')) {
      segments.push({ type: 'italic', text: token.slice(1, -1) });
    } else if (token.startsWith('`')) {
      segments.push({ type: 'code', text: token.slice(1, -1) });
    } else if (token.startsWith('[')) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        segments.push({ type: 'link', text: linkMatch[1], href: linkMatch[2] });
      } else {
        segments.push({ type: 'text', text: token });
      }
    } else {
      segments.push({ type: 'text', text: token });
    }

    lastIndex = matchStart + token.length;
  });

  if (lastIndex < text.length) {
    segments.push({ type: 'text', text: text.slice(lastIndex) });
  }

  const codeBg = isUser ? 'rgba(255,255,255,0.12)' : theme.colors.border + '55';

  return segments.map((seg, i) => {
    switch (seg.type) {
      case 'bold':
        return (
          <Text key={i} style={{ fontWeight: '700' }}>
            {seg.text}
          </Text>
        );
      case 'italic':
        return (
          <Text key={i} style={{ fontStyle: 'italic' }}>
            {seg.text}
          </Text>
        );
      case 'code':
        return (
          <Text
            key={i}
            style={{
              fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
              backgroundColor: codeBg,
              paddingHorizontal: 4,
              borderRadius: 4,
            }}
          >
            {seg.text}
          </Text>
        );
      case 'link':
        return (
          <Text
            key={i}
            style={{ color: isUser ? '#fff' : theme.colors.primary, textDecorationLine: 'underline' }}
            onPress={() => Linking.openURL(seg.href)}
          >
            {seg.text}
          </Text>
        );
      default:
        return <Text key={i}>{seg.text}</Text>;
    }
  });
}

const MarkdownBlock = ({ block, theme, isUser }) => {
  const baseColor = isUser ? '#fff' : theme.colors.text;
  const secondaryColor = isUser ? 'rgba(255,255,255,0.7)' : theme.colors.textSecondary;
  const codeBg = isUser ? 'rgba(255,255,255,0.12)' : theme.colors.border + '55';

  switch (block.type) {
    case 'h1':
    case 'h2':
    case 'h3': {
      const sizes = { h1: 22, h2: 20, h3: 18 };
      const weight = '700';
      return (
        <Text
          style={{
            color: baseColor,
            fontSize: sizes[block.type],
            fontWeight: weight,
            marginBottom: 4,
          }}
        >
          {renderInline(block.content, theme, isUser)}
        </Text>
      );
    }
    case 'p':
      return (
        <Text style={{ color: baseColor, fontSize: 16, lineHeight: 22 }}>
          {renderInline(block.content, theme, isUser)}
        </Text>
      );
    case 'blockquote':
      return (
        <View
          style={{
            borderLeftWidth: 3,
            borderLeftColor: isUser ? '#fff' : theme.colors.border,
            paddingLeft: 8,
            marginVertical: 6,
          }}
        >
          <Text style={{ color: secondaryColor, fontStyle: 'italic' }}>
            {renderInline(block.content, theme, isUser)}
          </Text>
        </View>
      );
    case 'ul':
      return (
        <View style={{ marginVertical: 4 }}>
          {block.items.map((item, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Text style={{ color: baseColor, marginRight: 6, lineHeight: 22 }}>•</Text>
              <Text style={{ color: baseColor, flex: 1, lineHeight: 22 }}>
                {renderInline(item, theme, isUser)}
              </Text>
            </View>
          ))}
        </View>
      );
    case 'ol':
      return (
        <View style={{ marginVertical: 4 }}>
          {block.items.map((item, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Text style={{ color: baseColor, marginRight: 6, lineHeight: 22 }}>
                {i + 1}.
              </Text>
              <Text style={{ color: baseColor, flex: 1, lineHeight: 22 }}>
                {renderInline(item, theme, isUser)}
              </Text>
            </View>
          ))}
        </View>
      );
    case 'code':
      return (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{
            backgroundColor: codeBg,
            borderRadius: 8,
            padding: 8,
            marginVertical: 6,
          }}
        >
          <Text
            style={{
              color: baseColor,
              fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
            }}
          >
            {block.content}
          </Text>
        </ScrollView>
      );
    case 'hr':
      return (
        <View
          style={{
            height: 1,
            backgroundColor: isUser ? '#ffffff40' : theme.colors.border,
            marginVertical: 8,
          }}
        />
      );
    default:
      return null;
  }
};

export default function ChatScreen() {
  const { theme } = useTheme();

  const [messages, setMessages] = useState([
    {
      id: '1',
      text: "Hi! I'm your crypto AI assistant. Ask me anything about crypto or trading.",
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

  const flatListRef = useRef(null);
  const cancelStreamRef = useRef(false);
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if ((messages.length > 0 || streamedText.length > 0) && isNearBottom) {
      requestAnimationFrame(() => flatListRef.current?.scrollToEnd({ animated: true }));
    }
  }, [messages, streamedText, isNearBottom]);

  useEffect(() => {
    const anim = (dot, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot, { toValue: 1, duration: 350, delay, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.2, duration: 350, useNativeDriver: true }),
        ])
      );
    const a = anim(dot1, 0),
      b = anim(dot2, 200),
      c = anim(dot3, 400);
    a.start();
    b.start();
    c.start();
    return () => {
      a.stop();
      b.stop();
      c.stop();
    };
  }, [dot1, dot2, dot3]);

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const onScroll = useCallback((e) => {
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

    const userMsg = {
      id: Date.now().toString(),
      text,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLastUserMessage(userMsg);
    setInputText('');
    setShowTyping(true);
    setLoading(true);

    try {
      cancelStreamRef.current = false;
      const response = await chatApi.sendMessage(text);

      setStreamedText('');
      setIsStreaming(true);

      const assistantMsgId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        { id: assistantMsgId, text: '', isUser: false, timestamp: new Date() },
      ]);

      const full = response || '';
      const step = Math.max(1, Math.floor(full.length / 120));

      for (let i = step; i <= full.length; i += step) {
        if (cancelStreamRef.current) break;
        await new Promise((r) => setTimeout(r, 12));
        setStreamedText(full.slice(0, i));
      }

      if (!cancelStreamRef.current) {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsgId ? { ...m, text: full } : m))
        );
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          text: 'Error: failed to get response',
          isUser: false,
          isError: true,
          timestamp: new Date(),
        },
      ]);
      Toast.show({ type: 'error', text1: 'Assistant Error', text2: 'Something went wrong' });
    } finally {
      setShowTyping(false);
      setLoading(false);
      setIsStreaming(false);
      cancelStreamRef.current = false;
    }
  };

  const regenerate = async () => lastUserMessage && sendChatMessage(lastUserMessage.text);

  const renderMessage = useCallback(
    ({ item, index }) => {
      const isLast = index === messages.length - 1;
      const bg = item.isUser
        ? theme.colors.primary
        : item.isError
          ? theme.colors.error + '20'
          : theme.colors.surface;
      const color = item.isUser ? '#fff' : theme.colors.text;

      const displayedText =
        isLast && isStreaming && !item.isUser ? streamedText : item.text;

      return (
        <View style={[styles.msgRow, item.isUser ? styles.alignRight : styles.alignLeft]}>
          <Card style={[styles.msgCard, { backgroundColor: bg }]}>
            <Md text={displayedText} theme={theme} isUser={item.isUser} />
            <Typography
              variant="caption"
              style={{
                color: item.isUser ? 'rgba(255,255,255,0.7)' : theme.colors.textSecondary,
                marginTop: 4,
                textAlign: item.isUser ? 'right' : 'left',
              }}
            >
              {formatTime(item.timestamp)}
            </Typography>
          </Card>
        </View>
      );
    },
    [messages, streamedText, isStreaming, theme.colors]
  );

  const extraData = useMemo(
    () => ({ streamedText, isStreaming }),
    [streamedText, isStreaming]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        {/* Header like OKX Chat */}
        <View
          style={[
            styles.header,
            { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border },
          ]}
        >
          <Typography variant="h2" style={{ color: theme.colors.text }}>
            Crypto AI Assistant
          </Typography>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          extraData={extraData}
        />

        {showTyping && (
          <View style={styles.typingRow}>
            <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>
              Assistant is typing
            </Typography>
            <Animated.Text style={[styles.dot, { opacity: dot1 }]}>.</Animated.Text>
            <Animated.Text style={[styles.dot, { opacity: dot2 }]}>.</Animated.Text>
            <Animated.Text style={[styles.dot, { opacity: dot3 }]}>.</Animated.Text>
          </View>
        )}

        <View
          style={[
            styles.inputRow,
            { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              { borderColor: theme.colors.border, color: theme.colors.text },
            ]}
            placeholder="Type your message..."
            placeholderTextColor={theme.colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            editable={!loading && !isStreaming}
            multiline
            maxLength={2000}
          />

          {isStreaming ? (
            <TouchableOpacity
              onPress={stopStreaming}
              style={[styles.btn, { backgroundColor: theme.colors.error }]}
            >
              <Ionicons name="square" size={22} color="#fff" />
            </TouchableOpacity>
          ) : lastUserMessage ? (
            <TouchableOpacity
              onPress={regenerate}
              style={[styles.btn, { backgroundColor: theme.colors.primary }]}
            >
              <Ionicons name="refresh" size={22} color="#fff" />
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            onPress={() => sendChatMessage()}
            disabled={!inputText.trim() || loading || isStreaming}
            style={[
              styles.btn,
              {
                backgroundColor: inputText.trim()
                  ? theme.colors.primary
                  : theme.colors.textSecondary + '55',
              },
            ]}
          >
            <Ionicons name="arrow-up" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {!isNearBottom && (
          <TouchableOpacity
            onPress={() => flatListRef.current?.scrollToEnd({ animated: true })}
            style={[
              styles.scrollBtn,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
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
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  dot: { marginHorizontal: 2, fontSize: 16 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    marginRight: 8,
    maxHeight: 120,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 12,
    fontSize: 16,
  },
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  scrollBtn: {
    position: 'absolute',
    right: 16,
    bottom: 90,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
});
