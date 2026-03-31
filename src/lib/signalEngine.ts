// src/lib/signalEngine.ts

import { 
  ALL_COINS, 
  ENTRY_SCORE_THRESHOLD, 
  EMA_SHORT, 
  EMA_LONG, 
  RSI_PERIOD, 
  RSI_LOW, 
  RSI_HIGH, 
  VOLUME_RATIO_THRESHOLD, 
  BTC_DOM_SPIKE_THRESHOLD, 
  BTC_DOM_DROP_THRESHOLD 
} from './config';
import { calculateEma, calculateRsi } from './indicators';

export interface CoinResult {
  id: string;
  symbol: string;
  name: string;
  score: number;
  reasons: string[];
  action: "BUY" | "HOLD";
  current_price_jpy: number;
  price_change_24h: number;
  volume_24h: number;
  error?: string;
}

export interface AnalysisResult {
  coins: CoinResult[];
  btc_dom: number;
  entries: CoinResult[];
  market_mood: string;
  avg_score: number;
}

// ------------------------------------------
// スコア判定関数
// ------------------------------------------

function getTrendScore(ema20: number | null, ema50: number | null): [number, string] {
  if (ema20 === null || ema50 === null) return [0, "EMA計算不可（データ不足）"];
  if (ema20 > ema50) {
    return [2, `✅ 上昇トレンド（EMA${EMA_SHORT}=${ema20.toFixed(2)} > EMA${EMA_LONG}=${ema50.toFixed(2)}）`];
  } else {
    return [0, `❌ 下降・横ばい（EMA${EMA_SHORT}=${ema20.toFixed(2)} ≤ EMA${EMA_LONG}=${ema50.toFixed(2)}）`];
  }
}

function getRsiScore(rsiVal: number | null): [number, string] {
  if (rsiVal === null || isNaN(rsiVal)) return [0, "RSI計算不可"];
  const rsi = Math.round(rsiVal * 10) / 10;
  
  if (rsi >= RSI_LOW && rsi <= RSI_HIGH) return [1, `✅ RSI適温ゾーン（RSI=${rsi}）`];
  if (rsi > 70) return [0, `⚠️ RSI過買い（RSI=${rsi}）— エントリー非推奨`];
  if (rsi < 30) return [0, `⚠️ RSI過売り（RSI=${rsi}）— 反発狙いのみ`];
  return [0, `ℹ️ RSI中立外（RSI=${rsi}）`];
}

function getVolumeScore(vol24h: number, vol7dAvg: number): [number, string] {
  if (vol7dAvg <= 0) return [0, "出来高データ不足"];
  const ratio = vol24h / vol7dAvg;
  if (ratio >= VOLUME_RATIO_THRESHOLD) return [1, `✅ 出来高急増（7日平均比 ${ratio.toFixed(1)}x）`];
  return [0, `ℹ️ 出来高平常（7日平均比 ${ratio.toFixed(1)}x）`];
}

function getBtcDomScore(current: number, prev: number): [number, string] {
  if (prev === 0) return [0, `ℹ️ BTC Dominance=${current.toFixed(1)}%（前回比不明）`];
  const change = current - prev;
  if (change >= BTC_DOM_SPIKE_THRESHOLD) return [-2, `🔴 BTC Dominance急騰（${prev.toFixed(1)}%→${current.toFixed(1)}%）— アルトに逆風`];
  if (change <= BTC_DOM_DROP_THRESHOLD) return [1, `🟢 BTC Dominance低下（${prev.toFixed(1)}%→${current.toFixed(1)}%）— アルトに追い風`];
  return [0, `ℹ️ BTC Dominance横ばい（${current.toFixed(1)}%）`];
}

function getPriceCrashScore(pct: number | null): [number, string] {
  if (pct === null) return [0, "ℹ️ 24h変化: データなし"];
  if (pct <= -8.0) return [-2, `🔴 急落中（24h: ${pct.toFixed(1)}%）— エントリー禁止`];
  if (pct >= 10.0) return [0, `⚠️ 急騰後（24h: +${pct.toFixed(1)}%）— 高値掴みリスク`];
  return [0, `ℹ️ 24h変化: ${pct.toFixed(1)}%`];
}

