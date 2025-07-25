import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { Typography, Card, Button, Input } from '@tradax/ui';
import { useTheme } from '@tradax/theme';
import { walletApi } from '@tradax/utils';

const coinImages = {
  BTC: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
  ETH: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  USDT: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
  BNB: 'https://assets.coingecko.com/coins/images/825/small/binance-coin-logo.png',
};

export default function WalletScreen() {
  const { theme } = useTheme();

  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('deposit');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [amount, setAmount] = useState('');
  const [totalValue, setTotalValue] = useState(0);

  useEffect(() => fetchBalances(), []);

  const fetchBalances = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const { balances: data, totalValue: total } = await walletApi.getBalances();
      setBalances(data);
      setTotalValue(total);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.message || 'Failed to fetch data' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => fetchBalances(true);

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

  const handleTransaction = async () => {
    if (!amount || isNaN(amount) || +amount <= 0) {
      return Toast.show({ type: 'error', text1: 'Invalid Amount', text2: 'Enter a valid value.' });
    }
    try {
      if (modalType === 'deposit') {
        await walletApi.deposit({ asset: selectedAsset.symbol, amount: +amount });
      } else {
        await walletApi.withdraw({ asset: selectedAsset.symbol, amount: +amount });
      }
      Toast.show({ type: 'success', text1: `${modalType.charAt(0).toUpperCase() + modalType.slice(1)} Successful` });
      closeModal();
      fetchBalances();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.message || 'Operation failed' });
    }
  };

  const formatNum = (n) => n >= 1 ? n.toFixed(2) : n.toFixed(6);

  const renderItem = ({ item }) => {
    const usd = item.balance * item.price;
    return (
      <Card style={[styles.assetCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.assetRow}>
          <View style={styles.assetInfoRow}>
            <Image source={{ uri: coinImages[item.symbol] }} style={styles.coinImage} />
            <View style={styles.assetText}>
              <Typography variant="h3" style={{ color: theme.colors.text }}>{item.symbol}</Typography>
              <Typography variant="body2" style={{ color: theme.colors.textSecondary }}>{item.name}</Typography>
            </View>
          </View>
          <View style={styles.assetValues}>
            <Typography variant="h3" style={{ color: theme.colors.text, textAlign: 'right' }}>
              {formatNum(item.balance)}
            </Typography>
            <Typography variant="body2" style={{ color: theme.colors.textSecondary, textAlign: 'right' }}>
              ${formatNum(usd)}
            </Typography>
          </View>
        </View>
        <View style={styles.assetActions}>
          <Button title="Deposit" variant="outline" onPress={() => openModal('deposit', item)} style={styles.actionBtn} />
          <Button title="Withdraw" variant="outline" onPress={() => openModal('withdraw', item)} style={styles.actionBtn} disabled={item.balance <= 0} />
        </View>
      </Card>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Typography variant="body1" style={{ color: theme.colors.text, alignSelf: 'center', marginTop: 50 }}>
          Loading wallet...
        </Typography>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        ListHeaderComponent={
          <View>
            <Card style={[styles.topCard, { backgroundColor: theme.colors.surface }]}>
              <Typography variant="body2" style={{ color: theme.colors.textSecondary }}>Total Portfolio Value</Typography>
              <Typography variant="h1" style={{ color: theme.colors.text, marginTop: 4 }}>
                ${formatNum(totalValue)}
              </Typography>
              <View style={[styles.portfolioBar, { backgroundColor: theme.colors.primary }]} />
            </Card>
            <Typography variant="h2" style={{ color: theme.colors.text, padding: 20 }}>Your Assets</Typography>
          </View>
        }
        data={balances}
        keyExtractor={item => item.symbol}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        showsVerticalScrollIndicator={false}
      />

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalBg}>
          <View style={[styles.modal, { backgroundColor: theme.colors.surface }]}>
            <Typography variant="h2" style={{ color: theme.colors.text }}>
              {modalType.charAt(0).toUpperCase() + modalType.slice(1)} {selectedAsset?.symbol}
            </Typography>
            <Typography variant="body2" style={{ color: theme.colors.textSecondary, marginVertical: 12 }}>
              Balance: {selectedAsset ? formatNum(selectedAsset.balance) : '--'} {selectedAsset?.symbol}
            </Typography>
            <Input placeholder={`Amount to ${modalType}`} value={amount} onChangeText={setAmount} keyboardType="numeric" style={styles.modalInput} />
            <View style={styles.modalActions}>
              <Button title="Cancel" variant="outline" onPress={closeModal} style={styles.modalBtn} />
              <Button title={modalType.charAt(0).toUpperCase() + modalType.slice(1)} onPress={handleTransaction} style={styles.modalBtn} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topCard: { margin: 20, padding: 24, borderRadius: 12 },
  portfolioBar: { height: 4, borderRadius: 2, marginTop: 12, alignSelf: 'stretch' },
  assetCard: { marginHorizontal: 20, marginVertical: 8, padding: 16, borderRadius: 8 },
  assetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  assetInfoRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  coinImage: { width: 32, height: 32, borderRadius: 16, marginRight: 12 },
  assetText: { flexShrink: 1 },
  assetValues: { width: 120 },
  assetActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  actionBtn: { flex: 0.48 },
  list: { paddingBottom: 20 },
  modalBg: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modal: { width: '90%', padding: 24, borderRadius: 12 },
  modalInput: { width: '100%', marginBottom: 24 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between' },
  modalBtn: { flex: 0.48 },
});
