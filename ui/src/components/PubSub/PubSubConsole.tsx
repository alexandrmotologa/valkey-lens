import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  Play, 
  Pause, 
  Trash2, 
  Search, 
  Radio, 
  CheckCircle2, 
  AlertCircle, 
  Copy,
  Hash,
  Clock
} from 'lucide-react';
import { api, PubSubMessage, subscribePubSub } from '../../api/client';

export const PubSubConsole: React.FC = () => {
  const [messages, setMessages] = useState<PubSubMessage[]>([]);
  const [isListening, setIsListening] = useState(true);
  const [channelsInput, setChannelsInput] = useState('*');
  const [activeChannels, setActiveChannels] = useState<string[]>(['*']);
  const [search, setSearch] = useState('');
  
  // Publisher state
  const [pubChannel, setPubChannel] = useState('notifications');
  const [pubMessage, setPubMessage] = useState('{"event":"ping","timestamp":1726942000}');
  const [publishStatus, setPublishStatus] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  // Auto-scroll
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isListening) return;

    const channels = activeChannels.filter((c) => !c.includes('*'));
    const patterns = activeChannels.filter((c) => c.includes('*'));

    const unsub = subscribePubSub(channels, patterns, (msg) => {
      setMessages((prev) => [msg, ...prev.slice(0, 499)]); // keep max 500
    });

    return () => {
      unsub();
    };
  }, [isListening, activeChannels]);

  const handleApplySubscription = (e: React.FormEvent) => {
    e.preventDefault();
    const parts = channelsInput.split(',').map((s) => s.trim()).filter(Boolean);
    setActiveChannels(parts.length ? parts : ['*']);
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pubChannel.trim() || !pubMessage.trim()) return;

    setIsPublishing(true);
    setPublishStatus(null);
    try {
      const res = await api.publishPubSub(pubChannel.trim(), pubMessage.trim());
      setPublishStatus(`Published! Received by ${res.receivers} active subscriber(s).`);
      setTimeout(() => setPublishStatus(null), 4000);
    } catch (err: any) {
      setPublishStatus(`Publish failed: ${err.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const filtered = messages.filter((m) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return m.channel.toLowerCase().includes(s) || m.payload.toLowerCase().includes(s);
  });

  return (
    <div className="h-full flex flex-col bg-[#0b0f19] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#1e293b] bg-[#0d1322] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-pink-400" />
            <h1 className="text-lg font-bold text-white tracking-tight">
              Pub/Sub Live Sniffer & Publisher
            </h1>
            <span className="text-xs bg-pink-500/10 text-pink-400 border border-pink-500/20 px-2 py-0.5 rounded-full font-mono font-medium">
              {messages.length} messages intercepted
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time subscriber stream for Valkey/Redis channels with interactive message dispatch.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Subscription channel filter form */}
          <form onSubmit={handleApplySubscription} className="flex items-center gap-2 bg-[#101726] border border-[#1e293b] p-1.5 rounded-lg text-xs">
            <span className="text-slate-400 pl-1 font-mono">Topics:</span>
            <input
              type="text"
              value={channelsInput}
              onChange={(e) => setChannelsInput(e.target.value)}
              placeholder="e.g. notifications, events:*"
              className="bg-[#162035] text-slate-200 rounded px-2 py-1 focus:outline-none w-44 font-mono"
            />
            <button
              type="submit"
              className="px-2.5 py-1 rounded bg-[#1e293b] hover:bg-[#28354d] text-slate-200 font-medium"
            >
              Subscribe
            </button>
          </form>

          {/* Pause/Resume button */}
          <button
            onClick={() => setIsListening(!isListening)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
              isListening
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
            }`}
          >
            {isListening ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isListening ? 'Streaming Live' : 'Paused'}</span>
          </button>

          {/* Clear messages */}
          <button
            onClick={() => setMessages([])}
            className="p-2 rounded-lg bg-[#162035] hover:bg-[#1e293b] text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors"
            title="Clear list"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Layout: Left Messages Table, Right Publisher Panel */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Message Log */}
        <div className="flex-1 flex flex-col border-r border-[#1e293b] overflow-hidden">
          {/* Sub-header with search */}
          <div className="p-3 bg-[#0d1322] border-b border-[#1e293b] flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <Radio className={`w-3.5 h-3.5 ${isListening ? 'text-pink-400 animate-pulse' : 'text-slate-600'}`} />
              <span>Active subscriptions: <strong className="text-slate-200">{activeChannels.join(', ')}</strong></span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter messages..."
                className="bg-[#101726] border border-[#1e293b] text-xs text-slate-200 rounded pl-7 pr-2.5 py-1 w-48 focus:outline-none focus:border-pink-500 font-mono"
              />
            </div>
          </div>

          {/* Messages Stream List */}
          <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-xs">
            {filtered.length === 0 ? (
              <div className="py-24 text-center text-slate-500">
                {isListening ? 'Waiting for pub/sub messages on topics...' : 'Stream is paused.'}
              </div>
            ) : (
              filtered.map((msg) => (
                <div
                  key={msg.id}
                  className="p-3 rounded-xl bg-[#0f1627] border border-[#1e293b] hover:border-pink-500/30 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 font-bold text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/20">
                        <Hash className="w-3 h-3" />
                        {msg.channel}
                      </span>
                      {msg.pattern && (
                        <span className="text-[10px] text-slate-500">via {msg.pattern}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-slate-500 text-[10px]">
                      <span>{msg.length} bytes</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#090d16] p-2.5 rounded-lg border border-slate-800/80 text-slate-200 overflow-x-auto select-text whitespace-pre-wrap break-all">
                    {msg.is_json ? (
                      <code>
                        {(() => {
                          try {
                            return JSON.stringify(JSON.parse(msg.payload), null, 2);
                          } catch {
                            return msg.payload;
                          }
                        })()}
                      </code>
                    ) : (
                      <span>{msg.payload}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Message Dispatcher */}
        <div className="w-full lg:w-96 p-4 bg-[#0d1322] flex flex-col justify-between overflow-y-auto">
          <form onSubmit={handlePublish} className="space-y-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                <Send className="w-4 h-4 text-pink-400" />
                <span>Publish Message</span>
              </h2>
              <p className="text-xs text-slate-400">
                Broadcast an event payload to all active subscribers on the target channel.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Target Channel:</label>
              <input
                type="text"
                value={pubChannel}
                onChange={(e) => setPubChannel(e.target.value)}
                placeholder="e.g. notifications"
                className="w-full bg-[#101726] border border-[#1e293b] text-xs text-slate-200 rounded-lg p-2.5 font-mono focus:outline-none focus:border-pink-500"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">Payload (JSON or text):</label>
                <button
                  type="button"
                  onClick={() => setPubMessage('{"action":"sync","user_id":1001,"status":"ok"}')}
                  className="text-[10px] text-pink-400 hover:underline"
                >
                  Insert Sample JSON
                </button>
              </div>
              <textarea
                rows={6}
                value={pubMessage}
                onChange={(e) => setPubMessage(e.target.value)}
                placeholder='{"foo":"bar"}'
                className="w-full bg-[#101726] border border-[#1e293b] text-xs text-slate-200 rounded-lg p-2.5 font-mono focus:outline-none focus:border-pink-500 resize-none"
              />
            </div>

            {publishStatus && (
              <div className={`p-2.5 rounded-lg text-xs font-mono flex items-center gap-2 ${
                publishStatus.includes('failed')
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              }`}>
                {publishStatus.includes('failed') ? <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> : <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />}
                <span>{publishStatus}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isPublishing}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:brightness-110 shadow-lg shadow-pink-950/40 transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isPublishing ? 'Publishing...' : 'Dispatch Message (PUBLISH)'}</span>
            </button>
          </form>

          <div className="p-3 mt-6 rounded-xl bg-[#080d16] border border-[#1e293b] text-[11px] text-slate-400 space-y-1">
            <div className="font-bold text-slate-300">Safety Tip</div>
            <p>Publishing in read-only mode is blocked by ValkeyLens guardrails to protect replica integrity.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
