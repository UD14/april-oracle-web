// src/app/api/signal/route.ts
import { NextResponse } from 'next/server';
import { runAnalysis } from '@/lib/signalEngine';
import { kv } from '@vercel/kv';

export const maxDuration = 60; // Allow sufficient time for sequential CoinGecko API calls
const isKvConfigured = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
let mockBtcDom = 0;

export async function GET(request: Request) {
  try {
    // 認証ヘッダーの確認 (Basic Auth for Vercel)
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Basic ${Buffer.from(`${process.env.BASIC_AUTH_USER}:${process.env.BASIC_AUTH_PASS}`).toString('base64')}`;
    
    // In local dev without env vars, allow bypass
    if (process.env.NODE_ENV === 'production' && process.env.BASIC_AUTH_USER && authHeader !== expectedAuth) {
      return new NextResponse('Unauthorized', { status: 401, headers: { 'WWW-Authenticate': 'Basic' } });
    }

    let prevBtcDom = 0;
    try {
      if (isKvConfigured) {
        // Get previous dominance from KV state if available
        const state = await kv.get<{ btc_dom: number }>('oracle_state');
        if (state && state.btc_dom) {
          prevBtcDom = state.btc_dom;
        }
      } else {
        prevBtcDom = mockBtcDom;
      }
    } catch (e) {
      console.warn("KV fetch failed, using 0 for prevBtcDom", e);
    }

    const result = await runAnalysis(prevBtcDom);

    // Save current btc dominance for next run
    try {
      if (isKvConfigured) {
        await kv.set('oracle_state', { btc_dom: result.btc_dom, last_updated: new Date().toISOString() });
      } else {
        mockBtcDom = result.btc_dom;
      }
    } catch (e) {
      console.warn("KV set failed", e);
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Signal API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
