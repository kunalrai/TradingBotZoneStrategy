import { GoogleGenAI } from "@google/genai";
import { Candle, StrategyResult } from '../types';

export const analyzeWithGemini = async (
  data: Candle[], 
  strategyResult: StrategyResult
): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return "API Key not found. Please set REACT_APP_GEMINI_API_KEY.";

    const ai = new GoogleGenAI({ apiKey });

    // Prepare a summary of the last 5 candles for context
    const recentData = data.slice(-5).map(c => 
      `Date: ${c.time}, Open: ${c.open.toFixed(2)}, High: ${c.high.toFixed(2)}, Low: ${c.low.toFixed(2)}, Close: ${c.close.toFixed(2)}, EMA9: ${c.ema9?.toFixed(2)}`
    ).join('\n');

    const prompt = `
    You are an expert technical analysis trading assistant. 
    Analyze the following market data and strategy signal.
    
    Strategy Signal: ${strategyResult.signal}
    Daily Bias: ${strategyResult.bias}
    Pattern Detected: ${strategyResult.lastCandlePattern || 'None'}
    
    Recent Price Action (Last 5 candles):
    ${recentData}
    
    Provide a concise (max 150 words) analysis. 
    1. Confirm or dispute the strategy signal based on the price action nuances.
    2. Identify any key psychological levels.
    3. Suggest a prudent risk management tip for this specific setup.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Could not generate analysis.";
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return "Failed to connect to AI analyst. Please try again later.";
  }
};