// screens/NewsListScreen.js
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  memo,
} from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Animated,
  Linking,
  Share,
  Image,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Typography, Card, Input } from '@tradax/ui';
import { useTheme } from '@tradax/theme';
import { newsApi } from '@tradax/utils';

const SEGMENTS = ['All', 'Trending'];
const CATEGORIES = ['All', 'BTC', 'ETH', 'DeFi', 'NFT', 'Memes', 'Regulation', 'Listings'];

const PAGE_SIZE = 30; // tweak as you wish

export default function NewsListScreen() {
  const { theme } = useTheme();

  const [news, setNews] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [segment, setSegment] = useState('All');
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const [page, setPage] = useState(1);
  const cursorRef = useRef(null); // if your backend returns a cursor, store it here

  const flatRef = useRef(null);

  useEffect(() => {
    // initial load
    loadNews({ reset: true }).finally(() => setLoadingInitial(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadNews = useCallback(
    async ({ reset = false } = {}) => {
      if (reset) {
        setRefreshing(true);
        setHasMore(true);
        setPage(1);
        cursorRef.current = null;
      } else {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
      }

      try {
        // ---- OPTION A: page/pageSize style ----
        const nextPage = reset ? 1 : page + 1;
        const res = await newsApi.getLatestNews({
          page: nextPage,
          pageSize: PAGE_SIZE,
          includeOlder: true, // <-- make sure your util passes this down (or remove if not needed)
        });

        // ---- OPTION B: cursor style ----
        // const res = await newsApi.getLatestNews({
        //   cursor: reset ? undefined : cursorRef.current,
        //   limit: PAGE_SIZE,
        //   includeOlder: true,
        // });

        const articles = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];

        // Allow util to indicate no more:
        const noMore =
          res?.hasMore === false ||
          (articles.length < PAGE_SIZE && !reset);

        // If using cursor:
        // cursorRef.current = res?.nextCursor || null;
        // const noMore = !cursorRef.current;

        const deduped = mergeDedup(news, articles, reset);

        setNews(deduped);
        setHasMore(!noMore);
        if (!reset) setPage(nextPage);
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: error?.message || 'Failed to fetch news',
        });
      } finally {
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [hasMore, loadingMore, news, page]
  );

  const onRefresh = useCallback(() => {
    loadNews({ reset: true });
  }, [loadNews]);

  const onEndReached = useCallback(() => {
    if (!loadingMore && hasMore && !refreshing) {
      loadNews({ reset: false });
    }
  }, [hasMore, loadingMore, refreshing, loadNews]);

  const handleNewsPress = useCallback(async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else Toast.show({ type: 'error', text1: 'Error', text2: 'Cannot open this link' });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to open link' });
    }
  }, []);

  const handleShare = useCallback(async (url) => {
    try {
      await Share.share({ message: url });
    } catch (_) {}
  }, []);

  const formatDate = useCallback((dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const mins = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    // show absolute date
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const detectCategory = useCallback((text) => {
    const t = (text || '').toLowerCase();
    if (t.includes('btc') || t.includes('bitcoin')) return 'BTC';
    if (t.includes('eth') || t.includes('ethereum')) return 'ETH';
    if (t.includes('defi')) return 'DeFi';
    if (t.includes('nft')) return 'NFT';
    if (t.includes('regulation') || t.includes('sec')) return 'Regulation';
    if (t.includes('listing') || t.includes('listed') || t.includes('lists')) return 'Listings';
    if (t.includes('memecoin') || t.includes('meme')) return 'Memes';
    return 'General';
  }, []);

  const enriched = useMemo(() => {
    return news.map((n, i) => ({
      ...n,
      category: n.category || detectCategory(`${n.title} ${n.description}`),
      score: typeof n.score === 'number' ? n.score : 1000 - i, // higher for newer top-most
      _id: getStableId(n),
    }));
  }, [news, detectCategory]);

  const trendingList = useMemo(() => {
    return [...enriched]
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 10);
  }, [enriched]);

  const baseList = useMemo(() => {
    if (segment === 'Trending') return trendingList;
    return enriched;
  }, [segment, enriched, trendingList]);

  const filteredByCategory = useMemo(() => {
    if (category === 'All') return baseList;
    return baseList.filter(
      (n) => (n.category || '').toLowerCase() === category.toLowerCase()
    );
  }, [baseList, category]);

  const filtered = useMemo(() => {
    if (!query.trim()) return filteredByCategory;
    const q = query.toLowerCase();
    return filteredByCategory.filter(
      (n) =>
        (n.title || '').toLowerCase().includes(q) ||
        (n.description || '').toLowerCase().includes(q) ||
        (n.source?.name || '').toLowerCase().includes(q)
    );
  }, [filteredByCategory, query]);

  const scrollToTop = useCallback(() => {
    flatRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const keyExtractor = useCallback((item) => item._id, []);

  const renderItem = useCallback(
    ({ item }) => (
      <NewsCard
        item={item}
        theme={theme}
        onPress={handleNewsPress}
        onShare={handleShare}
        formatDate={formatDate}
        isTrending={segment === 'Trending'}
      />
    ),
    [theme, handleNewsPress, handleShare, formatDate, segment]
  );

  const renderTrendingItem = useCallback(
    ({ item }) => <TrendingItem item={item} theme={theme} onPress={handleNewsPress} formatDate={formatDate} />,
    [theme, handleNewsPress, formatDate]
  );

  const ListHeader = useCallback(() => (
    <View>
      <View style={[styles.topBar, { backgroundColor: theme.colors.background }]}>
        <Typography variant="h2" style={{ color: theme.colors.text }}>Feed</Typography>

        {!showSearch ? (
          <Pressable onPress={() => setShowSearch(true)} style={[styles.searchFake, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}>
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
            onSubmitEditing={Keyboard.dismiss}
          />
        )}

        <View style={styles.segmentRow}>
          {SEGMENTS.map((s) => (
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
          {CATEGORIES.map((cat) => (
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
            keyExtractor={keyExtractor}
            renderItem={renderTrendingItem}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}
    </View>
  ), [
    theme,
    showSearch,
    query,
    segment,
    category,
    trendingList,
    renderTrendingItem,
    keyExtractor,
    scrollToTop,
  ]);

  if (loadingInitial && !refreshing) {
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
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListHeaderComponent={<ListHeader />}
          ListEmptyComponent={
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Typography variant="body2" style={{ color: theme.colors.textSecondary }}>
                No news found.
              </Typography>
            </View>
          }
          ListFooterComponent={
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              {loadingMore ? (
                <ActivityIndicator color={theme.colors.primary} />
              ) : !hasMore ? (
                <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>
                  No more news
                </Typography>
              ) : null}
            </View>
          }
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          removeClippedSubviews
          initialNumToRender={8}
          windowSize={11}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ---------------------- small helpers & memoized cards ---------------------- */

function getStableId(n) {
  const key = n.url || `${n.title}-${n.publishedAt}`;
  return key;
}

function mergeDedup(existing, incoming, reset) {
  const seen = new Set();
  const result = reset ? [] : [...existing];

  // index existing
  result.forEach((a) => seen.add(getStableId(a)));

  incoming.forEach((a) => {
    const id = getStableId(a);
    if (!seen.has(id)) {
      seen.add(id);
      result.push(a);
    }
  });

  // sort latest first (server should do this, but just in case)
  result.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  return result;
}

const NewsCard = memo(function NewsCard({
  item,
  theme,
  onPress,
  onShare,
  formatDate,
  isTrending,
}) {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    Animated.spring(scaleValue, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 10,
    }).start();
  }, [scaleValue]);

  const onPressOut = useCallback(() => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 10,
    }).start();
  }, [scaleValue]);

  return (
    <Pressable
      onPress={() => onPress(item.url)}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      android_ripple={{ color: theme.colors.border }}
    >
      <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
        <Card style={[styles.newsCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.newsHeader}>
            <Typography variant="caption" style={{ color: theme.colors.primary }}>
              {item.source?.name || 'Unknown'}
            </Typography>
            <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>
              {formatDate(item.publishedAt)}
            </Typography>
          </View>

          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.thumbnail} resizeMode="cover" />
          ) : null}

          <View style={styles.chipRow}>
          <View style={[styles.badge, { backgroundColor: theme.colors.primary + '22' }]}>
            <Typography variant="caption" style={{ color: theme.colors.primary }}>
              {item.category || 'General'}
            </Typography>
          </View>
          {isTrending && (
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
            <Typography
              variant="body2"
              style={[styles.newsDescription, { color: theme.colors.textSecondary }]}
            >
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
              onPress={() => onShare(item.url)}
            >
              Share
            </Typography>
          </View>
        </Card>
      </Animated.View>
    </Pressable>
  );
});

const TrendingItem = memo(function TrendingItem({ item, theme, onPress, formatDate }) {
  return (
    <Pressable
      onPress={() => onPress(item.url)}
      style={[styles.trendingCard, { backgroundColor: theme.colors.surface }]}
    >
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.trendingThumb} />
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
});

/* --------------------------------- styles --------------------------------- */

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
