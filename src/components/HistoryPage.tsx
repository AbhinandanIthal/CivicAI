import React, { useState, useMemo } from 'react';
import {
  ComplaintRecord,
  StandardDepartment,
  TriageStatus,
  PriorityLevel,
  ActivityLogItem,
} from '../types';
import {
  History,
  Search,
  Filter,
  Calendar,
  Building2,
  Clock,
  MapPin,
  Sparkles,
  AlertOctagon,
  GitCompare,
  FileText,
  UserCheck,
  CheckCircle2,
  X,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react';

interface HistoryPageProps {
  complaints: ComplaintRecord[];
  initialSelectedId?: string | null;
  onNavigateToCommand?: (id: string) => void;
  onNavigateToTrack?: (id: string) => void;
}

const STANDARD_DEPARTMENTS: StandardDepartment[] = [
  'Roads and Infrastructure',
  'Drainage Department',
  'Sanitation Department',
  'Electricity Department',
  'Water Supply Department',
  'Public Safety Department',
];

export const HistoryPage: React.FC<HistoryPageProps> = ({
  complaints,
  initialSelectedId,
  onNavigateToCommand,
  onNavigateToTrack,
}) => {
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');

  // Selected complaint for full chronological audit modal / drawer
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintRecord | null>(() => {
    if (initialSelectedId) {
      return complaints.find((c) => c.id === initialSelectedId) || null;
    }
    return null;
  });

  // Sync if prop changes
  React.useEffect(() => {
    if (initialSelectedId) {
      const found = complaints.find((c) => c.id === initialSelectedId);
      if (found) setSelectedComplaint(found);
    }
  }, [initialSelectedId, complaints]);

  // Extract categories present
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    complaints.forEach((c) => {
      const cat = c.analysis?.category;
      if (cat) set.add(cat);
    });
    return Array.from(set).sort();
  }, [complaints]);

  // Filter complaints
  const filteredComplaints = useMemo(() => {
    const now = new Date();

    return complaints.filter((c) => {
      // Search
      const searchLower = searchQuery.toLowerCase();
      const matchSearch =
        !searchQuery.trim() ||
        c.id.toLowerCase().includes(searchLower) ||
        c.complaintText.toLowerCase().includes(searchLower) ||
        (c.title && c.title.toLowerCase().includes(searchLower)) ||
        (c.location && c.location.toLowerCase().includes(searchLower));

      // Category
      const matchCategory =
        categoryFilter === 'All' || c.analysis?.category === categoryFilter;

      // Priority
      const matchPriority =
        priorityFilter === 'All' ||
        c.priority === priorityFilter ||
        c.emergencyAssessment?.priority_level === priorityFilter;

      // Status
      const matchStatus = statusFilter === 'All' || c.status === statusFilter;

      // Department
      const matchDept =
        deptFilter === 'All' ||
        c.assignedDepartment === deptFilter ||
        c.department === deptFilter;

      // Date Range
      let matchDate = true;
      if (dateRange !== 'all') {
        const itemDate = new Date(c.timestamp.replace(' ', 'T'));
        if (!isNaN(itemDate.getTime())) {
          const diffMs = now.getTime() - itemDate.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);

          if (dateRange === 'today') {
            matchDate = diffDays <= 1;
          } else if (dateRange === '7days') {
            matchDate = diffDays <= 7;
          } else if (dateRange === '30days') {
            matchDate = diffDays <= 30;
          }
        }
      }

      return matchSearch && matchCategory && matchPriority && matchStatus && matchDept && matchDate;
    });
  }, [
    complaints,
    searchQuery,
    categoryFilter,
    priorityFilter,
    statusFilter,
    deptFilter,
    dateRange,
  ]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold uppercase tracking-wider mb-2">
              <History className="w-3.5 h-3.5" />
              <span>Municipal Audit & Complaint Archive</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Grievance Activity History
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
              Complete chronological audit trail of all previous complaints, AI categorizations, severity calculations, department assignments, duplicate decisions, and operational field notes.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg text-slate-700 dark:text-slate-300">
              {filteredComplaints.length} of {complaints.length} Records
            </span>
          </div>
        </div>
      </div>

      {/* Multi-faceted Filter Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          <SlidersHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Filter Records & Audit History</span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID, keyword, address, or infrastructure..."
            className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {/* Date Range */}
          <div>
            <label className="text-3xs font-semibold uppercase text-slate-400 block mb-1">
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            >
              <option value="all">All Dates</option>
              <option value="today">Today (24h)</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="text-3xs font-semibold uppercase text-slate-400 block mb-1">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            >
              <option value="All">All Categories</option>
              {availableCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="text-3xs font-semibold uppercase text-slate-400 block mb-1">
              Priority Level
            </label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            >
              <option value="All">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="text-3xs font-semibold uppercase text-slate-400 block mb-1">
              Current Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            >
              <option value="All">All Statuses</option>
              <option value="New">New</option>
              <option value="Triaged">Triaged</option>
              <option value="Dispatched">Dispatched</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          {/* Department */}
          <div>
            <label className="text-3xs font-semibold uppercase text-slate-400 block mb-1">
              Department
            </label>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            >
              <option value="All">All Departments</option>
              {STANDARD_DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Complaints Archive Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-3xs">
              <tr>
                <th className="px-4 py-3.5">Complaint ID</th>
                <th className="px-4 py-3.5">Title & Location</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5">Priority</th>
                <th className="px-4 py-3.5">Assigned Department</th>
                <th className="px-4 py-3.5">Current Status</th>
                <th className="px-4 py-3.5">Submission Date</th>
                <th className="px-4 py-3.5">Last Updated</th>
                <th className="px-4 py-3.5 text-right">Activity Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredComplaints.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    No complaint records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredComplaints.map((c) => {
                  const isHigh =
                    c.priority === 'Critical' ||
                    c.priority === 'High' ||
                    (c.emergencyAssessment?.priority_score && c.emergencyAssessment.priority_score >= 75);

                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedComplaint(c)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      {/* ID */}
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {c.id}
                      </td>

                      {/* Title & Location */}
                      <td className="px-4 py-3.5 max-w-xs">
                        <div className="font-semibold text-slate-900 dark:text-white truncate">
                          {c.title || c.complaintText}
                        </div>
                        <div className="text-3xs text-slate-400 truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span>{c.location || 'Metro Area'}</span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-700 dark:text-slate-300">
                        {c.analysis?.category || 'General Civic'}
                      </td>

                      {/* Priority */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`font-mono text-3xs font-semibold px-2 py-0.5 rounded-full ${
                            isHigh
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {c.emergencyAssessment?.priority_level || c.priority || 'Medium'}
                          {c.emergencyAssessment?.priority_score ? ` (${c.emergencyAssessment.priority_score})` : ''}
                        </span>
                      </td>

                      {/* Department */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-700 dark:text-slate-300">
                        {c.assignedDepartment || c.department || 'Roads and Infrastructure'}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`text-3xs font-semibold px-2 py-0.5 rounded-full ${
                            c.status === 'Resolved'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : c.status === 'New'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>

                      {/* Submission Date */}
                      <td className="px-4 py-3.5 whitespace-nowrap font-mono text-slate-500 text-3xs">
                        {c.timestamp}
                      </td>

                      {/* Last Updated */}
                      <td className="px-4 py-3.5 whitespace-nowrap font-mono text-slate-500 text-3xs">
                        {c.lastUpdated || c.timestamp}
                      </td>

                      {/* View Action */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedComplaint(c);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-medium text-3xs inline-flex items-center gap-1 transition-colors"
                        >
                          <span>Open Audit</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chronological Activity Audit Drawer / Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-2xl h-full bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto p-6 sm:p-8 flex flex-col justify-between border-l border-slate-200 dark:border-slate-800">
            {/* Modal Header */}
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
                    {selectedComplaint.id}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Status: {selectedComplaint.status}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Title & Core Details */}
              <div className="mt-4 space-y-3">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {selectedComplaint.title || 'Civic Grievance Record'}
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{selectedComplaint.location || 'Metro Area'}</span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-xs italic text-slate-700 dark:text-slate-300">
                  "{selectedComplaint.complaintText}"
                </div>

                {selectedComplaint.imageUrl && (
                  <div>
                    <span className="text-3xs font-semibold text-slate-400 uppercase block mb-1">
                      Submitted Photo Evidence
                    </span>
                    <img
                      src={selectedComplaint.imageUrl}
                      alt="Incident attachment"
                      className="w-full max-h-40 object-cover rounded-xl border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                )}
              </div>

              {/* Four Factor Severity Breakdown */}
              <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Severity Assessment History
                  </span>
                  <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400">
                    Priority Score: {selectedComplaint.emergencyAssessment?.priority_score || 80} ({selectedComplaint.emergencyAssessment?.priority_level || 'High'})
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-3xs">
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block">Urgency (0.4)</span>
                    <strong className="font-mono text-xs">{selectedComplaint.emergencyAssessment?.urgency || 85}</strong>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block">Impact (0.3)</span>
                    <strong className="font-mono text-xs">{selectedComplaint.emergencyAssessment?.impact || 80}</strong>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block">Safety (0.2)</span>
                    <strong className="font-mono text-xs">{selectedComplaint.emergencyAssessment?.safety_risk || 90}</strong>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block">Duration (0.1)</span>
                    <strong className="font-mono text-xs">{selectedComplaint.emergencyAssessment?.duration || 40}</strong>
                  </div>
                </div>
                <p className="text-3xs text-slate-500 italic">
                  Formula: (0.4 × Urgency) + (0.3 × Impact) + (0.2 × Safety Risk) + (0.1 × Duration)
                </p>
              </div>

              {/* Complete Chronological Activity Timeline */}
              <div className="mt-6 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Chronological Activity Timeline
                </h3>

                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  {(selectedComplaint.activities && selectedComplaint.activities.length > 0
                    ? selectedComplaint.activities
                    : [
                        {
                          id: 'fallback-1',
                          timestamp: selectedComplaint.timestamp,
                          actor: 'Citizen',
                          action: 'Grievance Submitted',
                          details: 'Report logged into the municipal database.',
                          type: 'submission',
                        },
                        {
                          id: 'fallback-2',
                          timestamp: selectedComplaint.timestamp,
                          actor: 'AI System',
                          action: 'AI Triage Completed',
                          details: `Assigned category ${selectedComplaint.analysis?.category || 'General'}. Priority score: ${selectedComplaint.emergencyAssessment?.priority_score || 75}.`,
                          type: 'ai_analysis',
                        },
                      ]
                  ).map((act, idx) => (
                    <div key={act.id || idx} className="relative group">
                      {/* Timeline dot */}
                      <div
                        className={`absolute -left-6 top-1 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-slate-900 ${
                          act.actor === 'AI System'
                            ? 'bg-emerald-500'
                            : act.actor === 'Municipal Authority'
                            ? 'bg-blue-600'
                            : 'bg-slate-800 dark:bg-white'
                        }`}
                      />

                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-xs text-slate-900 dark:text-white">
                          {act.action}
                        </span>
                        <span className="font-mono text-3xs text-slate-400">
                          {act.timestamp}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 text-3xs text-slate-500">
                        <span
                          className={`font-semibold ${
                            act.actor === 'AI System'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : act.actor === 'Municipal Authority'
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          Actor: {act.actor}
                        </span>
                        <span>·</span>
                        <span className="uppercase text-2xs tracking-wider">{act.type.replace('_', ' ')}</span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                        {act.details}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              {onNavigateToCommand && (
                <button
                  type="button"
                  onClick={() => {
                    onNavigateToCommand(selectedComplaint.id);
                    setSelectedComplaint(null);
                  }}
                  className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors flex items-center gap-1.5"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Open in Command Center</span>
                </button>
              )}

              {onNavigateToTrack && (
                <button
                  type="button"
                  onClick={() => {
                    onNavigateToTrack(selectedComplaint.id);
                    setSelectedComplaint(null);
                  }}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors flex items-center gap-1.5"
                >
                  <span>Citizen Tracking View &rarr;</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
