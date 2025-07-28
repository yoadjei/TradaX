import React, { memo, useMemo, useState, useRef, useEffect } from 'react';
import { View, Animated, PanGestureHandler, State } from 'react-native';
import Svg, { Line, Rect, Polyline, Text, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '@tradax/theme';

function PriceChart({ 
  data = [], 
  height = 220, 
  type = 'candle', 
  showGrid = true,
  showPriceLabels = true,
  showVolume = false,
  animated = true,
  theme: propTheme,
  onPriceChange,
  selectedTimeRange = '1D',
  crosshairEnabled = true,
  showLastPrice = true,
  style
}) {
  const contextTheme = useTheme();
  const theme = propTheme || contextTheme?.theme || contextTheme;
  
  const [crosshair, setCrosshair] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 0, height });
  const animatedValue = useRef(new Animated.Value(0)).current;
  
  const parsed = useMemo(() => {
    if (!data || !data.length) return { candles: [], line: [], volume: [] };

    // Detect candle structure
    const looksLikeCandle = !!data[0]?.open && !!data[0]?.close && !!data[0]?.high && !!data[0]?.low;

    if (looksLikeCandle) {
      const candles = data.map((c, i) => ({
        time: c.time ?? Date.now() - (data.length - i) * 60000,
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
        volume: Number(c.volume ?? Math.random() * 1000000),
      }));
      
      const volume = candles.map(c => c.volume);
      const line = candles.map(c => c.close);
      
      return { candles, line, volume };
    }

    // fallback: line points
    const line = data.map((p, i) => {
      if (Array.isArray(p)) return { value: Number(p[1]), time: p[0] || Date.now() - (data.length - i) * 60000 };
      if (typeof p === 'number') return { value: Number(p), time: Date.now() - (data.length - i) * 60000 };
      return { value: Number(p.price ?? p.value ?? 0), time: p.time || Date.now() - (data.length - i) * 60000 };
    });

    // synthesize candles from line (enhanced approximation)
    const candles = line.map((item, i) => {
      const v = item.value;
      const prev = i === 0 ? v : line[i - 1].value;
      const next = i === line.length - 1 ? v : line[i + 1].value;
      
      const open = prev;
      const close = v;
      const volatility = Math.abs(v - prev) / prev * 2 || 0.02;
      const high = Math.max(open, close, next) * (1 + volatility * Math.random());
      const low = Math.min(open, close, next) * (1 - volatility * Math.random());
      
      return { 
        time: item.time, 
        open, 
        high, 
        low, 
        close, 
        volume: Math.random() * 1000000 * (1 + volatility) 
      };
    });

    const volume = candles.map(c => c.volume);
    const lineValues = line.map(item => item.value);

    return { candles, line: lineValues, volume };
  }, [data]);

  // Enhanced min/max calculation with padding
  const { min, max, volumeMax } = useMemo(() => {
    let nums = [];
    if (type === 'candle') {
      nums = parsed.candles.flatMap(c => [c.low, c.high]);
    } else {
      nums = parsed.line;
    }
    
    if (!nums.length) return { min: 0, max: 100, volumeMax: 1000 };
    
    const mn = Math.min(...nums);
    const mx = Math.max(...nums);
    const range = mx - mn;
    const padding = range * 0.05; // Reduced padding for better chart utilization
    
    const volumeMax = Math.max(...parsed.volume) || 1000;
    
    return { 
      min: mn - padding, 
      max: mx + padding, 
      volumeMax 
    };
  }, [parsed, type]);

  const range = useMemo(() => (max - min) || 1, [max, min]);

  // Animation effect
  useEffect(() => {
    if (animated && parsed.candles.length > 0) {
      animatedValue.setValue(0);
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 800,
        useNativeDriver: false,
      }).start();
    }
  }, [parsed, animated, animatedValue]);

  // Price change callback
  useEffect(() => {
    if (onPriceChange && parsed.candles.length > 0) {
      const currentPrice = parsed.candles[parsed.candles.length - 1].close;
      const previousPrice = parsed.candles.length > 1 ? parsed.candles[parsed.candles.length - 2].close : currentPrice;
      const change = currentPrice - previousPrice;
      const changePercent = (change / previousPrice) * 100;
      
      onPriceChange({
        current: currentPrice,
        previous: previousPrice,
        change,
        changePercent,
        isUp: change >= 0
      });
    }
  }, [parsed, onPriceChange]);

  const handleLayout = (event) => {
    const { width } = event.nativeEvent.layout;
    setDimensions({ width, height });
  };

  if (dimensions.width === 0) {
    return (
      <View 
        style={[{ height }, style]} 
        onLayout={handleLayout}
      />
    );
  }

  return (
    <View style={[{ height }, style]}>
      <InnerChart
        width={dimensions.width}
        height={height}
        theme={theme}
        showGrid={showGrid}
        showPriceLabels={showPriceLabels}
        showVolume={showVolume}
        parsed={parsed}
        type={type}
        min={min}
        max={max}
        range={range}
        volumeMax={volumeMax}
        crosshair={crosshair}
        setCrosshair={setCrosshair}
        crosshairEnabled={crosshairEnabled}
        showLastPrice={showLastPrice}
        selectedTimeRange={selectedTimeRange}
        animatedValue={animated ? animatedValue : null}
      />
    </View>
  );
}

