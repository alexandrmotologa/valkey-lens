import React, { useState } from 'react';
import { Clock, Trash2, Database, ShieldAlert } from 'lucide-react';
import { KeyDetail, api, formatBytes } from '../../api/client';
import { StringView } from './StringView';
import { HashView } from './HashView';
import { ListView } from './ListView';
import { SetView } from './SetView';
import { ZSetView } from './ZSetView';
import { StreamView } from './StreamView';

interface KeyDetailViewProps {
  detail: KeyDetail | null;
  loading: boolean;
  readOnly: boolean;
  onRefresh: () => void;
  onKeyDeleted: () => void;
}

export const KeyDetailView: React.FC<KeyDetailViewProps> = ({
  detail,
  loading,
  readOnly,
  onRefresh,
  onKeyDeleted,
}) => {
  const [editingTTL, setEditingTTL] = useState(false);
  const [ttlInput, setTtlInput] = useState('');

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
        Loading key details...
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-3">
        <Database className="w-10 h-10 text-slate-600" />
        <p className="text-sm">Select a key from the keyspace explorer to inspect its values and memory metrics</p>
      </div>
    );
  }

  const handleDelete = async () => {
    if (readOnly) return;
    if (!confirm(`Are you sure you want to delete '${detail.name}'?`)) return;
    try {
      await api.deleteKey(detail.name);
      onKeyDeleted();
    } catch (err) {
      alert('Failed to delete key');
    }
  };

  const handleUpdateTTL = async (e: React.FormEvent) => {
    e.preventDefault();
    const sec = parseInt(ttlInput, 10);
    if (isNaN(sec)) return;
    try {
      await api.updateTTL(detail.name, sec);
      setEditingTTL(false);
      onRefresh();
    } catch {
      alert('Failed to update TTL');
    }
  };

  const getTypeBadgeClass = (t: string) => {
    switch (t.toLowerCase()) {
      case 'string':
        return 'bg-[#00f5ff]/15 text-[#00f5ff] border-[#00f5ff]/30';
      case 'hash':
        return 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30';
      case 'list':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'set':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'zset':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case 'stream':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-4 gap-3">
      {/* Top Header Card */}
      <div className="p-4 bg-[#101625] border border-[#1e293b] rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className={`px-2.5 py-1 text-xs font-semibold rounded-md border uppercase tracking-wider ${getTypeBadgeClass(
              detail.type
            )}`}
          >
            {detail.type}
          </span>
          <h2 className="text-base font-mono font-bold text-white break-all max-w-xl">
            {detail.name}
          </h2>
        </div>

        {/* Badges: Memory & TTL */}
        <div className="flex items-center gap-3">
          {/* Memory Usage */}
          <div className="text-xs bg-[#161e31] px-3 py-1.5 rounded-lg border border-[#1e293b] flex items-center gap-1.5 font-mono">
            <span className="text-slate-400">Memory:</span>
            <span className="text-white font-medium">{formatBytes(detail.memory_bytes)}</span>
          </div>

          {/* TTL Badge */}
          {editingTTL ? (
            <form onSubmit={handleUpdateTTL} className="flex items-center gap-1.5 bg-[#161e31] p-1 rounded-lg border border-[#00f5ff]/40">
              <input
                type="number"
                value={ttlInput}
                onChange={(e) => setTtlInput(e.target.value)}
                placeholder="TTL (sec, -1=none)"
                className="w-28 bg-[#0b0f19] text-xs font-mono text-white px-2 py-0.5 rounded focus:outline-none"
                autoFocus
              />
              <button type="submit" className="px-2 py-0.5 text-xs text-slate-900 bg-[#00f5ff] rounded font-medium">
                Set
              </button>
              <button
                type="button"
                onClick={() => setEditingTTL(false)}
                className="px-2 py-0.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </form>
          ) : (
            <div
              onClick={() => {
                if (!readOnly) {
                  setTtlInput(detail.ttl_ms > 0 ? String(Math.floor(detail.ttl_ms / 1000)) : '-1');
                  setEditingTTL(true);
                }
              }}
              className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5 font-mono transition-colors ${
                !readOnly ? 'cursor-pointer hover:border-[#00f5ff]/50' : ''
              } ${
                detail.ttl_ms > 0
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>
                {detail.ttl_ms > 0
                  ? `TTL: ${Math.floor(detail.ttl_ms / 1000)}s`
                  : 'No TTL (Persistent)'}
              </span>
            </div>
          )}

          {/* Delete Action */}
          {!readOnly ? (
            <button
              onClick={handleDelete}
              className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 transition-colors"
              title="Delete Key"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <div className="p-2 text-slate-500" title="Read-only mode active">
              <ShieldAlert className="w-4 h-4" />
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0">
        {detail.type === 'string' && (
          <StringView detail={detail} readOnly={readOnly} onRefresh={onRefresh} />
        )}
        {detail.type === 'hash' && (
          <HashView detail={detail} readOnly={readOnly} onRefresh={onRefresh} />
        )}
        {detail.type === 'list' && (
          <ListView detail={detail} readOnly={readOnly} onRefresh={onRefresh} />
        )}
        {detail.type === 'set' && (
          <SetView detail={detail} readOnly={readOnly} onRefresh={onRefresh} />
        )}
        {detail.type === 'zset' && (
          <ZSetView detail={detail} readOnly={readOnly} onRefresh={onRefresh} />
        )}
        {detail.type === 'stream' && (
          <StreamView detail={detail} readOnly={readOnly} onRefresh={onRefresh} />
        )}
      </div>
    </div>
  );
};
