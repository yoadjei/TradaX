import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Modal,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Typography, Card, Button, Input } from '@tradax/ui';
import { useTheme } from '@tradax/theme';
import {
  cryptoApi,
  walletApi,
  formatPrice,
  formatPercentageChange,
  formatLargeNumber,
} from '@tradax/utils';
import PriceChart from '../components/PriceChart';

const RANGES = [
  { key: '1D', days: 1 },
  { key: '1W', days: 7 },
  { key: '1M', days: 30 },
  { key: '3M', days: 90 },
  { key: '6M', days: 180 },
  { key: '1Y', days: 365 },
];

const CHART_TYPES = ['candle', 'line'];
const ORDER_TABS = ['Buy', 'Sell'];
const ORDER_TYPES = ['market', 'limit', 'stop'];

export default function TradingScreen() {
  const { theme } = useTheme();

  const [selectedAsset, setSelectedAsset] = useState('bitcoin');
  const [assetData, setAssetData] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
  const [recentTrades, setRecentTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  const [range, setRange] = useState(RANGES[1]);
  const [chartType, setChartType] = useState('candle');

  const [activeOrderSide, setActiveOrderSide] = useState('Buy');
  const [orderType, setOrderType] = useState('market');
  const [amount, setAmount] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [triggerPrice, setTriggerPrice] = useState('');

  const [balance, setBalance] = useState({ usd: 0, assets: {} });
  const [feeRate] = useState(0.001);

  const [modalVisible, setModalVisible] = useState(false);

  const [availableAssets] = useState([
    { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png' },
    { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', image: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png' },
    { id: 'tether', name: 'Tether', symbol: 'USDT', image: 'https://assets.coingecko.com/coins/images/325/large/Tether-logo.png' },
    { id: 'ripple', name: 'XRP', symbol: 'XRP', image: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png' },
    { id: 'binancecoin', name: 'BNB', symbol: 'BNB', image: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png' },
    { id: 'solana', name: 'Solana', symbol: 'SOL', image: 'https://assets.coingecko.com/coins/images/4128/large/solana.png' },
    { id: 'usd-coin', name: 'USD Coin', symbol: 'USDC', image: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png' },
    { id: 'tron', name: 'TRX', symbol: 'TRX', image: 'https://assets.coingecko.com/coins/images/1094/large/tron-logo.png' },
    { id: 'dogecoin', name: 'Dogecoin', symbol: 'DOGE', image: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png' },
    { id: 'staked-ether', name: 'Staked ETH', symbol: 'STETH', image: 'https://assets.coingecko.com/coins/images/13442/large/steth_logo.png' },
  ]);

  useEffect(() => {
    fetchAll();
  }, [selectedAsset, range]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [coin, history, balRaw, book, trades] = await Promise.all([
        cryptoApi.getCoinDetails(selectedAsset),
        cryptoApi.getPriceHistory(selectedAsset, range.days),
        walletApi.getBalances(),
        cryptoApi.getOrderBook?.(selectedAsset) ?? { bids: [], asks: [] },
        walletApi.getUserTrades?.(selectedAsset) ?? [],
      ]);

      setAssetData(coin);
      setPriceHistory(history ?? []);

      const wallets = Array.isArray(balRaw.balances) ? balRaw.balances : [];
      const usdWallet = wallets.find(w => w.asset === 'USD');
      const usd = usdWallet ? Number(usdWallet.balance) : 0;
      const assets = wallets.reduce((map, w) => {
        map[w.asset.toLowerCase()] = Number(w.balance);
        return map;
      }, {});
      setBalance({ usd, assets });

      setOrderBook({
        bids: Array.isArray(book?.bids) ? book.bids : [],
        asks: Array.isArray(book?.asks) ? book.asks : [],
      });
      setRecentTrades(Array.isArray(trades) ? trades.slice(0, 30) : []);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to fetch trading data' });
    } finally {
      setLoading(false);
    }
  };

  const price = useMemo(() => Number(assetData?.priceUsd ?? 0), [assetData]);
  const priceChange24h = formatPercentageChange(assetData?.changePercent24Hr ?? 0);

  const numericAmount = useMemo(() => parseFloat(amount) || 0, [amount]);
  const numericLimitPrice = useMemo(() => parseFloat(limitPrice) || 0, [limitPrice]);
  const numericTriggerPrice = useMemo(() => parseFloat(triggerPrice) || 0, [triggerPrice]);

  const executionPrice = useMemo(() => {
    if (orderType === 'market') return price;
    return numericLimitPrice || price;
  }, [orderType, price, numericLimitPrice]);

  const cost = useMemo(() => executionPrice * numericAmount, [executionPrice, numericAmount]);
  const fee = useMemo(() => cost * feeRate, [cost, feeRate]);
  const totalWithFee = useMemo(() => (activeOrderSide === 'Buy' ? cost + fee : cost - fee), [activeOrderSide, cost, fee]);

  const userAssetBalance = useMemo(() => {
    const symbol = assetData?.symbol?.toLowerCase?.() ?? '';
    return balance.assets?.[symbol] ?? 0;
  }, [balance, assetData]);

  const canAfford = useMemo(() => {
    if (activeOrderSide === 'Buy') return balance.usd >= totalWithFee;
    return userAssetBalance >= numericAmount;
  }, [activeOrderSide, balance.usd, totalWithFee, userAssetBalance, numericAmount]);

  const fillPercent = (pct) => {
    if (activeOrderSide === 'Buy') {
      const maxQty = price > 0 ? balance.usd / executionPrice : 0;
      setAmount((maxQty * pct).toFixed(6));
    } else {
      setAmount((userAssetBalance * pct).toFixed(6));
    }
  };

  const openTradeModal = (side) => {
    setActiveOrderSide(side);
    setOrderType('market');
    setAmount('');
    setLimitPrice('');
    setTriggerPrice('');
    setModalVisible(true);
  };

  const closeTradeModal = () => {
    setModalVisible(false);
    setAmount('');
    setLimitPrice('');
    setTriggerPrice('');
  };

  const handleTrade = async () => {
    if (!numericAmount || numericAmount <= 0) {
      return Toast.show({ type: 'error', text1: 'Invalid Amount', text2: 'Please enter a valid amount' });
    }
    if (orderType === 'limit' && (!numericLimitPrice || numericLimitPrice <= 0)) {
      return Toast.show({ type: 'error', text1: 'Invalid Price', text2: 'Enter a valid limit price' });
    }
    if (orderType === 'stop' && (!numericTriggerPrice || numericTriggerPrice <= 0)) {
      return Toast.show({ type: 'error', text1: 'Invalid Trigger', text2: 'Enter a valid trigger price' });
    }
    if (!canAfford) {
      return Toast.show({ type: 'error', text1: 'Insufficient Balance' });
    }

    try {
      await walletApi.trade({
        asset: assetData.symbol.toLowerCase(),
        type: activeOrderSide.toLowerCase(),
        orderType,
        amount: numericAmount,
        price: executionPrice,
        trigger: orderType === 'stop' ? numericTriggerPrice : undefined,
        fee,
        total: totalWithFee,
      });

      Toast.show({
        type: 'success',
        text1: 'Order Submitted',
        text2: `${orderType.toUpperCase()} ${activeOrderSide.toUpperCase()} ${numericAmount} ${assetData.symbol}`,
      });
      closeTradeModal();
      await fetchAll();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Trade Failed', text2: e?.message || 'Could not submit order' });
    }
  };

  const renderOrderBookRow = (row, type, maxTotal) => {
    const [p, q] = row;
    const total = Number(q);
    const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
    const colorBg = type === 'ask' ? theme.colors.error + '22' : theme.colors.success + '22';
    return (
      <View style={styles.obRow}>
        <View style={[styles.obDepth, { width: `${pct}%`, backgroundColor: colorBg }]} />
        <Typography variant="caption" style={{ color: type === 'ask' ? theme.colors.error : theme.colors.success, width: 80 }}>
          {formatPrice(p)}
        </Typography>
        <Typography variant="caption" style={{ color: theme.colors.textSecondary, flex: 1, textAlign: 'right' }}>
          {Number(q).toFixed(4)}
        </Typography>
      </View>
    );
  };

  const maxAsk = useMemo(() => Math.max(...orderBook.asks.map(a => Number(a[1]) || 0), 0), [orderBook]);
  const maxBid = useMemo(() => Math.max(...orderBook.bids.map(b => Number(b[1]) || 0), 0), [orderBook]);

  if (loading || !assetData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.center}>
          <Typography variant="body1" style={{ color: theme.colors.text }}>
            Loading trading data...
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Pair selector */}        
        {/* ... rest of UI ... */}
      </ScrollView>
      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={closeTradeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalScrollContent}>
            {/* Modal Content */}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function StatItem({ label, value, theme }) {
  return (
    <View style={styles.statInlineItem}>
      <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>
        {label}
      </Typography>
      <Typography variant="body2" style={{ color: theme.colors.text }}>
        {value}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  selectorCard: { marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 16 },
  pairHeader: { marginBottom: 12 },
  assetInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  assetIcon: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
  assetButtons: { flexDirection: 'row', alignItems: 'center', paddingTop: 4, paddingBottom: 4 },
  assetButton: { marginRight: 6, minHeight: 28, paddingVertical: 2, paddingHorizontal: 8 },

  priceBlock: { marginTop: 4 },
  statsInline: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  statInlineItem: { flex: 1 },

  chartCard: { marginHorizontal: 16, marginTop: 16, padding: 12, borderRadius: 16 },
  segmentRow: { flexDirection: 'row', borderRadius: 10, overflow: 'hidden' },
  segmentBtn: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  rangeRow: { flexDirection: 'row', marginTop: 8 },
  rangeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    marginRight: 6,
  },

  bookCard: { marginHorizontal: 16, marginTop: 16, padding: 12, borderRadius: 16 },
  orderBookContainer: { flexDirection: 'row', alignItems: 'flex-start' },
  orderCol: { flex: 1 },
  midPrice: { width: 80, alignItems: 'center', justifyContent: 'center' },
  obRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    overflow: 'hidden',
  },
  obDepth: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
  },

  tradesCard: { marginHorizontal: 16, marginTop: 16, padding: 12, borderRadius: 16 },
  tradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },

  quickTradeCard: { marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 16 },
  buySellTabs: {
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
  },
  buySellTab: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  orderTypeRow: { flexDirection: 'row', marginTop: 8, marginBottom: 8 },
  orderTypeChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    marginRight: 6,
  },

  input: { marginTop: 8, marginBottom: 8 },
  percentRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  percentBtn: { flex: 1, marginHorizontal: 2 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
  submitBtn: { marginTop: 12 },
  advancedBtn: { marginTop: 8 },

  modalContainer: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 16 },
  modalScrollContent: { flexGrow: 1, justifyContent: 'center' },
  modalContent: { borderRadius: 12, padding: 16 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, gap: 8 },
  modalButton: { flex: 1 },
});
