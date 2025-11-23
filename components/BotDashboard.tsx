import React from 'react';
import { BacktestResult, Trade } from '../types';
import { Wallet, TrendingUp, TrendingDown, Clock, AlertCircle, PlayCircle } from 'lucide-react';

interface BotDashboardProps {
  backtest: BacktestResult;
}

export const BotDashboard: React.FC<BotDashboardProps> = ({ backtest }) => {
  const activeTrade = backtest.trades.find(t => t.status === 'OPEN');
  
  return (
    <div className="flex flex-col gap-6">
      
      {/* Wallet Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Balance Card */}
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Wallet size={64} className="text-blue-400" />
          </div>
          <h3 className="text-slate-400 text-sm font-medium mb-1">Paper Wallet</h3>
          <div className="text-2xl font-bold text-slate-100">
            {backtest.finalBalance.toFixed(2)} <span className="text-sm text-slate-500">USDT</span>
          </div>
          <div className={`text-sm mt-2 flex items-center gap-1 ${backtest.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {backtest.totalPnL >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {backtest.totalPnL >= 0 ? '+' : ''}{backtest.totalPnL.toFixed(2)} USDT
          </div>
        </div>

        {/* Win Rate Card */}
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg">
          <h3 className="text-slate-400 text-sm font-medium mb-1">Win Rate</h3>
          <div className="text-2xl font-bold text-slate-100">
            {backtest.winRate.toFixed(1)}%
          </div>
          <div className="text-sm text-slate-500 mt-2">
            Trades: {backtest.trades.filter(t => t.status === 'CLOSED').length}
          </div>
        </div>

        {/* Drawdown Card */}
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg">
          <h3 className="text-slate-400 text-sm font-medium mb-1">Max Drawdown</h3>
          <div className="text-2xl font-bold text-red-400">
            {backtest.maxDrawdown.toFixed(2)}%
          </div>
          <div className="text-sm text-slate-500 mt-2">
             Peak Equity: {Math.max(...backtest.equityCurve.map(e => e.value)).toFixed(0)}
          </div>
        </div>
      </div>

      {/* Active Trade Banner */}
      {activeTrade && (
        <div className="bg-gradient-to-r from-blue-900/50 to-slate-900 border border-blue-500/30 rounded-xl p-4 flex items-center justify-between animate-pulse">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">Active Position</span>
                </div>
                <div className="font-mono text-lg text-slate-100">
                    <span className={activeTrade.type === 'LONG' ? 'text-green-400' : 'text-red-400'}>{activeTrade.type}</span> @ {activeTrade.entryPrice.toFixed(2)}
                </div>
            </div>
            <div className="text-right">
                <div className="text-xs text-slate-400 mb-1">Unrealized PnL</div>
                <div className={`text-xl font-bold font-mono ${activeTrade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {activeTrade.pnl >= 0 ? '+' : ''}{activeTrade.pnl.toFixed(2)}
                </div>
            </div>
        </div>
      )}

      {/* Trade History Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg flex flex-col h-[400px]">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/50 rounded-t-xl">
          <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            Trade History
          </h3>
          <div className="flex items-center gap-2">
            <PlayCircle size={14} className="text-green-500" />
            <span className="text-xs text-green-400 font-medium">Bot Running</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {backtest.trades.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center">
               <AlertCircle size={32} className="mb-2 opacity-50" />
               <p>No trades executed yet.</p>
               <p className="text-xs mt-1">Waiting for signals...</p>
             </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 uppercase bg-slate-900/50 sticky top-0">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Entry</th>
                  <th className="px-4 py-3">Exit</th>
                  <th className="px-4 py-3 text-right">PnL</th>
                  <th className="px-4 py-3 text-right">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {backtest.trades.map((trade) => (
                  <tr key={trade.id} className={`hover:bg-slate-700/30 transition-colors ${trade.status === 'OPEN' ? 'bg-blue-900/10' : ''}`}>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                      {new Date(trade.entryTime).toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute:'2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        trade.type === 'LONG' ? 'bg-green-900/40 text-green-400 border border-green-800' : 'bg-red-900/40 text-red-400 border border-red-800'
                      }`}>
                        {trade.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 font-mono">
                      {trade.entryPrice.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-slate-300 font-mono">
                      {trade.exitPrice?.toFixed(2) || (trade.status === 'OPEN' ? 'Running' : '-')}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-medium ${
                      trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {trade.status === 'OPEN' ? '...' : (trade.pnl >= 0 ? '+' : '') + trade.pnl.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-500">
                      {trade.exitReason?.replace('_', ' ') || (trade.status === 'OPEN' ? 'Active' : '')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};