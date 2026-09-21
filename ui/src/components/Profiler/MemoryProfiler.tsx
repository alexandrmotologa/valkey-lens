import React, { useState, useEffect } from 'react';
import { 
  PieChart, 
  Download, 
  RefreshCw, 
  AlertTriangle, 
  Layers, 
  ShieldAlert,
  ArrowUpRight,
  Sparkles,
  Copy,
  Check
} from 'lucide-react';
import { api, ProfileReport, formatBytes, NamespaceNode } from '../../api/client';

interface MemoryProfilerProps {
  onSelectKey: (key: string) => void;
}

export const MemoryProfiler: React.FC<MemoryProfilerProps> = ({ onSelectKey }) => {
  const [report, setReport] = useState<ProfileReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedNamespace, setSelectedNamespace] = useState<string | null>(null);
  const [copiedCli, setCopiedCli] = useState<string | null>(null);

  const handleCopyCli = (cmd: string, id: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCli(id);
    setTimeout(() => setCopiedCli(null), 2000);
  };

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await api.getMemoryProfile(10000, '*', ':', 50);
      setReport(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const filteredNamespaces = report?.namespaces.filter((ns) => {
    if (!selectedNamespace) return true;
    return ns.full_path.startsWith(selectedNamespace);
  }) || [];

  // Color generator for treemap blocks
  const getBlockColor = (index: number) => {
    const palette = [
      'from-cyan-500/30 to-blue-600/30 border-cyan-400/40 text-cyan-200',
      'from-purple-500/30 to-indigo-600/30 border-purple-400/40 text-purple-200',
      'from-amber-500/30 to-orange-600/30 border-amber-400/40 text-amber-200',
      'from-emerald-500/30 to-teal-600/30 border-emerald-400/40 text-emerald-200',
      'from-rose-500/30 to-pink-600/30 border-rose-400/40 text-rose-200',
      'from-blue-500/30 to-slate-600/30 border-blue-400/40 text-blue-200',
    ];
    return palette[index % palette.length];
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] overflow-y-auto p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header with Title & Action Exports */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1e293b] pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <PieChart className="w-5 h-5 text-amber-400" />
            Non-Blocking Memory Profiler
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time keyspace memory aggregation via radix prefix trees & bounded big-key priority queues
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadProfile}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-300 bg-[#161e31] hover:bg-[#1e293b] border border-[#1e293b] rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Re-scan
          </button>

          <a
            href={api.getExportHTMLUrl()}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-900 bg-[#00f5ff] hover:bg-[#38bdf8] rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export HTML Report
          </a>

          <a
            href={api.getExportJSONUrl()}
            download
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-[#161e31] hover:bg-[#1e293b] border border-[#1e293b] rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            JSON Dump
          </a>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#101625] border border-[#1e293b] space-y-1">
          <div className="text-xs text-slate-400 font-medium">Scanned Keys</div>
          <div className="text-2xl font-bold font-mono text-white">
            {report?.scanned_keys.toLocaleString() || 0}
          </div>
          <div className="text-[11px] text-slate-500">Sampled without blocking cluster</div>
        </div>

        <div className="p-4 rounded-xl bg-[#101625] border border-[#1e293b] space-y-1">
          <div className="text-xs text-slate-400 font-medium">Analyzed Memory</div>
          <div className="text-2xl font-bold font-mono text-[#00f5ff]">
            {formatBytes(report?.total_bytes || 0)}
          </div>
          <div className="text-[11px] text-slate-500">Aggregate dataset footprint</div>
        </div>

        <div className="p-4 rounded-xl bg-[#101625] border border-[#1e293b] space-y-1">
          <div className="text-xs text-slate-400 font-medium">Active Namespaces</div>
          <div className="text-2xl font-bold font-mono text-purple-400">
            {report?.namespaces.length || 0}
          </div>
          <div className="text-[11px] text-slate-500">Segmented by &apos;:&apos; delimiters</div>
        </div>

        <div className="p-4 rounded-xl bg-[#101625] border border-[#1e293b] space-y-1">
          <div className="text-xs text-slate-400 font-medium">TTL Leak Risk</div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {report?.leak_alerts?.length || 0} Alerts
          </div>
          <div className="text-[11px] text-slate-500">Namespaces with 0% expiration</div>
        </div>
      </div>

      {/* Cache Leak Alerts Banner */}
      {report?.leak_alerts && report.leak_alerts.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
            <AlertTriangle className="w-4 h-4" />
            <span>Cache Leak Warning: High-Memory Namespaces Lacking Expiration Policies</span>
          </div>
          <ul className="text-xs text-amber-300/90 pl-6 list-disc space-y-1">
            {report.leak_alerts.map((alert, i) => (
              <li key={i}>{alert}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Automated Memory Optimization Advisor */}
      {report?.insights && report.insights.length > 0 && (
        <div className="p-5 rounded-xl bg-[#0f1627] border border-[#1e293b] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Automated Memory Optimization Advisor</span>
              <span className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full font-mono">
                {report.insights.length} recommendations
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {report.insights.map((insight) => {
              const sev = (insight.severity || '').toLowerCase();
              const isCrit = sev === 'critical';
              const isWarn = sev === 'warning';
              return (
                <div
                  key={insight.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 ${
                    isCrit
                      ? 'bg-rose-500/5 border-rose-500/30'
                      : isWarn
                      ? 'bg-amber-500/5 border-amber-500/30'
                      : 'bg-cyan-500/5 border-cyan-500/30'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase font-mono ${
                        isCrit
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                          : isWarn
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                          : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                      }`}>
                        {insight.severity}
                      </span>
                      <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                        Reclaimable: {insight.estimated_reclaimable}
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-white font-sans">{insight.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">{insight.description}</p>
                  </div>

                  {insight.remediation_command && (
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                      <code className="text-[11px] font-mono text-slate-300 bg-[#090d16] px-2 py-1 rounded border border-slate-800 truncate flex-1">
                        {insight.remediation_command}
                      </code>
                      <button
                        onClick={() => handleCopyCli(insight.remediation_command!, insight.id)}
                        className="px-2 py-1 rounded bg-[#162035] hover:bg-[#1e293b] text-slate-300 hover:text-white border border-slate-700 text-xs font-sans flex items-center gap-1 shrink-0"
                        title="Copy CLI Command"
                      >
                        {copiedCli === insight.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCli === insight.id ? 'Copied' : 'Copy Fix'}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Visual TreeMap Section */}
      <div className="p-5 rounded-xl bg-[#101625] border border-[#1e293b] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#00f5ff]" />
            Memory Share TreeMap (Proportional Namespace Weights)
          </h2>
          {selectedNamespace && (
            <button
              onClick={() => setSelectedNamespace(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Clear Filter ({selectedNamespace})
            </button>
          )}
        </div>

        {/* Proportional Grid Layout */}
        <div className="grid grid-cols-12 gap-2 h-44">
          {report?.namespaces.slice(0, 6).map((ns, idx) => {
            // Allocate columns based on percentage (min 2, max 8)
            const span = Math.max(2, Math.min(8, Math.round((ns.percentage / 100) * 12)));
            return (
              <div
                key={ns.full_path}
                onClick={() => setSelectedNamespace(ns.full_path === selectedNamespace ? null : ns.full_path)}
                style={{ gridColumn: `span ${span}` }}
                className={`p-3 rounded-lg bg-gradient-to-br border cursor-pointer transition-all hover:scale-[1.01] flex flex-col justify-between overflow-hidden ${getBlockColor(
                  idx
                )} ${selectedNamespace === ns.full_path ? 'ring-2 ring-white shadow-lg' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <span className="font-mono font-bold text-xs truncate max-w-[80%]">{ns.full_path}</span>
                  <span className="text-[11px] font-mono opacity-80">{ns.percentage.toFixed(1)}%</span>
                </div>
                <div>
                  <div className="text-sm font-bold font-mono">{formatBytes(ns.total_bytes)}</div>
                  <div className="text-[10px] opacity-75 font-mono">{ns.key_count} keys</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout: Namespace Breakdown & Top 50 Big Keys */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Namespace Table */}
        <div className="p-5 rounded-xl bg-[#101625] border border-[#1e293b] space-y-4">
          <h2 className="text-sm font-semibold text-white">Namespace Distribution</h2>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs font-mono">
              <thead className="sticky top-0 bg-[#161e31] text-slate-400 border-b border-[#1e293b]">
                <tr>
                  <th className="py-2.5 px-3">Prefix</th>
                  <th className="py-2.5 px-3">Keys</th>
                  <th className="py-2.5 px-3">Memory</th>
                  <th className="py-2.5 px-3">Share</th>
                  <th className="py-2.5 px-3">Policy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]/60">
                {filteredNamespaces.map((ns) => (
                  <tr key={ns.full_path} className="hover:bg-[#161e31]/40 transition-colors">
                    <td className="py-2 px-3 text-slate-200 font-semibold">{ns.full_path}</td>
                    <td className="py-2 px-3 text-slate-400">{ns.key_count}</td>
                    <td className="py-2 px-3 text-cyan-400">{formatBytes(ns.total_bytes)}</td>
                    <td className="py-2 px-3 text-slate-300">{ns.percentage.toFixed(1)}%</td>
                    <td className="py-2 px-3">
                      {ns.volatile_count === 0 ? (
                        <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          Persistent
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          Expiring
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Top Big Keys Heap */}
        <div className="p-5 rounded-xl bg-[#101625] border border-[#1e293b] space-y-4">
          <h2 className="text-sm font-semibold text-white">Top Big Keys by Memory</h2>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs font-mono">
              <thead className="sticky top-0 bg-[#161e31] text-slate-400 border-b border-[#1e293b]">
                <tr>
                  <th className="py-2.5 px-3 w-12">#</th>
                  <th className="py-2.5 px-3">Key Name</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Memory</th>
                  <th className="py-2.5 px-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]/60">
                {report?.big_keys.map((bk, i) => (
                  <tr key={bk.key} className="hover:bg-[#161e31]/40 transition-colors group">
                    <td className="py-2 px-3 text-slate-500">#{i + 1}</td>
                    <td className="py-2 px-3 text-slate-200 truncate max-w-[200px]" title={bk.key}>
                      {bk.key}
                    </td>
                    <td className="py-2 px-3 text-purple-400 uppercase text-[10px]">{bk.type}</td>
                    <td className="py-2 px-3 text-[#00f5ff] font-semibold">{formatBytes(bk.bytes)}</td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={() => onSelectKey(bk.key)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-white rounded transition-opacity"
                        title="Open in Explorer"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
