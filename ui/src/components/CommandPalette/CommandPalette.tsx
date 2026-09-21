import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Database, 
  PieChart, 
  Layers, 
  Activity, 
  Terminal, 
  Users, 
  Radio, 
  MessageSquare, 
  Network, 
  Download, 
  Zap, 
  Play, 
  X, 
  Sparkles,
  Command as CommandIcon
} from 'lucide-react';
import { TabType } from '../Navbar';
import { api } from '../../api/client';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: TabType) => void;
  onTriggerTrafficSample?: () => void;
  onTriggerExportScript?: () => void;
}

interface PaletteAction {
  id: string;
  category: 'Navigation' | 'Actions' | 'Tools';
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onTriggerTrafficSample,
  onTriggerExportScript,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const actions: PaletteAction[] = [
    // Navigation
    {
      id: 'nav-keys',
      category: 'Navigation',
      title: 'Keyspace Explorer',
      subtitle: 'Browse, inspect and mutate keys',
      icon: <Database className="w-4 h-4 text-[#00f5ff]" />,
      shortcut: 'G K',
      action: () => { onNavigate('explorer'); onClose(); },
    },
    {
      id: 'nav-profiler',
      category: 'Navigation',
      title: 'Memory Profiler & Advisor',
      subtitle: 'Deep namespace memory breakdown & recommendations',
      icon: <PieChart className="w-4 h-4 text-amber-400" />,
      shortcut: 'G P',
      action: () => { onNavigate('profiler'); onClose(); },
    },
    {
      id: 'nav-traffic',
      category: 'Navigation',
      title: 'Safe Traffic Sampler',
      subtitle: 'Sample live command monitor with auto-kill',
      icon: <Zap className="w-4 h-4 text-orange-400" />,
      shortcut: 'G T',
      action: () => { onNavigate('traffic'); onClose(); },
    },
    {
      id: 'nav-clients',
      category: 'Navigation',
      title: 'Client Connection Manager',
      subtitle: 'Inspect connected clients and terminate slow connections',
      icon: <Users className="w-4 h-4 text-indigo-400" />,
      shortcut: 'G C',
      action: () => { onNavigate('clients'); onClose(); },
    },
    {
      id: 'nav-pubsub',
      category: 'Navigation',
      title: 'Pub/Sub Live Sniffer',
      subtitle: 'Real-time message streaming & topic publisher',
      icon: <MessageSquare className="w-4 h-4 text-pink-400" />,
      shortcut: 'G S',
      action: () => { onNavigate('pubsub'); onClose(); },
    },
    {
      id: 'nav-cluster',
      category: 'Navigation',
      title: 'Cluster Topology & Slot Map',
      subtitle: 'Visual 16,384 hash slots & CRC16 calculator',
      icon: <Network className="w-4 h-4 text-sky-400" />,
      shortcut: 'G M',
      action: () => { onNavigate('cluster'); onClose(); },
    },
    {
      id: 'nav-streams',
      category: 'Navigation',
      title: 'Streams & Consumer Groups',
      subtitle: 'Inspect XREAD, PEL pending entries and lags',
      icon: <Layers className="w-4 h-4 text-purple-400" />,
      action: () => { onNavigate('streams'); onClose(); },
    },
    {
      id: 'nav-telemetry',
      category: 'Navigation',
      title: 'Live Telemetry & Slowlog',
      subtitle: 'Real-time ops/sec, memory RSS, spike alerts',
      icon: <Activity className="w-4 h-4 text-emerald-400" />,
      action: () => { onNavigate('telemetry'); onClose(); },
    },
    {
      id: 'nav-repl',
      category: 'Navigation',
      title: 'Interactive Web REPL',
      subtitle: 'Execute raw Redis/Valkey commands with auto-completion',
      icon: <Terminal className="w-4 h-4 text-cyan-400" />,
      shortcut: 'G R',
      action: () => { onNavigate('repl'); onClose(); },
    },

    // Actions
    {
      id: 'act-sample-traffic',
      category: 'Actions',
      title: 'Sample Live Traffic Now (5s)',
      subtitle: 'Intercept real-time stream and calculate hot keys',
      icon: <Play className="w-4 h-4 text-rose-400" />,
      action: () => {
        onNavigate('traffic');
        if (onTriggerTrafficSample) onTriggerTrafficSample();
        onClose();
      },
    },
    {
      id: 'act-dump-script',
      category: 'Actions',
      title: 'Export Dataset to .redis Script',
      subtitle: 'Download executable redis-cli bulk pipeline file',
      icon: <Download className="w-4 h-4 text-emerald-400" />,
      action: () => {
        window.open(api.getExportScriptUrl('*', 1000), '_blank');
        onClose();
      },
    },
    {
      id: 'act-export-html',
      category: 'Actions',
      title: 'Export Memory Audit HTML Report',
      subtitle: 'Self-contained offline audit documentation',
      icon: <Download className="w-4 h-4 text-amber-400" />,
      action: () => {
        window.open(api.getExportHTMLUrl(), '_blank');
        onClose();
      },
    },
  ];

  const filtered = actions.filter((a) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.subtitle.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-2xl bg-[#0d1322] border border-[#1e293b] rounded-2xl shadow-2xl shadow-cyan-950/40 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center px-4 border-b border-[#1e293b] bg-[#101726]">
          <Search className="w-5 h-5 text-slate-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, tool or section (e.g. Traffic, Clients, Cluster, Export)..."
            className="w-full bg-transparent py-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none font-sans"
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-1 ml-3 px-2 py-1 rounded bg-[#162035] border border-slate-700/60 text-[11px] font-mono text-slate-400">
            <span>ESC</span>
          </div>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 divide-y divide-slate-800/40">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No actions found matching "{query}"
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={item.id}
                    onClick={item.action}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#1e293b] text-white shadow-sm border border-cyan-500/30'
                        : 'text-slate-300 hover:bg-[#131b2d]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-cyan-500/10 text-cyan-400' : 'bg-[#162035] text-slate-400'}`}>
                        {item.icon}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-semibold flex items-center gap-2">
                          <span className={isSelected ? 'text-white' : 'text-slate-200'}>
                            {item.title}
                          </span>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                            {item.category}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {item.subtitle}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                      {item.shortcut && (
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#101726] border border-slate-800 text-slate-400">
                          {item.shortcut}
                        </span>
                      )}
                      {isSelected && (
                        <span className="text-[11px] text-cyan-400 font-medium">↵</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-[#090d16] border-t border-[#1e293b] flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span><strong className="text-slate-300">↑↓</strong> Navigate</span>
            <span><strong className="text-slate-300">↵</strong> Select</span>
            <span><strong className="text-slate-300">ESC</strong> Dismiss</span>
          </div>
          <div className="flex items-center gap-1 text-cyan-400/80">
            <Sparkles className="w-3 h-3" />
            <span>ValkeyLens 2.0 Command Center</span>
          </div>
        </div>
      </div>
    </div>
  );
};
