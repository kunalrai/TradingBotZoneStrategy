
import React from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceDot // Added ReferenceDot
} from 'recharts';
import { Candle, Zone, Trade } from '../types';

interface CandleChartProps {
  data: Candle[];
  zones: Zone[];
  trades?: Trade[]; // New prop for trades
}

const CustomShapeBar = (props: any) => {
  const { x, y, width, height, payload } = props;
  
  if (!payload) return null;

  const { open, close, high, low } = payload;
  const isGreen = close > open;
  const color = isGreen ? '#22c55e' : '#ef4444';
  
  const priceRange = high - low;
  if (priceRange === 0) {
    return (
       <line x1={x} y1={y} x2={x + width} y2={y} stroke={color} strokeWidth={2} />
    );
  }

  const pixelPerUnit = height / priceRange;
  
  const yOpen = y + (high - open) * pixelPerUnit;
  const yClose = y + (high - close) * pixelPerUnit;
  
  const bodyTop = Math.min(yOpen, yClose);
  const bodyHeight = Math.max(Math.abs(yOpen - yClose), 1);

  const cx = x + width / 2;

  return (
    <g>
      <line 
        x1={cx} 
        y1={y} 
        x2={cx} 
        y2={y + height} 
        stroke={color} 
        strokeWidth={1} 
      />
      <rect 
        x={x} 
        y={bodyTop} 
        width={width} 
        height={bodyHeight} 
        fill={color} 
        stroke="none"
      />
    </g>
  );
};

export const CandleChart: React.FC<CandleChartProps> = ({ data, zones, trades = [] }) => {
  const allLows = data.map(d => d.low);
  const allHighs = data.map(d => d.high);
  const minPrice = Math.min(...allLows) * 0.995;
  const maxPrice = Math.max(...allHighs) * 1.005;

  const chartData = data.map(d => ({
    ...d,
    candleRange: [d.low, d.high]
  }));

  const formatXAxis = (tickItem: string) => {
    try {
      const date = new Date(tickItem);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return tickItem;
    }
  };

  return (
    <div className="h-[500px] w-full bg-slate-800 rounded-xl p-4 shadow-lg border border-slate-700">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis 
            dataKey="time" 
            tick={{ fill: '#94a3b8', fontSize: 11 }} 
            tickLine={false}
            axisLine={{ stroke: '#475569' }}
            minTickGap={40}
            tickFormatter={formatXAxis}
          />
          <YAxis 
            domain={[minPrice, maxPrice]} 
            tick={{ fill: '#94a3b8', fontSize: 11 }} 
            tickLine={false}
            axisLine={{ stroke: '#475569' }}
            tickFormatter={(val) => val.toFixed(1)}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f8fafc' }}
            itemStyle={{ color: '#f8fafc' }}
            labelStyle={{ color: '#94a3b8' }}
            labelFormatter={(label) => new Date(label).toLocaleString()}
            formatter={(value: any, name: string) => {
              if (name === 'Price' && Array.isArray(value)) {
                return [`${value[0].toFixed(2)} - ${value[1].toFixed(2)}`, 'Range'];
              }
              return [Number(value).toFixed(2), name];
            }}
          />
          
          {zones.map((zone, idx) => (
            <ReferenceArea
              key={`zone-${idx}`}
              y1={zone.price * (1 - 0.003)}
              y2={zone.price * (1 + 0.003)}
              fill={zone.type === 'SUPPLY' ? '#ef4444' : '#22c55e'}
              fillOpacity={0.15}
            />
          ))}

          {trades.map((trade) => (
             <ReferenceDot
                key={`trade-${trade.id}`}
                x={trade.entryTime}
                y={trade.entryPrice}
                r={4}
                fill={trade.type === 'LONG' ? '#22c55e' : '#ef4444'}
                stroke="#fff"
                strokeWidth={1}
                label={{ 
                  value: trade.type === 'LONG' ? 'B' : 'S', 
                  fill: '#fff', 
                  fontSize: 10,
                  position: 'top'
                }}
             />
          ))}

          <Line 
            type="monotone" 
            dataKey="ema9" 
            stroke="#3b82f6" 
            strokeWidth={2} 
            dot={false} 
            name="9 EMA"
            isAnimationActive={false}
          />

          <Bar
            dataKey="candleRange"
            shape={<CustomShapeBar />}
            name="Price"
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
