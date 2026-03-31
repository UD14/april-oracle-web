// src/lib/indicators.ts

/**
 * 指数移動平均 (EMA) を計算する
 */
export function calculateEma(prices: number[], period: number): number[] {
  if (prices.length === 0) return [];
  
  const k = 2 / (period + 1);
  const ema = [prices[0]];
  
  for (let i = 1; i < prices.length; i++) {
    const prevEma = ema[i - 1];
    const currentEma = prices[i] * k + prevEma * (1 - k);
    ema.push(currentEma);
  }
  
  return ema;
}

/**
 * 相対力指数 (RSI) を計算する
 */
export function calculateRsi(prices: number[], period: number): number[] {
  if (prices.length < period) return Array(prices.length).fill(null);
  
  const rsi: (number | null)[] = Array(prices.length).fill(null);

  // 初期の平均上昇・下落を計算
  let sumGain = 0;
  let sumLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) sumGain += diff;
    else sumLoss -= diff; // loss is positive
  }

  let avgGain = sumGain / period;
  let avgLoss = sumLoss / period;
  
  // 初回RSI
  if (avgLoss === 0) {
    rsi[period] = 100;
  } else {
    const rs = avgGain / avgLoss;
    rsi[period] = 100 - (100 / (1 + rs));
  }

  // Wilder's Smoothing Method
  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    let gain = 0;
    let loss = 0;
    if (diff > 0) gain = diff;
    else loss = -diff;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      rsi[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      rsi[i] = 100 - (100 / (1 + rs));
    }
  }

  return rsi as number[];
}
