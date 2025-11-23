import { Candle } from '../types';

// Mock generator for fallback
export const generateMockData = (count: number = 100): Candle[] => {
  const data: Candle[] = [];
  let currentPrice = 65000.0; // BTC-ish price
  const now = new Date();
  now.setDate(now.getDate() - count);

  for (let i = 0; i < count; i++) {
    const volatility = currentPrice * 0.02;
    const change = (Math.random() - 0.5) * volatility;
    
    const open = currentPrice;
    const close = currentPrice + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;

    data.push({
      time: now.toISOString(),
      open,
      high,
      low,
      close,
      volume: Math.floor(Math.random() * 100000) + 10000,
    });

    currentPrice = close;
    now.setHours(now.getHours() + 1);
  }
  return data;
};

export const fetchMarketData = async (pair: string = 'B-BTC_USDT', resolution: string = '60'): Promise<Candle[]> => {
  try {
    // Calculate time window based on resolution to get approx 100-200 candles
    const toTimestamp = Math.floor(Date.now() / 1000);
    let durationSeconds = 200 * 60 * 60; // Default 200 hours for '60'

    switch(resolution) {
        case '1': durationSeconds = 200 * 60; break;
        case '5': durationSeconds = 200 * 5 * 60; break;
        case '60': durationSeconds = 200 * 60 * 60; break;
        case '1D': durationSeconds = 200 * 24 * 60 * 60; break;
    }
    
    const fromTimestamp = toTimestamp - durationSeconds;

    // Construct URL for public API
    const url = new URL('https://public.coindcx.com/market_data/candlesticks');
    url.searchParams.append('pair', pair);
    url.searchParams.append('from', fromTimestamp.toString());
    url.searchParams.append('to', toTimestamp.toString());
    url.searchParams.append('resolution', resolution);
    url.searchParams.append('pcode', 'f'); // Futures

    const response = await fetch(url.toString());
    const json = await response.json();

    if (json.s !== 'ok' || !Array.isArray(json.data)) {
      console.warn('CoinDCX API returned invalid status or data:', json);
      return generateMockData(); // Fallback
    }

    // Map API data to Candle interface
    // API returns newest first usually, we need oldest first for the chart
    const candles: Candle[] = json.data.map((c: any) => ({
      time: new Date(c.time).toISOString(), // c.time is in milliseconds
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume
    })).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    return candles;

  } catch (error) {
    console.error('Failed to fetch market data:', error);
    return generateMockData();
  }
};

export const fetchTicker = async (pair: string = 'B-BTC_USDT'): Promise<number | null> => {
    try {
        const url = `https://public.coindcx.com/market_data/trade_history?pair=${pair}&limit=1`;
        const response = await fetch(url);
        const json = await response.json();
        
        if (Array.isArray(json) && json.length > 0) {
            return json[0].p; // Recent trade price
        }
        return null;
    } catch (error) {
        console.error("Failed to fetch ticker:", error);
        return null;
    }
};