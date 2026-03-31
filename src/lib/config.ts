// src/lib/config.ts

export const TIER_A_COINS = [
  { id: "matic-network", symbol: "POL", name: "Polygon (POL/MATIC)" },
  { id: "optimism",      symbol: "OP",  name: "Optimism" },
  { id: "arbitrum",      symbol: "ARB", name: "Arbitrum" },
  { id: "solana",        symbol: "SOL", name: "Solana" },
];

export const TIER_B_COINS = [
  { id: "dogecoin",  symbol: "DOGE", name: "Dogecoin" },
  { id: "shiba-inu", symbol: "SHIB", name: "Shiba Inu" },
];

export const TIER_C_COINS = [
  { id: "bitcoin",  symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
];

export const ALL_COINS = [...TIER_A_COINS, ...TIER_B_COINS];

// ==========================================
// Risk Parameters
// ==========================================
export const INITIAL_CAPITAL_JPY = 30000;
export const MAX_RISK_PER_TRADE   = 0.10;
export const MAX_DAILY_LOSS       = 0.15;
export const STOP_LOSS_THRESHOLD  = 15000;
export const TIER_B_MAX_RATIO     = 0.20;

// ==========================================
// Signal Parameters
// ==========================================
export const ENTRY_SCORE_THRESHOLD = 3;
export const EMA_SHORT    = 20;
export const EMA_LONG     = 50;
export const RSI_PERIOD   = 14;
export const RSI_LOW      = 40;
export const RSI_HIGH     = 60;
export const VOLUME_RATIO_THRESHOLD = 1.5;
export const BTC_DOM_DROP_THRESHOLD = -0.5;
export const BTC_DOM_SPIKE_THRESHOLD = 1.5;

// ==========================================
// API Settings
// ==========================================
export const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";
export const OHLCV_DAYS = 30;