const InnerChart = memo(function InnerChart({
  width,
  height,
  theme,
  showGrid,
  showPriceLabels,
  showVolume,
  parsed,
  type,
  min,
  max,
  range,
  volumeMax,
  crosshair,
  setCrosshair,
  crosshairEnabled,
  showLastPrice,
  selectedTimeRange,
  animatedValue,
}) {
  // Enhanced theme colors with fallbacks
  const colors = {
    grid: theme?.colors?.border || theme?.colors?.textSecondary + '22' || '#333333',
    success: theme?.colors?.success || theme?.colors?.green || '#00ff88',
    error: theme?.colors?.error || theme?.colors?.red || '#ff4444',
    text: theme?.colors?.textSecondary || theme?.colors?.text + '80' || '#888888',
    primaryText: theme?.colors?.text || '#ffffff',
    background: theme?.colors?.surface || theme?.colors?.background || '#1a1a1a',
    accent: theme?.colors?.primary || '#007AFF',
    volume: theme?.colors?.textSecondary + '40' || '#888888',
  };

  const chartWidth = showPriceLabels ? width - 70 : width - 20;
  const volumeHeight = showVolume ? height * 0.25 : 0;
  const priceHeight = height - volumeHeight - 40;
  const offsetX = 10;
  const offsetY = 20;

  const N = type === 'candle' ? parsed.candles.length : parsed.line.length;
  const candleWidth = Math.max(0.5, Math.min(8, (chartWidth / Math.max(N, 1)) * 0.8));
  const half = candleWidth / 2;

  const y = (price) => offsetY + priceHeight - ((price - min) / range) * priceHeight;
  const x = (i) => offsetX + (i / Math.max(N - 1, 1)) * chartWidth;

  // Enhanced price calculations
  const priceStats = useMemo(() => {
    if (type === 'candle' && parsed.candles.length > 0) {
      const current = parsed.candles[parsed.candles.length - 1];
      const previous = parsed.candles.length > 1 ? parsed.candles[parsed.candles.length - 2] : current;
      const change = current.close - previous.close;
      const changePercent = (change / previous.close) * 100;
      
      return {
        current: current.close,
        previous: previous.close,
        change,
        changePercent,
        isUp: change >= 0,
        high24h: Math.max(...parsed.candles.slice(-24).map(c => c.high)),
        low24h: Math.min(...parsed.candles.slice(-24).map(c => c.low)),
        volume24h: parsed.candles.slice(-24).reduce((sum, c) => sum + c.volume, 0),
      };
    } else if (parsed.line.length > 0) {
      const current = parsed.line[parsed.line.length - 1];
      const previous = parsed.line.length > 1 ? parsed.line[parsed.line.length - 2] : current;
      const change = current - previous;
      const changePercent = (change / previous) * 100;
      
      return {
        current,
        previous,
        change,
        changePercent,
        isUp: change >= 0,
        high24h: Math.max(...parsed.line.slice(-24)),
        low24h: Math.min(...parsed.line.slice(-24)),
        volume24h: parsed.volume.slice(-24).reduce((sum, v) => sum + v, 0),
      };
    }
    return { current: 0, previous: 0, change: 0, changePercent: 0, isUp: true };
  }, [parsed, type]);

  const currentY = y(priceStats.current);

  // Enhanced grid lines
  const gridLines = useMemo(() => {
    if (!showGrid) return [];
    const steps = 6;
    const lines = [];
    for (let i = 0; i <= steps; i++) {
      const yPos = offsetY + (priceHeight / steps) * i;
      const price = max - ((yPos - offsetY) / priceHeight) * range;
      if (price >= min && price <= max) {
        lines.push({ y: yPos, price });
      }
    }
    return lines;
  }, [showGrid, priceHeight, offsetY, max, range, min]);

  // Enhanced time labels
  const timeLabels = useMemo(() => {
    const labels = [];
    const maxLabels = Math.floor(width / 80); // Dynamic label count based on width
    const step = Math.max(1, Math.floor(N / maxLabels));
    
    for (let i = 0; i < N; i += step) {
      const xPos = x(i);
      const timeData = type === 'candle' ? parsed.candles[i] : { time: Date.now() - (N - i) * 60000 };
      labels.push({ x: xPos, time: timeData.time || Date.now() });
    }
    return labels;
  }, [N, x, type, parsed, width]);

  return (
    <Svg width={width} height={height}>
      {/* Definitions for gradients */}
      <Defs>
        <LinearGradient id="volumeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={colors.accent} stopOpacity="0.6" />
          <Stop offset="100%" stopColor={colors.accent} stopOpacity="0.1" />
        </LinearGradient>
        <LinearGradient id="priceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={colors.success} stopOpacity="0.3" />
          <Stop offset="100%" stopColor={colors.success} stopOpacity="0.05" />
        </LinearGradient>
      </Defs>

      {/* Grid lines */}
      {gridLines.map((g, idx) => (
        <Line
          key={`grid-${idx}`}
          x1={offsetX}
          y1={g.y}
          x2={offsetX + chartWidth}
          y2={g.y}
          stroke={colors.grid}
          strokeWidth={0.5}
          strokeDasharray="3,3"
        />
      ))}

      {/* Volume bars */}
      {showVolume && parsed.volume.map((vol, i) => {
        const barHeight = (vol / volumeMax) * volumeHeight * 0.8;
        const barY = height - volumeHeight + (volumeHeight - barHeight);
        const barX = x(i) - half;
        
        return (
          <Rect
            key={`volume-${i}`}
            x={barX}
            y={barY}
            width={candleWidth}
            height={barHeight}
            fill="url(#volumeGradient)"
            opacity={0.7}
          />
        );
      })}

      {/* Chart content */}
      {type === 'candle' ? (
        parsed.candles.map((c, i) => {
          const up = c.close >= c.open;
          const color = up ? colors.success : colors.error;
          const cx = x(i);
          const openY = y(c.open);
          const closeY = y(c.close);
          const highY = y(c.high);
          const lowY = y(c.low);

          return (
            <React.Fragment key={i}>
              {/* Wick */}
              <Line
                x1={cx}
                y1={highY}
                x2={cx}
                y2={lowY}
                stroke={color}
                strokeWidth={Math.max(0.5, candleWidth * 0.1)}
              />
              {/* Body */}
              <Rect
                x={cx - half}
                y={Math.min(openY, closeY)}
                width={candleWidth}
                height={Math.max(Math.abs(closeY - openY), 1)}
                fill={up ? 'transparent' : color}
                stroke={color}
                strokeWidth={up ? 1.5 : 0}
                rx={candleWidth * 0.1}
              />
            </React.Fragment>
          );
        })
      ) : (
        <>
          {/* Line chart with gradient fill */}
          <LineSegments
            points={parsed.line.map((p, i) => ({ x: x(i), y: y(p), v: p }))}
            upColor={colors.success}
            downColor={colors.error}
            strokeWidth={2.5}
            showGradient={true}
            height={height}
            offsetY={offsetY}
            priceHeight={priceHeight}
          />
        </>
      )}

      {/* Price labels on right */}
      {showPriceLabels && gridLines.map((g, idx) => (
        <React.Fragment key={`price-label-${idx}`}>
          <Rect
            x={width - 65}
            y={g.y - 8}
            width={60}
            height={16}
            fill={colors.background}
            fillOpacity={0.8}
            rx={4}
          />
          <Text
            x={width - 35}
            y={g.y + 3}
            fontSize="10"
            fill={colors.text}
            textAnchor="middle"
            fontWeight="500"
          >
            {formatPrice(g.price)}
          </Text>
        </React.Fragment>
      ))}

      {/* Current price line and label */}
      {showLastPrice && (
        <>
          <Line
            x1={offsetX}
            y1={currentY}
            x2={offsetX + chartWidth}
            y2={currentY}
            stroke={priceStats.isUp ? colors.success : colors.error}
            strokeWidth={2}
            strokeDasharray="6,4"
          />
          
          {showPriceLabels && (
            <>
              <Rect
                x={width - 65}
                y={currentY - 12}
                width={60}
                height={24}
                fill={priceStats.isUp ? colors.success : colors.error}
                rx={6}
              />
              <Text
                x={width - 35}
                y={currentY - 2}
                fontSize="11"
                fill="#000000"
                textAnchor="middle"
                fontWeight="bold"
              >
                {formatPrice(priceStats.current)}
              </Text>
              <Text
                x={width - 35}
                y={currentY + 8}
                fontSize="8"
                fill="#000000"
                textAnchor="middle"
                opacity={0.8}
              >
                {priceStats.changePercent >= 0 ? '+' : ''}{priceStats.changePercent.toFixed(2)}%
              </Text>
            </>
          )}
        </>
      )}

      {/* Time labels */}
      {timeLabels.map((label, idx) => (
        <Text
          key={`time-${idx}`}
          x={label.x}
          y={height - 8}
          fontSize="9"
          fill={colors.text}
          textAnchor="middle"
        >
          {formatTime(label.time, selectedTimeRange)}
        </Text>
      ))}

      {/* Crosshair */}
      {crosshair && crosshairEnabled && (
        <>
          <Line
            x1={crosshair.x}
            y1={offsetY}
            x2={crosshair.x}
            y2={offsetY + priceHeight}
            stroke={colors.accent}
            strokeWidth={1}
            strokeDasharray="2,2"
          />
          <Line
            x1={offsetX}
            y1={crosshair.y}
            x2={offsetX + chartWidth}
            y2={crosshair.y}
            stroke={colors.accent}
            strokeWidth={1}
            strokeDasharray="2,2"
          />
          <Circle
            cx={crosshair.x}
            cy={crosshair.y}
            r={4}
            fill={colors.accent}
            stroke={colors.background}
            strokeWidth={2}
          />
        </>
      )}
    </Svg>
  );
});

