import { Candle, Trade, BacktestResult, Zone } from '../types';
import { calculateEMA, detectPattern, findZones, getBias } from './strategyEngine';

interface BotState {
  balance: number;
  openTrade: Trade | null;
  trades: Trade[];
  lastProcessedTime: number; // Timestamp of the last processed candle
  equityCurve: { time: string; value: number }[];
  maxDrawdown: number;
  maxBalance: number;
}

export class TradingBot {
  private state: BotState;
  private processedData: Candle[] = [];

  constructor(initialBalance: number = 1000) {
    this.state = {
      balance: initialBalance,
      openTrade: null,
      trades: [],
      lastProcessedTime: 0,
      equityCurve: [{ time: new Date().toISOString(), value: initialBalance }],
      maxDrawdown: 0,
      maxBalance: initialBalance
    };
  }

  // Syncs with latest market data. 
  // Processes ONLY new candles that haven't been processed yet.
  public processUpdate(rawData: Candle[]): BacktestResult {
    // 1. Re-calculate indicators on full dataset to ensure accuracy (EMA/Zones need history)
    this.processedData = calculateEMA(rawData);

    // 2. Identify new candles to process
    // We filter for candles that are strictly newer than what we've seen
    const newCandles = this.processedData.filter(c => {
       const cTime = new Date(c.time).getTime();
       return cTime > this.state.lastProcessedTime;
    });

    // 3. Process each new candle sequentially
    for (const candle of newCandles) {
      this.evaluateCandle(candle, this.processedData);
      this.state.lastProcessedTime = new Date(candle.time).getTime();
    }

    return this.getStats();
  }

  // Evaluates a single confirmed candle for Entry/Exit/SL/TP
  private evaluateCandle(candle: Candle, fullDataContext: Candle[]) {
    // Current Index in context (approximation for looking back)
    const index = fullDataContext.findIndex(c => c.time === candle.time);
    if (index < 20) return; // Need minimal history

    // --- 1. Manage Open Trade ---
    if (this.state.openTrade) {
      this.checkExit(this.state.openTrade, candle);
    }

    // --- 2. Check Entries (if no trade) ---
    if (!this.state.openTrade) {
      this.checkEntry(candle, fullDataContext, index);
    }

    // --- 3. Update Stats ---
    this.updateEquity(candle.time);
  }

  private checkExit(trade: Trade, candle: Candle) {
    let exitPrice = 0;
    let exitReason: Trade['exitReason'] = undefined;

    const SL_PCT = 0.01; // 1%
    const TP_PCT = 0.02; // 2%

    if (trade.type === 'LONG') {
      const slPrice = trade.entryPrice * (1 - SL_PCT);
      const tpPrice = trade.entryPrice * (1 + TP_PCT);

      if (candle.low <= slPrice) {
        exitPrice = slPrice;
        exitReason = 'STOP_LOSS';
      } else if (candle.high >= tpPrice) {
        exitPrice = tpPrice;
        exitReason = 'TAKE_PROFIT';
      }
    } else if (trade.type === 'SHORT') {
      const slPrice = trade.entryPrice * (1 + SL_PCT);
      const tpPrice = trade.entryPrice * (1 - TP_PCT);

      if (candle.high >= slPrice) {
        exitPrice = slPrice;
        exitReason = 'STOP_LOSS';
      } else if (candle.low <= tpPrice) {
        exitPrice = tpPrice;
        exitReason = 'TAKE_PROFIT';
      }
    }

    if (exitPrice > 0 && exitReason) {
      this.closeTrade(trade, exitPrice, candle.time, exitReason);
    }
  }

