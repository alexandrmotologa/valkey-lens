import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, Plus, Check, Trash2, X, ShieldAlert } from 'lucide-react';
import { api, ConnectionProfile } from '../../api/client';

interface ProfileManagerProps {
  isOpen: boolean;
  onClose: () => void;
  activeProfileId?: string;
  onSelectProfile: (profile: ConnectionProfile) => void;
}

export const ProfileManager: React.FC<ProfileManagerProps> = ({
  isOpen,
  onClose,
  activeProfileId,
  onSelectProfile,
}) => {
  const [profiles, setProfiles] = useState<ConnectionProfile[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [readOnly, setReadOnly] = useState(false);
  const [color, setColor] = useState('cyan');

  useEffect(() => {
    if (isOpen) {
      api.getProfiles().then(setProfiles).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !url) return;

    const newProfile: ConnectionProfile = {
      id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      name,
      url,
      read_only: readOnly,
      color,
    };

    const updated = [...profiles, newProfile];
    setProfiles(updated);
    await api.saveProfiles(updated);

    setName('');
    setUrl('');
    setShowAdd(false);
  };

  const handleDeleteProfile = async (id: string) => {
    const updated = profiles.filter((p) => p.id !== id);
    setProfiles(updated);
    await api.saveProfiles(updated);
  };

  const getColorClass = (c: string) => {
    switch (c) {
      case 'emerald': return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
      case 'amber': return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
      case 'rose': return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
      default: return 'text-[#00f5ff] border-[#00f5ff]/30 bg-[#00f5ff]/10';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#101625] border border-[#1e293b] rounded-xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#00f5ff]" />
            <h3 className="font-semibold text-white text-sm">Cluster & Server Connection Profiles</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profiles List */}
        <div className="space-y-2.5 max-h-64 overflow-y-auto">
          {profiles.map((p) => (
            <div
              key={p.id}
              className="p-3 bg-[#161e31] border border-[#1e293b] rounded-lg flex items-center justify-between gap-3 group hover:border-[#00f5ff]/40 transition-colors"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border uppercase ${getColorClass(p.color)}`}>
                  {p.color}
                </span>
                <div>
                  <div className="font-semibold text-white text-xs flex items-center gap-2">
                    {p.name}
                    {p.read_only && (
                      <span className="text-[10px] text-rose-400 flex items-center gap-0.5">
                        <ShieldAlert className="w-3 h-3" /> Read-Only
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[11px] text-slate-400 truncate max-w-xs">{p.url}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onSelectProfile(p);
                    onClose();
                  }}
                  className="px-3 py-1 text-xs font-semibold text-slate-900 bg-[#00f5ff] hover:bg-[#38bdf8] rounded transition-colors"
                >
                  Connect
                </button>
                <button
                  onClick={() => handleDeleteProfile(p.id)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add profile button or form */}
        {!showAdd ? (
          <button
            onClick={() => setShowAdd(true)}
            className="w-full py-2 bg-[#161e31] hover:bg-[#1e293b] text-slate-300 text-xs font-medium rounded-lg border border-dashed border-[#1e293b] flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-[#00f5ff]" />
            Add Connection Profile
          </button>
        ) : (
          <form onSubmit={handleAddProfile} className="p-4 bg-[#0b0f19] border border-[#1e293b] rounded-lg space-y-3">
            <div className="text-xs font-semibold text-white">Add New Profile</div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <input
                type="text"
                required
                placeholder="Profile Name (e.g. Staging Cluster)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-[#161e31] border border-[#1e293b] text-white p-2 rounded focus:outline-none"
              />
              <input
                type="text"
                required
                placeholder="valkey://:pass@host:6379/0"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="bg-[#161e31] border border-[#1e293b] text-white p-2 rounded focus:outline-none font-mono text-[11px]"
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={readOnly}
                  onChange={(e) => setReadOnly(e.target.checked)}
                  className="rounded bg-[#161e31] border-[#1e293b]"
                />
                Strict Read-Only Mode
              </label>

              <div className="flex items-center gap-1.5">
                {['cyan', 'emerald', 'amber', 'rose'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-4 h-4 rounded-full border ${
                      color === c ? 'ring-2 ring-white' : ''
                    } ${
                      c === 'cyan' ? 'bg-[#00f5ff]' : c === 'emerald' ? 'bg-emerald-400' : c === 'amber' ? 'bg-amber-400' : 'bg-rose-400'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold text-slate-900 bg-[#00f5ff] rounded"
              >
                Save Profile
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
