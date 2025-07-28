import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { Typography, Button, Input } from '@tradax/ui';
import { useTheme } from '@tradax/theme';
import { formatPrice, walletApi } from '@tradax/utils';
import Toast from 'react-native-toast-message';

const { height: screenHeight } = Dimensions.get('window');

const ORDER_TYPES = [
  { key: 'market', label: 'Market' },
  { key: 'limit', label: 'Limit' },
  { key: 'stop', label: 'Stop Loss' },
];

const QUICK_AMOUNTS = [0.25, 0.5, 0.75, 1.0];

export default function TradeModal({ 
  visible, 
  onClose, 
  assetData, 
  currentPrice,
  balance = { usd: 0, assets: {} }
}) {
  const { theme } = useTheme();
  
  const [activeTab, setActiveTab] = useState('Buy');
  const [orderType, setOrderType] = useState('market');
  const [amount, setAmount] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [loading, setLoading] = useState(false);

  const isBuy = activeTab === 'Buy';
  const price = useMemo(() => {
    if (orderType === 'limit' && limitPrice) return parseFloat(limitPrice);
    return currentPrice;
  }, [orderType, limitPrice, currentPrice]);

  const numericAmount = useMemo(() => parseFloat(amount) || 0, [amount]);
  const totalCost = useMemo(() => price * numericAmount, [price, numericAmount]);
  const fee = useMemo(() => totalCost * 0.001, [totalCost]); // 0.1% fee
  const totalWithFee = useMemo(() => 
    isBuy ? totalCost + fee : totalCost - fee, 
    [isBuy, totalCost, fee]
  );

  const assetBalance = useMemo(() => {
    const symbol = assetData?.symbol?.toLowerCase() || '';
    return balance.assets?.[symbol] || 0;
  }, [balance, assetData]);

  const maxAmount = useMemo(() => {
    if (isBuy) {
      return price > 0 ? balance.usd / price : 0;
    }
    return assetBalance;
  }, [isBuy, price, balance.usd, assetBalance]);

  const canTrade = useMemo(() => {
    if (!numericAmount || numericAmount <= 0) return false;
    if (orderType === 'limit' && (!limitPrice || parseFloat(limitPrice) <= 0)) return false;
    if (orderType === 'stop' && (!stopPrice || parseFloat(stopPrice) <= 0)) return false;
    
    if (isBuy) {
      return balance.usd >= totalWithFee;
    }
    return assetBalance >= numericAmount;
  }, [numericAmount, orderType, limitPrice, stopPrice, isBuy, balance.usd, totalWithFee, assetBalance]);

  const handleQuickAmount = (percentage) => {
    const qty = maxAmount * percentage;
    setAmount(qty.toFixed(6));
  };

  const handleTrade = async () => {
    if (!canTrade) return;

    setLoading(true);
    try {
      await walletApi.trade({
        asset: assetData.symbol.toLowerCase(),
        side: activeTab.toLowerCase(),
        orderType,
        amount: numericAmount,
        price: price,
        stopPrice: orderType === 'stop' ? parseFloat(stopPrice) : undefined,
        fee,
        total: totalWithFee,
      });

      Toast.show({
        type: 'success',
        text1: 'Order Placed',
        text2: `${orderType.toUpperCase()} ${activeTab} ${numericAmount} ${assetData.symbol}`,
      });

      onClose();
      resetForm();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Trade Failed',
        text2: error?.message || 'Unable to place order',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setAmount('');
    setLimitPrice('');
    setStopPrice('');
    setOrderType('market');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!assetData) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
      presentationStyle="pageSheet"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Typography variant="body1" style={{ color: theme.colors.textSecondary }}>
                Cancel
              </Typography>
            </Pressable>
            <Typography variant="h3" style={{ color: theme.colors.text }}>
              {assetData.symbol}/USDT
            </Typography>
            <View style={styles.placeholder} />
          </View>

          {/* Current Price */}
          <View style={styles.priceHeader}>
            <Typography variant="body2" style={{ color: theme.colors.textSecondary }}>
              Last Price
            </Typography>
            <Typography variant="h2" style={{ color: theme.colors.text }}>
              {formatPrice(currentPrice)}
            </Typography>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Buy/Sell Tabs */}
            <View style={styles.tabContainer}>
              {['Buy', 'Sell'].map(tab => (
                <Pressable
                  key={tab}
                  style={[
                    styles.tab,
                    {
                      backgroundColor: activeTab === tab 
                        ? (tab === 'Buy' ? theme.colors.success : theme.colors.error) + '22'
                        : 'transparent'
                    }
                  ]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Typography
                    variant="body1"
                    style={{
                      color: activeTab === tab 
                        ? (tab === 'Buy' ? theme.colors.success : theme.colors.error)
                        : theme.colors.textSecondary,
                      fontWeight: activeTab === tab ? 'bold' : 'normal'
                    }}
                  >
                    {tab}
                  </Typography>
                </Pressable>
              ))}
            </View>

            {/* Order Type Selector */}
            <View style={styles.orderTypeContainer}>
              <Typography variant="body2" style={{ color: theme.colors.text, marginBottom: 8 }}>
                Order Type
              </Typography>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.orderTypeRow}>
                  {ORDER_TYPES.map(type => (
                    <Pressable
                      key={type.key}
                      style={[
                        styles.orderTypeButton,
                        {
                          backgroundColor: orderType === type.key 
                            ? theme.colors.primary + '22'
                            : theme.colors.surface,
                          borderColor: orderType === type.key 
                            ? theme.colors.primary
                            : theme.colors.border
                        }
                      ]}
                      onPress={() => setOrderType(type.key)}
                    >
                      <Typography
                        variant="caption"
                        style={{
                          color: orderType === type.key 
                            ? theme.colors.primary 
                            : theme.colors.textSecondary
                        }}
                      >
                        {type.label}
                      </Typography>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Price Input for Limit Orders */}
            {orderType === 'limit' && (
              <View style={styles.inputContainer}>
                <Typography variant="body2" style={{ color: theme.colors.text, marginBottom: 4 }}>
                  Limit Price (USDT)
                </Typography>
                <Input
                  value={limitPrice}
                  onChangeText={setLimitPrice}
                  placeholder={formatPrice(currentPrice)}
                  keyboardType="numeric"
                  style={[styles.input, { backgroundColor: theme.colors.surface }]}
                />
              </View>
            )}

            {/* Stop Price Input for Stop Orders */}
            {orderType === 'stop' && (
              <View style={styles.inputContainer}>
                <Typography variant="body2" style={{ color: theme.colors.text, marginBottom: 4 }}>
                  Stop Price (USDT)
                </Typography>
                <Input
                  value={stopPrice}
                  onChangeText={setStopPrice}
                  placeholder={formatPrice(currentPrice * 0.95)}
                  keyboardType="numeric"
                  style={[styles.input, { backgroundColor: theme.colors.surface }]}
                />
              </View>
            )}

            {/* Amount Input */}
            <View style={styles.inputContainer}>
              <Typography variant="body2" style={{ color: theme.colors.text, marginBottom: 4 }}>
                Amount ({assetData.symbol})
              </Typography>
              <Input
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                keyboardType="numeric"
                style={[styles.input, { backgroundColor: theme.colors.surface }]}
              />
            </View>

            {/* Quick Amount Buttons */}
            <View style={styles.quickAmountContainer}>
              {QUICK_AMOUNTS.map(pct => (
                <Button
                  key={pct}
                  title={`${(pct * 100).toFixed(0)}%`}
                  variant="outline"
                  size="sm"
                  onPress={() => handleQuickAmount(pct)}
                  style={[styles.quickButton, { borderColor: theme.colors.border }]}
                  titleStyle={{ fontSize: 12 }}
                />
              ))}
            </View>

            {/* Balance Info */}
            <View style={styles.balanceContainer}>
              <View style={styles.balanceRow}>
                <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>
                  Available USDT
                </Typography>
                <Typography variant="caption" style={{ color: theme.colors.text }}>
                  {formatPrice(balance.usd)}
                </Typography>
              </View>
              <View style={styles.balanceRow}>
                <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>
                  Available {assetData.symbol}
                </Typography>
                <Typography variant="caption" style={{ color: theme.colors.text }}>
                  {assetBalance.toFixed(6)}
                </Typography>
              </View>
            </View>

            {/* Order Summary */}
            {numericAmount > 0 && (
              <View style={[styles.summaryContainer, { backgroundColor: theme.colors.surface }]}>
                <Typography variant="body2" style={{ color: theme.colors.text, marginBottom: 8 }}>
                  Order Summary
                </Typography>
                
                <View style={styles.summaryRow}>
                  <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>
                    Price
                  </Typography>
                  <Typography variant="caption" style={{ color: theme.colors.text }}>
                    {formatPrice(price)}
                  </Typography>
                </View>
                
                <View style={styles.summaryRow}>
                  <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>
                    Amount
                  </Typography>
                  <Typography variant="caption" style={{ color: theme.colors.text }}>
                    {numericAmount} {assetData.symbol}
                  </Typography>
                </View>
                
                <View style={styles.summaryRow}>
                  <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>
                    Total Cost
                  </Typography>
                  <Typography variant="caption" style={{ color: theme.colors.text }}>
                    {formatPrice(totalCost)}
                  </Typography>
                </View>
                
                <View style={styles.summaryRow}>
                  <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>
                    Trading Fee (0.1%)
                  </Typography>
                  <Typography variant="caption" style={{ color: theme.colors.text }}>
                    {formatPrice(fee)}
                  </Typography>
                </View>
                
                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Typography variant="body2" style={{ color: theme.colors.text, fontWeight: 'bold' }}>
                    Total
                  </Typography>
                  <Typography 
                    variant="body2" 
                    style={{ 
                      color: isBuy ? theme.colors.error : theme.colors.success,
                      fontWeight: 'bold'
                    }}
                  >
                    {formatPrice(totalWithFee)}
                  </Typography>
                </View>

                {!canTrade && numericAmount > 0 && (
                  <Typography variant="caption" style={{ color: theme.colors.error, marginTop: 8 }}>
                    {isBuy ? 'Insufficient USDT balance' : `Insufficient ${assetData.symbol} balance`}
                  </Typography>
                )}
              </View>
            )}
          </ScrollView>

          {/* Action Button */}
          <View style={styles.actionContainer}>
            <Button
              title={loading ? 'Placing Order...' : `${activeTab} ${assetData.symbol}`}
              onPress={handleTrade}
              disabled={!canTrade || loading}
              style={[
                styles.actionButton,
                {
                  backgroundColor: canTrade 
                    ? (isBuy ? theme.colors.success : theme.colors.error)
                    : theme.colors.textSecondary + '44'
                }
              ]}
              titleStyle={{ 
                color: canTrade ? '#fff' : theme.colors.textSecondary,
                fontWeight: 'bold',
                fontSize: 16
              }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: screenHeight * 0.9,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  closeButton: {
    paddingVertical: 4,
  },
  placeholder: {
    width: 60,
  },
  priceHeader: {
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  orderTypeContainer: {
    marginTop: 24,
  },
  orderTypeRow: {
    flexDirection: 'row',
  },
  orderTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  inputContainer: {
    marginTop: 16,
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  quickAmountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  quickButton: {
    flex: 1,
    paddingVertical: 8,
  },
  balanceContainer: {
    marginTop: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#333',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  summaryContainer: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  actionContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  actionButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});