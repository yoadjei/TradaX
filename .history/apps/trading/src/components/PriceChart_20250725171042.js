// components/PriceChart.js
import React, { memo, useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Line, Rect, Polyline } from 'react-native-svg';
import { useTheme } from '@tradax/theme';

/**
 * Accepts flexible data:
 * - Candles: [{ time, open, high, low, close, volume }]
 * - Line:    [{ time, price }] OR [timestamp, price] OR numbers
 *
 * Props:
 *  - data: array
 *  - height: number
 *  - type: 'candle' | 'line'
 *  - showGrid: boolean
 */
function PriceChart({ data = [], height = 220, type = 'candle', showGrid = true }) {
  const { theme } = useTheme();
  const width = useMemo(() => {
    // assume parent set its width; fallback to 100%
    return '100%';
  }, []);

  const parsed = useMemo(() => {
    if (!data || !data.length) return { candles: [], line: [] };

    // Detect candle structure
    const looksLikeCandle = !!data[0]?.open && !!data[0]?.close && !!data[0]?.high && !!data[0]?.low;

    if (looksLikeCandle) {
      const candles = data.map((c, i) => ({
        time: c.time ?? i,
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
        volume: Number(c.volume ?? 0),
      }));
      return { candles, line: candles.map(c => c.close) };
    }

    // fallback: line points
    const line = data.map(p => {
      if (Array.isArray(p)) return Number(p[1]);
      if (typeof p === 'number') return Number(p);
      return Number(p.price ?? p.value ?? 0);
    });

    // synthesize candles from line (basic approximation)
    const candles = line.map((v, i) => {
      const prev = i === 0 ? v : line[i - 1];
      const open = prev;
      const close = v;
      const high = Math.max(open, close);
      const low = Math.min(open, close);
      return { time: i, open, high, low, close, volume: 0 };
    });

    return { candles, line };
  }, [data]);

  // common min/max for current `type`
  const { min, max } = useMemo(() => {
    let nums = [];
    if (type === 'candle') {
      nums = parsed.candles.flatMap(c => [c.low, c.high]);
    } else {
      nums = parsed.line;
    }
    const mn = Math.min(...nums, Number.MAX_SAFE_INTEGER);
    const mx = Math.max(...nums, Number.MIN_SAFE_INTEGER);
    return { min: mn, max: mx };
  }, [parsed, type]);

  const range = useMemo(() => (max - min) || 1, [max, min]);

  // For drawing we need concrete width number, not percentage.
  // Workaround: ask for parent width via onLayout? For simplicity in copy-paste,
  // we rely on a View wrapper that measures width through native "onLayout".
  // To keep this file drop-in, we'll wrap with a measuring component below.

  return (
    <Measure width="100%" height={height}>
      {(w) => (
        <InnerChart
          width={w}
          height={height}
          theme={theme}
          showGrid={showGrid}
          parsed={parsed}
          type={type}
          min={min}
          max={max}
          range={range}
        />
      )}
    </Measure>
  );
}

const InnerChart = memo(function InnerChart({
  width,
  height,
  theme,
  showGrid,
  parsed,
  type,
  min,
  max,
  range,
}) {
  const gridColor = theme.colors.border ?? theme.colors.textSecondary + '33';
  const success = theme.colors.success;
  const error = theme.colors.error;
  const stroke = theme.colors.text;

  const N = type === 'candle' ? parsed.candles.length : parsed.line.length;
  const candleWidth = Math.max(2, (width / Math.max(N, 1)) * 0.6);
  const half = candleWidth / 2;

  const y = (price) => height - ((price - min) / range) * height;
  const x = (i) => (i / Math.max(N - 1, 1)) * width;

  // grid
  const gridLines = useMemo(() => {
    if (!showGrid) return [];
    const steps = 4;
    const lines = [];
    for (let i = 0; i <= steps; i++) {
      const yy = (height / steps) * i;
      lines.push({ y: yy });
    }
    return lines;
  }, [showGrid, height]);

  return (
    <Svg width={width} height={height}>
      {gridLines.map((g, idx) => (
        <Line
          key={`grid-${idx}`}
          x1={0}
          y1={g.y}
          x2={width}
          y2={g.y}
          stroke={gridColor}
          strokeWidth={1}
        />
      ))}

      {type === 'candle' ? (
        parsed.candles.map((c, i) => {
          const up = c.close >= c.open;
          const color = up ? success : error;
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
                strokeWidth={1}
              />
              {/* Body */}
              <Rect
                x={cx - half}
                y={Math.min(openY, closeY)}
                width={candleWidth}
                height={Math.max(Math.abs(closeY - openY), 1)}
                fill={color}
              />
            </React.Fragment>
          );
        })
      ) : (
        // Line chart with green/red segments
        <LineSegments
          points={parsed.line.map((p, i) => ({ x: x(i), y: y(p), v: p }))}
          upColor={success}
          downColor={error}
          strokeWidth={2}
        />
      )}
    </Svg>
  );
});

const LineSegments = memo(function LineSegments({ points, upColor, downColor, strokeWidth }) {
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
      {segments.map((seg, idx) => (
        <Polyline
          key={idx}
          points={seg.pts.map(p => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke={seg.dir === 'up' ? upColor : downColor}
          strokeWidth={strokeWidth}
        />
      ))}
    </>
  );
});

/**
 * Small helper to measure width synchronously for SVG plotting without adding another dependency.
 */
function Measure({ width = '100%', height, children }) {
  const [w, setW] = React.useState(0);
  return (
    <View
      style={{ width, height }}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
    >
      {w > 0 && children(w)}
    </View>
  );
}

export default memo(PriceChart);
