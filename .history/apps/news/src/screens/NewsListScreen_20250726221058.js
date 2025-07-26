// screens/NewsListScreen.js
// OKX-like feed:
// - Segmented control: All / Trending (Announcements removed)
// - Search with proper keyboard handling (KeyboardAvoidingView + keyboardShouldPersistTaps + dismiss on scroll)
// - Horizontal “Trending now” strip
// - Category chips
// - Time-ago, share, source labels
// - Latest-first sort

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableWithoutFeedback,
  Animated,
  Linking,
  Share,
  Image,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Typography, Card, Input } from '@tradax/ui';
import { useTheme } from '@tradax/theme';
import { newsApi } from '@tradax/utils';

const SEGMENTS = ['All', 'Trending'];
const CATEGORIES = ['All', 'BTC', 'ETH', 'DeFi', 'NFT', 'Memes', 'Regulation', 'Listings'];

export default function NewsListScreen() {
  const { theme } = useTheme();

  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [segment, setSegment] = useState('All');
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const flatRef = useRef(null);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const articles = await newsApi.getLatestNews({ max: 60 });

      const formatted = (articles || []).map((article, index) => ({
        id: `${index}-${new Date(article.publishedAt).getTime()}`,
        title: article.title,
        description: article.description,
        publishedAt: article.publishedAt,
        source: article.source?.name || 'Unknown',
        url: article.url,
        urlToImage: article.urlToImage,
        category: article.category || detectCategory(article.title || article.description) || 'General',
        score: (article.likes || 0) + (article.views || 0) + (60 - index),
      }));

      const sorted = formatted.sort(
        (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
      );

      setNews(sorted);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: error?.message || 'Failed to fetch news' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => fetchNews(true);

  const handleNewsPress = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else Toast.show({ type: 'error', text1: 'Error', text2: 'Cannot open this link' });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to open link' });
    }
  };

  const handleShare = async (url) => {
    try {
      await Share.share({ message: url });
    } catch (_) {}
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  const detectCategory = (text) => {
    const t = (text || '').toLowerCase();
    if (t.includes('btc') || t.includes('bitcoin')) return 'BTC';
    if (t.includes('eth') || t.includes('ethereum')) return 'ETH';
    if (t.includes('defi')) return 'DeFi';
    if (t.includes('nft')) return 'NFT';
    if (t.includes('regulation') || t.includes('sec')) return 'Regulation';
    if (t.includes('listing') || t.includes('listed') || t.includes('lists')) return 'Listings';
    if (t.includes('memecoin') || t.includes('meme')) return 'Memes';
    return null;
  };

  const trendingList = useMemo(() => {
    return [...news]
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 10);
  }, [news]);

  const baseList = useMemo(() => {
    if (segment === 'Trending') return trendingList;
    return news;
  }, [segment, news, trendingList]);

  const filteredByCategory = useMemo(() => {
    if (category === 'All') return baseList;
    return baseList.filter(n => (n.category || '').toLowerCase() === category.toLowerCase());
  }, [baseList, category]);

  const filtered = useMemo(() => {
    if (!query) return filteredByCategory;
    const q = query.toLowerCase();
    return filteredByCategory.filter(
      n =>
        (n.title || '').toLowerCase().includes(q) ||
        (n.description || '').toLowerCase().includes(q) ||
        (n.source || '').toLowerCase().includes(q)
    );
  }, [filteredByCategory, query]);

  const scrollToTop = () => {
    if (flatRef.current) flatRef.current.scrollToOffset({ offset: 0, animated: true });
  };

  const renderNewsItem = ({ item }) => {
    const scaleValue = new Animated.Value(1);

    const onPressIn = () => {
      Animated.spring(scaleValue, {
        toValue: 0.97,
        useNativeDriver: true,
        speed: 50,
        bounciness: 10,
      }).start();
    };

    const onPressOut = () => {
      Animated.spring(scaleValue, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
        bounciness: 10,
      }).start();
    };

    return (
      <TouchableWithoutFeedback
        onPress={() => handleNewsPress(item.url)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
          <Card style={[styles.newsCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.newsHeader}>
              <Typography variant="caption" style={{ color: theme.colors.primary }}>
                {item.source}
              </Typography>
              <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>
                {formatDate(item.publishedAt)}
              </Typography>
            </View>

            {item.urlToImage ? (
              <Image source={{ uri: item.urlToImage }} style={styles.thumbnail} resizeMode="cover" />
            ) : null}

            <View style={styles.chipRow}>
              <View style={[styles.badge, { backgroundColor: theme.colors.primary + '22' }]}>
                <Typography variant="caption" style={{ color: theme.colors.primary }}>
                  {item.category || 'General'}
                </Typography>
              </View>
              {segment === 'Trending' && (
                <View style={[styles.badge, { backgroundColor: theme.colors.success + '22' }]}>
                  <Typography variant="caption" style={{ color: theme.colors.success }}>
                    Trending
                  </Typography>
                </View>
              )}
            </View>

            <Typography variant="h3" style={[styles.newsTitle, { color: theme.colors.text }]}>
              {item.title}
            </Typography>

            {!!item.description && (
              <Typography variant="body2" style={[styles.newsDescription, { color: theme.colors.textSecondary }]}>
                {item.description}
              </Typography>
            )}

            <View style={styles.newsFooter}>
              <Typography variant="caption" style={{ color: theme.colors.primary }}>
                Read more →
              </Typography>
              <Typography
                variant="caption"
                style={{ color: theme.colors.secondary, marginLeft: 12 }}
                onPress={() => handleShare(item.url)}
              >
                Share
              </Typography>
            </View>
          </Card>
        </Animated.View>
      </TouchableWithoutFeedback>
    );
  };

  const renderTrendingItem = ({ item }) => (
    <Pressable
      onPress={() => handleNewsPress(item.url)}
      style={[styles.trendingCard, { backgroundColor: theme.colors.surface }]}
    >
      {item.urlToImage ? (
        <Image source={{ uri: item.urlToImage }} style={styles.trendingThumb} />
      ) : (
        <View style={[styles.trendingThumb, { backgroundColor: theme.colors.border }]} />
      )}
      <View style={styles.trendingContent}>
        <Typography numberOfLines={2} variant="body2" style={{ color: theme.colors.text }}>
          {item.title}
        </Typography>
        <Typography variant="caption" style={{ color: theme.colors.primary, marginTop: 4 }}>
          {formatDate(item.publishedAt)}
        </Typography>
      </View>
    </Pressable>
  );

  const ListHeader = () => (
    <View>
      <View style={[styles.topBar, { backgroundColor: theme.colors.background }]}>
        <Typography variant="h2" style={{ color: theme.colors.text }}>Feed</Typography>

        {!showSearch ? (
          <Pressable onPress={() => setShowSearch(true)} style={styles.searchFake}>
            <Typography variant="body2" style={{ color: theme.colors.textSecondary }}>
              Search news, tokens…
            </Typography>
          </Pressable>
        ) : (
          <Input
            placeholder="Search news, tokens…"
            value={query}
            onChangeText={setQuery}
            autoFocus
            style={styles.searchInput}
            returnKeyType="search"
          />
        )}

        <View style={styles.segmentRow}>
          {SEGMENTS.map(s => (
            <Pressable
              key={s}
              onPress={() => {
                setSegment(s);
                scrollToTop();
              }}
              style={[
                styles.segmentBtn,
                segment === s && { backgroundColor: theme.colors.primary + '22' },
              ]}
            >
              <Typography
                variant="body2"
                style={{
                  color: segment === s ? theme.colors.primary : theme.colors.textSecondary,
                }}
              >
                {s}
              </Typography>
            </Pressable>
          ))}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesRow}
          keyboardShouldPersistTaps="handled"
        >
          {CATEGORIES.map(cat => (
            <Pressable
              key={cat}
              onPress={() => {
                setCategory(cat);
                scrollToTop();
              }}
              style={[
                styles.catChip,
                {
                  backgroundColor:
                    category === cat ? theme.colors.primary : theme.colors.surface,
                  borderColor:
                    category === cat ? theme.colors.primary : theme.colors.border,
                },
              ]}
            >
              <Typography
                variant="caption"
                style={{
                  color: category === cat ? '#fff' : theme.colors.textSecondary,
                }}
              >
                {cat}
              </Typography>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {segment === 'All' && trendingList.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <Typography
            variant="h3"
            style={{ color: theme.colors.text, paddingHorizontal: 16, marginBottom: 8 }}
          >
            Trending now
          </Typography>
          <FlatList
            data={trendingList.slice(0, 8)}
            keyExtractor={(i) => i.id}
            renderItem={renderTrendingItem}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Typography variant="body1" style={{ color: theme.colors.text }}>
            Loading Feed...
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={flatRef}
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderNewsItem}
          ListHeaderComponent={<ListHeader />}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  topBar: { paddingHorizontal: 16, paddingTop: 16 },
  searchFake: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    opacity: 0.9,
  },
  searchInput: { marginTop: 8 },

  segmentRow: {
    flexDirection: 'row',
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },

  categoriesRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  catChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
  },

  newsCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  newsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  newsTitle: { marginBottom: 8, lineHeight: 24, fontWeight: 'bold' },
  newsDescription: { marginBottom: 12, lineHeight: 20 },
  newsFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  separator: { height: 8 },

  thumbnail: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 8,
  },

  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginRight: 6,
  },

  trendingCard: {
    width: 220,
    borderRadius: 12,
    marginRight: 10,
    overflow: 'hidden',
  },
  trendingThumb: { width: 220, height: 110 },
  trendingContent: { padding: 8 },
});
