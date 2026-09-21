import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Users, 
  Zap, 
  Radio, 
  AlertTriangle 
} from 'lucide-react';
import { 
  TelemetrySnapshot, 
  MetricPoint, 
  SlowlogRecord, 
  api, 
  subscribeTelemetry, 
  formatBytes 
} from '../../api/client';

// Simple SVG sparkline generator
const Sparkline: React.FC<{
  data: number[];
  color: string;
  height?: number;
}> = ({ data, color, height = 48 }) => {
  if (!data || data.length < 2) {
    return <div style={{ height }} className="flex items-center text-[10px] text-slate-600">Awaiting samples...</div>;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min === 0 ? 1 : max - min;
  const width = 280;

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible" style={{ height }}>
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" points={points} />
    </svg>
  );
};

export const TelemetryDashboard: React.FC = () => {
  const [snapshot, setSnapshot] = useState<TelemetrySnapshot | null>(null);
  const [slowlogs, setSlowlogs] = useState<SlowlogRecord[]>([]);

  useEffect(() => {
    // Initial fetch
    api.getTelemetrySnapshot().then(setSnapshot).catch(console.error);
    api.getSlowlogs(50).then(setSlowlogs).catch(console.error);

    // Live 1Hz subscription
    const unsubscribe = subscribeTelemetry(
      (snap) => setSnapshot(snap),
      (point: MetricPoint) => {
        setSnapshot((prev) => {
          if (!prev) return prev;
          const newHist = [...prev.history, point];
          if (newHist.length > 120) newHist.shift();
          return {
            ...prev,
            current: point,
            history: newHist,
          };
        });
      },
      (newSlow: SlowlogRecord[]) => {
        setSlowlogs((prev) => [...newSlow, ...prev].slice(0, 50));
      }
    );

    return () => unsubscribe();
  }, []);

  const history = snapshot?.history || [];
  const current = snapshot?.current;
  const server = snapshot?.server;

  const opsData = history.map((h) => h.ops_per_sec);
  const memData = history.map((h) => h.used_memory_bytes / (1024 * 1024));
  const hitData = history.map((h) => h.hit_ratio);
  const clientsData = history.map((h) => h.connected_clients);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] overflow-y-auto p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1e293b] pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-emerald-400" />
            Live Cluster Telemetry & Latency Monitor
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time 1Hz streaming observability: ops throughput, memory saturation, hit ratios, and slow execution logs
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs bg-[#101625] px-3 py-1.5 rounded-lg border border-[#1e293b]">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping mr-1" />
          <span className="font-mono text-emerald-400 font-medium">1Hz SSE Stream Active</span>
        </div>
      </div>

      {/* Sparkline Charts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ops/Sec */}
        <div className="p-4 rounded-xl bg-[#101625] border border-[#1e293b] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#00f5ff]" />
                Throughput
              </span>
              <span className="font-mono text-[10px] text-slate-500">ops/sec</span>
            </div>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              {current?.ops_per_sec.toLocaleString() || 0}
            </div>
          </div>
          <div className="mt-3">
            <Sparkline data={opsData} color="#00f5ff" />
          </div>
        </div>

        {/* Memory Footprint */}
        <div className="p-4 rounded-xl bg-[#101625] border border-[#1e293b] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-purple-400" />
                Allocated Memory
              </span>
              <span className="font-mono text-[10px] text-slate-500">RSS / Alloc</span>
            </div>
            <div className="text-2xl font-bold font-mono text-[#00f5ff] mt-1">
              {formatBytes(current?.used_memory_bytes || 0)}
            </div>
          </div>
          <div className="mt-3">
            <Sparkline data={memData} color="#a855f7" />
          </div>
        </div>

        {/* Cache Hit Ratio */}
        <div className="p-4 rounded-xl bg-[#101625] border border-[#1e293b] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                Cache Hit Ratio
              </span>
              <span className="font-mono text-[10px] text-slate-500">% Hits</span>
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              {current?.hit_ratio ? `${current.hit_ratio.toFixed(1)}%` : '100%'}
            </div>
          </div>
          <div className="mt-3">
            <Sparkline data={hitData} color="#10b981" />
          </div>
        </div>

        {/* Clients & CPU */}
        <div className="p-4 rounded-xl bg-[#101625] border border-[#1e293b] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                Connected Clients
              </span>
              <span className="font-mono text-[10px] text-slate-500">Active</span>
            </div>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              {current?.connected_clients || 0}
            </div>
          </div>
          <div className="mt-3">
            <Sparkline data={clientsData} color="#f59e0b" />
          </div>
        </div>
      </div>

      {/* Engine & Runtime Details */}
      <div className="p-5 rounded-xl bg-[#101625] border border-[#1e293b] space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          Engine Architecture & Hardware Topology
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 font-mono text-xs">
          <div className="p-3 bg-[#161e31] rounded-lg border border-[#1e293b]">
            <div className="text-[11px] text-slate-400">Engine Version</div>
            <div className="font-bold text-white mt-1">{server?.version || 'Valkey 8.0'}</div>
          </div>

          <div className="p-3 bg-[#161e31] rounded-lg border border-[#1e293b]">
            <div className="text-[11px] text-slate-400">Mode</div>
            <div className="font-bold text-purple-400 mt-1 capitalize">{server?.mode || 'Standalone'}</div>
          </div>

          <div className="p-3 bg-[#161e31] rounded-lg border border-[#1e293b]">
            <div className="text-[11px] text-slate-400">Operating System</div>
            <div className="font-bold text-slate-200 mt-1 truncate" title={server?.os}>{server?.os || 'Linux'}</div>
          </div>

          <div className="p-3 bg-[#161e31] rounded-lg border border-[#1e293b]">
            <div className="text-[11px] text-slate-400">Valkey 8 I/O Threads</div>
            <div className="font-bold text-emerald-400 mt-1">
              {current?.io_threads_active ? `${current.io_threads_active} Active` : 'Multi-Threaded'}
            </div>
          </div>

          <div className="p-3 bg-[#161e31] rounded-lg border border-[#1e293b]">
            <div className="text-[11px] text-slate-400">Frag Ratio</div>
            <div className="font-bold text-amber-400 mt-1">
              {server?.mem_frag_ratio ? server.mem_frag_ratio.toFixed(2) : '1.14'}
            </div>
          </div>

          <div className="p-3 bg-[#161e31] rounded-lg border border-[#1e293b]">
            <div className="text-[11px] text-slate-400">Total Keys</div>
            <div className="font-bold text-[#00f5ff] mt-1">{server?.total_keys || 0}</div>
          </div>
        </div>
      </div>

      {/* Real-time Slowlog Events */}
      <div className="p-5 rounded-xl bg-[#101625] border border-[#1e293b] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Slow Execution Query Log (SLOWLOG GET)
          </h2>
          <span className="text-xs font-mono text-slate-400">{slowlogs.length} events captured</span>
        </div>

        <div className="overflow-x-auto max-h-72">
          <table className="w-full text-left text-xs font-mono">
            <thead className="sticky top-0 bg-[#161e31] text-slate-400 border-b border-[#1e293b]">
              <tr>
                <th className="py-2 px-3 w-16">ID</th>
                <th className="py-2 px-3 w-28">Duration</th>
                <th className="py-2 px-3">Command Executed</th>
                <th className="py-2 px-3 w-36">Client Address</th>
                <th className="py-2 px-3 w-40">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]/60">
              {slowlogs.map((rec) => {
                const durationMs = rec.duration / 1000000;
                return (
                  <tr key={rec.id} className="hover:bg-[#161e31]/40 transition-colors">
                    <td className="py-2 px-3 text-slate-500">#{rec.id}</td>
                    <td className="py-2 px-3 font-semibold">
                      <span className={durationMs > 100 ? 'text-rose-400' : 'text-amber-400'}>
                        {durationMs > 0 ? `${durationMs.toFixed(1)} ms` : `${rec.duration} ns`}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-cyan-300 font-semibold break-all">
                      {rec.command.join(' ')}
                    </td>
                    <td className="py-2 px-3 text-slate-400">{rec.client_ip || '127.0.0.1'}</td>
                    <td className="py-2 px-3 text-slate-500">
                      {new Date(rec.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                );
              })}
              {slowlogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 font-sans">
                    Zero slow execution events recorded. Server is performing optimally!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