const LineSegments = memo(function LineSegments({ 
  points, 
  upColor, 
  downColor, 
  strokeWidth, 
  showGradient = false,
  height,
  offsetY,
  priceHeight 
}) {
  if (!points || points.length < 2) return null;

  const segments = [];
  let current = {
    dir: points[1].v - points[0].v >= 0 ? 'up' : 'down',
    pts: [points[0], points[1]],
  };

  for (let i = 2; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const dir = curr.v - prev.v >= 0 ? 'up' : 'down';

    if (dir === current.dir) {
      current.pts.push(curr);
    } else {
      segments.push(current);
      current = { dir, pts: [prev, curr] };
    }
  }
  segments.push(current);

  return (
    <>
      {/* Gradient fill area */}
      {showGradient && (
        <Polyline
          points={[
            `${points[0].x},${offsetY + priceHeight}`,
            ...points.map(p => `${p.x},${p.y}`),
            `${points[points.length - 1].x},${offsetY + priceHeight}`
          ].join(' ')}
          fill="url(#priceGradient)"
          stroke="none"
        />
      )}
      
      {/* Line segments */}
      {segments.map((seg, idx) => (
        <Polyline
          key={idx}
          points={seg.pts.map(p => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke={seg.dir === 'up' ? upColor : downColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </>
  );
});

function formatPrice(price) {
  if (price >= 1000) {
    return (price / 1000).toFixed(1) + 'K';
  } else if (price >= 1) {
    return price.toFixed(2);
  } else if (price >= 0.01) {
    return price.toFixed(4);
  } else {
    return price.toFixed(6);
  }
}

function formatTime(time, timeRange = '1D') {
  if (typeof time !== 'number' || time < 1000000000) {
    return time.toString();
  }
  
  const date = new Date(time);
  
  switch (timeRange) {
    case '1H':
    case '4H':
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    case '1D':
    case '1W':
      return `${(date.getMonth() + 1)}/${date.getDate()}`;
    case '1M':
    case '3M':
    case '1Y':
      return `${date.getMonth() + 1}/${date.getDate().toString().padStart(2, '0')}`;
    default:
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
}

export default memo(PriceChart);