import React, { useState } from 'react';
import { Search, Plus, Trash2, Check, Edit2, X } from 'lucide-react';
import { api, KeyDetail } from '../../api/client';

interface HashViewProps {
  detail: KeyDetail;
  readOnly: boolean;
  onRefresh: () => void;
}

export const HashView: React.FC<HashViewProps> = ({ detail, readOnly, onRefresh }) => {
  const fieldsMap = (detail.value as Record<string, string>) || {};
  const [filter, setFilter] = useState('');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const [newField, setNewField] = useState('');
  const [newValue, setNewValue] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const filteredEntries = Object.entries(fieldsMap).filter(
    ([k, v]) => k.toLowerCase().includes(filter.toLowerCase()) || v.toLowerCase().includes(filter.toLowerCase())
  );

  const handleStartEdit = (field: string, val: string) => {
    if (readOnly) return;
    setEditingField(field);
    setEditingValue(val);
  };

  const handleSaveEdit = async (field: string) => {
    try {
      await api.hset(detail.name, field, editingValue);
      setEditingField(null);
      onRefresh();
    } catch (err) {
      alert('Failed to save field');
    }
  };

  const handleDelete = async (field: string) => {
    if (readOnly) return;
    if (!confirm(`Delete field '${field}' from hash?`)) return;
    try {
      await api.hdel(detail.name, field);
      onRefresh();
    } catch (err) {
      alert('Failed to delete field');
    }
  };

  const handleAddField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newField) return;
    try {
      await api.hset(detail.name, newField, newValue);
      setNewField('');
      setNewValue('');
      setShowAdd(false);
      onRefresh();
    } catch (err) {
      alert('Failed to add field');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1322] border border-[#1e293b] rounded-xl overflow-hidden">
      {/* Action Bar */}
      <div className="h-11 px-4 border-b border-[#1e293b] bg-[#101625] flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search fields or values..."
            className="w-full bg-[#161e31] text-xs text-slate-200 pl-8 pr-3 py-1.5 rounded-md border border-[#1e293b] focus:outline-none focus:border-[#00f5ff]/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">
            {Object.keys(fieldsMap).length} fields
          </span>

          {!readOnly && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-900 bg-[#00f5ff] hover:bg-[#38bdf8] rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Field
            </button>
          )}
        </div>
      </div>

      {/* Add Field Inline Modal/Bar */}
      {showAdd && (
        <form onSubmit={handleAddField} className="p-3 bg-[#161e31] border-b border-[#1e293b] flex items-center gap-3">
          <input
            type="text"
            placeholder="Field name"
            value={newField}
            onChange={(e) => setNewField(e.target.value)}
            className="bg-[#0b0f19] border border-[#1e293b] text-xs text-white px-3 py-1.5 rounded focus:outline-none flex-1"
            autoFocus
          />
          <input
            type="text"
            placeholder="Value"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="bg-[#0b0f19] border border-[#1e293b] text-xs text-white px-3 py-1.5 rounded focus:outline-none flex-2"
          />
          <button type="submit" className="px-3 py-1.5 text-xs font-medium text-slate-900 bg-[#00f5ff] rounded hover:bg-[#38bdf8]">
            Save
          </button>
          <button type="button" onClick={() => setShowAdd(false)} className="p-1.5 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* Fields Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-[#101625] text-slate-400 border-b border-[#1e293b]">
            <tr>
              <th className="py-2.5 px-4 font-semibold w-1/3">Field</th>
              <th className="py-2.5 px-4 font-semibold">Value</th>
              {!readOnly && <th className="py-2.5 px-4 font-semibold w-16 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e293b]/60">
            {filteredEntries.map(([field, value]) => {
              const isEditing = editingField === field;
              return (
                <tr key={field} className="hover:bg-[#161e31]/40 transition-colors group">
                  <td className="py-2.5 px-4 font-mono font-medium text-slate-200 break-all">{field}</td>
                  <td className="py-2.5 px-4 font-mono text-slate-300 break-all">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          className="bg-[#0b0f19] border border-[#00f5ff]/40 text-xs text-white px-2 py-1 rounded w-full focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveEdit(field)}
                          className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingField(null)}
                          className="p-1 text-slate-400 hover:bg-slate-700 rounded"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span>{value}</span>
                    )}
                  </td>
                  {!readOnly && (
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!isEditing && (
                          <button
                            onClick={() => handleStartEdit(field, value)}
                            className="p-1 text-slate-400 hover:text-[#00f5ff] rounded"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(field)}
                          className="p-1 text-slate-400 hover:text-rose-400 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
            {filteredEntries.length === 0 && (
              <tr>
                <td colSpan={readOnly ? 2 : 3} className="py-8 text-center text-slate-500">
                  No fields match query
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
