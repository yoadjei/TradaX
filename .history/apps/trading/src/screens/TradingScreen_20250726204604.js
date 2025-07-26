// apps/trading/src/screens/TradingScreen.js
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

import { WalletProvider, useWallet } from '../../../wallet/src/stores/WalletContext';
import PriceChart from '../components/PriceChart';

const Divider = ({ style }) => (
  <View style={[{ height: 1, width: '100%', backgroundColor: '#E0E0E0' }, style]} />
);

const RANGES = [
  { key: '1D', days: 1 },
  { key: '1W', days: 7 },
  { key: '1M', days: 30 },
  { key: '3M', days: 90 },
  { key: '6M', days: 180 },
  { key: '1Y', days: 365 },
];

const CHART_TYPES = ['candle', 'line'];

function TradingScreenInner() {
  const { theme } = useTheme();
  const {
    balances,
    usdBalance,
    fetchBalances,
    trade: tradeWallet,
  } = useWallet();

  const [selectedAsset, setSelectedAsset] = useState('bitcoin');
  const [assetData, setAssetData] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [tradeType, setTradeType] = useState('buy');
  const [orderType, setOrderType] = useState('market');
  const [amount, setAmount] = useState('');
  const [limitPrice, setLimitPrice] = useState('');

  const [feeRate] = useState(0.001);

  const [range, setRange] = useState(RANGES[1]);
  const [chartType, setChartType] = useState('candle');

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
    fetchBalances();
  }, [selectedAsset, range]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [coin, history] = await Promise.all([
        cryptoApi.getCoinDetails(selectedAsset),
        cryptoApi.getPriceHistory(selectedAsset, range.days),
      ]);
      setAssetData(coin);
      setPriceHistory(history ?? []);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to fetch trading data' });
    } finally {
      setLoading(false);
    }
  };

  const openTradeModal = (type) => {
    setTradeType(type);
    setOrderType('market');
    setAmount('');
    setLimitPrice('');
    setModalVisible(true);
  };

  const closeTradeModal = () => {
    setModalVisible(false);
    setAmount('');
    setLimitPrice('');
  };

  const numericAmount = useMemo(() => parseFloat(amount) || 0, [amount]);
  const numericLimitPrice = useMemo(() => parseFloat(limitPrice) || 0, [limitPrice]);
  const executionPrice = useMemo(
    () => (orderType === 'market' ? parseFloat(assetData?.priceUsd ?? 0) : numericLimitPrice),
    [orderType, assetData, numericLimitPrice]
  );

  const cost = useMemo(() => executionPrice * numericAmount, [executionPrice, numericAmount]);
  const fee = useMemo(() => cost * feeRate, [cost, feeRate]);
  const totalWithFee = useMemo(() => (tradeType === 'buy' ? cost + fee : cost - fee), [tradeType, cost, fee]);

  const userAssetBalance = useMemo(() => {
    const sym = assetData?.symbol?.toUpperCase?.() ?? '';
    const found = balances.find(b => (b.symbol || b.asset || '').toUpperCase() === sym);
    return Number(found?.balance ?? 0);
  }, [balances, assetData]);

  const canAfford = useMemo(() => {
    if (tradeType === 'buy') return usdBalance >= totalWithFee;
    return userAssetBalance >= numericAmount;
  }, [tradeType, usdBalance, totalWithFee, userAssetBalance, numericAmount]);

  const fillPercent = (pct) => {
    if (!assetData) return;
    if (tradeType === 'buy') {
      const maxQty = usdBalance / executionPrice;
      setAmount((maxQty * pct).toFixed(6));
    } else {
      setAmount((userAssetBalance * pct).toFixed(6));
    }
  };

  const handleTrade = async () => {
    if (!numericAmount || numericAmount <= 0) {
      Toast.show({ type: 'error', text1: 'Invalid Amount', text2: 'Please enter a valid amount' });
      return;
    }
    if (orderType === 'limit' && (!numericLimitPrice || numericLimitPrice <= 0)) {
      Toast.show({ type: 'error', text1: 'Invalid Price', text2: 'Please enter a valid limit price' });
      return;
    }
    if (!canAfford) {
      Toast.show({
        type: 'error',
        text1: 'Insufficient Balance',
        text2: 'You do not have enough balance to complete this trade',
      });
      return;
    }

    try {
      await tradeWallet({
        asset: assetData.symbol.toLowerCase(),
        type: tradeType,
        orderType,
        amount: numericAmount,
        price: executionPrice,
        fee,
        total: totalWithFee,
      });

      Toast.show({
        type: 'success',
        text1: 'Trade Submitted',
        text2: `${orderType.toUpperCase()} ${tradeType.toUpperCase()} ${numericAmount} ${assetData.symbol}`,
      });
      closeTradeModal();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Trade Failed', text2: error?.message || 'Trade could not be completed' });
    }
  };

  if (loading || !assetData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Typography variant="body1" style={{ color: theme.colors.text }}>Loading trading data...</Typography>
        </View>
      </SafeAreaView>
    );
  }

  const priceChange24h = formatPercentageChange(assetData.changePercent24Hr ?? 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Card style={[styles.selectorCard, { backgroundColor: theme.colors.surface }]}>
          <Typography variant="body2" style={[styles.selectorTitle, { color: theme.colors.textSecondary }]}>
            Select Asset to Trade
          </Typography>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.assetButtons}>
              {availableAssets.map(asset => (
                <Button
                  key={asset.id}
                  title={asset.symbol}
                  variant={selectedAsset === asset.id ? 'solid' : 'outline'}
                  onPress={() => setSelectedAsset(asset.id)}
                  style={styles.assetButton}
                />
              ))}
            </View>
          </ScrollView>
        </Card>

        <Card style={[styles.priceCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.priceHeader}>
            <View>
              <Typography variant="h1" style={{ color: theme.colors.text }}>
                {formatPrice(assetData.priceUsd)}
              </Typography>
              <Typography
                variant="body2"
                style={{ color: priceChange24h.isPositive ? theme.colors.success : theme.colors.error }}
              >
                {priceChange24h.text} (24h)
              </Typography>
            </View>
            <View style={styles.assetInfo}>
              <Image source={{ uri: assetData.image }} style={styles.assetImage} />
              <Typography variant="h3" style={{ color: theme.colors.text }}>
                {assetData.symbol.toUpperCase()}
              </Typography>
              <Typography variant="body2" style={{ color: theme.colors.textSecondary }}>
                {assetData.name}
              </Typography>
            </View>
          </View>
        </Card>

        <Card style={[styles.chartCard, { backgroundColor: theme.colors.surface }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chartTypeToggle}
            keyboardShouldPersistTaps="handled"
          >
            {CHART_TYPES.map(ct => (
              <Button
                key={ct}
                title={ct === 'candle' ? 'Candle' : 'Line'}
                size="sm"
                variant={chartType === ct ? 'solid' : 'outline'}
                onPress={() => setChartType(ct)}
                style={styles.chartTypeButton}
              />
            ))}
          </ScrollView>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rangeToggle}
            keyboardShouldPersistTaps="handled"
          >
            {RANGES.map(r => (
              <Button
                key={r.key}
                title={r.key}
                size="sm"
                variant={r.key === range.key ? 'solid' : 'outline'}
                onPress={() => setRange(r)}
                style={styles.rangeButton}
              />
            ))}
          </ScrollView>

          <PriceChart
            data={priceHistory}
            height={Dimensions.get('window').width * 0.6}
            type={chartType}
          />
        </Card>

        <Card style={[styles.tradingCard, { backgroundColor: theme.colors.surface }]}>
          <Typography variant="h3" style={[styles.tradingTitle, { color: theme.colors.text }]}>
            Quick Trade
          </Typography>
          <View style={styles.tradingButtons}>
            <Button
              title={`Buy ${assetData.symbol.toUpperCase()}`}
              onPress={() => openTradeModal('buy')}
              style={[styles.tradeButton, { backgroundColor: theme.colors.success }]}
            />
            <Button
              title={`Sell ${assetData.symbol.toUpperCase()}`}
              onPress={() => openTradeModal('sell')}
              style={[styles.tradeButton, { backgroundColor: theme.colors.error }]}
            />
          </View>
        </Card>

        <Card style={[styles.statsCard, { backgroundColor: theme.colors.surface }]}>
          <Typography variant="h3" style={[styles.statsTitle, { color: theme.colors.text }]}>Market Statistics</Typography>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>Market Cap</Typography>
              <Typography variant="body1" style={{ color: theme.colors.text }}>{formatLargeNumber(assetData.marketCapUsd)}</Typography>
            </View>
            <View style={styles.statItem}>
              <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>24h Volume</Typography>
              <Typography variant="body1" style={{ color: theme.colors.text }}>{formatLargeNumber(assetData.volumeUsd24Hr)}</Typography>
            </View>
            <View style={styles.statItem}>
              <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>All Time High</Typography>
              <Typography variant="body1" style={{ color: theme.colors.text }}>{formatPrice(assetData.ath)}</Typography>
            </View>
            <View style={styles.statItem}>
              <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>All Time Low</Typography>
              <Typography variant="body1" style={{ color: theme.colors.text }}>{formatPrice(assetData.atl)}</Typography>
            </View>
          </View>
        </Card>
      </ScrollView>

      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={closeTradeModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.modalScrollContent}
          >
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
              <Typography variant="h2" style={[styles.modalTitle, { color: theme.colors.text }]}>
                {tradeType === 'buy' ? 'Buy' : 'Sell'} {assetData.symbol.toUpperCase()}
              </Typography>
              <Typography variant="body2" style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
                Spot Price: {formatPrice(assetData.priceUsd)}
              </Typography>

              <View style={styles.orderTypeRow}>
                <Button
                  title="Market"
                  variant={orderType === 'market' ? 'solid' : 'outline'}
                  style={styles.orderTypeBtn}
                  onPress={() => setOrderType('market')}
                />
                <Button
                  title="Limit"
                  variant={orderType === 'limit' ? 'solid' : 'outline'}
                  style={styles.orderTypeBtn}
                  onPress={() => setOrderType('limit')}
                />
              </View>

              {orderType === 'limit' && (
                <Input
                  placeholder="Limit price (USD)"
                  value={limitPrice}
                  onChangeText={setLimitPrice}
                  keyboardType="numeric"
                  style={styles.input}
                />
              )}

              <Input
                placeholder={`Amount of ${assetData.symbol.toUpperCase()}`}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                style={styles.input}
              />

              <View style={styles.percentRow}>
                {[0.25, 0.5, 0.75, 1].map(p => (
                  <Button
                    key={p}
                    title={`${p * 100}%`}
                    variant="outline"
                    size="sm"
                    onPress={() => fillPercent(p)}
                    style={styles.percentBtn}
                  />
                ))}
              </View>

              <View style={styles.balanceRow}>
                <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>
                  USD Balance: {formatPrice(usdBalance)}
                </Typography>
                <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>
                  {assetData.symbol.toUpperCase()} Balance: {userAssetBalance.toFixed(6)}
                </Typography>
              </View>

              {numericAmount > 0 && (
                <>
                  <Divider style={{ marginVertical: 12, backgroundColor: theme.colors.border }} />
                  <View style={styles.summaryRow}>
                    <Typography variant="body2" style={{ color: theme.colors.textSecondary }}>Price</Typography>
                    <Typography variant="body2" style={{ color: theme.colors.text }}>
                      {formatPrice(executionPrice)}
                    </Typography>
                  </View>
                  <View style={styles.summaryRow}>
                    <Typography variant="body2" style={{ color: theme.colors.textSecondary }}>Cost</Typography>
                    <Typography variant="body2" style={{ color: theme.colors.text }}>
                      {formatPrice(cost)}
                    </Typography>
                  </View>
                  <View style={styles.summaryRow}>
                    <Typography variant="body2" style={{ color: theme.colors.textSecondary }}>Fee ({(feeRate * 100).toFixed(2)}%)</Typography>
                    <Typography variant="body2" style={{ color: theme.colors.text }}>
                      {formatPrice(fee)}
                    </Typography>
                  </View>
                  <View style={styles.summaryRow}>
                    <Typography variant="body1" style={{ color: theme.colors.text }}>Total</Typography>
                    <Typography variant="body1" style={{ color: tradeType === 'buy' ? theme.colors.error : theme.colors.success }}>
                      {formatPrice(totalWithFee)}
                    </Typography>
                  </View>
                </>
              )}

              {!canAfford && numericAmount > 0 && (
                <Typography variant="caption" style={{ color: theme.colors.error, marginTop: 8 }}>
                  Insufficient balance
                </Typography>
              )}

              <View style={styles.modalButtons}>
                <Button title="Cancel" variant="outline" onPress={closeTradeModal} style={styles.modalButton} />
                <Button
                  title={orderType === 'market' ? (tradeType === 'buy' ? 'Buy (Market)' : 'Sell (Market)') : (tradeType === 'buy' ? 'Buy (Limit)' : 'Sell (Limit)')}
                  onPress={handleTrade}
                  disabled={!numericAmount || !canAfford}
                  style={styles.modalButton}
                />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

export default function TradingScreen() {
  return (
    <WalletProvider>
      <TradingScreenInner />
    </WalletProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  selectorCard: { marginHorizontal: 16, marginTop: 16, padding: 12 },
  selectorTitle: { marginBottom: 8 },
  assetButtons: { flexDirection: 'row', gap: 8 },
  assetButton: { marginRight: 8 },
  priceCard: { marginHorizontal: 16, marginTop: 16, padding: 16 },
  priceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  assetInfo: { alignItems: 'center' },
  assetImage: { width: 40, height: 40, borderRadius: 20, marginBottom: 4 },
  chartCard: { marginHorizontal: 16, marginTop: 16, padding: 12 },
  chartTypeToggle: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  chartTypeButton: { marginRight: 8 },
  rangeToggle: { flexDirection: 'row', gap: 8, marginVertical: 8 },
  rangeButton: { marginRight: 8 },
  tradingCard: { marginHorizontal: 16, marginTop: 16, padding: 16 },
  tradingTitle: { marginBottom: 12 },
  tradingButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  tradeButton: { flex: 1 },
  statsCard: { marginHorizontal: 16, marginTop: 16, padding: 16, marginBottom: 20 },
  statsTitle: { marginBottom: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statItem: { width: '48%', marginBottom: 12 },
  modalContainer: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 16 },
  modalScrollContent: { flexGrow: 1, justifyContent: 'center' },
  modalContent: { borderRadius: 12, padding: 16 },
  modalTitle: { textAlign: 'center', marginBottom: 4 },
  modalSubtitle: { textAlign: 'center', marginBottom: 16 },
  orderTypeRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 12, gap: 8 },
  orderTypeBtn: { flex: 1 },
  input: { marginBottom: 12 },
  percentRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  percentBtn: { flex: 1, marginHorizontal: 2 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, gap: 8 },
  modalButton: { flex: 1 },
});
