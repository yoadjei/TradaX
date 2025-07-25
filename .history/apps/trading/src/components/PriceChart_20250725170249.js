import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { CandlestickChart } from 'react-native-wagmi-charts';
import { useTheme } from '@tradax/theme';

const { width } = Dimensions.get('window');

export default function PriceChart({ data }) {
  const { theme } = useTheme();

  if (!data || data.length === 0) {
    return <View style={styles.emptyContainer} />;
  }

  const candleData = data.map(item => ({
    timestamp: new Date(item.time).getTime(),
    open: parseFloat(item.open),
    high: parseFloat(item.high),
    low: parseFloat(item.low),
    close: parseFloat(item.close),
  }));

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <CandlestickChart.Provider data={candleData}>
        <CandlestickChart height={220} width={width - 40}>
          <CandlestickChart.Candles positiveColor={theme.colors.success} negativeColor={theme.colors.error} />
          <CandlestickChart.Crosshair />
        </CandlestickChart>
      </CandlestickChart.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { height: 220, justifyContent: 'center', alignItems: 'center' },
});
