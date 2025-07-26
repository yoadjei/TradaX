// screens/WalletScreen.js
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Modal,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Typography, Card, Button, Input } from '@tradax/ui';
import { useTheme } from '@tradax/theme';
import { walletApi, formatPrice } from '@tradax/utils';

export default function WalletScreen() {
  const { theme } = useTheme();

  const [serverBalances, setServerBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [hideBalances, setHideBalances] = useState(false);
  const [activeTab, setActiveTab] = useState('spot');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('usd');
  const [sortDir, setSortDir] = useState('desc');

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('deposit');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [amount, setAmount] = useState('');
  const [totalValue, setTotalValue] = useState(0);
  const [feeRate] = useState(0.001);

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
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await walletApi.getBalances();
        if (!cancelled) {
          setServerBalances(Array.isArray(res?.balances) ? res.balances : []);
          setTotalValue(Number(res?.totalValue) || 0);
        }
      } catch (e) {
        if (!cancelled) {
          Toast.show({ type: 'error', text1: 'Error', text2: e?.message ?? 'Failed to fetch data' });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await walletApi.getBalances();
      setServerBalances(Array.isArray(res?.balances) ? res.balances : []);
      setTotalValue(Number(res?.totalValue) || 0);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: e?.message ?? 'Failed to refresh' });
    } finally {
      setRefreshing(false);
    }
  };

  const bySymbol = useMemo(() => {
    const map = {};
    serverBalances.forEach(b => {
      const sym = (b.symbol || b.asset || '').toUpperCase();
      if (sym) map[sym] = b;
    });
    return map;
  }, [serverBalances]);

  const balances = useMemo(() => {
    const list = availableAssets.map(a => {
      const sym = a.symbol.toUpperCase();
      const srv = bySymbol[sym] || {};
      const balance = Number(srv.balance ?? 0);
      const price = Number(srv.price ?? 0);
      const usd = balance * price;
      return {
        symbol: sym,
        name: a.name,
        image: a.image,
        balance,
        price,
        usd,
        percent: totalValue > 0 ? (usd / totalValue) * 100 : 0,
      };
    });
    const filtered = search
      ? list.filter(i => i.symbol.toLowerCase().includes(search.toLowerCase()) || i.name.toLowerCase().includes(search.toLowerCase()))
      : list;
    const sorted = [...filtered].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'symbol') return a.symbol.localeCompare(b.symbol) * dir;
      if (sortKey === 'balance') return (a.balance - b.balance) * dir;
      return (a.usd - b.usd) * dir;
    });
    return sorted;
  }, [availableAssets, bySymbol, totalValue, search, sortKey, sortDir]);

  const openModal = (type, asset) => {
    setModalType(type);
    setSelectedAsset(asset);
    setAmount('');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedAsset(null);
    setAmount('');
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
      } else if (modalType === 'buy' || modalType === 'sell') {
        const price = Number(selectedAsset.price ?? 0);
        const cost = price * numericAmount;
        const fee = cost * feeRate;
        await walletApi.trade({
          asset: selectedAsset.symbol.toLowerCase(),
          type: modalType === 'buy' ? 'buy' : 'sell',
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
      closeModal();
      onRefresh();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err?.message || 'Operation failed',
      });
    }
  };

  const formatQty = n => {
    const num = Number(n) || 0;
    return num >= 1 ? num.toFixed(2) : num.toFixed(6);
  };

  const mask = v => (hideBalances ? '•••••' : v);

  const renderHeader = () => (
    <View>
      <Card style={[styles.topCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.topRow}>
          <Typography variant="body2" style={{ color: theme.colors.textSecondary }}>
            Total Portfolio Value
          </Typography>
          <Pressable onPress={() => setHideBalances(!hideBalances)}>
            <Typography variant="body2" style={{ color: theme.colors.textSecondary }}>
              {hideBalances ? '👁️‍🗨️' : '👁️'}
            </Typography>
          </Pressable>
        </View>
        <Typography variant="h1" style={{ color: theme.colors.text, marginTop: 6 }}>
          {mask(formatPrice(totalValue))}
        </Typography>

        <View style={styles.pnlRow}>
          <Typography variant="body2" style={{ color: theme.colors.textSecondary }}>
            24h PnL
          </Typography>
          <Typography variant="body2" style={{ color: theme.colors.success, marginLeft: 8 }}>
            --
          </Typography>
        </View>

        <View style={[styles.progressTrack, { backgroundColor: theme.colors.border }]}>
          <View style={[styles.progressFill, { backgroundColor: theme.colors.primary }]} />
        </View>

        <View style={styles.quickButtonsRow}>
          <Button title="Deposit" onPress={() => openModal('deposit', { symbol: 'USD', balance: 0 })} style={styles.quickBtn4} />
          <Button title="Withdraw" variant="outline" onPress={() => openModal('withdraw', { symbol: 'USD', balance: 0 })} style={styles.quickBtn4} />
          <Button title="Buy Crypto" variant="outline" onPress={() => {}} style={styles.quickBtn4} />
          <Button title="Transfer" variant="outline" onPress={() => {}} style={styles.quickBtn4} />
        </View>
      </Card>

      <Card style={[styles.tabsCard, { backgroundColor: theme.colors.surface }]}>
        <View style={[styles.tabs, { backgroundColor: theme.colors.surface }]}>
          <Pressable style={[styles.tabItem, activeTab === 'spot' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }]} onPress={() => setActiveTab('spot')}>
            <Typography variant="body1" style={{ color: activeTab === 'spot' ? theme.colors.primary : theme.colors.textSecondary }}>Spot</Typography>
          </Pressable>
          <Pressable style={[styles.tabItem, activeTab === 'funding' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }]} onPress={() => setActiveTab('funding')}>
            <Typography variant="body1" style={{ color: activeTab === 'funding' ? theme.colors.primary : theme.colors.textSecondary }}>Funding</Typography>
          </Pressable>
          <Pressable style={[styles.tabItem, activeTab === 'earn' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }]} onPress={() => setActiveTab('earn')}>
          <Typography variant="body1" style={{ color: activeTab === 'earn' ? theme.colors.primary : theme.colors.textSecondary }}>Earn</Typography>
          </Pressable>
        </View>
        <Input
          placeholder="Search assets"
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />

        <View style={styles.sortRow}>
          <Pressable style={styles.sortBtn} onPress={() => { setSortKey('symbol'); setSortDir(sortKey === 'symbol' && sortDir === 'desc' ? 'asc' : 'desc'); }}>
            <Typography variant="body2" style={{ color: theme.colors.textSecondary }}>Symbol {sortKey === 'symbol' ? (sortDir === 'desc' ? '↓' : '↑') : ''}</Typography>
          </Pressable>
          <Pressable style={styles.sortBtn} onPress={() => { setSortKey('balance'); setSortDir(sortKey === 'balance' && sortDir === 'desc' ? 'asc' : 'desc'); }}>
            <Typography variant="body2" style={{ color: theme.colors.textSecondary }}>Amount {sortKey === 'balance' ? (sortDir === 'desc' ? '↓' : '↑') : ''}</Typography>
          </Pressable>
          <Pressable style={styles.sortBtn} onPress={() => { setSortKey('usd'); setSortDir(sortKey === 'usd' && sortDir === 'desc' ? 'asc' : 'desc'); }}>
            <Typography variant="body2" style={{ color: theme.colors.textSecondary }}>Value {sortKey === 'usd' ? (sortDir === 'desc' ? '↓' : '↑') : ''}</Typography>
          </Pressable>
        </View>
      </Card>

      <Typography variant="h2" style={{ color: theme.colors.text, paddingHorizontal: 20, marginTop: 16 }}>
        Your Assets
      </Typography>
    </View>
  );

  const renderItem = ({ item }) => {
    const canWithdraw = item.balance > 0;
    const canSell = item.balance > 0;

    return (
      <Pressable onPress={() => {}} style={{ width: '100%' }}>
        <Card style={[styles.assetCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.assetRow}>
            <View style={styles.assetInfoRow}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.coinImage} />
              ) : (
                <View style={[styles.coinImage, { backgroundColor: theme.colors.border }]} />
              )}
              <View style={styles.assetText}>
                <Typography variant="h3" style={{ color: theme.colors.text }}>
                  {item.symbol}
                </Typography>
                <Typography variant="body2" style={{ color: theme.colors.textSecondary }}>
                  {item.name}
                </Typography>
              </View>
            </View>

            <View style={styles.assetValues}>
              <Typography variant="h3" style={{ color: theme.colors.text, textAlign: 'right' }}>
                {mask(formatQty(item.balance))}
              </Typography>
              <Typography variant="body2" style={{ color: theme.colors.textSecondary, textAlign: 'right' }}>
                {mask(formatPrice(item.usd))}
              </Typography>
            </View>
          </View>

          <View style={[styles.percentBar, { backgroundColor: theme.colors.border }]}>
            <View style={[styles.percentFill, { width: `${item.percent.toFixed(2)}%`, backgroundColor: theme.colors.primary }]} />
          </View>

          <View style={styles.assetActionsRow}>
            <Button
              title="Deposit"
              variant="outline"
              onPress={() => openModal('deposit', item)}
              style={styles.actionBtn}
            />
            <Button
              title="Withdraw"
              variant="outline"
              disabled={!canWithdraw}
              onPress={() => openModal('withdraw', item)}
              style={styles.actionBtn}
            />
            <Button
              title={`Buy`}
              onPress={() => openModal('buy', item)}
              style={styles.actionBtn}
            />
            <Button
              title={`Sell`}
              variant="outline"
              disabled={!canSell}
              onPress={() => openModal('sell', item)}
              style={styles.actionBtn}
            />
          </View>
        </Card>
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
      <FlatList
        ListHeaderComponent={renderHeader}
        data={balances}
        keyExtractor={(item, idx) => item.symbol || String(idx)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        showsVerticalScrollIndicator={false}
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

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
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

              {selectedAsset?.symbol !== 'USD' && (
                <Typography variant="body2" style={{ color: theme.colors.textSecondary, marginVertical: 8, textAlign: 'center' }}>
                  Balance: {selectedAsset ? formatQty(selectedAsset.balance) : '--'} {selectedAsset?.symbol}
                </Typography>
              )}

              <Input
                placeholder={`Amount to ${modalType}`}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                style={styles.modalInput}
              />

              {(modalType === 'buy' || modalType === 'sell') && Number(amount) > 0 && (
                <View style={styles.tradeSummary}>
                  <View style={styles.summaryRow}>
                    <Typography variant="body2" style={{ color: theme.colors.textSecondary }}>Price</Typography>
                    <Typography variant="body2" style={{ color: theme.colors.text }}>
                      {formatPrice(selectedAsset?.price ?? 0)}
                    </Typography>
                  </View>
                  <View style={styles.summaryRow}>
                    <Typography variant="body2" style={{ color: theme.colors.textSecondary }}>Cost</Typography>
                    <Typography variant="body2" style={{ color: theme.colors.text }}>
                      {formatPrice((selectedAsset?.price ?? 0) * Number(amount || 0))}
                    </Typography>
                  </View>
                  <View style={styles.summaryRow}>
                    <Typography variant="body2" style={{ color: theme.colors.textSecondary }}>Fee ({(feeRate * 100).toFixed(2)}%)</Typography>
                    <Typography variant="body2" style={{ color: theme.colors.text }}>
                      {formatPrice(((selectedAsset?.price ?? 0) * Number(amount || 0)) * feeRate)}
                    </Typography>
                  </View>
                </View>
              )}

              <View style={styles.modalActions}>
                <Button title="Cancel" variant="outline" onPress={closeModal} style={styles.modalBtn} />
                <Button
                  title={modalType.charAt(0).toUpperCase() + modalType.slice(1)}
                  onPress={handleAction}
                  style={styles.modalBtn}
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
  topCard: { marginHorizontal: 20, marginTop: 20, padding: 24, borderRadius: 16 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pnlRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  progressTrack: { width: '100%', height: 6, borderRadius: 3, marginTop: 14, overflow: 'hidden' },
  progressFill: { width: '65%', height: '100%' },
  quickButtonsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  quickBtn4: { flex: 0.24 },
  tabsCard: { marginHorizontal: 20, marginTop: 16, padding: 12, borderRadius: 16 },
  tabs: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  searchInput: { marginTop: 4 },
  sortRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  sortBtn: { paddingVertical: 6, paddingHorizontal: 8 },
  assetCard: { marginHorizontal: 20, marginTop: 14, padding: 16, borderRadius: 16 },
  assetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  assetInfoRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  coinImage: { width: 36, height: 36, borderRadius: 18, marginRight: 12 },
  assetText: { flexShrink: 1 },
  assetValues: { width: 140 },
  percentBar: { width: '100%', height: 4, borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  percentFill: { height: '100%' },
  assetActionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, flexWrap: 'wrap' },
  actionBtn: { flex: 0.48, marginTop: 6 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalScroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16 },
  modal: { borderRadius: 16, padding: 20 },
  modalInput: { width: '100%', marginVertical: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  modalBtn: { flex: 0.48 },
  tradeSummary: { marginTop: 8, marginBottom: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
});