// ------------------------------------------
// API Client Fetchers
// ------------------------------------------

async function fetchOhlcv(coinId: string): Promise<number[]> {
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=jpy&days=30`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`CoinGecko OHLVC Error: ${res.status}`);
  const data = await res.json() as number[][];
  // data format: [timestamp, open, high, low, close]
  return data.map(d => d[4]).sort((a, b) => a - b); // close prices
}

async function fetchMarketData(coinId: string) {
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`CoinGecko MarketData Error: ${res.status}`);
  const data = await res.json();
  return {
    price: data.market_data?.current_price?.jpy || 0,
    volume: data.market_data?.total_volume?.jpy || 0,
    change24h: data.market_data?.price_change_percentage_24h || 0,
  };
}

async function fetchBtcDominance() {
  const url = `https://api.coingecko.com/api/v3/global`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`CoinGecko Global Error: ${res.status}`);
  const data = await res.json();
  return data.data?.market_cap_percentage?.btc || 0;
}

// delay helper for rate limit
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function runAnalysis(prevBtcDom: number = 0): Promise<AnalysisResult> {
  let btcDom = 0;
  try {
    btcDom = await fetchBtcDominance();
  } catch (e) {
    console.error(e);
  }

  const results: CoinResult[] = [];

  for (const coin of ALL_COINS) {
    const result: CoinResult = {
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      score: 0,
      reasons: [],
      action: "HOLD",
      current_price_jpy: 0,
      price_change_24h: 0,
      volume_24h: 0,
    };

    try {
      // Fetch data sequentially to respect rate limits
      await delay(1000); 
      const prices = await fetchOhlcv(coin.id);
      
      await delay(1000);
      const market = await fetchMarketData(coin.id);

      // calc indicators
      const ema20 = calculateEma(prices, EMA_SHORT);
      const ema50 = calculateEma(prices, EMA_LONG);
      const rsiArr = calculateRsi(prices, RSI_PERIOD);

      const latestEma20 = ema20.length > 0 ? ema20[ema20.length - 1] : null;
      const latestEma50 = ema50.length > 0 ? ema50[ema50.length - 1] : null;
      const latestRsi = rsiArr.length > 0 ? rsiArr[rsiArr.length - 1] : null;

      const [s1, r1] = getTrendScore(latestEma20, latestEma50);
      const [s2, r2] = getRsiScore(latestRsi);
      const [s3, r3] = getVolumeScore(market.volume, market.volume); // mock 7d avg as 1.0x for now
      const [s4, r4] = getBtcDomScore(btcDom, prevBtcDom);
      const [s5, r5] = getPriceCrashScore(market.change24h);

      const totalScore = s1 + s2 + s3 + s4 + s5;

      result.score = totalScore;
      result.reasons = [r1, r2, r3, r4, r5];
      result.action = totalScore >= ENTRY_SCORE_THRESHOLD ? "BUY" : "HOLD";
      result.current_price_jpy = market.price;
      result.price_change_24h = market.change24h;
      result.volume_24h = market.volume;

    } catch (e: any) {
      result.error = e.message;
    }

    results.push(result);
  }

  const entries = results.filter(r => r.action === "BUY");
  const avgScore = results.length > 0 ? results.reduce((sum, r) => sum + r.score, 0) / results.length : 0;
  
  let mood = "🔴 RISK-OFF（待機推奨）";
  if (avgScore >= 2) mood = "🟢 RISK-ON（攻めどき）";
  else if (avgScore >= 0) mood = "🟡 NEUTRAL（慎重に）";

  return {
    coins: results,
    btc_dom: btcDom,
    entries,
    market_mood: mood,
    avg_score: Math.round(avgScore * 100) / 100
  };
}
