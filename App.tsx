import React, { useEffect, useState, useCallback, useRef } from 'react';
import { fetchMarketData, fetchTicker } from './services/dataService';
import { runStrategy } from './services/strategyEngine';
import { analyzeWithGemini } from './services/geminiService';
import { TradingBot } from './services/backtestService';
import { Candle, StrategyResult, BacktestResult } from './types';
import { CandleChart } from './components/CandleChart';
import { StrategyPanel } from './components/StrategyPanel';
import { BotDashboard } from './components/BotDashboard';
import { RefreshCw, Activity, ChevronDown, Bot, Play, Pause, Zap } from 'lucide-react';

const PAIRS = [
  { label: 'BTC/USDT', value: 'B-BTC_USDT' },
  { label: 'ETH/USDT', value: 'B-ETH_USDT' },
  { label: 'SOL/USDT', value: 'B-SOL_USDT' },
  { label: 'XRP/USDT', value: 'B-XRP_USDT' },
  { label: 'DOGE/USDT', value: 'B-DOGE_USDT' },
];

const TIMEFRAMES = [
  { label: '1 Minute', value: '1' },
  { label: '5 Minutes', value: '5' },
  { label: '1 Hour', value: '60' },
  { label: '1 Day', value: '1D' },
];

const App: React.FC = () => {
  const [data, setData] = useState<Candle[]>([]);
  const [processedData, setProcessedData] = useState<Candle[]>([]);
  const [strategyResult, setStrategyResult] = useState<StrategyResult | null>(null);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  
  const [selectedPair, setSelectedPair] = useState('B-BTC_USDT');
  const [timeframe, setTimeframe] = useState('60');
  
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'strategy' | 'bot'>('strategy');

  // Bot State
  const botRef = useRef<TradingBot>(new TradingBot(1000));
  const [isBotActive, setIsBotActive] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Initialize data
  const loadData = useCallback(async (isRefresh: boolean = false) => {
    if (!isRefresh) setIsLoading(true);
    if (!isRefresh) setAiAnalysis(null);
    
    try {
      const rawData = await fetchMarketData(selectedPair, timeframe);
      const currentTicker = await fetchTicker(selectedPair);
      
      // Run Strategy for Live view (always uses full latest data)
      const { processedData: withEma, result } = runStrategy(rawData);
      
      // Update Bot
      // If pair/timeframe changed drastically, we might want to reset, but for now we sync
      // If it's a manual refresh or poll, we process updates
      const btResult = botRef.current.processUpdate(rawData);
      
      // Get Live Stats (injecting current ticker price for open PnL)
      const liveStats = botRef.current.getStats(currentTicker || undefined);

      setData(rawData);
      setProcessedData(withEma);
      setStrategyResult(result);
      setBacktestResult(liveStats);
      setLastUpdate(new Date());

    } catch (e) {
      console.error("Error loading data", e);
    } finally {
      if (!isRefresh) setIsLoading(false);
    }
  }, [selectedPair, timeframe]);

  // Initial Load & Pair Change Reset
  useEffect(() => {
    botRef.current.reset(1000); // Reset bot on pair/tf change
    loadData();
  }, [loadData]); // loadData depends on pair/tf

  // Polling Effect for Live Bot
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isBotActive) {
      interval = setInterval(() => {
        loadData(true); // Silent refresh
      }, 5000); // Poll every 5 seconds
    }
    return () => clearInterval(interval);
  }, [isBotActive, loadData]);

  const handleAiAnalyze = async () => {
    if (!strategyResult || processedData.length === 0) return;
    setIsAnalyzing(true);
    const analysis = await analyzeWithGemini(processedData, strategyResult);
    setAiAnalysis(analysis);
    setIsAnalyzing(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700 pb-6">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 flex items-center gap-3">
              TradeLogic AI
              {isBotActive && (
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              )}
            </h1>
            <p className="text-slate-400 mt-1 flex items-center gap-2 text-sm">
              <Activity size={14} />
              CoinDCX Futures • Real-Time Data • Last update: {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 bg-slate-800 p-2 rounded-lg border border-slate-700">
            {/* Live Toggle */}
            <button
               onClick={() => setIsBotActive(!isBotActive)}
               className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-bold transition-all ${
                 isBotActive 
                 ? 'bg-green-500/10 text-green-400 border border-green-500/50' 
                 : 'bg-slate-700 text-slate-400'
               }`}
            >
              {isBotActive ? <Pause size={14} /> : <Play size={14} />}
              {isBotActive ? 'LIVE ON' : 'PAUSED'}
            </button>

            <div className="w-px h-6 bg-slate-700 mx-1"></div>

            {/* Selectors */}
            <div className="relative">
              <select 
                value={selectedPair}
                onChange={(e) => setSelectedPair(e.target.value)}
                className="appearance-none bg-slate-900 border border-slate-700 text-slate-200 py-2 pl-3 pr-8 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-sm font-medium"
              >
                {PAIRS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-2.5 text-slate-400 pointer-events-none" size={14} />
            </div>

            <div className="relative">
              <select 
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="appearance-none bg-slate-900 border border-slate-700 text-slate-200 py-2 pl-3 pr-8 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-sm font-medium"
              >
                {TIMEFRAMES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-2.5 text-slate-400 pointer-events-none" size={14} />
            </div>
            
            <button 
              onClick={() => loadData(false)}
              disabled={isLoading}
              className={`p-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Refresh Data"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className="flex gap-4 border-b border-slate-800">
          <button 
            onClick={() => setActiveTab('strategy')}
            className={`pb-3 px-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'strategy' 
                ? 'border-blue-500 text-blue-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Strategy Dashboard
          </button>
          <button 
             onClick={() => setActiveTab('bot')}
             className={`pb-3 px-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
               activeTab === 'bot' 
                 ? 'border-purple-500 text-purple-400' 
                 : 'border-transparent text-slate-400 hover:text-slate-200'
             }`}
          >
            <Bot size={16} />
            Paper Trading Bot
          </button>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Chart Section - Takes up 2 columns */}
          <div className="lg:col-span-2 space-y-4">
             <div className="flex items-center justify-between px-2">
               <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                 {PAIRS.find(p => p.value === selectedPair)?.label} 
                 <span className="text-slate-500 text-sm font-normal">
                   ({TIMEFRAMES.find(t => t.value === timeframe)?.label})
                 </span>
                 {isBotActive && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-400 text-xs border border-blue-800 flex items-center gap-1">
                        <Zap size={10} /> Live Monitoring
                    </span>
                 )}
               </h2>
               <div className="flex gap-4 text-xs text-slate-400">
                 <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500 rounded-sm"></div> 9 EMA</div>
                 <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500/50 rounded-sm"></div> Zones</div>
                 {activeTab === 'bot' && (
                    <>
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Buy</div>
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Sell</div>
                    </>
                 )}
               </div>
             </div>
             
             {strategyResult && (
               <div className="relative">
                  {isLoading && (
                    <div className="absolute inset-0 z-10 bg-slate-900/50 flex items-center justify-center rounded-xl backdrop-blur-sm">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  )}
                  <CandleChart 
                    data={processedData} 
                    zones={strategyResult.zones}
                    trades={activeTab === 'bot' ? backtestResult?.trades : []}
                  />
               </div>
             )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {activeTab === 'strategy' && strategyResult && (
              <StrategyPanel 
                result={strategyResult} 
                onAnalyze={handleAiAnalyze}
                isAnalyzing={isAnalyzing}
                aiAnalysis={aiAnalysis}
              />
            )}
            
            {activeTab === 'bot' && backtestResult && (
              <BotDashboard backtest={backtestResult} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;