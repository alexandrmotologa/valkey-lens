import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { KeyDetail } from '../../api/client';

interface ZSetMember {
  member: string;
  score: number;
}

interface ZSetViewProps {
  detail: KeyDetail;
  readOnly: boolean;
  onRefresh: () => void;
}

export const ZSetView: React.FC<ZSetViewProps> = ({ detail }) => {
  const members = (detail.value as ZSetMember[]) || [];
  const [filter, setFilter] = useState('');

  const filteredMembers = members.filter((m) =>
    m.member.toLowerCase().includes(filter.toLowerCase())
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
            placeholder="Search sorted set members..."
            className="w-full bg-[#161e31] text-xs text-slate-200 pl-8 pr-3 py-1.5 rounded-md border border-[#1e293b] focus:outline-none focus:border-[#00f5ff]/50"
          />
        </div>
        <span className="text-xs text-slate-400 font-mono">{members.length} members</span>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-[#101625] text-slate-400 border-b border-[#1e293b]">
            <tr>
              <th className="py-2.5 px-4 font-semibold w-16">Rank</th>
              <th className="py-2.5 px-4 font-semibold w-32">Score</th>
              <th className="py-2.5 px-4 font-semibold">Member</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e293b]/60 font-mono">
            {filteredMembers.map((item, idx) => (
              <tr key={idx} className="hover:bg-[#161e31]/40 transition-colors">
                <td className="py-2.5 px-4 text-slate-500 font-semibold">#{idx + 1}</td>
                <td className="py-2.5 px-4 text-purple-400 font-semibold">{item.score}</td>
                <td className="py-2.5 px-4 text-slate-200 break-all">{item.member}</td>
              </tr>
            ))}
            {filteredMembers.length === 0 && (
              <tr>
                <td colSpan={3} className="py-8 text-center text-slate-500">
                  No sorted set members found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
