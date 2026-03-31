// src/app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Loader2, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { AnalysisResult, CoinResult } from "@/lib/signalEngine";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [capital, setCapital] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showChecklist, setShowChecklist] = useState<string | null>(null); // holds coin symbol to show checklist for

  useEffect(() => {
    // Initial fetch for capital only
    fetchCapital();
  }, []);

  const fetchCapital = async () => {
    try {
      const res = await fetch("/api/log");
      if (res.ok) {
        const data = await res.json();
        setCapital(data.capital);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      // Refresh capital first
      await fetchCapital();
      
      const res = await fetch("/api/signal");
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch signal");
      }
      setResult(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const maxRisk = capital ? Math.floor(capital * 0.10) : 0;

  return (
    <main className="max-w-xl mx-auto p-4 min-h-screen pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pt-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">April Oracle</h1>
          <p className="text-sm text-gray-400">Crypto AI Signal Engine</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Current Capital</p>
          <div className="text-xl font-mono text-white flex items-center gap-2">
            {capital !== null ? `¥${capital.toLocaleString()}` : "..."}
          </div>
        </div>
      </div>

      {capital !== null && capital < 15000 && (
        <div className="bg-red-950/50 border border-red-900 text-red-400 p-4 rounded-xl mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong className="block mb-1">SYSTEM STOPPED</strong>
            残資金が15,000円を下回りました。取引は全停止状態です。
          </div>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={runAnalysis}
        disabled={loading || (capital !== null && capital < 15000)}
        className="w-full bg-white text-black font-semibold py-4 rounded-2xl mb-8 flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            分析中 (約10秒)...
          </>
        ) : (
          <>
            <RefreshCw className="w-5 h-5" />
            シグナル分析を実行
          </>
        )}
      </button>

      {error && (
        <div className="bg-red-900/20 text-red-500 p-4 rounded-xl mb-8 text-sm border border-red-900/50">
          Error: {error}
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-6 animate-in fade-in duration-500">
          
          {/* Market Mood Card */}
          <div className="bg-[#111] border border-[#333] rounded-2xl p-5">
            <h2 className="text-sm font-medium text-gray-400 mb-4">Market Environment</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Mood</p>
                <p className="text-lg">{result.market_mood}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">BTC Dominance</p>
                <p className="text-lg font-mono">{result.btc_dom.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          <hr className="border-[#222]" />

          {/* Entries */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center justify-between">
              <span>Entries</span>
              <span className="bg-[#222] text-xs px-2 py-1 rounded text-gray-400">
                Max {maxRisk.toLocaleString()} JPY / trade
              </span>
            </h2>

            {result.entries.length === 0 ? (
              <div className="bg-[#111] border border-[#333] rounded-2xl p-6 text-center text-gray-400">
                <p className="mb-2">📭 本日のエントリー候補なし</p>
                <p className="text-sm">無理にトレードせず <strong>HOLD</strong> が最善手です。</p>
              </div>
            ) : (
              <div className="space-y-4">
                {result.entries.map((coin) => (
                  <div key={coin.id} className="bg-[#111] border border-green-900/50 rounded-2xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                    
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold">
                          BUY
                        </div>
                        <div>
                          <h3 className="font-bold text-lg leading-none">{coin.symbol}</h3>
                          <p className="text-xs text-gray-500 mt-1">Score: {coin.score}/5</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-lg">{formatPrice(coin.current_price_jpy)}</p>
                        <p className={`text-xs ${coin.price_change_24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {coin.price_change_24h > 0 && '+'}{coin.price_change_24h.toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5 mb-5 bg-black/40 rounded-lg p-3">
                      {coin.reasons.map((r, i) => (
                        <p key={i} className="text-xs text-gray-300 flex gap-2">
                          <span className="shrink-0">{r.split(' ')[0]}</span>
                          <span>{r.substring(r.indexOf(' ') + 1)}</span>
                        </p>
                      ))}
                    </div>

                    <button 
                      onClick={() => setShowChecklist(coin.symbol)}
                      className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-medium text-sm transition-colors"
                    >
                      bitbankで発注する
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <hr className="border-[#222]" />

          {/* All Coins */}
          <div>
            <h2 className="text-lg font-semibold mb-4">All Coins</h2>
            <div className="bg-[#111] border border-[#333] rounded-2xl overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#1a1a1a] text-xs text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-normal">Coin</th>
                    <th className="px-4 py-3 font-normal">Score</th>
                    <th className="px-4 py-3 font-normal">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222]">
                  {result.coins.sort((a,b)=>b.score - a.score).map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-3 font-medium">{c.symbol}</td>
                      <td className="px-4 py-3">{c.error ? '-' : c.score}</td>
                      <td className="px-4 py-3">
                        {c.error ? (
                          <span className="text-red-500 text-xs">Error</span>
                        ) : c.action === 'BUY' ? (
                          <span className="text-green-500">BUY</span>
                        ) : (
                          <span className="text-gray-500">HOLD</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* Checklist Modal */}
      {showChecklist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111] border border-[#333] rounded-2xl p-6 max-w-sm w-full animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <CheckCircle2 className="text-green-500" />
              発注前チェック
            </h3>
            
            <div className="space-y-4 mb-8 text-sm text-gray-300">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-1 w-4 h-4 rounded border-gray-600 bg-black accent-green-500" />
                <span>投入額は <strong>¥{maxRisk.toLocaleString()} 以内</strong>か？</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-1 w-4 h-4 rounded border-gray-600 bg-black accent-green-500" />
                <span>Tier B (DOGE/SHIB) の合計は20%以下か？</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-1 w-4 h-4 rounded border-gray-600 bg-black accent-green-500" />
                <span>感情（FOMO）で判断していないか？</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-1 w-4 h-4 rounded border-gray-600 bg-black accent-green-500" />
                <span>bitbankの実価格と乖離がないか？</span>
              </label>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowChecklist(null)}
                className="flex-1 py-3 rounded-xl bg-[#222] hover:bg-[#333] text-white font-medium transition-colors"
              >
                キャンセル
              </button>
              <a 
                href="https://app.bitbank.cc/" 
                target="_blank" 
                rel="noreferrer"
                onClick={() => setShowChecklist(null)}
                className="flex-1 py-3 rounded-xl bg-white hover:bg-gray-200 text-black text-center font-medium transition-colors"
              >
                bitbankへ
              </a>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}

function formatPrice(p: number) {
  if (p < 0.01) return `¥${p.toFixed(8)}`;
  if (p < 1) return `¥${p.toFixed(4)}`;
  return `¥${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
