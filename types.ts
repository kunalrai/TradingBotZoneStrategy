
export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ema9?: number;
}

export interface Zone {
  price: number;
  type: 'SUPPLY' | 'DEMAND';
  strength: number;
}

export interface StrategyResult {
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  lastCandlePattern: string | null;
  zones: Zone[];
  signal: 'BUY' | 'SELL' | 'WAIT';
  riskReward?: string;
  stopLoss?: number;
}

export enum MarketTrend {
  UP = 'UP',
  DOWN = 'DOWN',
  SIDEWAYS = 'SIDEWAYS'
}

export interface Trade {
  id: string;
  entryTime: string;
  entryPrice: number;
  type: 'LONG' | 'SHORT';
  exitTime?: string;
  exitPrice?: number;
  pnl: number;
  pnlPercent: number;
  status: 'OPEN' | 'CLOSED';
  exitReason?: 'STOP_LOSS' | 'TAKE_PROFIT' | 'SIGNAL_FLIP' | 'MANUAL';
  entryReason?: string;
  size: number; // Position size in units of asset
}

export interface BacktestResult {
  trades: Trade[];
  finalBalance: number;
  totalPnL: number;
  winRate: number;
  equityCurve: { time: string; value: number }[];
  maxDrawdown: number;
}
