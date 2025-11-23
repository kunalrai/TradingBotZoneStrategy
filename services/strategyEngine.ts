
import { Candle, StrategyResult, Zone } from '../types';

// 1. Calculate 9 EMA
export const calculateEMA = (data: Candle[], period: number = 9): Candle[] => {
  const k = 2 / (period + 1);
  let ema = data[0].close;

  return data.map((candle, index) => {
    if (index === 0) {
      return { ...candle, ema9: candle.close };
    }
    ema = candle.close * k + ema * (1 - k);
    return { ...candle, ema9: ema };
  });
};

// 2. Determine Daily Bias
export const getBias = (currentCandle: Candle): 'BULLISH' | 'BEARISH' => {
  if (!currentCandle.ema9) return 'BULLISH'; // Default
  return currentCandle.close > currentCandle.ema9 ? 'BULLISH' : 'BEARISH';
};

// 3. Detect Candlestick Patterns
export const detectPattern = (candle: Candle): string | null => {
  const body = Math.abs(candle.close - candle.open);
  const lowerWick = Math.min(candle.open, candle.close) - candle.low;
  const upperWick = candle.high - Math.max(candle.open, candle.close);
  const totalRange = candle.high - candle.low;

  if (totalRange === 0) return null;

  // Pin bar (Hammer/Shooting Star logic)
  if (lowerWick > 2 * body && upperWick < body) {
    return 'Bullish Pin Bar';
  }
  
  if (upperWick > 2 * body && lowerWick < body) {
    return 'Bearish Pin Bar';
  }

  // Marubozu
  if (body > totalRange * 0.8) {
    return candle.close > candle.open ? 'Bullish Momentum' : 'Bearish Momentum';
  }

  return null;
};

// 4. Supply/Demand Zone Detection
// Added maxIndex support for backtesting to prevent look-ahead bias
export const findZones = (data: Candle[], windowSize: number = 10, threshold: number = 0.005, maxIndex?: number): Zone[] => {
  const zones: Zone[] = [];
  const limit = maxIndex !== undefined ? Math.min(maxIndex, data.length - windowSize) : data.length - windowSize;
  
  // Look for pivot lows (Demand) and pivot highs (Supply)
  // Note: A pivot at 'i' is only confirmed at 'i + windowSize'
  // So if we are at 'maxIndex', we can only see pivots up to 'maxIndex - windowSize'
  
  for (let i = windowSize; i < limit; i++) {
    const currentLow = data[i].low;
    const currentHigh = data[i].high;
    
    // Check local minimum
    let isLow = true;
    for (let j = i - windowSize; j <= i + windowSize; j++) {
      // If we are backtesting, ensure we don't peek past maxIndex
      if (maxIndex !== undefined && j > maxIndex) continue; 
      
      if (data[j].low < currentLow) {
        isLow = false;
        break;
      }
    }

    // Check local maximum
    let isHigh = true;
    for (let j = i - windowSize; j <= i + windowSize; j++) {
       if (maxIndex !== undefined && j > maxIndex) continue;

      if (data[j].high > currentHigh) {
        isHigh = false;
        break;
      }
    }

    if (isLow) {
      const existingZone = zones.find(z => Math.abs(z.price - currentLow) / currentLow < threshold);
      if (existingZone) {
        existingZone.strength += 1;
      } else {
        zones.push({ price: currentLow, type: 'DEMAND', strength: 1 });
      }
    }

    if (isHigh) {
      const existingZone = zones.find(z => Math.abs(z.price - currentHigh) / currentHigh < threshold);
      if (existingZone) {
        existingZone.strength += 1;
      } else {
        zones.push({ price: currentHigh, type: 'SUPPLY', strength: 1 });
      }
    }
  }

  return zones.filter(z => z.strength >= 1).slice(-5);
};

export const runStrategy = (rawData: Candle[]): { processedData: Candle[], result: StrategyResult } => {
  const processedData = calculateEMA(rawData);
  const lastCandle = processedData[processedData.length - 1];
  const bias = getBias(lastCandle);
  const pattern = detectPattern(lastCandle);
  const zones = findZones(processedData); // Current live mode uses full data

  let signal: 'BUY' | 'SELL' | 'WAIT' = 'WAIT';
  let stopLoss = 0;

  // Logic duplicated in Backtest Service, kept here for live "Current Candle" analysis
  if (bias === 'BULLISH') {
    const nearbyDemand = zones.some(z => 
      z.type === 'DEMAND' && 
      Math.abs(lastCandle.close - z.price) / lastCandle.close < 0.02
    );
    if ((pattern === 'Bullish Pin Bar' || pattern === 'Bullish Momentum') && nearbyDemand) {
      signal = 'BUY';
      stopLoss = lastCandle.low * 0.99; 
    } else if (pattern === 'Bullish Pin Bar') {
       signal = 'BUY';
       stopLoss = lastCandle.low * 0.995;
    }
  } else {
    const nearbySupply = zones.some(z => 
      z.type === 'SUPPLY' && 
      Math.abs(lastCandle.close - z.price) / lastCandle.close < 0.02
    );
    if ((pattern === 'Bearish Pin Bar' || pattern === 'Bearish Momentum') && nearbySupply) {
      signal = 'SELL';
      stopLoss = lastCandle.high * 1.01;
    } else if (pattern === 'Bearish Pin Bar') {
      signal = 'SELL';
      stopLoss = lastCandle.high * 1.005;
    }
  }

  return {
    processedData,
    result: {
      bias,
      lastCandlePattern: pattern,
      zones,
      signal,
      stopLoss: stopLoss > 0 ? stopLoss : undefined,
      riskReward: stopLoss > 0 ? '1:2' : undefined
    }
  };
};
