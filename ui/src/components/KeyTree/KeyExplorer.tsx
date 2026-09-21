import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Plus, 
  Folder, 
  FolderOpen, 
  Key, 
  RefreshCw, 
  Trash2, 
  ChevronRight, 
  ChevronDown,
  X
} from 'lucide-react';
import { api, KeySummary, KeyDetail, formatBytes } from '../../api/client';
import { KeyDetailView } from '../KeyDetail/KeyDetailView';

interface KeyExplorerProps {
  readOnly: boolean;
}

export const KeyExplorer: React.FC<KeyExplorerProps> = ({ readOnly }) => {
  const [keys, setKeys] = useState<KeySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [pattern, setPattern] = useState('*');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [keyDetail, setKeyDetail] = useState<KeyDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Tree view state
  const [viewMode, setViewMode] = useState<'tree' | 'flat'>('tree');
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({ user: true });

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyType, setNewKeyType] = useState('string');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [newKeyTTL, setNewKeyTTL] = useState('');

  // Bulk Delete Modal
  const [showDeletePatternModal, setShowDeletePatternModal] = useState(false);
  const [deletePatternQuery, setDeletePatternQuery] = useState('');

  const loadKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getKeys(0, pattern, 500);
      setKeys(res.keys);
      if (res.keys.length > 0 && !selectedKey) {
        setSelectedKey(res.keys[0].name);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [pattern, selectedKey]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  // Load key detail when selectedKey changes
  useEffect(() => {
    if (!selectedKey) {
      setKeyDetail(null);
      return;
    }
    const fetchDetail = async () => {
      setDetailLoading(true);
      try {
        const d = await api.getKeyDetail(selectedKey);
        setKeyDetail(d);
      } catch (err) {
        console.error(err);
        setKeyDetail(null);
      } finally {
        setDetailLoading(false);
      }
    };
    fetchDetail();
  }, [selectedKey]);

  const toggleFolder = (path: string) => {
    setOpenFolders((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName) return;
    try {
      const ttl = parseInt(newKeyTTL, 10) || 0;
      await api.setString(newKeyName, newKeyValue, ttl);
      setShowCreateModal(false);
      setNewKeyName('');
      setNewKeyValue('');
      setNewKeyTTL('');
      await loadKeys();
      setSelectedKey(newKeyName);
    } catch (err: any) {
      alert(err.message || 'Failed to create key');
    }
  };

  const handleDeletePattern = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletePatternQuery) return;
    if (!confirm(`Are you sure you want to delete ALL keys matching '${deletePatternQuery}'?`)) return;
    try {
      const res = await api.deletePattern(deletePatternQuery);
      alert(`Successfully removed ${res.deleted} keys`);
      setShowDeletePatternModal(false);
      setDeletePatternQuery('');
      await loadKeys();
    } catch (err: any) {
      alert(err.message || 'Failed to delete keys');
    }
  };

  // Filter keys by type
  const filteredKeys = keys.filter((k) => {
    if (typeFilter !== 'all' && k.type.toLowerCase() !== typeFilter.toLowerCase()) {
      return false;
    }
    return true;
  });

  // Group keys for tree hierarchy
  const treeNodes = React.useMemo(() => {
    const tree: Record<string, KeySummary[]> = {};
    for (const k of filteredKeys) {
      const ns = k.namespace || 'root';
      if (!tree[ns]) tree[ns] = [];
      tree[ns].push(k);
    }
    return tree;
  }, [filteredKeys]);

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'string': return 'text-[#00f5ff]';
      case 'hash': return 'text-indigo-400';
      case 'list': return 'text-amber-400';
      case 'set': return 'text-emerald-400';
      case 'zset': return 'text-purple-400';
      case 'stream': return 'text-rose-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="flex-1 flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Left Sidebar (Keyspace Browser) */}
      <div className="w-80 md:w-96 border-r border-[#1e293b] bg-[#090d16] flex flex-col h-full shrink-0">
        {/* Search & Actions Header */}
        <div className="p-3 border-b border-[#1e293b] space-y-2.5 bg-[#0e1424]">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadKeys()}
                placeholder="Filter pattern (e.g. user:*)"
                className="w-full bg-[#161e31] text-xs font-mono text-white pl-8 pr-8 py-1.5 rounded-lg border border-[#1e293b] focus:outline-none focus:border-[#00f5ff]/50"
              />
              {pattern !== '*' && (
                <button
                  onClick={() => setPattern('*')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              onClick={loadKeys}
              disabled={loading}
              className="p-1.5 bg-[#161e31] hover:bg-[#1e293b] text-slate-300 rounded-lg border border-[#1e293b] transition-colors"
              title="Refresh Keys"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {!readOnly && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="p-1.5 bg-[#00f5ff] hover:bg-[#38bdf8] text-slate-950 font-bold rounded-lg transition-colors"
                title="Create Key"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type Filter Pills & Mode Toggle */}
          <div className="flex items-center justify-between gap-1 text-[11px]">
            <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar">
              {['all', 'string', 'hash', 'list', 'set', 'zset', 'stream'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-2 py-0.5 rounded capitalize whitespace-nowrap transition-colors ${
                    typeFilter === t
                      ? 'bg-[#00f5ff]/20 text-[#00f5ff] font-medium border border-[#00f5ff]/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <button
              onClick={() => setViewMode(viewMode === 'tree' ? 'flat' : 'tree')}
              className="text-slate-400 hover:text-white text-[11px] font-mono shrink-0 pl-1"
            >
              {viewMode === 'tree' ? 'Tree' : 'Flat'}
            </button>
          </div>
        </div>

        {/* Keys List / Hierarchy */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 font-mono text-xs">
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-xs font-sans">
              Scanning keyspace...
            </div>
          ) : viewMode === 'tree' ? (
            /* Tree View */
            Object.entries(treeNodes).map(([namespace, items]) => {
              const isOpen = openFolders[namespace] !== false;
              return (
                <div key={namespace} className="space-y-0.5">
                  <div
                    onClick={() => toggleFolder(namespace)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded text-slate-400 hover:text-slate-200 hover:bg-[#161e31]/60 cursor-pointer select-none transition-colors"
                  >
                    {isOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    {isOpen ? (
                      <FolderOpen className="w-3.5 h-3.5 text-amber-400/80" />
                    ) : (
                      <Folder className="w-3.5 h-3.5 text-amber-400/80" />
                    )}
                    <span className="font-semibold text-slate-300 truncate">{namespace}</span>
                    <span className="text-[10px] text-slate-500 ml-auto">({items.length})</span>
                  </div>

                  {isOpen && (
                    <div className="pl-5 space-y-0.5 border-l border-[#1e293b]/50 ml-3">
                      {items.map((k) => (
                        <div
                          key={k.name}
                          onClick={() => setSelectedKey(k.name)}
                          className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors ${
                            selectedKey === k.name
                              ? 'bg-[#00f5ff]/15 text-white border border-[#00f5ff]/30'
                              : 'text-slate-300 hover:bg-[#161e31]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className={`text-[10px] uppercase font-bold ${getTypeColor(k.type)}`}>
                              {k.type.slice(0, 3)}
                            </span>
                            <span className="truncate">{k.name.split(':').pop() || k.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-500">{formatBytes(k.memory_bytes)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            /* Flat View */
            filteredKeys.map((k) => (
              <div
                key={k.name}
                onClick={() => setSelectedKey(k.name)}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition-colors ${
                  selectedKey === k.name
                    ? 'bg-[#00f5ff]/15 text-white border border-[#00f5ff]/30'
                    : 'text-slate-300 hover:bg-[#161e31]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Key className={`w-3.5 h-3.5 shrink-0 ${getTypeColor(k.type)}`} />
                  <span className="truncate">{k.name}</span>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0">{formatBytes(k.memory_bytes)}</span>
              </div>
            ))
          )}

          {!loading && filteredKeys.length === 0 && (
            <div className="py-12 text-center text-slate-500 font-sans text-xs">
              No keys match filter
            </div>
          )}
        </div>

        {/* Footer info & bulk action */}
        <div className="p-2.5 border-t border-[#1e293b] bg-[#0c1220] flex items-center justify-between text-xs text-slate-400">
          <span>{filteredKeys.length} keys displayed</span>
          {!readOnly && (
            <button
              onClick={() => setShowDeletePatternModal(true)}
              className="flex items-center gap-1 text-slate-500 hover:text-rose-400 text-[11px] transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Batch Delete
            </button>
          )}
        </div>
      </div>

      {/* Right Master Detail Pane */}
      <KeyDetailView
        detail={keyDetail}
        loading={detailLoading}
        readOnly={readOnly}
        onRefresh={() => {
          if (selectedKey) {
            api.getKeyDetail(selectedKey).then(setKeyDetail);
          }
        }}
        onKeyDeleted={() => {
          setSelectedKey(null);
          loadKeys();
        }}
      />

      {/* Create Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateKey}
            className="w-full max-w-md bg-[#101625] border border-[#1e293b] rounded-xl p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
              <h3 className="font-semibold text-white text-sm">Create New Key</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Key Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. user:profile:1005"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-[#1e293b] text-white p-2 rounded focus:outline-none focus:border-[#00f5ff]/50 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Data Type</label>
                <select
                  value={newKeyType}
                  onChange={(e) => setNewKeyType(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-[#1e293b] text-white p-2 rounded focus:outline-none font-mono"
                >
                  <option value="string">String</option>
                  <option value="hash">Hash</option>
                  <option value="list">List</option>
                  <option value="set">Set</option>
                  <option value="zset">Sorted Set</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Initial Value</label>
                <textarea
                  rows={3}
                  placeholder="Value string or JSON..."
                  value={newKeyValue}
                  onChange={(e) => setNewKeyValue(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-[#1e293b] text-white p-2 rounded focus:outline-none focus:border-[#00f5ff]/50 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">TTL (Seconds, optional)</label>
                <input
                  type="number"
                  placeholder="e.g. 3600 (0 for no expiration)"
                  value={newKeyTTL}
                  onChange={(e) => setNewKeyTTL(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-[#1e293b] text-white p-2 rounded focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#1e293b]">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold text-slate-900 bg-[#00f5ff] hover:bg-[#38bdf8] rounded"
              >
                Create Key
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Batch Delete Pattern Modal */}
      {showDeletePatternModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleDeletePattern}
            className="w-full max-w-md bg-[#101625] border border-rose-500/30 rounded-xl p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
              <h3 className="font-semibold text-rose-400 text-sm flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Safe Batch Delete by Pattern
              </h3>
              <button
                type="button"
                onClick={() => setShowDeletePatternModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Scans cursor in chunks and non-blockingly removes all matching keys from the keyspace.
            </p>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Target Key Pattern</label>
              <input
                type="text"
                required
                placeholder="e.g. cache:temp:*"
                value={deletePatternQuery}
                onChange={(e) => setDeletePatternQuery(e.target.value)}
                className="w-full bg-[#0b0f19] border border-[#1e293b] text-white p-2 rounded focus:outline-none focus:border-rose-500/50 font-mono text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#1e293b]">
              <button
                type="button"
                onClick={() => setShowDeletePatternModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded"
              >
                Execute Safe Delete
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
