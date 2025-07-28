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
import TradeModal from '../components/TradeModal';
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

    const wallets = Array.isArray(balRaw.balances) ? balRaw.balances : [];
    const usdWallet = wallets.find(w => w.getAsset?.toUpperCase
      ? w.getAsset().toUpperCase() === 'USD'
      : w.asset === 'USD'
    );
    const usd = usdWallet ? Number(usdWallet.balance) : 0;
    const assets = wallets.reduce((map, w) => {
      const sym = (w.getAsset?.() || w.asset || '').toLowerCase();
      map[sym] = Number(w.getBalance?.() ?? w.balance);
      return map;
    }, {});
    setBalance({ usd, assets });

    setAssetData(coin);
    setPriceHistory(history ?? []);
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
      await fetchAll(); // Refresh balances and user trades
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
        {/* Pair selector like OKX top bar */}
        <Card style={[styles.selectorCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.pairHeader}>
            <View style={styles.assetInfoRow}>
              <Image source={{ uri: assetData.image }} style={styles.assetIcon} />
              <View>
                <Typography variant="h3" style={{ color: theme.colors.text }}>
                  {assetData.symbol?.toUpperCase()}/USD
                </Typography>
                <Typography
                  variant="caption"
                  style={{ color: priceChange24h.isPositive ? theme.colors.success : theme.colors.error }}
                >
                  {priceChange24h.text}
                </Typography>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.assetButtons}>
                {availableAssets.map(a => (
                  <Button
                    key={a.id}
                    title={a.symbol}
                    variant={selectedAsset === a.id ? 'solid' : 'outline'}
                    size="sm"
                    onPress={() => setSelectedAsset(a.id)}
                    style={styles.assetButton}
                    titleStyle={{ fontSize: 12 }}
                  />
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.priceBlock}>
          <Typography variant="h1" style={{ color: theme.colors.text }}>
              {formatPrice(price)}
            </Typography>
            <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>
              {assetData.name}
            </Typography>
          </View>

          <View style={styles.statsInline}>
            <StatItem label="24h High" value={formatPrice(assetData.high24h)} theme={theme} />
            <StatItem label="24h Low" value={formatPrice(assetData.low24h)} theme={theme} />
            <StatItem label="24h Vol" value={formatLargeNumber(assetData.volumeUsd24Hr)} theme={theme} />
          </View>
        </Card>

        {/* Chart + ranges/types like OKX */}
        <Card style={[styles.chartCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.segmentRow}>
            {CHART_TYPES.map(ct => (
              <Pressable
                key={ct}
                onPress={() => setChartType(ct)}
                style={[
                  styles.segmentBtn,
                  chartType === ct && { backgroundColor: theme.colors.primary + '22' },
                ]}
              >
                <Typography
                  variant="body2"
                  style={{ color: chartType === ct ? theme.colors.primary : theme.colors.textSecondary }}
                >
                  {ct === 'candle' ? 'Candle' : 'Line'}
                </Typography>
              </Pressable>
            ))}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rangeRow}
            keyboardShouldPersistTaps="handled"
          >
            {RANGES.map(r => (
              <Pressable
                key={r.key}
                onPress={() => setRange(r)}
                style={[
                  styles.rangeBtn,
                  r.key === range.key && { backgroundColor: theme.colors.primary + '22' },
                ]}
              >
                <Typography
                  variant="caption"
                  style={{ color: r.key === range.key ? theme.colors.primary : theme.colors.textSecondary }}
                >
                  {r.key}
                </Typography>
              </Pressable>
            ))}
          </ScrollView>

          <PriceChart
            data={priceHistory}
            height={Dimensions.get('window').width * 0.6}
            type={chartType}
          />
        </Card>

        {/* Order book + recent trades block like OKX */}
        <Card style={[styles.bookCard, { backgroundColor: theme.colors.surface }]}>
          <Typography variant="h3" style={{ color: theme.colors.text, marginBottom: 8 }}>
            Order Book
          </Typography>

          <View style={styles.orderBookContainer}>
            <View style={styles.orderCol}>
              <FlatList
                data={orderBook.asks.slice(0, 10).reverse()}
                keyExtractor={(item, idx) => `ask-${idx}`}
                renderItem={({ item }) => renderOrderBookRow(item, 'ask', maxAsk)}
                scrollEnabled={false}
              />
            </View>

            <View style={styles.midPrice}>
              <Typography variant="body2" style={{ color: theme.colors.text }}>
                {formatPrice(price)}
              </Typography>
            </View>

            <View style={styles.orderCol}>
              <FlatList
                data={orderBook.bids.slice(0, 10)}
                keyExtractor={(item, idx) => `bid-${idx}`}
                renderItem={({ item }) => renderOrderBookRow(item, 'bid', maxBid)}
                scrollEnabled={false}
              />
            </View>
          </View>
        </Card>

        <Card style={[styles.tradesCard, { backgroundColor: theme.colors.surface }]}>
          <Typography variant="h3" style={{ color: theme.colors.text, marginBottom: 8 }}>
            Recent Trades
          </Typography>
          {recentTrades.slice(0, 20).map((t, idx) => {
            const sideBuy = (t.side || '').toLowerCase() === 'buy';
            return (
              <View style={styles.tradeRow} key={idx}>
                <Typography variant="caption" style={{ color: sideBuy ? theme.colors.success : theme.colors.error, width: 80 }}>
                  {formatPrice(t.price || price)}
                </Typography>
                <Typography variant="caption" style={{ color: theme.colors.textSecondary, flex: 1, textAlign: 'right' }}>
                  {Number(t.qty || t.amount || 0).toFixed(4)}
                </Typography>
              </View>
            );
          })}
        </Card>

        {/* Buy / Sell panel like OKX (inside modal for clarity, but you can anchor it bottom) */}
        <Card style={[styles.quickTradeCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.buySellTabs}>
            {ORDER_TABS.map(t => (
              <Pressable
                key={t}
                onPress={() => setActiveOrderSide(t)}
                style={[
                  styles.buySellTab,
                  activeOrderSide === t && { backgroundColor: (t === 'Buy' ? theme.colors.success : theme.colors.error) + '22' },
                ]}
              >
                <Typography
                  variant="body2"
                  style={{ color: activeOrderSide === t ? (t === 'Buy' ? theme.colors.success : theme.colors.error) : theme.colors.textSecondary }}
                >
                  {t}
                </Typography>
              </Pressable>
            ))}
          </View>

          <View style={styles.orderTypeRow}>
            {ORDER_TYPES.map(ot => (
              <Pressable
                key={ot}
                onPress={() => setOrderType(ot)}
                style={[
                  styles.orderTypeChip,
                  orderType === ot && { backgroundColor: theme.colors.primary + '22' },
                ]}
              >
                <Typography
                  variant="caption"
                  style={{ color: orderType === ot ? theme.colors.primary : theme.colors.textSecondary }}
                >
                  {ot === 'market' ? 'Market' : ot === 'limit' ? 'Limit' : 'Stop'}
                </Typography>
              </Pressable>
            ))}
          </View>

          {orderType === 'stop' && (
            <Input
              placeholder="Trigger price (USD)"
              value={triggerPrice}
              onChangeText={setTriggerPrice}
              keyboardType="numeric"
              style={styles.input}
            />
          )}

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
            placeholder={`Amount (${assetData.symbol?.toUpperCase()})`}
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
                titleStyle={{ fontSize: 12 }}
              />
            ))}
          </View>

          <View style={styles.balanceRow}>
            <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>
              USD: {formatPrice(balance.usd)}
            </Typography>
            <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>
              {assetData.symbol?.toUpperCase()}: {userAssetBalance.toFixed(6)}
            </Typography>
          </View>

          {numericAmount > 0 && (
            <View style={{ marginTop: 8 }}>
              <View style={styles.summaryRow}>
                <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>Price</Typography>
                <Typography variant="caption" style={{ color: theme.colors.text }}>
                  {formatPrice(executionPrice)}
                </Typography>
              </View>
              <View style={styles.summaryRow}>
                <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>Cost</Typography>
                <Typography variant="caption" style={{ color: theme.colors.text }}>
                  {formatPrice(cost)}
                </Typography>
              </View>
              <View style={styles.summaryRow}>
                <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>Fee ({(feeRate * 100).toFixed(2)}%)</Typography>
                <Typography variant="caption" style={{ color: theme.colors.text }}>
                  {formatPrice(fee)}
                </Typography>
              </View>
              <View style={styles.summaryRow}>
                <Typography variant="body2" style={{ color: theme.colors.text }}>Total</Typography>
                <Typography
                  variant="body2"
                  style={{ color: activeOrderSide === 'Buy' ? theme.colors.error : theme.colors.success }}
                >
                  {formatPrice(totalWithFee)}
                </Typography>
              </View>
              {!canAfford && (
                <Typography variant="caption" style={{ color: theme.colors.error, marginTop: 4 }}>
                  Insufficient balance
                </Typography>
              )}
            </View>
          )}

          <Button
            title={`${activeOrderSide} ${assetData.symbol?.toUpperCase()}`}
            onPress={handleTrade}
            disabled={!numericAmount || !canAfford}
            style={[
              styles.submitBtn,
              { backgroundColor: activeOrderSide === 'Buy' ? theme.colors.success : theme.colors.error },
            ]}
          />
          <Button
            title="Advanced (Full Form)"
            variant="outline"
            onPress={() => openTradeModal(activeOrderSide)}
            style={styles.advancedBtn}
            titleStyle={{ fontSize: 12 }}
          />
        </Card>
      </ScrollView>

      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={closeTradeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalScrollContent}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
              <Typography variant="h2" style={{ color: theme.colors.text, textAlign: 'center' }}>
                {activeOrderSide} {assetData.symbol?.toUpperCase()}
              </Typography>
              <Typography variant="body2" style={{ color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 12 }}>
                Spot Price: {formatPrice(price)}
              </Typography>

              <View style={styles.orderTypeRow}>
                {ORDER_TYPES.map(ot => (
                  <Button
                    key={ot}
                    title={ot === 'market' ? 'Market' : ot === 'limit' ? 'Limit' : 'Stop'}
                    variant={orderType === ot ? 'solid' : 'outline'}
                    style={styles.orderTypeBtn}
                    onPress={() => setOrderType(ot)}
                  />
                ))}
              </View>

              {orderType === 'stop' && (
                <Input
                  placeholder="Trigger price (USD)"
                  value={triggerPrice}
                  onChangeText={setTriggerPrice}
                  keyboardType="numeric"
                  style={styles.input}
                />
              )}

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
                placeholder={`Amount (${assetData.symbol?.toUpperCase()})`}
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
                  USD: {formatPrice(balance.usd)}
                </Typography>
                <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>
                  {assetData.symbol?.toUpperCase()}: {userAssetBalance.toFixed(6)}
                </Typography>
              </View>

              {numericAmount > 0 && (
                <>
                  <View style={[styles.summaryRow, { marginTop: 12 }]}>
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
                    <Typography
                      variant="body1"
                      style={{ color: activeOrderSide === 'Buy' ? theme.colors.error : theme.colors.success }}
                    >
                      {formatPrice(totalWithFee)}
                    </Typography>
                  </View>
                  {!canAfford && (
                    <Typography variant="caption" style={{ color: theme.colors.error, marginTop: 4 }}>
                      Insufficient balance
                    </Typography>
                  )}
                </>
              )}

              <View style={styles.modalButtons}>
                <Button title="Cancel" variant="outline" onPress={closeTradeModal} style={styles.modalButton} />
                <Button
                  title={`${activeOrderSide} ${assetData.symbol?.toUpperCase()}`}
                  onPress={handleTrade}
                  disabled={!numericAmount || !canAfford}
                  style={[
                    styles.modalButton,
                    { backgroundColor: activeOrderSide === 'Buy' ? theme.colors.success : theme.colors.error },
                  ]}
                />
              </View>
            </View>
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