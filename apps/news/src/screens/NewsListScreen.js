// Full Enhanced NewsListScreen with:
// - Image Thumbnails
// - Category Badges (using simple View and Typography)
// - Empty State Screen
// - Share Button
// - Static Header
// - Basic Sorting by Latest First

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableWithoutFeedback, Animated, Linking, Share, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { Typography, Card } from '@tradax/ui';
import { useTheme } from '@tradax/theme';
import { newsApi } from '@tradax/utils';

export default function NewsListScreen() {
  const { theme } = useTheme();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const articles = await newsApi.getLatestNews({ max: 20 });

      const formattedNews = articles.map((article, index) => ({
        id: `${index}-${article.publishedAt.toISOString()}`,
        title: article.title,
        description: article.description,
        publishedAt: article.publishedAt,
        source: article.source.name,
        url: article.url,
        urlToImage: article.urlToImage,
        category: article.category || 'General'
      }));

      const sortedNews = formattedNews.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

      setNews(sortedNews);
    } catch (error) {
      console.error('Error fetching news:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: error.message });
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
      console.error('Error opening link:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to open link' });
    }
  };

  const handleShare = async (url) => {
    try {
      await Share.share({ message: url });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  const renderNewsItem = ({ item }) => {
    const scaleValue = new Animated.Value(1);

    const onPressIn = () => {
      Animated.spring(scaleValue, {
        toValue: 0.97,
        useNativeDriver: true,
        speed: 50,
        bounciness: 10
      }).start();
    };

    const onPressOut = () => {
      Animated.spring(scaleValue, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
        bounciness: 10
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

            {item.urlToImage && (
              <Image source={{ uri: item.urlToImage }} style={styles.thumbnail} resizeMode="cover" />
            )}

            <View style={styles.badgeContainer}>
              <Typography
                variant="caption"
                style={{ color: theme.colors.secondary, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4, backgroundColor: '#E0E0E0', alignSelf: 'flex-start' }}
              >
                {item.category}
              </Typography>
            </View>

            <Typography variant="h3" style={[styles.newsTitle, { color: theme.colors.text }]}>
              {item.title}
            </Typography>

            <Typography variant="body2" style={[styles.newsDescription, { color: theme.colors.textSecondary }]}>
              {item.description}
            </Typography>

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

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Typography variant="body1" style={{ color: theme.colors.text }}>
            Loading news...
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  if (news.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Typography variant="h2" style={{ color: theme.colors.textSecondary }}>
            No news articles available
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Typography variant="h1" style={{ color: theme.colors.text }}>
          Latest News
        </Typography>
        <Typography variant="body2" style={{ color: theme.colors.textSecondary }}>
          Stay updated with the cryptocurrency market
        </Typography>
      </View>

      <FlatList
        data={news}
        keyExtractor={(item) => item.id}
        renderItem={renderNewsItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={() => (
          <View style={styles.staticHeader}>
            <Typography variant="h2" style={{ color: theme.colors.primary }}>
              Trending Today
            </Typography>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, paddingBottom: 10 },
  staticHeader: { paddingBottom: 10 },
  listContainer: { padding: 20, paddingTop: 10 },
  newsCard: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  newsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
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
  badgeContainer: { marginBottom: 8 },
});
