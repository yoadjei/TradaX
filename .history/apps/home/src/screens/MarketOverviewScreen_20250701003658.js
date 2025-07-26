// marketOverviewScreen.js
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Typography, Card } from '@tradax/ui';
import { useTheme } from '@tradax/theme';
import { cryptoApi, formatPrice, formatPercentageChange, formatLargeNumber } from '@tradax/utils';

export default function MarketOverviewScreen() {
  const { theme } = useTheme();
  const [marketData, setMarketData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchMarketData();
  }, []);

  const fetchMarketData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await cryptoApi.getTopCoins(10);
      setMarketData(data);
    } catch (error) {
      console.error(error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to fetch market data',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const renderCoinItem = ({ item }) => {
    const priceChange = formatPercentageChange(item.changePercent24Hr ?? 0);

    return (
      <Card style={[styles.coinCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.coinHeader}>
          <View style={styles.coinInfoWithImage}>
            <Image source={{ uri: item.image }} style={styles.coinImage} />
            <View style={styles.coinInfoText}>
              <Typography variant="h3" style={{ color: theme.colors.text }}>
                {item.symbol?.toUpperCase()}
              </Typography>
              <Typography variant="body2" style={{ color: theme.colors.textSecondary }}>
                {item.name}
              </Typography>
            </View>
          </View>
          <View style={styles.rankBadge}>
            <Typography variant="caption" style={{ color: theme.colors.primary }}>
              #{item.market_cap_rank ?? '-'}
            </Typography>
          </View>
        </View>
        <View style={styles.priceSection}>
          <Typography variant="h2" style={{ color: theme.colors.text }}>
            {formatPrice(item.priceUsd)}
          </Typography>
          <Typography variant="body2" style={{ color: priceChange.isPositive ? theme.colors.success : theme.colors.error }}>
            {priceChange.text}
          </Typography>
        </View>
        <View style={styles.marketData}>
          <View style={styles.dataItem}>
            <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>Market Cap</Typography>
            <Typography variant="body2" style={{ color: theme.colors.text }}>
              {formatLargeNumber(item.marketCapUsd)}
            </Typography>
          </View>
          <View style={styles.dataItem}>
            <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>Volume 24h</Typography>
            <Typography variant="body2" style={{ color: theme.colors.text }}>
              {formatLargeNumber(item.volumeUsd24Hr)}
            </Typography>
          </View>
        </View>
      </Card>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Typography variant="body1" style={{ color: theme.colors.text }}>
            Loading market data...
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Typography variant="h1" style={{ color: theme.colors.text }}>Market Overview</Typography>
        <Typography variant="body2" style={{ color: theme.colors.textSecondary }}>
          Top cryptocurrencies by market cap
        </Typography>
      </View>
      <FlatList
        data={marketData}
        keyExtractor={(item) => item.id}
        renderItem={renderCoinItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchMarketData(true)} tintColor={theme.colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, paddingBottom: 10 },
  listContainer: { padding: 20, paddingTop: 10 },
  coinCard: { padding: 16, marginBottom: 12 },
  coinHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  coinInfoWithImage: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  coinImage: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  coinInfoText: { flex: 1 },
  rankBadge: { backgroundColor: 'rgba(74,144,226,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  priceSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  marketData: { flexDirection: 'row', justifyContent: 'space-between' },
  dataItem: { flex: 1 }
});
