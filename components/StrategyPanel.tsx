import React from 'react';
import { StrategyResult, Zone } from '../types';
import { ArrowUp, ArrowDown, Minus, ShieldAlert, Target, Activity } from 'lucide-react';

interface StrategyPanelProps {
  result: StrategyResult;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  aiAnalysis: string | null;
}

export const StrategyPanel: React.FC<StrategyPanelProps> = ({ result, onAnalyze, isAnalyzing, aiAnalysis }) => {
  return (
    <div className="flex flex-col gap-6">
      {/* Main Signal Card */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg">
        <h2 className="text-xl font-semibold text-slate-100 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          Market Signal
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
            <span className="text-sm text-slate-400 block mb-1">Daily Bias (9 EMA)</span>
            <div className={`flex items-center gap-2 text-lg font-bold ${
              result.bias === 'BULLISH' ? 'text-green-400' : 'text-red-400'
            }`}>
              {result.bias === 'BULLISH' ? <ArrowUp size={20} /> : <ArrowDown size={20} />}
              {result.bias}
            </div>
          </div>

          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
             <span className="text-sm text-slate-400 block mb-1">Pattern</span>
             <div className="text-lg font-bold text-slate-100 truncate" title={result.lastCandlePattern || 'None'}>
               {result.lastCandlePattern || 'No Pattern'}
             </div>
          </div>

          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
             <span className="text-sm text-slate-400 block mb-1">Action</span>
             <div className={`text-lg font-bold ${
               result.signal === 'BUY' ? 'text-green-400' : 
               result.signal === 'SELL' ? 'text-red-400' : 'text-slate-400'
             }`}>
               {result.signal}
             </div>
          </div>

          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
             <span className="text-sm text-slate-400 block mb-1">Suggested Stop</span>
             <div className="text-lg font-bold text-slate-100">
               {result.stopLoss ? result.stopLoss.toFixed(2) : '-'}
             </div>
          </div>
        </div>
      </div>

      {/* Zones List */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg">
        <h3 className="text-lg font-medium text-slate-100 mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-purple-400" />
          Active Zones
        </h3>
        <div className="space-y-3">
          {result.zones.length === 0 ? (
            <p className="text-slate-500 italic">No strong zones detected nearby.</p>
          ) : (
            result.zones.map((zone, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                 <div className="flex items-center gap-3">
                   <div className={`w-2 h-2 rounded-full ${zone.type === 'SUPPLY' ? 'bg-red-500' : 'bg-green-500'}`} />
                   <span className={`font-semibold ${zone.type === 'SUPPLY' ? 'text-red-400' : 'text-green-400'}`}>
                     {zone.type}
                   </span>
                 </div>
                 <div className="text-slate-200 font-mono">
                   {zone.price.toFixed(2)}
                 </div>
                 <div className="text-xs text-slate-500">
                   Strength: {zone.strength}
                 </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* AI Analysis Section */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-yellow-400" />
            AI Analyst
          </h3>
          <button 
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isAnalyzing ? 'Analyzing...' : 'Ask Gemini'}
          </button>
        </div>
        
        <div className="p-4 bg-slate-900 rounded-lg border border-slate-700 min-h-[100px]">
          {aiAnalysis ? (
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{aiAnalysis}</p>
          ) : (
            <p className="text-slate-500 italic text-sm">
              Click "Ask Gemini" to get a second opinion on this setup based on price action and strategy rules.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};