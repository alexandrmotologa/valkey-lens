import React, { useState, useEffect } from 'react';
import { 
  Navbar, 
  TabType 
} from './components/Navbar';
import { KeyExplorer } from './components/KeyTree/KeyExplorer';
import { MemoryProfiler } from './components/Profiler/MemoryProfiler';
import { StreamInspector } from './components/Streams/StreamInspector';
import { TelemetryDashboard } from './components/Telemetry/TelemetryDashboard';
import { WebTerminal } from './components/REPL/WebTerminal';
import { ProfileManager } from './components/Profiles/ProfileManager';
import { 
  api, 
  SystemInfo, 
  subscribeTelemetry, 
  TelemetrySnapshot, 
  MetricPoint,
  ConnectionProfile,
  formatBytes
} from './api/client';
import { Database, HardDrive, Cpu, Radio, ExternalLink, GitBranch } from 'lucide-react';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabType>('explorer');
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [isProfilesOpen, setIsProfilesOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [latestMetric, setLatestMetric] = useState<MetricPoint | null>(null);
  const [serverMeta, setServerMeta] = useState<TelemetrySnapshot['server'] | null>(null);

  // Load initial system status
  useEffect(() => {
    api.getSystemInfo()
      .then(setSystemInfo)
      .catch((err) => console.error('Failed to load system info:', err));
  }, []);

  // Subscribe to telemetry SSE stream
  useEffect(() => {
    const unsub = subscribeTelemetry(
      (snap) => {
        setIsStreaming(true);
        setServerMeta(snap.server);
        setLatestMetric(snap.current);
      },
      (metric) => {
        setIsStreaming(true);
        setLatestMetric(metric);
      },
      () => {}
    );

    return () => {
      unsub();
      setIsStreaming(false);
    };
  }, []);

  const handleSelectKeyFromProfiler = (_key: string) => {
    setCurrentTab('explorer');
  };

  const handleSelectProfile = (_profile: ConnectionProfile) => {
    setIsProfilesOpen(false);
    // Reload system info
    api.getSystemInfo().then(setSystemInfo).catch(console.error);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0a0e17] text-slate-100 font-sans select-none">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        systemInfo={systemInfo}
        onOpenProfiles={() => setIsProfilesOpen(true)}
        isStreaming={isStreaming}
      />

      {/* Main View Area */}
      <main className="flex-1 overflow-hidden relative">
        {currentTab === 'explorer' && (
          <KeyExplorer readOnly={systemInfo?.read_only ?? false} />
        )}
        {currentTab === 'profiler' && (
          <MemoryProfiler onSelectKey={handleSelectKeyFromProfiler} />
        )}
        {currentTab === 'streams' && (
          <StreamInspector />
        )}
        {currentTab === 'telemetry' && (
          <TelemetryDashboard />
        )}
        {currentTab === 'repl' && (
          <WebTerminal />
        )}
      </main>

      {/* Persistent Bottom Status Bar */}
      <footer className="h-7 border-t border-[#1e293b] bg-[#090d16] px-4 flex items-center justify-between text-[11px] text-slate-400 font-mono z-30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isStreaming ? 'bg-emerald-400' : 'bg-slate-500'}`} />
            <span className="text-slate-300">
              {serverMeta?.is_valkey ? 'Valkey' : 'Redis'} {serverMeta?.version || (systemInfo?.is_demo ? '8.0.0-mock' : 'Active')}
            </span>
          </div>

          {serverMeta && (
            <>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1">
                <Database className="w-3 h-3 text-slate-500" />
                <span>Keys: <strong className="text-slate-200">{serverMeta.total_keys.toLocaleString()}</strong></span>
              </div>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1">
                <HardDrive className="w-3 h-3 text-slate-500" />
                <span>Mem: <strong className="text-slate-200">{serverMeta.used_memory_human}</strong> (RSS: {serverMeta.used_memory_rss_human})</span>
              </div>
            </>
          )}

          {latestMetric && (
            <>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1">
                <Cpu className="w-3 h-3 text-slate-500" />
                <span>Ops: <strong className="text-slate-200">{latestMetric.ops_per_sec}</strong>/s</span>
              </div>
              <span className="text-slate-700">|</span>
              <div>
                Hit Ratio: <strong className="text-slate-200">{(latestMetric.hit_ratio * 100).toFixed(1)}%</strong>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          {systemInfo?.is_demo && (
            <span className="text-[#00f5ff] bg-[#00f5ff]/10 px-2 py-0.5 rounded border border-[#00f5ff]/30 text-[10px]">
              Non-Blocking Mock Engine
            </span>
          )}

          <a 
            href="https://github.com/alexandrmotologa/valkey-lens" 
            target="_blank" 
            rel="noreferrer"
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span>GitHub</span>
          </a>
        </div>
      </footer>

      {/* Connection Profiles Modal */}
      <ProfileManager
        isOpen={isProfilesOpen}
        onClose={() => setIsProfilesOpen(false)}
        activeProfileId={systemInfo?.is_demo ? 'demo' : 'default'}
        onSelectProfile={handleSelectProfile}
      />
    </div>
  );
};
