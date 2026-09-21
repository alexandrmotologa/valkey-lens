import React, { useState, useEffect } from 'react';
import { Layers, Clock, AlertCircle } from 'lucide-react';
import { api, KeyDetail, StreamDetail } from '../../api/client';

interface StreamViewProps {
  detail: KeyDetail;
  readOnly: boolean;
  onRefresh: () => void;
}

export const StreamView: React.FC<StreamViewProps> = ({ detail }) => {
  const [streamData, setStreamData] = useState<StreamDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'entries' | 'groups'>('entries');

  useEffect(() => {
    const loadStream = async () => {
      setLoading(true);
      try {
        const res = await api.getStreamDetail(detail.name, 50);
        setStreamData(res);
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    };
    loadStream();
  }, [detail]);

  return (
    <div className="flex flex-col h-full bg-[#0d1322] border border-[#1e293b] rounded-xl overflow-hidden">
      {/* Tab bar */}
      <div className="h-11 px-4 border-b border-[#1e293b] bg-[#101625] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('entries')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'entries'
                ? 'bg-[#1e293b] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Entries Timeline ({streamData?.entries.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'groups'
                ? 'bg-[#1e293b] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Consumer Groups ({streamData?.groups.length || 0})
          </button>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          Total Length: {streamData?.length || detail.length}
        </span>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="py-12 text-center text-slate-500 text-xs">Loading stream data...</div>
        ) : activeTab === 'entries' ? (
          <div className="space-y-3">
            {streamData?.entries.map((entry) => (
              <div
                key={entry.id}
                className="p-3 bg-[#161e31] border border-[#1e293b] rounded-lg text-xs font-mono space-y-2"
              >
                <div className="flex items-center justify-between text-slate-400 border-b border-[#1e293b]/60 pb-1.5">
                  <span className="text-cyan-400 font-semibold">{entry.id}</span>
                  <div className="flex items-center gap-1 text-[11px]">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(entry.timestamp).toLocaleString()}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-300">
                  {Object.entries(entry.fields).map(([k, v]) => (
                    <div key={k} className="bg-[#0b0f19] px-2 py-1 rounded border border-[#1e293b]/40">
                      <span className="text-purple-400 font-medium">{k}:</span>{' '}
                      <span className="text-slate-200">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {(!streamData || streamData.entries.length === 0) && (
              <div className="py-12 text-center text-slate-500 text-xs">No stream entries found</div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 border-b border-[#1e293b]">
                <tr>
                  <th className="py-2 px-3">Group Name</th>
                  <th className="py-2 px-3">Consumers</th>
                  <th className="py-2 px-3">Pending Messages (PEL)</th>
                  <th className="py-2 px-3">Last Delivered ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]/60 font-mono">
                {streamData?.groups.map((grp) => (
                  <tr key={grp.name} className="hover:bg-[#161e31]/40">
                    <td className="py-2.5 px-3 text-purple-400 font-semibold">{grp.name}</td>
                    <td className="py-2.5 px-3 text-slate-200">{grp.consumers}</td>
                    <td className="py-2.5 px-3">
                      {grp.pending > 0 ? (
                        <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          <AlertCircle className="w-3 h-3" />
                          {grp.pending} unacked
                        </span>
                      ) : (
                        <span className="text-emerald-400">0 pending</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{grp.last_delivered_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