  private checkEntry(candle: Candle, context: Candle[], index: number) {
    const bias = getBias(candle);
    const pattern = detectPattern(candle);
    
    // Prevent look-ahead: find zones based on data available UP TO this candle
    // We pass 'index' as maxIndex to findZones
    const currentZones = findZones(context, 10, 0.005, index); 

    let signal: 'BUY' | 'SELL' | 'WAIT' = 'WAIT';

    if (bias === 'BULLISH') {
      const nearbyDemand = currentZones.some(z => 
        z.type === 'DEMAND' && 
        Math.abs(candle.close - z.price) / candle.close < 0.02
      );
      if (pattern?.includes('Bullish') && nearbyDemand) {
        signal = 'BUY';
      }
    } else { // BEARISH
      const nearbySupply = currentZones.some(z => 
        z.type === 'SUPPLY' && 
        Math.abs(candle.close - z.price) / candle.close < 0.02
      );
      if (pattern?.includes('Bearish') && nearbySupply) {
        signal = 'SELL';
      }
    }

    if (signal !== 'WAIT') {
      const entryPrice = candle.close;
      const ALLOCATION = 0.5; // 50% of balance
      const size = (this.state.balance * ALLOCATION) / entryPrice;

      this.state.openTrade = {
        id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        entryTime: candle.time,
        entryPrice: entryPrice,
        type: signal === 'BUY' ? 'LONG' : 'SHORT',
        status: 'OPEN',
        pnl: 0,
        pnlPercent: 0,
        size: size,
        entryReason: pattern || 'Trend Follow'
      };
    }
  }

  private closeTrade(trade: Trade, price: number, time: string, reason: Trade['exitReason']) {
    const pnlRaw = trade.type === 'LONG' 
      ? (price - trade.entryPrice) * trade.size
      : (trade.entryPrice - price) * trade.size;
    
    this.state.balance += pnlRaw;
    
    const closedTrade: Trade = {
      ...trade,
      status: 'CLOSED',
      exitTime: time,
      exitPrice: price,
      pnl: pnlRaw,
      pnlPercent: (pnlRaw / (trade.entryPrice * trade.size)) * 100,
      exitReason: reason
    };

    this.state.trades.unshift(closedTrade); // Add to beginning
    this.state.openTrade = null;
  }

  private updateEquity(time: string) {
    let currentEquity = this.state.balance;
    // Note: We only add REALIZED equity to the curve usually, or mark-to-market.
    // For simplicity, we assume close of candle PnL if open
    if (this.state.openTrade) {
      // Use the last processed candle close for approx unrealized
      // This is just for the curve
    }
    
    this.state.equityCurve.push({ time: time, value: currentEquity });
    
    this.state.maxBalance = Math.max(this.state.maxBalance, currentEquity);
    const drawdown = (this.state.maxBalance - currentEquity) / this.state.maxBalance;
    this.state.maxDrawdown = Math.max(this.state.maxDrawdown, drawdown);
  }

  // Returns stats, optionally including live PnL from current ticker price
  public getStats(currentTickerPrice?: number): BacktestResult {
    let activeTrade = this.state.openTrade;
    let effectiveBalance = this.state.balance;

    // Create a temporary "view" of the open trade with live PnL
    if (activeTrade && currentTickerPrice) {
       const pnlRaw = activeTrade.type === 'LONG'
         ? (currentTickerPrice - activeTrade.entryPrice) * activeTrade.size
         : (activeTrade.entryPrice - currentTickerPrice) * activeTrade.size;
       
       activeTrade = {
         ...activeTrade,
         pnl: pnlRaw,
         pnlPercent: (pnlRaw / (activeTrade.entryPrice * activeTrade.size)) * 100
       };
       effectiveBalance += pnlRaw;
    }

    const tradesToReturn = [...this.state.trades];
    if (activeTrade) {
      tradesToReturn.unshift(activeTrade);
    }

    const winningTrades = this.state.trades.filter(t => t.pnl > 0);
    const winRate = this.state.trades.length > 0 
      ? (winningTrades.length / this.state.trades.length) * 100 
      : 0;

    return {
      trades: tradesToReturn,
      finalBalance: effectiveBalance,
      totalPnL: effectiveBalance - this.state.equityCurve[0].value,
      winRate,
      equityCurve: this.state.equityCurve,
      maxDrawdown: this.state.maxDrawdown * 100
    };
  }

  public reset(initialBalance: number = 1000) {
    this.state = {
      balance: initialBalance,
      openTrade: null,
      trades: [],
      lastProcessedTime: 0,
      equityCurve: [{ time: new Date().toISOString(), value: initialBalance }],
      maxDrawdown: 0,
      maxBalance: initialBalance
    };
    this.processedData = [];
  }
}

// Wrapper for compatibility if needed, but App.tsx will use class directly
export const runBacktest = (data: Candle[], initialBalance: number = 1000): BacktestResult => {
  const bot = new TradingBot(initialBalance);
  return bot.processUpdate(data);
};