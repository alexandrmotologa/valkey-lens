import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  RefreshCw, 
  XCircle, 
  AlertTriangle, 
  HardDrive, 
  Clock, 
  Terminal, 
  ShieldAlert,
  CheckCircle,
  Activity
} from 'lucide-react';
import { api, ClientInfo, formatBytes } from '../../api/client';

export const ClientManager: React.FC = () => {
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [killingId, setKillingId] = useState<number | null>(null);
  const [confirmKill, setConfirmKill] = useState<ClientInfo | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getClients();
      setClients(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
    const interval = setInterval(loadClients, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleKill = async (client: ClientInfo) => {
    setKillingId(client.id);
    try {
      await api.killClient(String(client.id), true);
      setSuccessMsg(`Successfully terminated client #${client.id} (${client.addr})`);
      setConfirmKill(null);
      loadClients();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || `Failed to terminate client #${client.id}`);
    } finally {
      setKillingId(null);
    }
  };

  const filtered = clients.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.addr.toLowerCase().includes(s) ||
      (c.name && c.name.toLowerCase().includes(s)) ||
      c.cmd.toLowerCase().includes(s) ||
      (c.user && c.user.toLowerCase().includes(s)) ||
      String(c.id).includes(s)
    );
  });

  const totalMem = clients.reduce((acc, c) => acc + (c.tot_mem_bytes || 0), 0);
  const maxOmem = clients.reduce((max, c) => Math.max(max, c.omem_bytes || 0), 0);
  const maxIdle = clients.reduce((max, c) => Math.max(max, c.idle_sec || 0), 0);

  return (
    <div className="h-full flex flex-col bg-[#0b0f19] overflow-hidden">
      {/* Header Bar */}
      <div className="p-4 border-b border-[#1e293b] bg-[#0d1322] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <h1 className="text-lg font-bold text-white tracking-tight">
              Client Connection Manager
            </h1>
            <span className="text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-mono font-medium">
              {clients.length} active
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor real-time client buffers, idle times, and terminate rogue connections safely.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by IP, ID, name, cmd..."
              className="bg-[#101726] border border-[#1e293b] text-xs text-slate-200 rounded-lg pl-9 pr-3 py-2 w-64 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            onClick={loadClients}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#162035] hover:bg-[#1e293b] text-xs text-slate-300 border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-[#080d16] border-b border-[#1e293b]">
        <div className="p-3 rounded-xl bg-[#0f1627] border border-[#1e293b] flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-400">Connected Clients</div>
            <div className="text-lg font-bold text-white font-mono">{clients.length}</div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#0f1627] border border-[#1e293b] flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-400">Total Client Buffers</div>
            <div className="text-lg font-bold text-white font-mono">{formatBytes(totalMem)}</div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#0f1627] border border-[#1e293b] flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${maxOmem > 10 * 1024 * 1024 ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-400">Max Output Buffer</div>
            <div className="text-lg font-bold text-white font-mono">{formatBytes(maxOmem)}</div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#0f1627] border border-[#1e293b] flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-400">Max Idle Time</div>
            <div className="text-lg font-bold text-white font-mono">{maxIdle}s</div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="m-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="m-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Clients Table */}
      <div className="flex-1 overflow-auto p-4">
        <div className="rounded-xl border border-[#1e293b] bg-[#0d1322] overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#1e293b] bg-[#101728] text-slate-400 font-mono">
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Address / Name</th>
                <th className="py-3 px-4">User / DB</th>
                <th className="py-3 px-4">Last Command</th>
                <th className="py-3 px-4">Age / Idle</th>
                <th className="py-3 px-4">Buffer Memory</th>
                <th className="py-3 px-4">Flags</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b] font-mono">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No active clients found matching filter.
                  </td>
                </tr>
              ) : (
                filtered.map((client) => {
                  const isHighBuffer = client.omem_bytes > 5 * 1024 * 1024;
                  return (
                    <tr 
                      key={client.id}
                      className="hover:bg-[#131a2c] transition-colors text-slate-300"
                    >
                      <td className="py-3 px-4 font-bold text-slate-200">
                        #{client.id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-white">{client.addr}</div>
                        {client.name && (
                          <div className="text-[10px] text-indigo-400">{client.name}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-400">{client.user || 'default'}</span>
                        <span className="ml-1 text-[10px] text-slate-500">db:{client.db}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-[#162035] text-cyan-400 text-[11px] font-bold">
                          {client.cmd || 'IDLE'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div>Age: {client.age_sec}s</div>
                        <div className="text-[10px] text-slate-500">Idle: {client.idle_sec}s</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className={isHighBuffer ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                          {formatBytes(client.omem_bytes)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Total: {formatBytes(client.tot_mem_bytes)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
                          {client.flags}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setConfirmKill(client)}
                          className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-sans transition-all flex items-center gap-1 ml-auto"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Kill</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmKill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0e1424] border border-rose-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Terminate Client Connection?</h3>
                <p className="text-xs text-slate-400">This executes CLIENT KILL ID {confirmKill.id}.</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#141b2e] border border-[#1e293b] space-y-1.5 text-xs font-mono text-slate-300">
              <div><strong>Client ID:</strong> #{confirmKill.id}</div>
              <div><strong>Address:</strong> {confirmKill.addr}</div>
              <div><strong>Command:</strong> {confirmKill.cmd}</div>
              <div><strong>Output Buffer:</strong> {formatBytes(confirmKill.omem_bytes)}</div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmKill(null)}
                className="px-4 py-2 rounded-lg bg-[#162035] hover:bg-[#1e293b] text-xs text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleKill(confirmKill)}
                disabled={killingId !== null}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white shadow-lg shadow-rose-900/40 transition-all flex items-center gap-1.5"
              >
                {killingId !== null ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                <span>Terminate Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
