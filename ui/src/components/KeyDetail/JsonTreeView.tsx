import React, { useState } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Copy, 
  Check, 
  Search, 
  Braces, 
  Hash, 
  Type
} from 'lucide-react';

interface JsonTreeViewProps {
  data: any;
  onUpdateValue?: (path: string, newValue: any) => void;
  readOnly?: boolean;
}

export const JsonTreeView: React.FC<JsonTreeViewProps> = ({ data, onUpdateValue, readOnly = true }) => {
  const [filter, setFilter] = useState('');
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>({
    'root': true,
  });
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const toggleExpand = (path: string) => {
    setExpandedPaths((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  const copyToClipboard = (text: string, path: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 1500);
  };

  const renderNode = (keyName: string | number, value: any, path: string, depth = 0): React.ReactNode => {
    const isObject = value !== null && typeof value === 'object';
    const isArray = Array.isArray(value);
    const isExpanded = expandedPaths[path] ?? (depth < 2);

    // Filter matching
    if (filter) {
      const matchKey = String(keyName).toLowerCase().includes(filter.toLowerCase());
      const matchVal = !isObject && String(value).toLowerCase().includes(filter.toLowerCase());
      const matchPath = path.toLowerCase().includes(filter.toLowerCase());
      if (!matchKey && !matchVal && !matchPath && depth > 0) {
        // Check if any children match
        if (isObject) {
          const serialized = JSON.stringify(value).toLowerCase();
          if (!serialized.includes(filter.toLowerCase())) {
            return null;
          }
        } else {
          return null;
        }
      }
    }

    if (isObject) {
      const entries: [string | number, any][] = isArray 
        ? value.map((v: any, i: number) => [i, v]) 
        : Object.entries(value);
      const count = entries.length;

      return (
        <div key={path} className="font-mono text-xs select-text">
          <div className="flex items-center gap-1.5 py-1 px-1.5 rounded hover:bg-[#162035] group transition-colors">
            <button
              onClick={() => toggleExpand(path)}
              className="p-0.5 text-slate-400 hover:text-white"
            >
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>

            <span className="font-bold text-sky-400">{keyName}:</span>
            <span className="text-slate-500 font-normal">
              {isArray ? `Array[${count}]` : `Object{${count}}`}
            </span>

            <button
              onClick={() => copyToClipboard(JSON.stringify(value, null, 2), path)}
              className="opacity-0 group-hover:opacity-100 ml-2 p-0.5 text-slate-500 hover:text-slate-200 transition-opacity"
              title="Copy JSON Subtree"
            >
              {copiedPath === path ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>

          {isExpanded && (
            <div className="pl-4 border-l border-slate-800 ml-2.5 my-0.5 space-y-0.5">
              {entries.map(([childKey, childVal]) =>
                renderNode(childKey, childVal, `${path}.${childKey}`, depth + 1)
              )}
            </div>
          )}
        </div>
      );
    }

    // Primitive values
    let valClass = 'text-emerald-400';
    let valDisplay = JSON.stringify(value);

    if (typeof value === 'number') {
      valClass = 'text-amber-400';
      valDisplay = String(value);
    } else if (typeof value === 'boolean') {
      valClass = 'text-pink-400';
      valDisplay = String(value);
    } else if (value === null) {
      valClass = 'text-slate-500 italic';
      valDisplay = 'null';
    }

    return (
      <div key={path} className="flex items-center gap-1.5 py-0.5 px-1.5 rounded hover:bg-[#162035] group transition-colors font-mono text-xs">
        <span className="w-4" /> {/* Spacer aligning with chevron */}
        <span className="text-slate-300 font-medium">{keyName}:</span>
        <span className={valClass}>{valDisplay}</span>

        <button
          onClick={() => copyToClipboard(String(value), path)}
          className="opacity-0 group-hover:opacity-100 ml-auto p-0.5 text-slate-500 hover:text-slate-200 transition-opacity"
          title="Copy Value"
        >
          {copiedPath === path ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1322] border border-[#1e293b] rounded-xl overflow-hidden">
      {/* Search / Filter toolbar */}
      <div className="h-10 px-3 bg-[#101625] border-b border-[#1e293b] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter nodes by key or value..."
            className="w-full bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none font-mono"
          />
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
          <Braces className="w-3.5 h-3.5 text-sky-400" />
          <span>Interactive Tree View</span>
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 p-3 overflow-auto">
        {renderNode('root', data, 'root', 0)}
      </div>
    </div>
  );
};
