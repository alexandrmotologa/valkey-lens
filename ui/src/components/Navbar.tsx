import React from 'react';
import { 
  Database, 
  PieChart, 
  Activity, 
  Terminal, 
  ShieldAlert, 
  ShieldCheck, 
  Layers, 
  SlidersHorizontal,
  Radio,
  Users,
  Zap,
  MessageSquare,
  Network,
  Command as CommandIcon
} from 'lucide-react';
import { SystemInfo } from '../api/client';

export type TabType = 
  | 'explorer' 
  | 'profiler' 
  | 'traffic' 
  | 'clients' 
  | 'pubsub' 
  | 'cluster' 
  | 'streams' 
  | 'telemetry' 
  | 'repl';

interface NavbarProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  systemInfo: SystemInfo | null;
  onOpenProfiles: () => void;
  onOpenCommandPalette: () => void;
  isStreaming: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  systemInfo,
  onOpenProfiles,
  onOpenCommandPalette,
  isStreaming,
}) => {
  return (
    <header className="h-14 border-b border-[#1e293b] bg-[#090d16]/90 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-40">
      {/* Brand & Logo */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onTabChange('explorer')}>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#00f5ff]/20 to-[#0284c7]/30 border border-[#00f5ff]/40 flex items-center justify-center shadow-[0_0_12px_rgba(0,245,255,0.25)]">
            <img src="/logo.svg" alt="ValkeyLens" className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-bold tracking-tight text-white text-base">
              Valkey<span className="text-[#00f5ff]">Lens</span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">
                v{systemInfo?.version || '0.2.0'}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center gap-0.5 bg-[#101625] p-1 rounded-lg border border-[#1e293b] overflow-x-auto no-scrollbar">
          <button
            onClick={() => onTabChange('explorer')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 ${
              currentTab === 'explorer'
                ? 'bg-[#1e293b] text-white shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#161e31]'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-[#00f5ff]" />
            Keys
          </button>

          <button
            onClick={() => onTabChange('profiler')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 ${
              currentTab === 'profiler'
                ? 'bg-[#1e293b] text-white shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#161e31]'
            }`}
          >
            <PieChart className="w-3.5 h-3.5 text-amber-400" />
            Memory
          </button>

          <button
            onClick={() => onTabChange('traffic')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 ${
              currentTab === 'traffic'
                ? 'bg-[#1e293b] text-white shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#161e31]'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-orange-400" />
            Traffic
          </button>

          <button
            onClick={() => onTabChange('clients')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 ${
              currentTab === 'clients'
                ? 'bg-[#1e293b] text-white shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#161e31]'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            Clients
          </button>

          <button
            onClick={() => onTabChange('pubsub')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 ${
              currentTab === 'pubsub'
                ? 'bg-[#1e293b] text-white shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#161e31]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-pink-400" />
            Pub/Sub
          </button>

          <button
            onClick={() => onTabChange('cluster')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 ${
              currentTab === 'cluster'
                ? 'bg-[#1e293b] text-white shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#161e31]'
            }`}
          >
            <Network className="w-3.5 h-3.5 text-sky-400" />
            Cluster
          </button>

          <button
            onClick={() => onTabChange('streams')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 ${
              currentTab === 'streams'
                ? 'bg-[#1e293b] text-white shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#161e31]'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            Streams
          </button>

          <button
            onClick={() => onTabChange('telemetry')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 ${
              currentTab === 'telemetry'
                ? 'bg-[#1e293b] text-white shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#161e31]'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            Telemetry
          </button>

          <button
            onClick={() => onTabChange('repl')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 ${
              currentTab === 'repl'
                ? 'bg-[#1e293b] text-white shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#161e31]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            REPL
          </button>
        </nav>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2.5">
        {/* Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-[#101625] hover:bg-[#161e31] px-2.5 py-1.5 rounded-md border border-[#1e293b] transition-colors"
          title="Open Command Palette (Ctrl+K or Cmd+K)"
        >
          <CommandIcon className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-mono text-[11px] text-slate-400">Ctrl+K</span>
        </button>

        {/* SSE Live Indicator */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-[#101625] px-2 py-1.5 rounded-md border border-[#1e293b]">
          <span className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
          <span className="font-mono text-[11px]">{isStreaming ? '1Hz Live' : 'Idle'}</span>
        </div>

        {/* Read-Only Badge */}
        {systemInfo?.read_only ? (
          <div className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Read-Only</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Guarded</span>
          </div>
        )}

        {/* Target Profile Button */}
        <button
          onClick={onOpenProfiles}
          className="flex items-center gap-2 text-xs text-slate-300 hover:text-white bg-[#101625] hover:bg-[#161e31] px-2.5 py-1.5 rounded-md border border-[#1e293b] transition-colors"
        >
          {systemInfo?.is_demo ? (
            <span className="flex items-center gap-1.5 text-[#00f5ff]">
              <Radio className="w-3 h-3 text-[#00f5ff]" />
              <span className="font-medium">Demo</span>
            </span>
          ) : (
            <span className="font-mono text-slate-300 truncate max-w-[120px]">
              {systemInfo?.url || 'valkey://localhost'}
            </span>
          )}
          <SlidersHorizontal className="w-3 h-3 text-slate-400" />
        </button>
      </div>
    </header>
  );
};
