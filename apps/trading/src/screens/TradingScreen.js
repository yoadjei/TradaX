import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { Typography, Card, Button, Input } from '@tradax/ui';
import { useTheme } from '@tradax/theme';
import { cryptoApi, walletApi } from '@tradax/utils';
import PriceChart from '../components/PriceChart';

export default function TradingScreen() {
  const { theme } = useTheme();
  const [selectedAsset, setSelectedAsset] = useState('bitcoin');
  const [assetData, setAssetData] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [tradeType, setTradeType] = useState('buy'); // 'buy' or 'sell'
  const [amount, setAmount] = useState('');
  const [availableAssets] = useState([
    { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC' },
    { id: 'ethereum', name: 'Ethereum', symbol: 'ETH' },
    { id: 'cardano', name: 'Cardano', symbol: 'ADA' },
    { id: 'solana', name: 'Solana', symbol: 'SOL' },
  ]);

  useEffect(() => {
    fetchAssetData();
    fetchPriceHistory();
  }, [selectedAsset]);

  const fetchAssetData = async () => {
    setLoading(true);
    try {
      const data = await cryptoApi.getCoinDetails(selectedAsset);
      setAssetData(data);
    } catch (error) {
      console.error('Error fetching asset data:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to fetch asset data',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPriceHistory = async () => {
    try {
      const history = await cryptoApi.getPriceHistory(selectedAsset, 7);
      setPriceHistory(history);
    } catch (error) {
      console.error('Error fetching price history:', error);
    }
  };

  const openTradeModal = (type) => {
    setTradeType(type);
    setAmount('');
    setModalVisible(true);
  };

  const closeTradeModal = () => {
    setModalVisible(false);
    setAmount('');
  };

  const handleTrade = async () => {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Amount',
        text2: 'Please enter a valid amount',
      });
      return;
    }

    try {
      const tradeAmount = parseFloat(amount);
      const response = await walletApi.trade({
        asset: assetData.symbol.toLowerCase(),
        type: tradeType,
        amount: tradeAmount,
        price: assetData.market_data.current_price.usd,
      });

      Toast.show({
        type: 'success',
        text1: 'Trade Successful',
        text2: `${tradeType === 'buy' ? 'Bought' : 'Sold'} ${tradeAmount} ${assetData.symbol}`,
      });
      
      closeTradeModal();
    } catch (error) {
      console.error('Trade error:', error);
      Toast.show({
        type: 'error',
        text1: 'Trade Failed',
        text2: error.message || 'Trade could not be completed',
      });
    }
  };

  const formatPrice = (price) => {
    if (price >= 1) {
      return `$${price.toFixed(2)}`;
    } else {
      return `$${price.toFixed(6)}`;
    }
  };

  const formatPercentage = (percentage) => {
    const isPositive = percentage >= 0;
    return {
      text: `${isPositive ? '+' : ''}${percentage.toFixed(2)}%`,
      color: isPositive ? theme.colors.success : theme.colors.error,
    };
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Typography variant="body1" style={{ color: theme.colors.text }}>
            Loading trading data...
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  if (!assetData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Typography variant="body1" style={{ color: theme.colors.text }}>
            No data available
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  const priceChange24h = formatPercentage(
    assetData.market_data?.price_change_percentage_24h || 0
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Asset Selector */}
        <Card style={[styles.selectorCard, { backgroundColor: theme.colors.surface }]}>
          <Typography variant="body2" style={[styles.selectorTitle, { color: theme.colors.textSecondary }]}>
            Select Asset to Trade
          </Typography>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.assetButtons}>
              {availableAssets.map((asset) => (
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

        {/* Price Overview */}
        <Card style={[styles.priceCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.priceHeader}>
            <View>
              <Typography variant="h1" style={{ color: theme.colors.text }}>
                {formatPrice(assetData.market_data.current_price.usd)}
              </Typography>
              <Typography variant="body2" style={{ color: priceChange24h.color }}>
                {priceChange24h.text} (24h)
              </Typography>
            </View>
            <View style={styles.assetInfo}>
              <Typography variant="h3" style={{ color: theme.colors.text }}>
                {assetData.symbol.toUpperCase()}
              </Typography>
              <Typography variant="body2" style={{ color: theme.colors.textSecondary }}>
                {assetData.name}
              </Typography>
            </View>
          </View>
        </Card>

        {/* Price Chart */}
        <Card style={[styles.chartCard, { backgroundColor: theme.colors.surface }]}>
          <Typography variant="h3" style={[styles.chartTitle, { color: theme.colors.text }]}>
            Price Chart (7 Days)
          </Typography>
          <PriceChart data={priceHistory} />
        </Card>

        {/* Trading Actions */}
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

        {/* Market Stats */}
        <Card style={[styles.statsCard, { backgroundColor: theme.colors.surface }]}>
          <Typography variant="h3" style={[styles.statsTitle, { color: theme.colors.text }]}>
            Market Statistics
          </Typography>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>
                Market Cap
              </Typography>
              <Typography variant="body1" style={{ color: theme.colors.text }}>
                ${(assetData.market_data.market_cap.usd / 1e9).toFixed(2)}B
              </Typography>
            </View>
            <View style={styles.statItem}>
              <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>
                24h Volume
              </Typography>
              <Typography variant="body1" style={{ color: theme.colors.text }}>
                ${(assetData.market_data.total_volume.usd / 1e9).toFixed(2)}B
              </Typography>
            </View>
            <View style={styles.statItem}>
              <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>
                24h High
              </Typography>
              <Typography variant="body1" style={{ color: theme.colors.text }}>
                {formatPrice(assetData.market_data.high_24h.usd)}
              </Typography>
            </View>
            <View style={styles.statItem}>
              <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>
                24h Low
              </Typography>
              <Typography variant="body1" style={{ color: theme.colors.text }}>
                {formatPrice(assetData.market_data.low_24h.usd)}
              </Typography>
            </View>
          </View>
        </Card>
      </ScrollView>

      {/* Trade Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeTradeModal}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Typography variant="h2" style={[styles.modalTitle, { color: theme.colors.text }]}>
              {tradeType === 'buy' ? 'Buy' : 'Sell'} {assetData.symbol.toUpperCase()}
            </Typography>

            <Typography variant="body2" style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
              Current Price: {formatPrice(assetData.market_data.current_price.usd)}
            </Typography>

            <Input
              placeholder={`Amount of ${assetData.symbol.toUpperCase()}`}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              style={styles.amountInput}
            />

            {amount && !isNaN(amount) && parseFloat(amount) > 0 && (
              <Typography variant="body2" style={[styles.estimatedValue, { color: theme.colors.textSecondary }]}>
                Estimated Value: {formatPrice(parseFloat(amount) * assetData.market_data.current_price.usd)}
              </Typography>
            )}

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={closeTradeModal}
                style={styles.modalButton}
              />
              <Button
                title={tradeType === 'buy' ? 'Buy' : 'Sell'}
                onPress={handleTrade}
                style={[
                  styles.modalButton,
                  {
                    backgroundColor: tradeType === 'buy' ? theme.colors.success : theme.colors.error,
                  },
                ]}
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
  selectorCard: {
    margin: 20,
    marginBottom: 10,
    padding: 16,
  },
  selectorTitle: {
    marginBottom: 12,
  },
  assetButtons: {
    flexDirection: 'row',
  },
  assetButton: {
    marginRight: 8,
    minWidth: 60,
  },
  priceCard: {
    margin: 20,
    marginVertical: 10,
    padding: 20,
  },
  priceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assetInfo: {
    alignItems: 'flex-end',
  },
  chartCard: {
    margin: 20,
    marginVertical: 10,
    padding: 16,
  },
  chartTitle: {
    marginBottom: 16,
  },
  tradingCard: {
    margin: 20,
    marginVertical: 10,
    padding: 20,
  },
  tradingTitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  tradingButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tradeButton: {
    flex: 0.48,
  },
  statsCard: {
    margin: 20,
    marginVertical: 10,
    padding: 20,
    marginBottom: 40,
  },
  statsTitle: {
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    marginBottom: 16,
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
    marginBottom: 16,
  },
  estimatedValue: {
    marginBottom: 24,
    textAlign: 'center',
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
