import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { KeyDetail } from '../../api/client';

interface SetViewProps {
  detail: KeyDetail;
  readOnly: boolean;
  onRefresh: () => void;
}

export const SetView: React.FC<SetViewProps> = ({ detail }) => {
  const members = (detail.value as string[]) || [];
  const [filter, setFilter] = useState('');

  const filteredMembers = members.filter((m) =>
    m.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#0d1322] border border-[#1e293b] rounded-xl overflow-hidden">
      <div className="h-11 px-4 border-b border-[#1e293b] bg-[#101625] flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search set members..."
            className="w-full bg-[#161e31] text-xs text-slate-200 pl-8 pr-3 py-1.5 rounded-md border border-[#1e293b] focus:outline-none focus:border-[#00f5ff]/50"
          />
        </div>
        <span className="text-xs text-slate-400 font-mono">{members.length} members</span>
      </div>

      <div className="flex-1 p-4 overflow-auto">
        <div className="flex flex-wrap gap-2">
          {filteredMembers.map((member, i) => (
            <div
              key={i}
              className="px-3 py-1.5 rounded-lg bg-[#161e31] border border-[#1e293b] text-xs font-mono text-emerald-400/90 shadow-sm flex items-center gap-2"
            >
              <span>{member}</span>
            </div>
          ))}
          {filteredMembers.length === 0 && (
            <div className="w-full py-12 text-center text-slate-500 text-xs">
              No set members found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
