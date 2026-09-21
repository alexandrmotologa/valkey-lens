import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Send, Trash2, HelpCircle } from 'lucide-react';
import { api, REPLResult, CommandDef } from '../../api/client';

interface TerminalEntry {
  command: string;
  result: REPLResult;
}

export const WebTerminal: React.FC = () => {
  const [input, setInput] = useState('');
  const [entries, setEntries] = useState<TerminalEntry[]>([
    {
      command: 'INFO server',
      result: {
        command: 'INFO server',
        type: 'string',
        raw: null,
        formatted: 'ValkeyLens Web REPL connected. Safety guards and non-blocking SCAN enforcement active.\nTry: PING, DBSIZE, SCAN 0, HGETALL settings:user:1001',
        duration_ms: 0.2,
        is_error: false,
      },
    },
  ]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [completions, setCompletions] = useState<CommandDef[]>([]);
  const [selectedCompletion, setSelectedCompletion] = useState<number>(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [executing, setExecuting] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  // Handle autocomplete matching
  useEffect(() => {
    const trimmed = input.trim();
    if (!trimmed || trimmed.includes(' ')) {
      setCompletions([]);
      setShowSuggestions(false);
      return;
    }
    api.getCompletions(trimmed).then((matches) => {
      setCompletions(matches);
      setSelectedCompletion(0);
      setShowSuggestions(matches.length > 0);
    });
  }, [input]);

  const handleExecute = async (cmdToExec?: string) => {
    const cmd = (cmdToExec || input).trim();
    if (!cmd) return;

    setExecuting(true);
    setShowSuggestions(false);
    try {
      const res = await api.execREPL(cmd);
      setEntries((prev) => [...prev, { command: cmd, result: res }]);
      setHistory((prev) => [cmd, ...prev.filter((h) => h !== cmd)]);
      setHistoryIndex(-1);
      setInput('');
    } catch (err: any) {
      setEntries((prev) => [
        ...prev,
        {
          command: cmd,
          result: {
            command: cmd,
            type: 'error',
            raw: null,
            formatted: `(error) ${err.message || 'Execution error'}`,
            duration_ms: 0,
            is_error: true,
          },
        },
      ]);
    } finally {
      setExecuting(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Autocomplete Tab or Enter when suggestions are open
    if (showSuggestions && completions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCompletion((prev) => (prev + 1) % completions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCompletion((prev) => (prev - 1 + completions.length) % completions.length);
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !input.includes(' '))) {
        e.preventDefault();
        const selected = completions[selectedCompletion];
        if (selected) {
          setInput(selected.name + ' ');
          setShowSuggestions(false);
          return;
        }
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        return;
      }
    }

    // Command History Navigation
    if (e.key === 'ArrowUp' && !showSuggestions) {
      e.preventDefault();
      if (history.length > 0 && historyIndex < history.length - 1) {
        const nextIdx = historyIndex + 1;
        setHistoryIndex(nextIdx);
        setInput(history[nextIdx]);
      }
    } else if (e.key === 'ArrowDown' && !showSuggestions) {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInput(history[nextIdx]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleExecute();
    }
  };

  const renderResult = (res: REPLResult) => {
    if (res.is_error) {
      return <div className="text-rose-400 font-semibold">{res.formatted}</div>;
    }
    switch (res.type) {
      case 'integer':
        return <div className="text-[#00f5ff] font-semibold">{res.formatted}</div>;
      case 'nil':
        return <div className="text-slate-500 italic">{res.formatted}</div>;
      case 'array':
        return <div className="text-slate-200 whitespace-pre font-mono">{res.formatted}</div>;
      default:
        return <div className="text-emerald-300 whitespace-pre-wrap">{res.formatted}</div>;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] p-6 max-w-5xl mx-auto w-full">
      {/* Terminal Window Container */}
      <div className="flex-1 flex flex-col bg-[#080d1a] border border-[#1e293b] rounded-xl overflow-hidden shadow-2xl">
        {/* Terminal Header Bar */}
        <div className="h-10 px-4 bg-[#0e1424] border-b border-[#1e293b] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <span className="text-xs font-mono text-slate-400 ml-2 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-[#00f5ff]" />
              valkeylens-cli (RESP3)
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Command Chips */}
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono">
              {['PING', 'DBSIZE', 'SCAN 0', 'INFO memory'].map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => handleExecute(cmd)}
                  className="px-2 py-0.5 rounded bg-[#161e31] hover:bg-[#1e293b] text-slate-400 hover:text-white transition-colors"
                >
                  {cmd}
                </button>
              ))}
            </div>

            <button
              onClick={() => setEntries([])}
              className="p-1 text-slate-400 hover:text-white rounded"
              title="Clear Terminal"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Output Stream Panel */}
        <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-4">
          {entries.map((entry, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center gap-2 text-slate-400">
                <span className="text-[#00f5ff] font-bold">&gt;</span>
                <span className="text-white font-semibold">{entry.command}</span>
                {entry.result.duration_ms > 0 && (
                  <span className="text-[10px] text-slate-500 ml-auto">
                    {entry.result.duration_ms.toFixed(2)}ms
                  </span>
                )}
              </div>
              <div className="pl-4">{renderResult(entry.result)}</div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Autocomplete Suggestions Overlay */}
        {showSuggestions && completions.length > 0 && (
          <div className="mx-4 mb-2 bg-[#101625] border border-[#00f5ff]/40 rounded-lg shadow-xl overflow-hidden font-mono text-xs">
            <div className="px-3 py-1.5 bg-[#161e31] text-[10px] text-slate-400 font-semibold uppercase flex items-center justify-between">
              <span>Command Autocomplete (Press Tab or Enter to select)</span>
              <HelpCircle className="w-3 h-3" />
            </div>
            <div className="max-h-40 overflow-y-auto divide-y divide-[#1e293b]/50">
              {completions.map((c, i) => (
                <div
                  key={c.name}
                  onClick={() => {
                    setInput(c.name + ' ');
                    setShowSuggestions(false);
                    inputRef.current?.focus();
                  }}
                  className={`px-3 py-1.5 flex items-center justify-between cursor-pointer ${
                    i === selectedCompletion ? 'bg-[#00f5ff]/20 text-white' : 'hover:bg-[#161e31] text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#00f5ff]">{c.name}</span>
                    <span className="text-[11px] text-slate-400">{c.syntax}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">{c.summary}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Prompt Box */}
        <div className="p-3 bg-[#0a0f1d] border-t border-[#1e293b] flex items-center gap-3">
          <span className="text-[#00f5ff] font-mono font-bold text-sm pl-2">&gt;</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={executing}
            placeholder="Enter command (e.g. GET user:profile:1001, SCAN 0, HGETALL settings:user:1001)..."
            className="flex-1 bg-transparent text-white font-mono text-xs focus:outline-none placeholder-slate-600 selection:bg-[#00f5ff]/20"
            autoFocus
          />
          <button
            onClick={() => handleExecute()}
            disabled={executing || !input.trim()}
            className="px-3 py-1.5 bg-[#00f5ff] hover:bg-[#38bdf8] text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors disabled:opacity-30"
          >
            <Send className="w-3 h-3" />
            Execute
          </button>
        </div>
      </div>
    </div>
  );
};
