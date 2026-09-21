import React, { useState, useEffect } from 'react';
import { 
  Network, 
  Search, 
  Server, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  ArrowRight,
  ShieldAlert,
  Hash,
  Database
} from 'lucide-react';
import { api, TopologyReport, SlotLookupResult } from '../../api/client';

export const ClusterMap: React.FC = () => {
  const [report, setReport] = useState<TopologyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Slot calculator
  const [keyInput, setKeyInput] = useState('user:{1001}:profile');
  const [slotResult, setSlotResult] = useState<SlotLookupResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const loadTopology = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getClusterTopology();
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load cluster topology');
    } finally {
      setLoading(false);
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) return;
    setIsCalculating(true);
    try {
      const res = await api.lookupClusterSlot(keyInput.trim());
      setSlotResult(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsCalculating(false);
    }
  };

  useEffect(() => {
    loadTopology();
  }, []);

  // Initial lookup calculation
  useEffect(() => {
    if (keyInput) {
      api.lookupClusterSlot(keyInput).then(setSlotResult).catch(() => {});
    }
  }, []);

  return (
    <div className="h-full flex flex-col bg-[#0b0f19] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#1e293b] bg-[#0d1322] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-sky-400" />
            <h1 className="text-lg font-bold text-white tracking-tight">
              Cluster Topology & 16,384 Hash Slot Visualizer
            </h1>
            {report?.is_cluster ? (
              <span className="text-xs bg-sky-500/10 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded-full font-mono font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Cluster Mode Active ({report.nodes.length} nodes)
              </span>
            ) : (
              <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono font-medium">
                Standalone Instance Mode
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Inspect master-replica shard distributions and test key CRC16 hash slot routing with hash-tag support.
          </p>
        </div>

        <button
          onClick={loadTopology}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#162035] hover:bg-[#1e293b] text-xs text-slate-300 border border-slate-700 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-400' : ''}`} />
          <span>Refresh Topology</span>
        </button>
      </div>

      {error && (
        <div className="m-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main View Area */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Interactive CRC16 Hash Slot Lookup Widget */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-[#0d1627] to-[#101b33] border border-[#1e293b] shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                <Hash className="w-4 h-4" />
                <span>CRC16 Key Slot Resolver</span>
              </h2>
              <p className="text-xs text-slate-400">
                Type any key to calculate CRC16 XMODEM hash slot (supports <code className="text-sky-300">{"{hash_tag}"}</code> syntax).
              </p>
            </div>

            <form onSubmit={handleLookup} className="flex items-center gap-2">
              <input
                type="text"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="e.g. user:{1001}:profile"
                className="bg-[#090d16] border border-slate-700 text-xs text-white rounded-lg px-3 py-2 w-72 font-mono focus:outline-none focus:border-sky-400"
              />
              <button
                type="submit"
                disabled={isCalculating}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow-md shadow-sky-950/40"
              >
                Resolve
              </button>
            </form>
          </div>

          {slotResult && (
            <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
              <div className="p-2.5 rounded-lg bg-[#090d16] border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase">Input Key</div>
                <div className="font-bold text-white truncate">{slotResult.key}</div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#090d16] border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase">Hash Tag Extracted</div>
                <div className="font-bold text-sky-400">
                  {slotResult.hash_tag ? `{${slotResult.hash_tag}}` : 'Entire Key'}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#090d16] border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase">Computed Hash Slot</div>
                <div className="font-bold text-emerald-400 text-sm">
                  #{slotResult.slot} <span className="text-[10px] text-slate-500">/ 16383</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#090d16] border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase">Owning Master Node</div>
                <div className="font-bold text-cyan-300 truncate">
                  {slotResult.node_addr || slotResult.node_id || 'Primary Master'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Shard Visual Heatmap */}
        {report && (
          <div className="p-4 rounded-xl bg-[#0f1627] border border-[#1e293b] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-sky-400" />
                <span>16,384 Hash Slot Allocation</span>
              </h3>
              <span className="text-xs font-mono text-slate-400">
                Assigned: <strong className="text-emerald-400">{report.assigned_slots.toLocaleString()}</strong> / 16,384 (100%)
              </span>
            </div>

            {/* Visual Bar */}
            <div className="w-full h-8 rounded-lg bg-[#090d16] border border-slate-800 overflow-hidden flex">
              {report.nodes
                .filter((n) => n.role === 'master' && n.slot_count > 0)
                .map((node, i) => {
                  const pct = ((node.slot_count / 16384) * 100).toFixed(1);
                  const colors = ['bg-sky-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-pink-500'];
                  const color = colors[i % colors.length];

                  return (
                    <div
                      key={node.id}
                      style={{ width: `${pct}%` }}
                      className={`h-full ${color} opacity-80 hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-mono text-white font-bold px-1 truncate border-r border-black/30 cursor-pointer`}
                      title={`${node.address}: ${node.slot_count} slots (${pct}%)`}
                    >
                      {node.address.split(':')[1] || node.address} ({pct}%)
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Nodes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {report?.nodes.map((node) => {
            const isMaster = node.role === 'master';
            const isTargetNode = slotResult?.node_id === node.id;

            return (
              <div
                key={node.id}
                className={`p-4 rounded-xl border transition-all ${
                  isTargetNode
                    ? 'bg-[#121c32] border-sky-400 shadow-lg shadow-sky-950/40'
                    : 'bg-[#0f1627] border-[#1e293b]'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Server className={`w-4 h-4 ${isMaster ? 'text-sky-400' : 'text-purple-400'}`} />
                    <span className="font-bold text-white text-xs font-mono">{node.address}</span>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase font-mono ${
                    isMaster 
                      ? 'bg-sky-500/10 text-sky-400 border-sky-500/30' 
                      : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                  }`}>
                    {node.role}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-mono text-slate-400">
                  <div className="text-[11px] truncate">
                    <span className="text-slate-500">ID:</span> {node.id}
                  </div>
                  {node.master_id && (
                    <div className="text-[11px] truncate">
                      <span className="text-slate-500">Master ID:</span> {node.master_id}
                    </div>
                  )}
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-500">Slots Owned:</span>
                    <strong className="text-white">{node.slot_count.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Link State:</span>
                    <span className="text-emerald-400 font-bold">{node.link_state}</span>
                  </div>
                </div>

                {node.slots.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase font-mono mb-1.5">Slot Ranges</div>
                    <div className="flex flex-wrap gap-1">
                      {node.slots.map((sr, idx) => (
                        <span key={idx} className="text-[10px] bg-[#162035] text-sky-300 px-2 py-0.5 rounded border border-slate-700/60 font-mono">
                          {sr.start} - {sr.end}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
