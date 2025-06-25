import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { Typography, Card, Button, Input } from '@tradax/ui';
import { useTheme } from '@tradax/theme';
import { walletApi } from '@tradax/utils';

export default function WalletScreen() {
  const { theme } = useTheme();
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('deposit'); // 'deposit' or 'withdraw'
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [amount, setAmount] = useState('');
  const [totalPortfolioValue, setTotalPortfolioValue] = useState(0);

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await walletApi.getBalances();
      setBalances(data.balances || []);
      setTotalPortfolioValue(data.totalValue || 0);
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to fetch wallet data',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    fetchWalletData(true);
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

  const handleTransaction = async () => {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Amount',
        text2: 'Please enter a valid amount',
      });
      return;
    }

    try {
      if (modalType === 'deposit') {
        await walletApi.deposit({
          asset: selectedAsset.symbol,
          amount: parseFloat(amount),
        });
        Toast.show({
          type: 'success',
          text1: 'Deposit Successful',
          text2: `${amount} ${selectedAsset.symbol} deposited`,
        });
      } else {
        await walletApi.withdraw({
          asset: selectedAsset.symbol,
          amount: parseFloat(amount),
        });
        Toast.show({
          type: 'success',
          text1: 'Withdrawal Successful',
          text2: `${amount} ${selectedAsset.symbol} withdrawn`,
        });
      }
      
      closeModal();
      fetchWalletData();
    } catch (error) {
      console.error('Transaction error:', error);
      Toast.show({
        type: 'error',
        text1: 'Transaction Failed',
        text2: error.message || 'Transaction could not be completed',
      });
    }
  };

  const formatValue = (value) => {
    if (value >= 1) {
      return value.toFixed(2);
    } else {
      return value.toFixed(6);
    }
  };

  const renderAssetItem = ({ item }) => {
    const usdValue = item.balance * (item.price || 0);
    
    return (
      <Card style={[styles.assetCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.assetHeader}>
          <View style={styles.assetInfo}>
            <Typography variant="h3" style={{ color: theme.colors.text }}>
              {item.symbol}
            </Typography>
            <Typography variant="body2" style={{ color: theme.colors.textSecondary }}>
              {item.name}
            </Typography>
          </View>
          <View style={styles.balanceInfo}>
            <Typography variant="h3" style={{ color: theme.colors.text }}>
              {formatValue(item.balance)}
            </Typography>
            <Typography variant="body2" style={{ color: theme.colors.textSecondary }}>
              ${formatValue(usdValue)}
            </Typography>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <Button
            title="Deposit"
            variant="outline"
            onPress={() => openModal('deposit', item)}
            style={styles.actionButton}
          />
          <Button
            title="Withdraw"
            variant="outline"
            onPress={() => openModal('withdraw', item)}
            style={styles.actionButton}
            disabled={item.balance <= 0}
          />
        </View>
      </Card>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Typography variant="body1" style={{ color: theme.colors.text }}>
            Loading wallet data...
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Card style={[styles.portfolioCard, { backgroundColor: theme.colors.surface }]}>
        <Typography variant="body2" style={{ color: theme.colors.textSecondary }}>
          Total Portfolio Value
        </Typography>
        <Typography variant="h1" style={{ color: theme.colors.text }}>
          ${formatValue(totalPortfolioValue)}
        </Typography>
        <Typography variant="body2" style={{ color: theme.colors.success }}>
          +2.45% (24h) {/* This would come from API in real implementation */}
        </Typography>
      </Card>

      <View style={styles.sectionHeader}>
        <Typography variant="h2" style={{ color: theme.colors.text }}>
          Your Assets
        </Typography>
      </View>

      <FlatList
        data={balances}
        keyExtractor={(item) => item.symbol}
        renderItem={renderAssetItem}
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

      {/* Transaction Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Typography variant="h2" style={[styles.modalTitle, { color: theme.colors.text }]}>
              {modalType === 'deposit' ? 'Deposit' : 'Withdraw'} {selectedAsset?.symbol}
            </Typography>

            <Typography variant="body2" style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
              Current Balance: {formatValue(selectedAsset?.balance || 0)} {selectedAsset?.symbol}
            </Typography>

            <Input
              placeholder={`Amount to ${modalType}`}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              style={styles.amountInput}
            />

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={closeModal}
                style={styles.modalButton}
              />
              <Button
                title={modalType === 'deposit' ? 'Deposit' : 'Withdraw'}
                onPress={handleTransaction}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  portfolioCard: {
    margin: 20,
    padding: 24,
    alignItems: 'center',
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  listContainer: {
    padding: 20,
    paddingTop: 10,
  },
  assetCard: {
    padding: 16,
    marginBottom: 12,
  },
  assetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  assetInfo: {
    flex: 1,
  },
  balanceInfo: {
    alignItems: 'flex-end',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 0.48,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    marginBottom: 24,
    textAlign: 'center',
  },
  amountInput: {
    width: '100%',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 0.48,
  },
});
