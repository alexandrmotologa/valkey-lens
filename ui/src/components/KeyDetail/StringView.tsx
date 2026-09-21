import React, { useState, useEffect } from 'react';
import { Copy, Check, Save, Code, FileText } from 'lucide-react';
import { api, KeyDetail } from '../../api/client';

interface StringViewProps {
  detail: KeyDetail;
  readOnly: boolean;
  onRefresh: () => void;
}

export const StringView: React.FC<StringViewProps> = ({ detail, readOnly, onRefresh }) => {
  const [content, setContent] = useState<string>('');
  const [isJSONView, setIsJSONView] = useState<boolean>(detail.is_json);
  const [copied, setCopied] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let strVal = typeof detail.value === 'string' ? detail.value : JSON.stringify(detail.value, null, 2);
    if (detail.is_json) {
      try {
        const parsed = JSON.parse(strVal);
        strVal = JSON.stringify(parsed, null, 2);
      } catch {}
    }
    setContent(strVal);
    setIsJSONView(detail.is_json);
  }, [detail]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (readOnly) return;
    setSaving(true);
    setError(null);
    try {
      await api.setString(detail.name, content, detail.ttl_ms > 0 ? Math.floor(detail.ttl_ms / 1000) : 0);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to update key');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1322] border border-[#1e293b] rounded-xl overflow-hidden">
      {/* Action Toolbar */}
      <div className="h-10 px-4 border-b border-[#1e293b] bg-[#101625] flex items-center justify-between">
        <div className="flex items-center gap-2">
          {detail.is_json && (
            <div className="flex items-center bg-[#161e31] p-0.5 rounded-md border border-[#1e293b] text-xs">
              <button
                onClick={() => setIsJSONView(true)}
                className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                  isJSONView ? 'bg-[#00f5ff]/20 text-[#00f5ff] font-medium' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                JSON
              </button>
              <button
                onClick={() => setIsJSONView(false)}
                className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                  !isJSONView ? 'bg-[#00f5ff]/20 text-[#00f5ff] font-medium' : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Raw Text
              </button>
            </div>
          )}
          <span className="text-xs text-slate-400 font-mono">
            {detail.length} chars ({Math.round(detail.memory_bytes)} bytes)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-[#161e31] hover:bg-[#1e293b] rounded-md border border-[#1e293b] transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>

          {!readOnly && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-900 bg-[#00f5ff] hover:bg-[#38bdf8] rounded-md transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border-b border-rose-500/20 px-4 py-2 text-xs text-rose-400">
          {error}
        </div>
      )}

      {/* Editor view */}
      <div className="flex-1 p-3 overflow-auto">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          readOnly={readOnly}
          className="w-full h-full bg-transparent text-slate-200 font-mono text-xs leading-relaxed resize-none focus:outline-none selection:bg-[#00f5ff]/20"
          placeholder="Key value..."
          spellCheck={false}
        />
      </div>
    </div>
  );
};
