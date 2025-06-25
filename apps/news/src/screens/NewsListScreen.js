import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { Typography, Card } from '@tradax/ui';
import { useTheme } from '@tradax/theme';

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
      // Using a free crypto news API or mock data for demonstration
      // In a real implementation, you would use a proper news API
      const mockNews = [
        {
          id: '1',
          title: 'Bitcoin Reaches New All-Time High Amid Institutional Adoption',
          description: 'Major institutions continue to invest in Bitcoin, driving the price to unprecedented levels.',
          publishedAt: '2025-06-22T10:00:00Z',
          source: 'CryptoDaily',
          url: 'https://example.com/news/1',
        },
        {
          id: '2',
          title: 'Ethereum 2.0 Staking Rewards Exceed Expectations',
          description: 'Early stakers are seeing higher than expected returns as the network continues to grow.',
          publishedAt: '2025-06-22T08:30:00Z',
          source: 'BlockNews',
          url: 'https://example.com/news/2',
        },
        {
          id: '3',
          title: 'DeFi Protocol Launches Revolutionary Yield Farming Strategy',
          description: 'New automated yield farming strategies promise to maximize returns for liquidity providers.',
          publishedAt: '2025-06-22T07:15:00Z',
          source: 'DeFi Times',
          url: 'https://example.com/news/3',
        },
        {
          id: '4',
          title: 'Central Bank Digital Currencies Gain Momentum Worldwide',
          description: 'Multiple countries announce plans to launch their own digital currencies in 2025.',
          publishedAt: '2025-06-22T06:00:00Z',
          source: 'FinTech Today',
          url: 'https://example.com/news/4',
        },
        {
          id: '5',
          title: 'NFT Market Shows Signs of Recovery After Winter',
          description: 'Trading volumes and floor prices are increasing across major NFT collections.',
          publishedAt: '2025-06-21T20:45:00Z',
          source: 'NFT Insider',
          url: 'https://example.com/news/5',
        },
      ];

      setNews(mockNews);
    } catch (error) {
      console.error('Error fetching news:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to fetch news',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    fetchNews(true);
  };

  const handleNewsPress = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Cannot open this link',
        });
      }
    } catch (error) {
      console.error('Error opening link:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to open link',
      });
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const renderNewsItem = ({ item }) => (
    <TouchableOpacity onPress={() => handleNewsPress(item.url)}>
      <Card style={[styles.newsCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.newsHeader}>
          <Typography variant="caption" style={{ color: theme.colors.primary }}>
            {item.source}
          </Typography>
          <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>
            {formatDate(item.publishedAt)}
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
        </View>
      </Card>
    </TouchableOpacity>
  );

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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Price Alert Placeholder */}
      <View style={[styles.alertPlaceholder, { backgroundColor: theme.colors.surface }]}>
        <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>
          Price alerts and notifications coming soon
        </Typography>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  listContainer: {
    padding: 20,
    paddingTop: 10,
  },
  newsCard: {
    padding: 16,
    marginBottom: 16,
  },
  newsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  newsTitle: {
    marginBottom: 8,
    lineHeight: 22,
  },
  newsDescription: {
    marginBottom: 12,
    lineHeight: 20,
  },
  newsFooter: {
    alignItems: 'flex-end',
  },
  alertPlaceholder: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#ccc',
  },
});
