import React, { useState } from 'react';
import { 
  Zap, 
  Play, 
  Flame, 
  ShieldCheck, 
  BarChart2, 
  Clock, 
  Radio, 
  Terminal, 
  Filter,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api, TrafficSummary } from '../../api/client';

export const TrafficSampler: React.FC = () => {
  const [durationSec, setDurationSec] = useState<number>(5);
  const [maxCommands, setMaxCommands] = useState<number>(500);
  const [isSampling, setIsSampling] = useState<boolean>(false);
  const [summary, setSummary] = useState<TrafficSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const startSampling = async () => {
    setIsSampling(true);
    setError(null);
    try {
      const res = await api.sampleTraffic(durationSec, maxCommands);
      setSummary(res);
    } catch (err: any) {
      setError(err.message || 'Sampling failed');
    } finally {
      setIsSampling(false);
    }
  };

  const filteredCommands = summary?.recent_commands.filter((cmd) => {
    if (categoryFilter === 'ALL') return true;
    return cmd.category === categoryFilter;
  }) || [];

  const categoryColors: Record<string, string> = {
    READ: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    WRITE: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    SCAN: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    ADMIN: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    OTHER: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  };

  return (
    <div className="h-full flex flex-col bg-[#0b0f19] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#1e293b] bg-[#0d1322] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-400" />
            <h1 className="text-lg font-bold text-white tracking-tight">
              Safe Traffic Sampler
            </h1>
            <span className="flex items-center gap-1 text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              <ShieldCheck className="w-3 h-3" />
              <span>Throttled Auto-Kill Guard</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Safely intercept and classify live traffic for a bounded time window without risking production memory spikes.
          </p>
        </div>

        {/* Sampling Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#101726] border border-[#1e293b] p-1.5 rounded-lg text-xs">
            <span className="text-slate-400 pl-1">Duration:</span>
            <select
              value={durationSec}
              onChange={(e) => setDurationSec(Number(e.target.value))}
              disabled={isSampling}
              className="bg-[#162035] text-slate-200 rounded px-2 py-1 focus:outline-none"
            >
              <option value={3}>3 seconds</option>
              <option value={5}>5 seconds</option>
              <option value={10}>10 seconds</option>
            </select>

            <span className="text-slate-400 pl-2">Limit:</span>
            <select
              value={maxCommands}
              onChange={(e) => setMaxCommands(Number(e.target.value))}
              disabled={isSampling}
              className="bg-[#162035] text-slate-200 rounded px-2 py-1 focus:outline-none"
            >
              <option value={200}>200 cmds</option>
              <option value={500}>500 cmds</option>
              <option value={1000}>1000 cmds</option>
            </select>
          </div>

          <button
            onClick={startSampling}
            disabled={isSampling}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-xs transition-all shadow-lg ${
              isSampling
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40 animate-pulse cursor-not-allowed'
                : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:brightness-110 shadow-orange-900/30'
            }`}
          >
            {isSampling ? (
              <>
                <Radio className="w-4 h-4 animate-spin" />
                <span>Sampling Traffic ({durationSec}s)...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Start Sampling Session</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="m-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {summary ? (
          <>
            {/* Top Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-[#0f1627] border border-[#1e293b]">
                <div className="text-[11px] text-slate-400 font-medium">Sampled Commands</div>
                <div className="text-xl font-bold text-white font-mono mt-1">
                  {summary.total_commands}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Captured in {summary.duration_ms}ms window
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0f1627] border border-[#1e293b]">
                <div className="text-[11px] text-slate-400 font-medium">Throughput</div>
                <div className="text-xl font-bold text-orange-400 font-mono mt-1">
                  {summary.commands_per_sec.toFixed(1)} <span className="text-xs text-slate-400">cmds/s</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Live estimated ops frequency</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0f1627] border border-[#1e293b]">
                <div className="text-[11px] text-slate-400 font-medium">Dominant Category</div>
                <div className="text-xl font-bold text-cyan-400 font-mono mt-1">
                  {Object.entries(summary.categories || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || 'NONE'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Workload profile characteristic</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0f1627] border border-[#1e293b]">
                <div className="text-[11px] text-slate-400 font-medium">Hot Keys Detected</div>
                <div className="text-xl font-bold text-rose-400 font-mono mt-1">
                  {summary.hot_keys?.length || 0}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Keys with multiple hits</div>
              </div>
            </div>

            {/* Split view: Hot Keys vs Category Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Category Breakdown */}
              <div className="p-4 rounded-xl bg-[#0f1627] border border-[#1e293b] flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <BarChart2 className="w-4 h-4 text-cyan-400" />
                    <span>Command Breakdown</span>
                  </h3>
                  <div className="space-y-2 font-mono text-xs">
                    {Object.entries(summary.categories || {}).map(([cat, count]) => {
                      const pct = summary.total_commands > 0 
                        ? Math.round((count / summary.total_commands) * 100) 
                        : 0;
                      return (
                        <div key={cat}>
                          <div className="flex justify-between text-slate-300 mb-1 text-[11px]">
                            <span>{cat}</span>
                            <span>{count} ({pct}%)</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-[#162035] overflow-hidden">
                            <div 
                              className={`h-full ${
                                cat === 'READ' ? 'bg-emerald-400' :
                                cat === 'WRITE' ? 'bg-rose-400' :
                                cat === 'SCAN' ? 'bg-amber-400' : 'bg-cyan-400'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#1e293b] mt-4 flex items-center gap-2 text-[11px] text-slate-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>Safely detached MONITOR connection automatically.</span>
                </div>
              </div>

              {/* Hot Keys Table */}
              <div className="lg:col-span-2 p-4 rounded-xl bg-[#0f1627] border border-[#1e293b]">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-rose-400" />
                  <span>High-Frequency Hot Keys</span>
                </h3>
                {summary.hot_keys && summary.hot_keys.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="text-slate-400 border-b border-[#1e293b]">
                          <th className="pb-2">Key Name</th>
                          <th className="pb-2 text-right">Access Count</th>
                          <th className="pb-2 text-right">Access Share</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e293b]">
                        {summary.hot_keys.map((hk, i) => {
                          const pct = ((hk.count / summary.total_commands) * 100).toFixed(1);
                          return (
                            <tr key={i} className="hover:bg-[#162035]/60">
                              <td className="py-2 text-cyan-300 font-bold">{hk.key}</td>
                              <td className="py-2 text-right text-white">{hk.count}</td>
                              <td className="py-2 text-right text-slate-400">{pct}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No repeated hot keys observed during this sample window.
                  </div>
                )}
              </div>
            </div>

            {/* Intercepted Commands Log Table */}
            <div className="rounded-xl border border-[#1e293b] bg-[#0d1322] overflow-hidden">
              <div className="p-3 bg-[#101728] border-b border-[#1e293b] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white">Intercepted Command Stream</span>
                  <span className="text-[11px] text-slate-500 font-mono">({filteredCommands.length} events)</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
                  {['ALL', 'READ', 'WRITE', 'SCAN', 'ADMIN'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-colors ${
                        categoryFilter === cat
                          ? 'bg-[#1e293b] text-white border border-slate-600'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#1e293b] bg-[#090d16] text-slate-400 text-[11px]">
                      <th className="py-2 px-3">Time</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3">Client IP</th>
                      <th className="py-2 px-3">DB</th>
                      <th className="py-2 px-3">Command</th>
                      <th className="py-2 px-3">Target Key</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e293b]">
                    {filteredCommands.map((cmd, idx) => (
                      <tr key={idx} className="hover:bg-[#131b2d] transition-colors">
                        <td className="py-2 px-3 text-slate-500 text-[11px]">
                          {new Date(cmd.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${categoryColors[cmd.category] || categoryColors.OTHER}`}>
                            {cmd.category}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-400">{cmd.client_ip}</td>
                        <td className="py-2 px-3 text-slate-500">db{cmd.db}</td>
                        <td className="py-2 px-3 font-bold text-white">{cmd.command}</td>
                        <td className="py-2 px-3 text-cyan-300 truncate max-w-xs">{cmd.key || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          /* Empty / Initial State */
          <div className="h-96 flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-dashed border-[#1e293b] bg-[#0d1322]/50">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mb-4 shadow-xl shadow-orange-950/20">
              <Zap className="w-8 h-8" />
            </div>
            <h2 className="text-base font-bold text-white mb-1">
              No Traffic Session Active
            </h2>
            <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
              Click the button below to start a 5-second safe sampling session. ValkeyLens will stream live commands, identify hot keys, and disconnect before any memory pressure can occur.
            </p>
            <button
              onClick={startSampling}
              disabled={isSampling}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:brightness-110 shadow-lg shadow-orange-900/30 transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start 5-Second Traffic Sampling</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
