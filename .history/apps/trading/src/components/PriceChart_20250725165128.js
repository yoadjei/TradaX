
import React, { memo, useMemo } from 'react';
import { View, Dimensions } from 'react-native';
import Svg, { Polyline, Line } from 'react-native-svg';
import { useTheme } from '@tradax/theme';

const CHART_HEIGHT = 220;

function PriceChart({ data = [], height = CHART_HEIGHT, showGrid = true }) {
  const { theme } = useTheme();
  const width = useMemo(() => Dimensions.get('window').width - 64, []); // card horizontal padding/margins estimate

  
  const prices = useMemo(() => {
    return data.map(p => {
      if (Array.isArray(p)) return Number(p[1]);
      if (typeof p === 'number') return p;
      return Number(p.price ?? p.value ?? 0);
    });
  }, [data]);

  const points = useMemo(() => {
    if (!prices.length) return [];
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    return prices.map((price, i) => {
      const x = (i / (prices.length - 1)) * width;
      const y = height - ((price - min) / range) * height;
      return { x, y, price, i };
    });
  }, [prices, width, height]);

  // Split the line into red/green segments
  const segments = useMemo(() => {
    if (points.length < 2) return [];
    const segs = [];
    let current = {
      dir: points[1].price - points[0].price >= 0 ? 'up' : 'down',
      pts: [points[0], points[1]],
    };

    for (let i = 2; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const dir = curr.price - prev.price >= 0 ? 'up' : 'down';

      if (dir === current.dir) {
        current.pts.push(curr);
      } else {
        segs.push(current);
        current = { dir, pts: [prev, curr] };
      }
    }
    segs.push(current);
    return segs;
  }, [points]);

  // Optional light grid
  const gridColor = theme.colors.border ?? theme.colors.textSecondary + '33'; // faint
  const stepY = 4;

  return (
    <View style={{ height, width }}>
      <Svg width={width} height={height}>
        {showGrid &&
          Array.from({ length: stepY + 1 }).map((_, idx) => {
            const y = (height / stepY) * idx;
            return (
              <Line
                key={`grid-${idx}`}
                x1={0}
                y1={y}
                x2={width}
                y2={y}
                stroke={gridColor}
                strokeWidth={1}
              />
            );
          })}

        {segments.map((seg, idx) => (
          <Polyline
            key={`seg-${idx}`}
            points={seg.pts.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={seg.dir === 'up' ? theme.colors.success : theme.colors.error}
            strokeWidth={2}
          />
        ))}
      </Svg>
    </View>
  );
}

export default memo(PriceChart);
