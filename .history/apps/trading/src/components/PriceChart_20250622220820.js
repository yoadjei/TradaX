import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { VictoryLine, VictoryChart, VictoryTheme, VictoryArea } from 'victory-native';
import { useTheme } from '@tradax/theme';
import { Typography } from '@tradax/ui';

const { width } = Dimensions.get('window');

export default function PriceChart({ data = [] }) {
  const { theme } = useTheme();

  // Transform data for Victory charts
  const chartData = data.map((item, index) => ({
    x: index,
    y: item.price || item[1] || 0, // Handle different data formats
  }));

  if (!chartData.length) {
    return (
      <View style={styles.emptyContainer}>
        <Typography variant="body2" style={{ color: theme.colors.textSecondary }}>
          No chart data available
        </Typography>
      </View>
    );
  }

  // Calculate price change for gradient color
  const firstPrice = chartData[0]?.y || 0;
  const lastPrice = chartData[chartData.length - 1]?.y || 0;
  const isPositive = lastPrice >= firstPrice;

  return (
    <View style={styles.container}>
      <VictoryChart
        theme={VictoryTheme.material}
        width={width - 80}
        height={200}
        padding={{ left: 50, top: 20, right: 50, bottom: 40 }}
        domainPadding={{ x: 10 }}
      >
        <VictoryArea
          data={chartData}
          style={{
            data: {
              fill: isPositive ? theme.colors.success : theme.colors.error,
              fillOpacity: 0.1,
              stroke: isPositive ? theme.colors.success : theme.colors.error,
              strokeWidth: 2,
            },
          }}
          animate={{
            duration: 1000,
            onLoad: { duration: 500 },
          }}
        />
        <VictoryLine
          data={chartData}
          style={{
            data: {
              stroke: isPositive ? theme.colors.success : theme.colors.error,
              strokeWidth: 2,
            },
          }}
          animate={{
            duration: 1000,
            onLoad: { duration: 500 },
          }}
        />
      </VictoryChart>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
