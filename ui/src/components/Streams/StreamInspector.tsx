import React, { useState, useEffect } from 'react';
import { Layers, RefreshCw, AlertCircle, Clock, Search, Users } from 'lucide-react';
import { api, StreamDetail, PendingEntry } from '../../api/client';

export const StreamInspector: React.FC = () => {
  const [streamKey, setStreamKey] = useState('stream:orders:events');
  const [streamData, setStreamData] = useState<StreamDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [pendingEntries, setPendingEntries] = useState<PendingEntry[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);

  const loadStream = async () => {
    if (!streamKey) return;
    setLoading(true);
    try {
      const res = await api.getStreamDetail(streamKey, 50);
      setStreamData(res);
      if (res.groups.length > 0 && !selectedGroup) {
        setSelectedGroup(res.groups[0].name);
      }
    } catch (err) {
      console.error(err);
      setStreamData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStream();
  }, [streamKey]);

  useEffect(() => {
    if (!streamKey || !selectedGroup) return;
    const fetchPending = async () => {
      setLoadingPending(true);
      try {
        const p = await api.getStreamPending(streamKey, selectedGroup, 50);
        setPendingEntries(p);
      } catch {
        setPendingEntries([]);
      } finally {
        setLoadingPending(false);
      }
    };
    fetchPending();
  }, [streamKey, selectedGroup]);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] overflow-y-auto p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1e293b] pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-purple-400" />
            Valkey & Redis Stream Inspector
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time event log timeline, consumer group lag, and Pending Entries List (PEL) inspection
          </p>
        </div>

        {/* Stream Key Search Input */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={streamKey}
              onChange={(e) => setStreamKey(e.target.value)}
              placeholder="Stream key..."
              className="bg-[#101625] text-xs font-mono text-white pl-8 pr-3 py-1.5 rounded-lg border border-[#1e293b] focus:outline-none focus:border-[#00f5ff]/50 w-64"
            />
          </div>

          <button
            onClick={loadStream}
            disabled={loading}
            className="p-1.5 bg-[#161e31] hover:bg-[#1e293b] text-slate-300 rounded-lg border border-[#1e293b] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stream Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#101625] border border-[#1e293b] space-y-1">
          <div className="text-xs text-slate-400 font-medium">Total Messages</div>
          <div className="text-2xl font-bold font-mono text-white">
            {streamData?.length || 0}
          </div>
          <div className="text-[11px] text-slate-500">Append-only log length</div>
        </div>

        <div className="p-4 rounded-xl bg-[#101625] border border-[#1e293b] space-y-1">
          <div className="text-xs text-slate-400 font-medium">Consumer Groups</div>
          <div className="text-2xl font-bold font-mono text-purple-400">
            {streamData?.groups.length || 0}
          </div>
          <div className="text-[11px] text-slate-500">Active worker pools</div>
        </div>

        <div className="p-4 rounded-xl bg-[#101625] border border-[#1e293b] space-y-1">
          <div className="text-xs text-slate-400 font-medium">First Entry ID</div>
          <div className="text-sm font-bold font-mono text-cyan-400 truncate" title={streamData?.first_entry_id}>
            {streamData?.first_entry_id || 'N/A'}
          </div>
          <div className="text-[11px] text-slate-500">Earliest available timestamp</div>
        </div>

        <div className="p-4 rounded-xl bg-[#101625] border border-[#1e293b] space-y-1">
          <div className="text-xs text-slate-400 font-medium">Last Entry ID</div>
          <div className="text-sm font-bold font-mono text-emerald-400 truncate" title={streamData?.last_entry_id}>
            {streamData?.last_entry_id || 'N/A'}
          </div>
          <div className="text-[11px] text-slate-500">Most recent appended event</div>
        </div>
      </div>

      {/* Consumer Groups & PEL Inspector */}
      <div className="p-5 rounded-xl bg-[#101625] border border-[#1e293b] space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-400" />
          Consumer Groups & Pending Entries (PEL)
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Groups list */}
          <div className="space-y-2">
            <div className="text-xs text-slate-400 font-medium">Select Consumer Group:</div>
            <div className="space-y-1.5">
              {streamData?.groups.map((g) => (
                <div
                  key={g.name}
                  onClick={() => setSelectedGroup(g.name)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedGroup === g.name
                      ? 'bg-[#1e293b] border-[#00f5ff]/40 shadow-sm'
                      : 'bg-[#161e31] border-[#1e293b] hover:bg-[#1a233a]'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="font-semibold text-purple-300">{g.name}</span>
                    <span className="text-slate-400 text-[11px]">{g.consumers} workers</span>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-[11px] font-mono">
                    <span className="text-slate-400">Pending:</span>
                    {g.pending > 0 ? (
                      <span className="text-amber-400 font-semibold">{g.pending} msgs</span>
                    ) : (
                      <span className="text-emerald-400">0 unacked</span>
                    )}
                  </div>
                </div>
              ))}
              {(!streamData || streamData.groups.length === 0) && (
                <div className="p-4 text-center text-slate-500 text-xs">No consumer groups registered</div>
              )}
            </div>
          </div>

          {/* Pending Messages (PEL) detail table */}
          <div className="lg:col-span-2 space-y-2">
            <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
              <span>Unacknowledged Messages in Group: <strong className="text-white font-mono">{selectedGroup || 'None'}</strong></span>
              <span className="font-mono text-[11px]">{pendingEntries.length} items</span>
            </div>

            <div className="bg-[#0b0f19] border border-[#1e293b] rounded-lg overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="sticky top-0 bg-[#161e31] text-slate-400 border-b border-[#1e293b]">
                  <tr>
                    <th className="py-2 px-3">Message ID</th>
                    <th className="py-2 px-3">Owner Consumer</th>
                    <th className="py-2 px-3">Idle Time</th>
                    <th className="py-2 px-3">Deliveries</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e293b]/60">
                  {pendingEntries.map((p) => (
                    <tr key={p.id} className="hover:bg-[#161e31]/40">
                      <td className="py-2 px-3 text-cyan-400">{p.id}</td>
                      <td className="py-2 px-3 text-slate-300">{p.consumer}</td>
                      <td className="py-2 px-3 text-amber-400">{(p.idle_time_ms / 1000).toFixed(1)}s</td>
                      <td className="py-2 px-3 text-slate-400">{p.delivery_count}x</td>
                    </tr>
                  ))}
                  {pendingEntries.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500 font-sans">
                        {loadingPending ? 'Loading pending entries...' : 'All messages acknowledged! Zero pending lag.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Stream Entries Timeline */}
      <div className="p-5 rounded-xl bg-[#101625] border border-[#1e293b] space-y-4">
        <h2 className="text-sm font-semibold text-white">Event Stream Timeline (Recent 50 Messages)</h2>

        <div className="space-y-3 font-mono text-xs">
          {streamData?.entries.map((entry) => (
            <div
              key={entry.id}
              className="p-3.5 bg-[#161e31] border border-[#1e293b] rounded-lg space-y-2 hover:border-[#00f5ff]/30 transition-colors"
            >
              <div className="flex items-center justify-between text-slate-400 border-b border-[#1e293b]/60 pb-1.5">
                <span className="text-cyan-400 font-bold">{entry.id}</span>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(entry.timestamp).toLocaleTimeString()} ({entry.timestamp})</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(entry.fields).map(([k, v]) => (
                  <div key={k} className="bg-[#0b0f19] px-2.5 py-1.5 rounded border border-[#1e293b]/60 flex items-center justify-between gap-2">
                    <span className="text-purple-400 font-medium">{k}:</span>
                    <span className="text-slate-200 truncate">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {(!streamData || streamData.entries.length === 0) && (
            <div className="py-12 text-center text-slate-500 font-sans text-xs">
              No entries found in stream
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
