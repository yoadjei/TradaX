// screens/MarketOverviewScreen.js
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Image,
  FlatList,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Typography, Card, Button, Input } from '@tradax/ui';
import { useTheme } from '@tradax/theme';
import {
  cryptoApi,
  formatPrice,
  formatPercentageChange,
  formatLargeNumber,
} from '@tradax/utils';

export default function MarketOverviewScreen() {
  const { theme } = useTheme();

  const [marketData, setMarketData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const [activeTab, setActiveTab] = useState<'overview' | 'gainers' | 'losers' | 'trending'>('overview');

  useEffect(() => {
    fetchMarketData();
  }, []);

  const fetchMarketData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // pull more to power all sections (OKX-like markets tab shows lots)
      const data = await cryptoApi.getTopCoins?.(200);
      setMarketData(Array.isArray(data) ? data : []);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error?.message || 'Failed to fetch market data',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredAll = useMemo(() => {
    if (!search) return marketData;
    const q = search.toLowerCase();
    return marketData.filter(
      c =>
        (c.symbol || '').toLowerCase().includes(q) ||
        (c.name || '').toLowerCase().includes(q)
    );
  }, [marketData, search]);

  const topStrip = useMemo(() => {
    // pick a few majors to pin to the top ticker strip
    const majors = ['BTC', 'ETH', 'SOL', 'USDT', 'BNB', 'XRP'];
    const map = {};
    filteredAll.forEach(c => (map[(c.symbol || '').toUpperCase()] = c));
    return majors
      .map(s => map[s])
      .filter(Boolean)
      .map(c => ({
        id: c.id,
        symbol: c.symbol?.toUpperCase(),
        price: c.priceUsd,
        change: formatPercentageChange(c.changePercent24Hr ?? 0),
      }));
  }, [filteredAll]);

  const topGainers = useMemo(() => {
    const arr = [...filteredAll].sort(
      (a, b) => (b.changePercent24Hr || 0) - (a.changePercent24Hr || 0)
    );
    return arr.slice(0, 10);
  }, [filteredAll]);

  const topLosers = useMemo(() => {
    const arr = [...filteredAll].sort(
      (a, b) => (a.changePercent24Hr || 0) - (b.changePercent24Hr || 0)
    );
    return arr.slice(0, 10);
  }, [filteredAll]);

  const trendingByVolume = useMemo(() => {
    const arr = [...filteredAll].sort(
      (a, b) => (b.volumeUsd24Hr || 0) - (a.volumeUsd24Hr || 0)
    );
    return arr.slice(0, 10);
  }, [filteredAll]);

  const overviewList = useMemo(() => filteredAll.slice(0, 50), [filteredAll]);

  const listForTab = useMemo(() => {
    switch (activeTab) {
      case 'gainers':
        return topGainers;
      case 'losers':
        return topLosers;
      case 'trending':
        return trendingByVolume;
      default:
        return overviewList;
    }
  }, [activeTab, overviewList, topGainers, topLosers, trendingByVolume]);

  const renderStripItem = ({ item }) => (
    <View style={styles.stripItem}>
      <Typography variant="body2" style={{ color: theme.colors.text }}>
        {item.symbol}
      </Typography>
      <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>
        {formatPrice(item.price)}
      </Typography>
      <Typography
        variant="caption"
        style={{ color: item.change.isPositive ? theme.colors.success : theme.colors.error }}
      >
        {item.change.text}
      </Typography>
    </View>
  );

  const CoinRow = ({ coin }) => {
    const change = formatPercentageChange(coin.changePercent24Hr ?? 0);

    return (
      <Pressable>
        <Card style={[styles.rowCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.rowLeft}>
            <Image source={{ uri: coin.image }} style={styles.rowIcon} />
            <View style={{ marginLeft: 8 }}>
              <Typography variant="body1" style={{ color: theme.colors.text }}>
                {coin.symbol?.toUpperCase()}
              </Typography>
              <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>
                {coin.name}
              </Typography>
            </View>
          </View>

          <View style={styles.rowRight}>
          <Typography variant="body1" style={{ color: theme.colors.text, textAlign: 'right' }}>
              {formatPrice(coin.priceUsd)}
            </Typography>
            <Typography
              variant="caption"
              style={{
                color: change.isPositive ? theme.colors.success : theme.colors.error,
                textAlign: 'right',
              }}
            >
              {change.text}
            </Typography>
          </View>
        </Card>
      </Pressable>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Typography variant="body1" style={{ marginTop: 12, color: theme.colors.text }}>
          Loading markets...
        </Typography>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchMarketData(true)}
            tintColor={theme.colors.primary}
          />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Top search + tabs header */}
        <View style={styles.header}>
          <Typography variant="h2" style={{ color: theme.colors.text }}>
            Markets
          </Typography>

          {!showSearch ? (
            <Pressable onPress={() => setShowSearch(true)} style={styles.searchFake}>
              <Typography variant="body2" style={{ color: theme.colors.textSecondary }}>
                Search coins, pairs…
              </Typography>
            </Pressable>
          ) : (
            <Input
              placeholder="Search coins, pairs…"
              value={search}
              onChangeText={setSearch}
              autoFocus
              style={styles.searchInput}
            />
          )}

          <View style={[styles.tabs, { borderColor: theme.colors.border }]}>
            {['overview', 'gainers', 'losers', 'trending'].map(t => (
              <Pressable
                key={t}
                onPress={() => setActiveTab(t)}
                style={[
                  styles.tabBtn,
                  activeTab === t && { backgroundColor: theme.colors.primary + '22' },
                ]}
              >
                <Typography
                  variant="body2"
                  style={{
                    color: activeTab === t ? theme.colors.primary : theme.colors.textSecondary,
                  }}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Typography>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Horizontal ticker strip */}
        {topStrip.length > 0 && (
          <View style={{ marginTop: 12 }}>
            <FlatList
              data={topStrip}
              keyExtractor={i => i.id}
              renderItem={renderStripItem}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            />
          </View>
        )}

        {/* Section blocks for Overview tab (OKX-like: Top Gainers / Losers preview) */}
        {activeTab === 'overview' && (
          <>
            <SectionHeader title="Top Gainers (24h)" theme={theme} />
            <HorizontalCoins data={topGainers.slice(0, 6)} theme={theme} />

            <SectionHeader title="Top Losers (24h)" theme={theme} />
            <HorizontalCoins data={topLosers.slice(0, 6)} theme={theme} />

            <SectionHeader title="Trending by Volume" theme={theme} />
            <HorizontalCoins data={trendingByVolume.slice(0, 6)} theme={theme} />

            <SectionHeader title="All" theme={theme} />
          </>
        )}

        {/* Main list according to tab */}
        <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
          {listForTab.map(c => (
            <CoinRow key={c.id} coin={c} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title, theme }) {
  return (
    <View style={{ paddingHorizontal: 16, marginTop: 20, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Typography variant="h3" style={{ color: theme.colors.text }}>{title}</Typography>
    </View>
  );
}

function HorizontalCoins({ data, theme }) {
  return (
    <FlatList
      data={data}
      keyExtractor={i => i.id}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      renderItem={({ item }) => <MiniCoinCard coin={item} theme={theme} />}
    />
  );
}

function MiniCoinCard({ coin, theme }) {
  const change = formatPercentageChange(coin.changePercent24Hr ?? 0);
  return (
    <Card style={[miniStyles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={miniStyles.row}>
        <Image source={{ uri: coin.image }} style={miniStyles.icon} />
        <Typography variant="body2" style={{ color: theme.colors.text, marginLeft: 6 }}>
          {coin.symbol?.toUpperCase()}
        </Typography>
      </View>
      <Typography variant="caption" style={{ color: theme.colors.textSecondary, marginTop: 2 }}>
        {coin.name}
      </Typography>
      <Typography variant="body2" style={{ color: theme.colors.text, marginTop: 6 }}>
        {formatPrice(coin.priceUsd)}
      </Typography>
      <Typography
        variant="caption"
        style={{
          color: change.isPositive ? theme.colors.success : theme.colors.error,
          marginTop: 2,
        }}
      >
        {change.text}
      </Typography>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 16 },
  searchFake: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    opacity: 0.9,
  },
  searchInput: {
    marginTop: 8,
  },
  tabs: {
    flexDirection: 'row',
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  stripItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    borderRadius: 12,
  },
  rowCard: {
    marginBottom: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  rowRight: { alignItems: 'flex-end' },
  rowIcon: { width: 28, height: 28, borderRadius: 14 },
});

const miniStyles = StyleSheet.create({
  card: {
    width: 140,
    marginRight: 10,
    padding: 12,
    borderRadius: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 20, height: 20, borderRadius: 10 },
});
