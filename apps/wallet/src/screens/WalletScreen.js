// screens/WalletScreen.js
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Typography, Card, Button, Input } from '@tradax/ui';
import { useTheme } from '@tradax/theme';
import { walletApi, cryptoApi } from '@tradax/utils';
import Svg, { G, Path, Circle, Text as SvgText, Defs, TextPath } from 'react-native-svg';

const CHART_SIZE = 240;
const CHART_STROKE = 30;
const EXCLUDE_FROM_CRYPTO = new Set(['USD']); // ignore USD completely

function formatUSDNum(n) {
  const num = Number(n || 0);
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function CoinImage({ uri, style, placeholderColor, symbol }) {
  const [error, setError] = useState(false);
  if (!uri || error || symbol === 'USD') {
    return (
      <View
        style={[
          style,
          {
            backgroundColor: placeholderColor,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        <Typography variant="caption" style={{ fontWeight: '700' }}>
          {symbol?.[0] ?? '•'}
        </Typography>
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={style}
      onError={() => setError(true)}
      resizeMode="contain"
    />
  );
}

/**
 * Donut with:
 * - straight edges (no round caps)
 * - curved labels INSIDE each slice using TextPath
 * - minimum sweep so tiny assets are still visible
 */
function DonutChart({
  data,
  size = CHART_SIZE,
  strokeWidth = CHART_STROKE,
  trackColor,
  colors = [],
  gapDeg = 6,
  minShowPct = 0.2,
  minSweepDeg = 3,
  hideBalances = false,
  labelLight = '#000',
  labelDark = '#fff',
  isDark,
}) {
  const radius = size / 2;
  const r = radius - strokeWidth / 2;
  const rInnerLabel = r - strokeWidth * 0.62;
  const cx = radius;
  const cy = radius;

  const total = data.reduce((acc, d) => acc + (d.value || 0), 0) || 1;

  const polarToCartesian = (centerX, centerY, rad, angleInDeg) => {
    const angleInRad = ((angleInDeg - 90) * Math.PI) / 180.0;
    return {
      x: centerX + rad * Math.cos(angleInRad),
      y: centerY + rad * Math.sin(angleInRad),
    };
  };

  const arcPath = (rad, startAngle, endAngle) => {
    const start = polarToCartesian(cx, cy, rad, endAngle);
    const end = polarToCartesian(cx, cy, rad, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${rad} ${rad} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  };

  const n = data.length;
  const available = 360 - gapDeg * n;

  // compute sweeps with minSweepDeg
  const rawSweeps = data.map(d => ((d.value || 0) / total) * available);
  const withMin = rawSweeps.map(s => Math.max(s, minSweepDeg));
  const sumWithMin = withMin.reduce((a, b) => a + b, 0);
  const scale = sumWithMin > 0 ? available / sumWithMin : 1;
  const sweeps = withMin.map(s => s * scale);

  // build slices
  let cursor = 0;
  const slices = data.map((d, i) => {
    const sweep = sweeps[i];
    const value = d.value || 0;
    const percent = (value / total) * 100;
    const startAngle = cursor;
    const endAngle = cursor + sweep;
    cursor = endAngle + gapDeg;

    const mid = (startAngle + endAngle) / 2;

    const id = `inner-arc-${i}`;
    const labelText = hideBalances ? '' : `${d.key} ${percent.toFixed(1)}%`;
    const visible = percent >= minShowPct;

    return {
      key: d.key || String(i),
      color: d.color || colors[i % colors.length],
      strokePath: arcPath(r, startAngle, endAngle),
      labelPath: arcPath(rInnerLabel, startAngle, endAngle),
      mid,
      id,
      labelText,
      visible,
    };
  });

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={cx}
        cy={cy}
        r={r}
        stroke={trackColor}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="butt"
      />
      <G>
        {slices.map((s, idx) => (
          <Path
            key={`arc-${s.key}-${idx}`}
            d={s.strokePath}
            stroke={s.color}
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
            fill="none"
          />
        ))}
      </G>

      <Defs>
        {slices.map((s, idx) => (
          <Path key={`def-${s.id}`} id={s.id} d={s.labelPath} fill="none" />
        ))}
      </Defs>

      <G>
        {slices.map((s, idx) =>
          s.visible && s.labelText ? (
            <SvgText
              key={`txt-${s.key}-${idx}`}
              fontSize={8}
              fontWeight="600"
              fill={isDark ? labelDark : labelLight}
            >
              <TextPath href={`#${s.id}`} startOffset="50%" textAnchor="middle">
                {s.labelText}
              </TextPath>
            </SvgText>
          ) : null
        )}
      </G>
    </Svg>
  );
}

const DEFAULT_ASSETS = [
  { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png' },
  { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', image: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png' },
  { id: 'tether', name: 'Tether', symbol: 'USDT', image: 'https://assets.coingecko.com/coins/images/325/large/Tether-logo.png' },
  { id: 'usd-coin', name: 'USD Coin', symbol: 'USDC', image: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png' },
  { id: 'binancecoin', name: 'BNB', symbol: 'BNB', image: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png' },
  { id: 'ripple', name: 'XRP', symbol: 'XRP', image: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png' },
  { id: 'solana', name: 'Solana', symbol: 'SOL', image: 'https://assets.coingecko.com/coins/images/4128/large/solana.png' },
  { id: 'cardano', name: 'Cardano', symbol: 'ADA', image: 'https://assets.coingecko.com/coins/images/975/large/cardano.png' },
  { id: 'dogecoin', name: 'Dogecoin', symbol: 'DOGE', image: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png' },
  { id: 'tron', name: 'TRON', symbol: 'TRX', image: 'https://assets.coingecko.com/coins/images/1094/large/tron-logo.png' },
  { id: 'polkadot', name: 'Polkadot', symbol: 'DOT', image: 'https://assets.coingecko.com/coins/images/12171/large/polkadot.png' },
  { id: 'matic-network', name: 'Polygon', symbol: 'MATIC', image: 'https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png' },
  { id: 'shiba-inu', name: 'Shiba Inu', symbol: 'SHIB', image: 'https://assets.coingecko.com/coins/images/11939/large/shiba.png' },
  { id: 'litecoin', name: 'Litecoin', symbol: 'LTC', image: 'https://assets.coingecko.com/coins/images/2/large/litecoin.png' },
  { id: 'avalanche-2', name: 'Avalanche', symbol: 'AVAX', image: 'https://assets.coingecko.com/coins/images/12559/large/coin-round-red.png' },
  { id: 'uniswap', name: 'Uniswap', symbol: 'UNI', image: 'https://assets.coingecko.com/coins/images/12504/large/uniswap-uni.png' },
  { id: 'chainlink', name: 'Chainlink', symbol: 'LINK', image: 'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png' },
  { id: 'stellar', name: 'Stellar', symbol: 'XLM', image: 'https://assets.coingecko.com/coins/images/100/large/Stellar_symbol_black_RGB.png' },
  { id: 'monero', name: 'Monero', symbol: 'XMR', image: 'https://assets.coingecko.com/coins/images/69/large/monero_logo.png' },
];

export default function WalletScreen() {
  const { theme } = useTheme();

  const [serverBalances, setServerBalances] = useState([]);
  const [priceMap, setPriceMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [hideBalances, setHideBalances] = useState(false);

  const [search, setSearch] = useState('');
  const [searchModalVisible, setSearchModalVisible] = useState(false);

  const [sortKey, setSortKey] = useState('usd');
  const [sortDir, setSortDir] = useState('desc');

  const [tradeModalVisible, setTradeModalVisible] = useState(false);
  const [assetPickerVisible, setAssetPickerVisible] = useState(false);
  const [modalType, setModalType] = useState('deposit');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [amount, setAmount] = useState('');
  const [feeRate] = useState(0.001);

  const [assetsCatalog, setAssetsCatalog] = useState(DEFAULT_ASSETS);

  useEffect(() => {
    refreshBalances();
  }, []);

  const refreshBalances = async () => {
    setLoading(true);
    try {
      const res = await walletApi.getBalances();
      const list = Array.isArray(res?.balances) ? res.balances : [];
      setServerBalances(list);

      const newOnes = list
        .map(b => (b.symbol || b.asset || '').toUpperCase())
        .filter(Boolean)
        .filter(sym => !assetsCatalog.some(a => a.symbol.toUpperCase() === sym))
        .map(sym => ({ id: sym.toLowerCase(), name: sym, symbol: sym, image: null }));
      if (newOnes.length) {
        setAssetsCatalog(prev => [...prev, ...newOnes]);
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: e?.message ?? 'Failed to fetch data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const loadPrices = async () => {
      try {
        const res = await cryptoApi.getPrices?.();
        const map = {};
        if (Array.isArray(res)) {
          res.forEach(p => {
            const sym = (p.symbol || p.base || p.ticker || '').toUpperCase();
            const price = Number(p.price ?? p.last ?? p.current_price ?? p.usd ?? 0);
            if (sym && price) map[sym] = { price };
          });
        } else if (res && typeof res === 'object') {
          Object.keys(res).forEach(k => {
            const sym = k.toUpperCase();
            const v = res[k];
            const price = Number(v?.price ?? v?.last ?? v?.current_price ?? v?.usd ?? 0);
            if (price) map[sym] = { price };
          });
        }
        if (mounted) setPriceMap(map);
      } catch (_) {}
    };
    loadPrices();
    const id = setInterval(loadPrices, 15000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshBalances();
    setRefreshing(false);
  };

  const bySymbol = useMemo(() => {
    const map = {};
    serverBalances.forEach(b => {
      const sym = (b.symbol || b.asset || '').toUpperCase();
      if (sym) map[sym] = b;
    });
    return map;
  }, [serverBalances]);

  const MAX_COINS = 50;

  const baseBalances = useMemo(() => {
    const merged = [];
    const catalog = assetsCatalog.slice(0, MAX_COINS);

    catalog.forEach(a => {
      const sym = a.symbol.toUpperCase();
      if (EXCLUDE_FROM_CRYPTO.has(sym)) return;

      const srv = bySymbol[sym] || {};
      const livePrice = Number(priceMap[sym]?.price ?? srv.price ?? 0);
      const balance = Number(srv.balance ?? 0);
      const usd = balance * livePrice;
      merged.push({
        id: a.id || sym.toLowerCase(),
        symbol: sym,
        name: a.name,
        image: a.image,
        balance,
        price: livePrice,
        usd,
      });
    });

    Object.keys(bySymbol).forEach(sym => {
      const up = sym.toUpperCase();
      if (EXCLUDE_FROM_CRYPTO.has(up)) return;
      if (!merged.some(x => x.symbol === up)) {
        const srv = bySymbol[up];
        const livePrice = Number(priceMap[up]?.price ?? srv.price ?? 0);
        const balance = Number(srv.balance ?? 0);
        const usd = balance * livePrice;
        merged.push({
          id: up.toLowerCase(),
          symbol: up,
          name: up,
          image: null,
          balance,
          price: livePrice,
          usd,
        });
      }
    });

    return merged;
  }, [assetsCatalog, bySymbol, priceMap]);

  const ownedBalances = useMemo(
    () => baseBalances.filter(b => (b.usd || 0) > 0 || (b.balance || 0) > 0),
    [baseBalances]
  );

  const totalValue = useMemo(
    () => ownedBalances.reduce((acc, b) => acc + b.usd, 0),
    [ownedBalances]
  );

  const balancesWithPct = useMemo(() => {
    return ownedBalances.map(b => ({
      ...b,
      percent: totalValue > 0 ? (b.usd / totalValue) * 100 : 0,
    }));
  }, [ownedBalances, totalValue]);

  const balances = useMemo(() => {
    const filtered = search
      ? balancesWithPct.filter(
          i =>
            i.symbol.toLowerCase().includes(search.toLowerCase()) ||
            i.name.toLowerCase().includes(search.toLowerCase())
        )
      : balancesWithPct;
    const sorted = [...filtered].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'symbol') return a.symbol.localeCompare(b.symbol) * dir;
      if (sortKey === 'balance') return (a.balance - b.balance) * dir;
      return (a.usd - b.usd) * dir;
    });
    return sorted;
  }, [balancesWithPct, search, sortKey, sortDir]);

  const openPickerThenTrade = (type) => {
    setModalType(type);
    setSelectedAsset(null);
    setAmount('');
    setAssetPickerVisible(true);
  };

  const openTradeModal = (asset) => {
    setSelectedAsset(asset);
    setAmount('');
    setAssetPickerVisible(false);
    setTradeModalVisible(true);
  };

  const handleAction = async () => {
    const numericAmount = Number(amount);
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      return Toast.show({
        type: 'error',
        text1: 'Invalid Amount',
        text2: 'Enter a valid value.',
      });
    }
    try {
      if (modalType === 'deposit') {
        await walletApi.deposit({ asset: selectedAsset.symbol, amount: numericAmount });
      } else if (modalType === 'withdraw') {
        await walletApi.withdraw({ asset: selectedAsset.symbol, amount: numericAmount });
      } else if (modalType === 'buy' || modalType === 'sell' || modalType === 'convert') {
        const price = Number(selectedAsset.price ?? 0);
        const cost = price * numericAmount;
        const fee = cost * feeRate;
        await walletApi.trade?.({
          asset: selectedAsset.symbol.toLowerCase(),
          type: modalType,
          orderType: 'market',
          amount: numericAmount,
          price,
          fee,
          total: modalType === 'buy' ? cost + fee : cost - fee,
        });
      }
      Toast.show({
        type: 'success',
        text1: `${modalType.charAt(0).toUpperCase() + modalType.slice(1)} Successful`,
      });
      setTradeModalVisible(false);
      setSelectedAsset(null);
      setAmount('');
      await refreshBalances();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err?.message || 'Operation failed',
      });
    }
  };

  const mask = v => (hideBalances ? '•••••' : v);

  const ringColors =
    theme.colors?.chartColors ||
    ['#5F6FFF', '#00C2FF', '#FFC542', '#FF5757', '#8E44AD', '#2ECC71', '#E84393', '#636E72', '#55EFC4', '#81ECEC'];

  const QuickAction = ({ label, icon, onPress }) => (
    <Pressable style={[styles.quickActionCol]} onPress={onPress}>
      <View style={[styles.quickActionCircle, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Typography variant="body2" style={{ color: theme.colors.text }}>{icon}</Typography>
      </View>
      <Typography variant="caption" style={{ color: theme.colors.textSecondary, marginTop: 4 }}>
        {label}
      </Typography>
    </Pressable>
  );

  const renderHeader = () => {
    const chartData = balancesWithPct.map((b, i) => ({
      key: b.symbol,
      value: b.usd,
      color: ringColors[i % ringColors.length],
      percent: b.percent,
    }));

    const assetsCount = balancesWithPct.length;

    return (
      <View>
        <Card style={[styles.topCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.ringWrap}>
            <DonutChart
              data={chartData}
              size={CHART_SIZE}
              strokeWidth={CHART_STROKE}
              trackColor={theme.colors.border}
              colors={ringColors}
              gapDeg={6}
              minShowPct={0.2}
              minSweepDeg={3}
              hideBalances={hideBalances}
              labelLight="#000"
              labelDark="#fff"
              isDark={theme.dark}
            />
            <View style={[styles.ringCenter, { backgroundColor: 'transparent' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                <Typography variant="h2" style={{ color: theme.colors.text, textAlign: 'center' }}>
                  {mask(formatUSDNum(totalValue))}
                </Typography>
                <Typography variant="caption" style={{ color: theme.colors.textSecondary, marginLeft: 4, marginBottom: 4 }}>
                  USD
                </Typography>
              </View>

              <View style={styles.assetsRowCenter}>
                <Typography variant="caption" style={{ color: theme.colors.textSecondary, marginRight: 8 }}>
                  {assetsCount} assets
                </Typography>
                <Pressable onPress={() => setHideBalances(prev => !prev)} style={styles.hideBtn}>
                  <Typography variant="caption" style={{ color: theme.colors.primary }}>
                    {hideBalances ? 'SHOW' : 'HIDE'}
                  </Typography>
                </Pressable>
              </View>
            </View>
          </View>
        </Card>

        <View style={styles.quickActionsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickRowScrollable}
          >
            <QuickAction label="Buy" icon="＋" onPress={() => openPickerThenTrade('buy')} />
            <QuickAction label="Sell" icon="↘" onPress={() => openPickerThenTrade('sell')} />
            <QuickAction label="Convert" icon="⇄" onPress={() => openPickerThenTrade('convert')} />
            <QuickAction label="Deposit" icon="↓" onPress={() => openPickerThenTrade('deposit')} />
            <QuickAction label="Withdraw" icon="↑" onPress={() => openPickerThenTrade('withdraw')} />
          </ScrollView>
        </View>

        <View style={styles.sortRow}>
          <Pressable
            style={styles.sortBtn}
            onPress={() => {
              setSortKey('symbol');
              setSortDir(sortKey === 'symbol' && sortDir === 'desc' ? 'asc' : 'desc');
            }}
          >
            <Typography variant="body2" style={{ color: theme.colors.textSecondary }}>
              Symbol {sortKey === 'symbol' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
            </Typography>
          </Pressable>
          <Pressable
            style={styles.sortBtn}
            onPress={() => {
              setSortKey('balance');
              setSortDir(sortKey === 'balance' && sortDir === 'desc' ? 'asc' : 'desc');
            }}
          >
            <Typography variant="body2" style={{ color: theme.colors.textSecondary }}>
              Amount {sortKey === 'balance' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
            </Typography>
          </Pressable>
          <Pressable
            style={styles.sortBtn}
            onPress={() => {
              setSortKey('usd');
              setSortDir(sortKey === 'usd' && sortDir === 'desc' ? 'asc' : 'desc');
            }}
          >
            <Typography variant="body2" style={{ color: theme.colors.textSecondary }}>
              Value {sortKey === 'usd' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
            </Typography>
          </Pressable>
          <Pressable
            style={styles.sortBtn}
            onPress={() => setSearchModalVisible(true)}
          >
            <Typography variant="body2" style={{ color: theme.colors.textSecondary }}>🔍</Typography>
          </Pressable>
        </View>

        <View style={styles.yourCryptoHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <Typography variant="h3" style={{ color: theme.colors.text }}>Your crypto</Typography>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <Typography variant="h4" style={{ color: theme.colors.text, marginTop: 4 }}>
              {mask(formatUSDNum(totalValue))}
            </Typography>
            <Typography variant="caption" style={{ color: theme.colors.textSecondary, marginLeft: 4, marginBottom: 2 }}>
              USD
            </Typography>
          </View>
        </View>
      </View>
    );
  };

  const renderItem = ({ item }) => {
    return (
      <Pressable onPress={() => {}} style={{ width: '100%' }}>
        <View style={[styles.assetRowList, { backgroundColor: 'transparent' }]}>
          <View style={styles.assetInfoRow}>
            <CoinImage
              uri={item.image}
              style={styles.coinImage}
              placeholderColor={theme.colors.border}
              symbol={item.symbol}
            />
            <View style={styles.assetText}>
              <Typography variant="body2" style={{ color: theme.colors.text }}>
                {item.symbol}
              </Typography>
              <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>
                {item.name}
              </Typography>
            </View>
          </View>

          <View style={styles.assetValuesRight}>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
              <Typography variant="body2" style={{ color: theme.colors.text, textAlign: 'right' }}>
                {mask(formatUSDNum(item.usd))}
              </Typography>
              <Typography variant="caption" style={{ color: theme.colors.textSecondary, marginLeft: 2, marginBottom: 1 }}>
                USD
              </Typography>
            </View>
            <Typography variant="caption" style={{ color: theme.colors.textSecondary, textAlign: 'right' }}>
              {mask(item.balance >= 1 ? item.balance.toFixed(2) : item.balance.toFixed(6))}
            </Typography>
          </View>
        </View>
      </Pressable>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Typography variant="body1" style={{ color: theme.colors.text, marginTop: 12 }}>
          Loading wallet...
        </Typography>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <FlatList
          ListHeaderComponent={renderHeader}
          data={balances}
          keyExtractor={(item, idx) => `${item.symbol}-${item.id || ''}-${idx}`}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
          }
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            !loading && (
              <Typography
                variant="body2"
                style={{ color: theme.colors.textSecondary, textAlign: 'center', marginTop: 40 }}
              >
                No assets found.
              </Typography>
            )
          }
        />
      </KeyboardAvoidingView>

      {/* Search modal */}
      <Modal
        visible={searchModalVisible}
        animationType="slide"
        onRequestClose={() => setSearchModalVisible(false)}
      >
        <SafeAreaView style={[styles.searchModalContainer, { backgroundColor: theme.colors.background }]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <View style={[styles.searchBarWrap, { borderBottomColor: theme.colors.border }]}>
              <Input
                placeholder="Search assets"
                value={search}
                onChangeText={setSearch}
                autoFocus
                returnKeyType="search"
                style={styles.searchBarInput}
              />
            </View>

            <View style={styles.cancelContainer}>
              <Pressable
                onPress={() => {
                  setSearchModalVisible(false);
                  setSearch('');
                }}
                style={styles.cancelBtn}
              >
                <Typography variant="body1" style={{ color: theme.colors.primary }}>Cancel</Typography>
              </Pressable>
            </View>

            {search.length === 0 ? (
              <View style={styles.searchPlaceholder}>
                <Typography variant="body2" style={{ color: theme.colors.textSecondary, textAlign: 'center', marginTop: 40 }}>
                  Start typing to search assets
                </Typography>
              </View>
            ) : (
              <FlatList
                data={balances}
                keyExtractor={(item, idx) => `${item.symbol}-${item.id || ''}-${idx}`}
                renderItem={({ item }) => (
                  <View style={[styles.searchRow, { borderBottomColor: theme.colors.border }]}>
                    <View style={styles.assetInfoRow}>
                      <CoinImage
                        uri={item.image}
                        style={styles.coinImage}
                        placeholderColor={theme.colors.border}
                        symbol={item.symbol}
                      />
                      <View>
                        <Typography variant="body2" style={{ color: theme.colors.text }}>{item.symbol}</Typography>
                        <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>{item.name}</Typography>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                        <Typography variant="body2" style={{ color: theme.colors.text }}>{formatUSDNum(item.usd)}</Typography>
                        <Typography variant="caption" style={{ color: theme.colors.textSecondary, marginLeft: 2, marginBottom: 1 }}>USD</Typography>
                      </View>
                    </View>
                  </View>
                )}
                keyboardDismissMode="interactive"
                keyboardShouldPersistTaps="handled"
              />
            )}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Asset picker */}
      <Modal
        visible={assetPickerVisible}
        animationType="slide"
        onRequestClose={() => setAssetPickerVisible(false)}
      >
        <SafeAreaView style={[styles.searchModalContainer, { backgroundColor: theme.colors.background }]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <View style={[styles.searchBarWrap, { borderBottomColor: theme.colors.border }]}>
              <Typography variant="h3" style={{ color: theme.colors.text }}>
                {modalType.charAt(0).toUpperCase() + modalType.slice(1)} — Select asset
              </Typography>
            </View>

            <FlatList
              data={balancesWithPct}
              keyExtractor={(item, idx) => `${item.symbol}-${item.id || ''}-${idx}`}
              renderItem={({ item }) => (
                <Pressable onPress={() => openTradeModal(item)}>
                  <View style={[styles.searchRow, { borderBottomColor: theme.colors.border }]}>
                    <View style={styles.assetInfoRow}>
                      <CoinImage
                        uri={item.image}
                        style={styles.coinImage}
                        placeholderColor={theme.colors.border}
                        symbol={item.symbol}
                      />
                      <View>
                        <Typography variant="body2" style={{ color: theme.colors.text }}>{item.symbol}</Typography>
                        <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>{item.name}</Typography>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                        <Typography variant="body2" style={{ color: theme.colors.text }}>{formatUSDNum(item.usd)}</Typography>
                        <Typography variant="caption" style={{ color: theme.colors.textSecondary, marginLeft: 2, marginBottom: 1 }}>USD</Typography>
                      </View>
                    </View>
                  </View>
                </Pressable>
              )}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
            />

            <View style={styles.cancelContainer}>
              <Pressable
                onPress={() => {
                  setAssetPickerVisible(false);
                }}
                style={styles.cancelBtn}
              >
                <Typography variant="body1" style={{ color: theme.colors.primary }}>Cancel</Typography>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Trade modal */}
      <Modal visible={tradeModalVisible} transparent animationType="slide" onRequestClose={() => setTradeModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBg}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.modalScroll}
          >
            <View style={[styles.modal, { backgroundColor: theme.colors.surface }]}>
              <Typography variant="h2" style={{ color: theme.colors.text, textAlign: 'center' }}>
                {modalType.charAt(0).toUpperCase() + modalType.slice(1)} {selectedAsset?.symbol}
              </Typography>

              {selectedAsset?.symbol && (
                <Typography variant="body2" style={{ color: theme.colors.textSecondary, marginVertical: 8, textAlign: 'center' }}>
                  Balance: {selectedAsset?.balance >= 1 ? selectedAsset.balance.toFixed(2) : selectedAsset?.balance?.toFixed(6)} {selectedAsset.symbol}
                </Typography>
              )}

              <Input
                placeholder={`Amount to ${modalType}`}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                style={styles.modalInput}
              />

              {(modalType === 'buy' || modalType === 'sell' || modalType === 'convert') && Number(amount) > 0 && (
                <View style={styles.tradeSummary}>
                  <View style={styles.summaryRow}>
                    <Typography variant="body2" style={{ color: theme.colors.textSecondary }}>Price</Typography>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                      <Typography variant="body2" style={{ color: theme.colors.text }}>
                        {formatUSDNum(selectedAsset?.price ?? 0)}
                      </Typography>
                      <Typography variant="caption" style={{ color: theme.colors.textSecondary, marginLeft: 2, marginBottom: 1 }}>
                        USD
                      </Typography>
                    </View>
                  </View>
                  <View style={styles.summaryRow}>
                    <Typography variant="body2" style={{ color: theme.colors.textSecondary }}>Cost</Typography>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                      <Typography variant="body2" style={{ color: theme.colors.text }}>
                        {formatUSDNum((selectedAsset?.price ?? 0) * Number(amount || 0))}
                      </Typography>
                      <Typography variant="caption" style={{ color: theme.colors.textSecondary, marginLeft: 2, marginBottom: 1 }}>
                        USD
                      </Typography>
                    </View>
                  </View>
                  <View style={styles.summaryRow}>
                    <Typography variant="body2" style={{ color: theme.colors.textSecondary }}>Fee ({(feeRate * 100).toFixed(2)}%)</Typography>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                      <Typography variant="body2" style={{ color: theme.colors.text }}>
                        {formatUSDNum(((selectedAsset?.price ?? 0) * Number(amount || 0)) * feeRate)}
                      </Typography>
                      <Typography variant="caption" style={{ color: theme.colors.textSecondary, marginLeft: 2, marginBottom: 1 }}>
                        USD
                      </Typography>
                    </View>
                  </View>
                </View>
              )}

              <View style={styles.modalActions}>
                <Button title="Cancel" variant="outline" onPress={() => setTradeModalVisible(false)} style={styles.modalBtn} titleStyle={styles.compactBtnTextTiny} />
                <Button
                  title={modalType.charAt(0).toUpperCase() + modalType.slice(1)}
                  onPress={handleAction}
                  style={styles.modalBtn}
                  titleStyle={styles.compactBtnTextTiny}
                />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingBottom: 24 },

  topCard: { marginHorizontal: 20, marginTop: 20, paddingVertical: 16, paddingHorizontal: 12, borderRadius: 16 },

  ringWrap: { alignSelf: 'center', width: CHART_SIZE, height: CHART_SIZE, marginBottom: 12 },
  ringCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CHART_SIZE,
    height: CHART_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  assetsRowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  hideBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },

  quickActionsWrapper: {
    marginTop: 8,
    marginHorizontal: 20,
  },
  quickRowScrollable: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  quickActionCol: {
    alignItems: 'center',
    width: 70,
    marginHorizontal: 6,
  },
  quickActionCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },

  sortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 20,
  },
  sortBtn: { paddingVertical: 6, paddingHorizontal: 8 },

  yourCryptoHeader: {
    marginHorizontal: 20,
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },

  assetRowList: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assetInfoRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  coinImage: { width: 30, height: 30, borderRadius: 15, marginRight: 10 },
  assetText: { flexShrink: 1 },
  assetValuesRight: { alignItems: 'flex-end', minWidth: 120 },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalScroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16 },
  modal: { borderRadius: 16, padding: 20 },
  modalInput: { width: '100%', marginVertical: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  modalBtn: { flex: 0.48 },
  compactBtnTextTiny: { fontSize: 12 },
  tradeSummary: { marginTop: 8, marginBottom: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },

  searchModalContainer: { flex: 1 },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBarInput: { flex: 1 },
  cancelContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelBtn: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  searchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchPlaceholder: {
    flex: 1,
    justifyContent: 'center',
  },
});
