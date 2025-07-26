// screens/WalletScreen.js
import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { Typography, Card, Button, Input } from '@tradax/ui';
import { useTheme } from '@tradax/theme';
import { formatPrice } from '@tradax/utils';
import { useWalletStore } from '../stores/useWalletStore';

export default function WalletScreen() {
  const { theme } = useTheme();

  const {
    balances,
    totalValue,
    usdBalance,
    loading,
    fetchBalances,
    deposit,
    withdraw,
    trade,
  } = useWalletStore();

  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('deposit'); // deposit | withdraw | buy | sell
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [amount, setAmount] = useState('');
  const [feeRate] = useState(0.001);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBalances();
    setRefreshing(false);
  };

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
        await deposit({ asset: selectedAsset.symbol, amount: numericAmount });
      } else if (modalType === 'withdraw') {
        await withdraw({ asset: selectedAsset.symbol, amount: numericAmount });
      } else if (modalType === 'buy' || modalType === 'sell') {
        const price = Number(selectedAsset.price ?? 0);
        const cost = price * numericAmount;
        const fee = cost * feeRate;
        await trade({
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
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: err?.message || 'Operation failed',
      });
    }
  };

  const formatQty = (n) => {
    const num = Number(n) || 0;
    return num >= 1 ? num.toFixed(2) : num.toFixed(6);
  };

  const renderHeader = () => (
    <View>
      <Card style={[styles.topCard, { backgroundColor: theme.colors.surface }]}>
        <Typography variant="body2" style={{ color: theme.colors.textSecondary }}>
          Total Portfolio Value
        </Typography>
        <Typography variant="h1" style={{ color: theme.colors.text, marginTop: 6 }}>
          {formatPrice(totalValue)}
        </Typography>
        <Typography variant="caption" style={{ color: theme.colors.textSecondary, marginTop: 4 }}>
          USD Balance: {formatPrice(usdBalance)}
        </Typography>
        <View style={[styles.progressTrack, { backgroundColor: theme.colors.border }]}>
          <View style={[styles.progressFill, { backgroundColor: theme.colors.primary }]} />
        </View>
      </Card>

      <Card style={[styles.quickActions, { backgroundColor: theme.colors.surface }]}>
        <Typography variant="h3" style={{ color: theme.colors.text, marginBottom: 12 }}>
          Quick Actions
        </Typography>
        <View style={styles.quickButtons}>
          <Button title="Deposit USD" onPress={() => openModal('deposit', { symbol: 'USD', balance: usdBalance })} style={styles.quickBtn} />
          <Button title="Withdraw USD" variant="outline" onPress={() => openModal('withdraw', { symbol: 'USD', balance: usdBalance })} style={styles.quickBtn} />
        </View>
      </Card>

      <Typography variant="h2" style={{ color: theme.colors.text, paddingHorizontal: 20, marginTop: 20 }}>
        Your Assets
      </Typography>
    </View>
  );

  const renderItem = ({ item }) => {
    const canWithdraw = item.balance > 0;
    const canSell = item.balance > 0;

    return (
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
              {formatQty(item.balance)}
            </Typography>
            <Typography variant="body2" style={{ color: theme.colors.textSecondary, textAlign: 'right' }}>
              {formatPrice(item.usd)}
            </Typography>
          </View>
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
        </View>

        <View style={styles.assetActionsRow}>
          <Button
            title={`Buy ${item.symbol}`}
            onPress={() => openModal('buy', item)}
            style={styles.actionBtn}
          />
          <Button
            title={`Sell ${item.symbol}`}
            variant="outline"
            disabled={!canSell}
            onPress={() => openModal('sell', item)}
            style={styles.actionBtn}
          />
        </View>
      </Card>
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
                  Balance: {selectedAsset ? formatQty(selectedAsset.balance) : '--'}{' '}
                  {selectedAsset?.symbol}
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
  progressTrack: { width: '100%', height: 6, borderRadius: 3, marginTop: 14, overflow: 'hidden' },
  progressFill: { width: '65%', height: '100%' },
  quickActions: { marginHorizontal: 20, marginTop: 16, padding: 16, borderRadius: 16 },
  quickButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  quickBtn: { flex: 0.48 },
  assetCard: { marginHorizontal: 20, marginTop: 14, padding: 16, borderRadius: 16 },
  assetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  assetInfoRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  coinImage: { width: 36, height: 36, borderRadius: 18, marginRight: 12 },
  assetText: { flexShrink: 1 },
  assetValues: { width: 120 },
  assetActionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  actionBtn: { flex: 0.48 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalScroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16 },
  modal: { borderRadius: 16, padding: 20 },
  modalInput: { width: '100%', marginVertical: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  modalBtn: { flex: 0.48 },
  tradeSummary: { marginTop: 8, marginBottom: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
});
