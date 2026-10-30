import React, { useState, useMemo } from 'react';
import { ComplaintRecord, TriageStatus } from '../types';
import { AnalysisResultCard } from './AnalysisResultCard';
import { ExecutiveReportModal } from './ExecutiveReportModal';
import {
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  Building,
  AlertTriangle,
  X,
  Link2,
  FileText,
} from 'lucide-react';

interface ComplaintRegistryProps {
  complaints: ComplaintRecord[];
  onUpdateStatus: (id: string, status: TriageStatus) => void;
  onAnalyzeComplaint: (complaintText: string) => void;
}

export const ComplaintRegistry: React.FC<ComplaintRegistryProps> = ({
  complaints,
  onUpdateStatus,
  onAnalyzeComplaint,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<ComplaintRecord | null>(null);
  const [briefingRecord, setBriefingRecord] = useState<ComplaintRecord | null>(null);

  // Extract distinct categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    complaints.forEach((c) => {
      if (c.analysis?.category) set.add(c.analysis.category);
    });
    return Array.from(set);
  }, [complaints]);

  // Filter complaints
  const filtered = useMemo(() => {
    return complaints.filter((c) => {
      const matchSearch =
        c.complaintText.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.analysis?.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.analysis?.infrastructure?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCategory =
        selectedCategory === 'all' || c.analysis?.category === selectedCategory;

      const matchStatus =
        selectedStatus === 'all' || c.status === selectedStatus;

      return matchSearch && matchCategory && matchStatus;
    });
  }, [complaints, searchTerm, selectedCategory, selectedStatus]);

  return (
    <div className="space-y-6">
      {/* Editorial Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Complaint Registry & Incident Directory
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Unified municipal record of analysed citizen complaints, categorized by infrastructure asset and public impact.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-900 dark:text-white font-mono tabular-nums">
            {filtered.length}
          </span>
          <span>of</span>
          <span className="font-mono tabular-nums">{complaints.length} Records</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-3 transition-colors">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by keywords, ID, infrastructure or issue..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
          >
            <option value="all">All Triage Statuses</option>
            <option value="New">New</option>
            <option value="Triaged">Triaged</option>
            <option value="Dispatched">Dispatched</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>

          {(searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setSelectedStatus('all');
              }}
              className="px-3 py-2 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Complaint ID</th>
                <th className="py-3 px-4">Logged</th>
                <th className="py-3 px-4">Citizen Complaint</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Infrastructure</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Confidence</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    No complaints matching the selected search criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const confPct = item.analysis
                    ? (item.analysis.confidence <= 1 ? item.analysis.confidence * 100 : item.analysis.confidence).toFixed(0)
                    : null;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <div>{item.id}</div>
                        {item.duplicateOf && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-sans font-medium flex items-center gap-1 mt-0.5">
                            <Link2 className="w-2.5 h-2.5" />
                            <span>Dup of {item.duplicateOf}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono tabular-nums">
                        {item.timestamp}
                      </td>
                      <td className="py-3.5 px-4 text-slate-900 dark:text-slate-100 max-w-sm truncate font-medium">
                        {item.complaintText}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap font-medium">
                        {item.analysis?.category || (
                          <span className="text-slate-400 italic">Pending analysis</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {item.analysis?.infrastructure || '—'}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <select
                          value={item.status}
                          onChange={(e) => onUpdateStatus(item.id, e.target.value as TriageStatus)}
                          className="text-[11px] font-medium py-1 px-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                        >
                          <option value="New">New</option>
                          <option value="Triaged">Triaged</option>
                          <option value="Dispatched">Dispatched</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        {confPct ? `${confPct}%` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setBriefingRecord(item)}
                            className="px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors inline-flex items-center gap-1"
                            title="Generate Executive Decision-Maker Report"
                          >
                            <FileText className="w-3 h-3 text-slate-500" />
                            <span>Briefing</span>
                          </button>
                          {item.analysis ? (
                            <button
                              type="button"
                              onClick={() => setSelectedRecord(item)}
                              className="px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors inline-flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onAnalyzeComplaint(item.complaintText)}
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 rounded-md transition-colors"
                            >
                              Analyse
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal / Inspector for full analysis */}
      {selectedRecord && selectedRecord.analysis && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  {selectedRecord.id} · Logged {selectedRecord.timestamp}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Complaint Analysis Report
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <AnalysisResultCard
              analysis={selectedRecord.analysis}
              complaintText={selectedRecord.complaintText}
              isSaved={true}
            />
          </div>
        </div>
      )}

      {/* Executive Decision-Maker Report Modal */}
      {briefingRecord && (
        <ExecutiveReportModal
          complaint={briefingRecord}
          onClose={() => setBriefingRecord(null)}
          relatedComplaintsCount={briefingRecord.duplicateOf ? 2 : 1}
        />
      )}
    </div>
  );
};
