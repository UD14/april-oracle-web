// src/app/api/log/route.ts
import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { INITIAL_CAPITAL_JPY } from '@/lib/config';

// mock in-memory store for local dev
let mockLogs: TradeLogEntry[] = [];
const isKvConfigured = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;

export interface TradeLogEntry {
  id: string;
  date: string;
  symbol: string;
  action: string;
  amount_jpy: number;
  pnl_jpy: number;
  remaining_capital_jpy: number;
  note: string;
}

export async function GET(request: Request) {
  try {
    let logs: TradeLogEntry[] = [];
    if (isKvConfigured) {
      logs = await kv.lrange<TradeLogEntry>('oracle_trade_logs', 0, -1) || [];
    } else {
      logs = mockLogs;
    }
    
    // Calculate current capital
    let currentCapital = INITIAL_CAPITAL_JPY;
    if (logs.length > 0) {
      currentCapital = logs[0].remaining_capital_jpy; // assuming index 0 is latest
    }

    return NextResponse.json({ success: true, capital: currentCapital, logs });
  } catch (error: any) {
    console.error("Log Fetch API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: Omit<TradeLogEntry, 'id' | 'date'> = await request.json();
    
    const newEntry: TradeLogEntry = {
      ...body,
      id: Date.now().toString(),
      date: new Date().toISOString(),
    };

    // LPUSH pushes to the head of the list (index 0 will be newest)
    if (isKvConfigured) {
      await kv.lpush('oracle_trade_logs', newEntry);
    } else {
      mockLogs.unshift(newEntry);
    }

    return NextResponse.json({ success: true, entry: newEntry });
  } catch (error: any) {
    console.error("Log Entry API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
