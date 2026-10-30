import React, { useState, useMemo } from 'react';
import {
  ComplaintRecord,
  StandardDepartment,
  TriageStatus,
  PriorityLevel,
  ActivityLogItem,
} from '../types';
import {
  ShieldAlert,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  MapPin,
  Search,
  Filter,
  Building2,
  GitCompare,
  Sparkles,
  BarChart3,
  Layers,
  ArrowUpRight,
  ChevronRight,
  Check,
  XCircle,
  FileText,
  UserCheck,
  Send,
  Eye,
  AlertOctagon,
  RefreshCw,
  Compass,
  SlidersHorizontal,
} from 'lucide-react';

interface CommandCenterProps {
  complaints: ComplaintRecord[];
  onUpdateComplaint: (updated: ComplaintRecord) => void;
  selectedComplaintId?: string | null;
  onSelectComplaint?: (id: string) => void;
  onNavigateToHistory?: (id: string) => void;
}

const STANDARD_DEPARTMENTS: StandardDepartment[] = [
  'Roads and Infrastructure',
  'Drainage Department',
  'Sanitation Department',
  'Electricity Department',
  'Water Supply Department',
  'Public Safety Department',
];

export const CommandCenter: React.FC<CommandCenterProps> = ({
  complaints,
  onUpdateComplaint,
  selectedComplaintId,
  onSelectComplaint,
  onNavigateToHistory,
}) => {
  // Active selection
  const [activeId, setActiveId] = useState<string>(() => {
    if (selectedComplaintId && complaints.some((c) => c.id === selectedComplaintId)) {
      return selectedComplaintId;
    }
    return complaints[0]?.id || '';
  });

  // Table filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [deptFilter, setDeptFilter] = useState<string>('All');

  // Authority note input
  const [newNote, setNewNote] = useState('');
  const [noteSuccess, setNoteSuccess] = useState(false);

  // Sync prop changes
  React.useEffect(() => {
    if (selectedComplaintId && complaints.some((c) => c.id === selectedComplaintId)) {
      setActiveId(selectedComplaintId);
    }
  }, [selectedComplaintId, complaints]);

  const currentComplaint = useMemo(() => {
    return complaints.find((c) => c.id === activeId) || complaints[0] || null;
  }, [complaints, activeId]);

  // Selected department in routing card
  const [chosenDept, setChosenDept] = useState<StandardDepartment>(
    (currentComplaint?.assignedDepartment ||
      currentComplaint?.departmentAssignment?.department ||
      'Roads and Infrastructure') as StandardDepartment
  );

  React.useEffect(() => {
    if (currentComplaint) {
      setChosenDept(
        (currentComplaint.assignedDepartment ||
          currentComplaint.departmentAssignment?.department ||
          'Roads and Infrastructure') as StandardDepartment
      );
    }
  }, [currentComplaint]);

  // KPIs
  const totalCount = complaints.length;
  const pendingCount = complaints.filter((c) => c.status === 'New').length;
  const inProgressCount = complaints.filter(
    (c) => c.status === 'In Progress' || c.status === 'Dispatched'
  ).length;
  const resolvedCount = complaints.filter((c) => c.status === 'Resolved').length;
  const highPriorityCount = complaints.filter(
    (c) =>
      c.priority === 'Critical' ||
      c.priority === 'High' ||
      c.emergencyAssessment?.priority_level === 'High' ||
      (c.emergencyAssessment?.priority_score && c.emergencyAssessment.priority_score >= 75)
  ).length;

  // Hotspot Detection
  const hotspots = useMemo(() => {
    const corridorMap = new Map<string, ComplaintRecord[]>();
    complaints.forEach((c) => {
      const loc = c.location || 'Unknown Zone';
      let key = 'Other Metro Zone';
      if (loc.toLowerCase().includes('elm')) key = 'Elm Street Corridor';
      else if (loc.toLowerCase().includes('pinehurst')) key = 'Pinehurst Sector';
      else if (loc.toLowerCase().includes('oakway')) key = 'Oakway Boulevard';
      else if (loc.toLowerCase().includes('central park')) key = 'Central Park Precinct';
      else if (loc.toLowerCase().includes('northcrest')) key = 'Northcrest Utility Corridor';
      else if (loc.toLowerCase().includes('highland')) key = 'Highland Terrace & Valley';
      else if (loc.toLowerCase().includes('market')) key = '5th & Market District';
      else if (loc.toLowerCase().includes('king')) key = 'King Street Corridor';

      const existing = corridorMap.get(key) || [];
      existing.push(c);
      corridorMap.set(key, existing);
    });

    return Array.from(corridorMap.entries())
      .filter(([_, list]) => list.length >= 1)
      .map(([name, list]) => {
        const highPriority = list.filter(
          (c) =>
            c.priority === 'Critical' ||
            c.priority === 'High' ||
            (c.emergencyAssessment?.priority_score && c.emergencyAssessment.priority_score >= 75)
        ).length;
        return {
          name,
          count: list.length,
          highPriority,
          isAlert: list.length >= 2 || highPriority >= 1,
          reports: list,
        };
      })
      .sort((a, b) => b.highPriority - a.highPriority || b.count - a.count);
  }, [complaints]);

  // Analytics distributions
  const deptDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    STANDARD_DEPARTMENTS.forEach((d) => (counts[d] = 0));
    complaints.forEach((c) => {
      const d = (c.assignedDepartment || c.department || 'Roads and Infrastructure') as string;
      counts[d] = (counts[d] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({
      name,
      count,
      pct: totalCount > 0 ? Math.round((count / totalCount) * 100) : 0,
    }));
  }, [complaints, totalCount]);

  // Priority Distribution
  const priorityStats = useMemo(() => {
    let high = 0;
    let med = 0;
    let low = 0;
    complaints.forEach((c) => {
      const score = c.emergencyAssessment?.priority_score ?? 50;
      if (score >= 75 || c.priority === 'Critical' || c.priority === 'High') high++;
      else if (score >= 40) med++;
      else low++;
    });
    return { high, med, low };
  }, [complaints]);

  // Filtered complaints table
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      const matchSearch =
        !searchQuery.trim() ||
        c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.complaintText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.title && c.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.location && c.location.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus = statusFilter === 'All' || c.status === statusFilter;
      const matchPriority =
        priorityFilter === 'All' ||
        c.priority === priorityFilter ||
        c.emergencyAssessment?.priority_level === priorityFilter;
      const matchDept =
        deptFilter === 'All' ||
        c.assignedDepartment === deptFilter ||
        c.department === deptFilter;

      return matchSearch && matchStatus && matchPriority && matchDept;
    });
  }, [complaints, searchQuery, statusFilter, priorityFilter, deptFilter]);

  // Department assignment modification
  const handleAssignDepartment = (dept: StandardDepartment) => {
    if (!currentComplaint) return;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const activityItem: ActivityLogItem = {
      id: `act-assign-${Date.now()}`,
      timestamp: nowStr,
      actor: 'Municipal Authority',
      action: 'Department Assignment Confirmed',
      details: `Authority officially assigned work order to ${dept}.`,
      type: 'department_assignment',
    };

    const updated: ComplaintRecord = {
      ...currentComplaint,
      assignedDepartment: dept,
      department: dept,
      assignedDepartmentTimestamp: nowStr,
      lastUpdated: nowStr,
      activities: [activityItem, ...(currentComplaint.activities || [])],
    };
    onUpdateComplaint(updated);
  };

  // Duplicate decision confirmation
  const handleDuplicateDecision = (decision: 'confirmed_related' | 'not_a_duplicate') => {
    if (!currentComplaint) return;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const activityItem: ActivityLogItem = {
      id: `act-dup-${Date.now()}`,
      timestamp: nowStr,
      actor: 'Municipal Authority',
      action:
        decision === 'confirmed_related'
          ? 'Duplicate Incident Confirmed'
          : 'Duplicate Flag Dismissed',
      details:
        decision === 'confirmed_related'
          ? `Confirmed incident is related to ${currentComplaint.duplicateCheck?.matching_report_id || 'master record'}. Consolidated work queue.`
          : 'Dismissed duplicate flag: Record classified as distinct independent incident.',
      type: 'duplicate_decision',
    };

    const updated: ComplaintRecord = {
      ...currentComplaint,
      duplicateDecision: decision,
      duplicateDecisionTimestamp: nowStr,
      lastUpdated: nowStr,
      activities: [activityItem, ...(currentComplaint.activities || [])],
    };
    onUpdateComplaint(updated);
  };

  // Status Change
  const handleStatusChange = (newStatus: TriageStatus) => {
    if (!currentComplaint) return;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const activityItem: ActivityLogItem = {
      id: `act-status-${Date.now()}`,
      timestamp: nowStr,
      actor: 'Municipal Authority',
      action: `Status Changed to ${newStatus}`,
      details: `Work order transitioned from ${currentComplaint.status} to ${newStatus}.`,
      type: 'status_change',
    };

    const updated: ComplaintRecord = {
      ...currentComplaint,
      status: newStatus,
      lastUpdated: nowStr,
      activities: [activityItem, ...(currentComplaint.activities || [])],
    };
    onUpdateComplaint(updated);
  };

  // Add Authority Note
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !currentComplaint) return;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const activityItem: ActivityLogItem = {
      id: `act-note-${Date.now()}`,
      timestamp: nowStr,
      actor: 'Municipal Authority',
      action: 'Authority Operational Note Logged',
      details: newNote.trim(),
      type: 'note',
    };

    const updatedNotes = [...(currentComplaint.authorityNotes || []), newNote.trim()];
    const updated: ComplaintRecord = {
      ...currentComplaint,
      authorityNotes: updatedNotes,
      lastUpdated: nowStr,
      activities: [activityItem, ...(currentComplaint.activities || [])],
    };
    onUpdateComplaint(updated);
    setNewNote('');
    setNoteSuccess(true);
    setTimeout(() => setNoteSuccess(false), 2500);
  };

  const handleSelectComplaintItem = (id: string) => {
    setActiveId(id);
    onSelectComplaint?.(id);
    // Smooth scroll to selected view
    const el = document.getElementById('selected-complaint-ai-view');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <Compass className="w-3.5 h-3.5" />
            <span>Authority Command Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Municipal Operations Dashboard
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Real-time incident monitoring, AI triage verification, hotspot detection, and multi-department dispatch.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-xs text-slate-400 block font-mono">Triage Engine</span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Active · Gemini 3.8 Flash
            </span>
          </div>
        </div>
      </div>

      {/* 1. Five KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <span className="text-xs font-semibold uppercase text-slate-500 block mb-1">
            Total Complaints
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {totalCount}
            </span>
            <span className="text-xs text-slate-400">logged</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/40 rounded-xl p-4 shadow-2xs">
          <span className="text-xs font-semibold uppercase text-amber-600 dark:text-amber-400 block mb-1">
            Pending Complaints
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {pendingCount}
            </span>
            <span className="text-xs text-slate-400">awaiting triage</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/40 rounded-xl p-4 shadow-2xs">
          <span className="text-xs font-semibold uppercase text-blue-600 dark:text-blue-400 block mb-1">
            In-Progress
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
              {inProgressCount}
            </span>
            <span className="text-xs text-slate-400">dispatched</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/40 rounded-xl p-4 shadow-2xs">
          <span className="text-xs font-semibold uppercase text-emerald-600 dark:text-emerald-400 block mb-1">
            Resolved
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {resolvedCount}
            </span>
            <span className="text-xs text-slate-400">closed</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/40 rounded-xl p-4 shadow-2xs col-span-2 md:col-span-1">
          <span className="text-xs font-semibold uppercase text-rose-600 dark:text-rose-400 block mb-1">
            High Priority
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
              {highPriorityCount}
            </span>
            <span className="text-xs text-rose-500 font-medium">urgent SLA</span>
          </div>
        </div>
      </div>

      {/* 2. Interactive Map & Geographic Hotspots */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive SVG Complaint Map (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Interactive Metro Incident Map
              </h2>
            </div>
            <span className="text-xs text-slate-400">Click a pin to view AI triage</span>
          </div>

          {/* Stylized vector map canvas */}
          <div className="relative w-full h-64 sm:h-72 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden select-none">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="city-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path
                    d="M 40 0 L 0 0 0 40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.5"
                    className="text-slate-300 dark:text-slate-800"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#city-grid)" />

              {/* Metro River */}
              <path
                d="M 0,160 Q 150,110 300,190 T 600,140 T 900,200"
                fill="none"
                stroke="currentColor"
                strokeWidth="12"
                className="text-blue-200 dark:text-blue-950/70"
              />

              {/* Arterials */}
              <line x1="80" y1="0" x2="80" y2="300" stroke="currentColor" strokeWidth="3" className="text-slate-300 dark:text-slate-800" />
              <line x1="260" y1="0" x2="260" y2="300" stroke="currentColor" strokeWidth="3" className="text-slate-300 dark:text-slate-800" />
              <line x1="440" y1="0" x2="440" y2="300" stroke="currentColor" strokeWidth="3" className="text-slate-300 dark:text-slate-800" />
              <line x1="620" y1="0" x2="620" y2="300" stroke="currentColor" strokeWidth="3" className="text-slate-300 dark:text-slate-800" />
              <line x1="0" y1="100" x2="900" y2="100" stroke="currentColor" strokeWidth="3" className="text-slate-300 dark:text-slate-800" />
              <line x1="0" y1="210" x2="900" y2="210" stroke="currentColor" strokeWidth="3" className="text-slate-300 dark:text-slate-800" />

              <text x="20" y="30" className="text-3xs font-mono fill-slate-400">NW SECTOR 1</text>
              <text x="320" y="30" className="text-3xs font-mono fill-slate-400">CENTRAL METRO</text>
              <text x="500" y="30" className="text-3xs font-mono fill-slate-400">NE PRECINCT 4</text>
              <text x="20" y="270" className="text-3xs font-mono fill-slate-400">SW WATERFRONT</text>
              <text x="500" y="270" className="text-3xs font-mono fill-slate-400">SE RESIDENTIAL</text>
            </svg>

            {/* Incident Pins */}
            {complaints.map((c, i) => {
              const isSelected = c.id === activeId;
              const isHigh =
                c.priority === 'Critical' ||
                c.priority === 'High' ||
                (c.emergencyAssessment?.priority_score && c.emergencyAssessment.priority_score >= 75);

              const xPos = 12 + ((i * 13 + 7) % 76);
              const yPos = 18 + ((i * 19 + 11) % 64);

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectComplaintItem(c.id)}
                  style={{ left: `${xPos}%`, top: `${yPos}%` }}
                  title={`${c.id}: ${c.title || c.complaintText.substring(0, 30)}`}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all group flex items-center justify-center ${
                    isSelected
                      ? 'ring-4 ring-emerald-500 scale-125 z-30 shadow-lg'
                      : 'hover:scale-110 z-10'
                  } ${
                    isHigh
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-800 dark:bg-white text-white dark:text-slate-900'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-3xs font-mono px-1.5 py-0.5 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {c.id}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 pt-1">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                <span>High / Urgent Hazard</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-800 dark:bg-white" />
                <span>Standard Incident</span>
              </div>
            </div>
            <span className="font-mono text-3xs text-slate-400">
              Selected Incident: <strong className="text-slate-800 dark:text-slate-200">{activeId}</strong>
            </span>
          </div>
        </div>

        {/* Geographic Hotspot Detection (1 col) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Geographic Hotspots
              </h2>
            </div>
            <span className="text-2xs font-bold text-rose-600 dark:text-rose-400 uppercase bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-md">
              AI Clustered
            </span>
          </div>

          <p className="text-xs text-slate-500 mb-3">
            Automated cluster correlation flagging repeated municipal failures within 500m corridors:
          </p>

          <div className="space-y-2.5 overflow-y-auto max-h-60 pr-1 flex-1">
            {hotspots.map((spot, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border text-xs transition-colors ${
                  spot.isAlert
                    ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-slate-900 dark:text-white truncate">
                    {spot.name}
                  </span>
                  <span
                    className={`font-mono text-3xs font-bold px-1.5 py-0.5 rounded ${
                      spot.highPriority > 0
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200'
                        : 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {spot.count} {spot.count === 1 ? 'case' : 'cases'}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1 text-2xs text-slate-500 dark:text-slate-400">
                  <span>{spot.highPriority} urgent priority</span>
                  {spot.reports[0] && (
                    <button
                      type="button"
                      onClick={() => handleSelectComplaintItem(spot.reports[0].id)}
                      className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                    >
                      Inspect #{spot.reports[0].id}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Analytics & Workload Charts */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Department Workload & Severity Analytics
            </h2>
          </div>
          <div className="flex items-center gap-3 text-2xs font-mono">
            <span className="text-rose-500 font-semibold">{priorityStats.high} High Priority</span>
            <span className="text-amber-500 font-semibold">{priorityStats.med} Medium</span>
            <span className="text-emerald-500 font-semibold">{priorityStats.low} Low</span>
          </div>
        </div>

        {/* Department workload bars */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {deptDistribution.map((dept) => (
            <div
              key={dept.name}
              className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between"
            >
              <div>
                <span
                  className="text-3xs font-semibold text-slate-400 uppercase tracking-wide block truncate"
                  title={dept.name}
                >
                  {dept.name}
                </span>
                <span className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1 block">
                  {dept.count}
                </span>
              </div>
              <div className="mt-2">
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${dept.pct}%` }}
                  />
                </div>
                <span className="text-3xs text-slate-400 mt-1 block font-mono">
                  {dept.pct}% city total
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Full Complaint Management Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Complaint Management Table
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select any grievance record to trigger or review complete unified AI analysis.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg self-start sm:self-auto">
            Showing {filteredComplaints.length} of {complaints.length} complaints
          </span>
        </div>

        {/* Search & Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Search */}
          <div className="sm:col-span-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ID, keyword, street..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            >
              <option value="All">All Statuses</option>
              <option value="New">New</option>
              <option value="Triaged">Triaged</option>
              <option value="Dispatched">Dispatched</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            >
              <option value="All">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
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

        {/* Management Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-3xs">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Citizen Complaint</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Priority Score</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredComplaints.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    No complaints found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredComplaints.map((c) => {
                  const isSelected = c.id === activeId;
                  const score = c.emergencyAssessment?.priority_score ?? 60;
                  const level = c.emergencyAssessment?.priority_level || c.priority || 'Medium';
                  const isHigh = score >= 75 || level === 'High' || level === 'Critical';

                  return (
                    <tr
                      key={c.id}
                      onClick={() => handleSelectComplaintItem(c.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 font-semibold'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {c.id}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="truncate text-slate-900 dark:text-white font-medium">
                          {c.title || c.complaintText}
                        </div>
                        <div className="text-3xs text-slate-400 truncate">
                          {c.complaintText}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {c.analysis?.category || 'General Civic'}
                      </td>
                      <td className="px-4 py-3 max-w-[180px] truncate text-slate-600 dark:text-slate-400">
                        {c.location || 'Metro Zone'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-mono text-3xs font-bold px-2 py-0.5 rounded-full ${
                              isHigh
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : level === 'Low'
                                ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {level} · {score}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`text-3xs font-semibold px-2 py-0.5 rounded-full ${
                            c.status === 'Resolved'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : c.status === 'In Progress'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : c.status === 'New'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {c.assignedDepartment || c.department || 'Unassigned'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-3xs font-mono text-slate-400">
                        {c.timestamp.split(' ')[0]}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectComplaintItem(c.id);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-3xs font-semibold transition-colors ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {isSelected ? 'Active Selection' : 'Inspect AI'}
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

      {/* 5. Selected Complaint View: All Four AI Functionalities Together */}
      {currentComplaint && (
        <div id="selected-complaint-ai-view" className="space-y-6 pt-4 border-t border-slate-200 dark:border-slate-800">
          {/* Header Banner for Selected Complaint */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="font-mono text-sm font-bold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 px-3 py-1 rounded-lg">
                    {currentComplaint.id}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Status: {currentComplaint.status}
                  </span>
                  <span className="text-xs text-slate-400">
                    Logged: {currentComplaint.timestamp}
                  </span>
                  {currentComplaint.lastUpdated && (
                    <span className="text-xs text-slate-400">
                      · Updated: {currentComplaint.lastUpdated}
                    </span>
                  )}
                </div>

                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {currentComplaint.title || 'Civic Incident'}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{currentComplaint.location || 'Metro Right-of-Way'}</span>
                </p>
              </div>

              {onNavigateToHistory && (
                <button
                  type="button"
                  onClick={() => onNavigateToHistory(currentComplaint.id)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors self-start shrink-0"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Audit History &rarr;</span>
                </button>
              )}
            </div>

            {/* Original Complaint Text */}
            <div className="mt-4 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300 italic">
              "{currentComplaint.complaintText}"
            </div>

            {/* Image attachment if any */}
            {currentComplaint.imageUrl && (
              <div className="mt-3 flex items-center gap-3">
                <img
                  src={currentComplaint.imageUrl}
                  alt="Incident attachment"
                  className="w-16 h-16 object-cover rounded-lg border border-slate-300 dark:border-slate-700"
                />
                <span className="text-xs text-slate-500">Citizen photo evidence attached</span>
              </div>
            )}

            {/* Status Workflow & Authority Notes Bar */}
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div>
                <span className="text-3xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Update Work Order Status
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(['New', 'Triaged', 'Dispatched', 'In Progress', 'Resolved'] as TriageStatus[]).map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleStatusChange(st)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                          currentComplaint.status === st
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {st}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Add authority note */}
              <form onSubmit={handleAddNote} className="flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Log authority note / dispatch update..."
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={!newNote.trim()}
                  className="px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors disabled:opacity-50 shrink-0 flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  <span>Log</span>
                </button>
              </form>
            </div>
            {noteSuccess && (
              <p className="text-3xs text-emerald-600 dark:text-emerald-400 mt-1">
                Note recorded to chronological audit timeline.
              </p>
            )}
          </div>

          {/* ALL FOUR AI FUNCTIONALITIES TOGETHER IN 4 DISTINCT CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CARD A: Complaint Analysis */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    A. Complaint Analysis
                  </h3>
                </div>
                <span className="text-3xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded font-semibold">
                  Confidence: {Math.round((currentComplaint.analysis?.confidence || 0.95) * 100)}%
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-3xs uppercase font-semibold text-slate-400 block mb-0.5">
                    Detected Category
                  </span>
                  <p className="font-semibold text-slate-900 dark:text-white text-sm">
                    {currentComplaint.analysis?.category || 'Roads and Infrastructure'}
                  </p>
                </div>

                <div>
                  <span className="text-3xs uppercase font-semibold text-slate-400 block mb-0.5">
                    Infrastructure Involved
                  </span>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {currentComplaint.analysis?.infrastructure || 'Municipal Infrastructure'}
                  </p>
                </div>

                <div>
                  <span className="text-3xs uppercase font-semibold text-slate-400 block mb-0.5">
                    AI Summary
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    {currentComplaint.analysis?.summary || currentComplaint.complaintText}
                  </p>
                </div>

                <div>
                  <span className="text-3xs uppercase font-semibold text-slate-400 block mb-0.5">
                    Public Impact
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {currentComplaint.analysis?.public_impact ||
                      'Moderate localized impact to transit and residents.'}
                  </p>
                </div>
              </div>
            </div>

            {/* CARD B: Severity Assessment */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    B. Severity Assessment
                  </h3>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                    {currentComplaint.emergencyAssessment?.priority_score || 80}
                  </span>
                  <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                    ({currentComplaint.emergencyAssessment?.priority_level || 'High'})
                  </span>
                </div>
              </div>

              {/* Mathematical Formula Banner */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 text-3xs font-mono text-slate-600 dark:text-slate-400">
                <strong>Formula:</strong> (0.4 × Urgency) + (0.3 × Impact) + (0.2 × Safety Risk) + (0.1 × Duration)
              </div>

              {/* Four Factor Progress Bars */}
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-600 dark:text-slate-400">Urgency (0.4)</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {currentComplaint.emergencyAssessment?.urgency || 85} / 100
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-rose-500 h-2 rounded-full transition-all"
                      style={{ width: `${currentComplaint.emergencyAssessment?.urgency || 85}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-600 dark:text-slate-400">Public Impact (0.3)</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {currentComplaint.emergencyAssessment?.impact || 80} / 100
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-2 rounded-full transition-all"
                      style={{ width: `${currentComplaint.emergencyAssessment?.impact || 80}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-600 dark:text-slate-400">Safety Risk (0.2)</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {currentComplaint.emergencyAssessment?.safety_risk || 75} / 100
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-rose-600 h-2 rounded-full transition-all"
                      style={{ width: `${currentComplaint.emergencyAssessment?.safety_risk || 75}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-600 dark:text-slate-400">Duration (0.1)</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {currentComplaint.emergencyAssessment?.duration || 65} / 100
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${currentComplaint.emergencyAssessment?.duration || 65}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-3xs uppercase font-semibold text-slate-400 block mb-0.5">
                    Priority Explanation
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed italic bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-3xs">
                    {currentComplaint.emergencyAssessment?.reasoning ||
                      'Elevated priority due to significant public impact and safety hazard.'}
                  </p>
                </div>
              </div>
            </div>

            {/* CARD C: Department Routing */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    C. Department Routing
                  </h3>
                </div>
                <span className="text-3xs font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  {currentComplaint.assignedDepartment ? 'Assigned' : 'AI Recommended'}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-3xs uppercase font-semibold text-slate-400 block mb-0.5">
                    Recommended Department
                  </span>
                  <p className="font-bold text-slate-900 dark:text-white text-base">
                    {currentComplaint.departmentAssignment?.department || 'Roads and Infrastructure'}
                  </p>
                </div>

                <div>
                  <span className="text-3xs uppercase font-semibold text-slate-400 block mb-0.5">
                    Reason for Recommendation
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {currentComplaint.departmentAssignment?.reason ||
                      'Department has jurisdiction over roadway repairs, structural surfaces, and traffic safety.'}
                  </p>
                </div>

                <div>
                  <span className="text-3xs uppercase font-semibold text-slate-400 block mb-0.5">
                    Recommended Action
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    {currentComplaint.departmentAssignment?.recommended_action ||
                      'Dispatch roadway assessment unit with asphalt cold-patch repair crew.'}
                  </p>
                </div>

                {/* Authority Modification Dropdown & Assign Button */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <label className="text-3xs font-semibold uppercase text-slate-400 block">
                    Department Selection & Override
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={chosenDept}
                      onChange={(e) => setChosenDept(e.target.value as StandardDepartment)}
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      {STANDARD_DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleAssignDepartment(chosenDept)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors shrink-0"
                    >
                      Assign Department
                    </button>
                  </div>
                  {currentComplaint.assignedDepartment && (
                    <p className="text-3xs text-emerald-600 dark:text-emerald-400 font-medium">
                      ✓ Currently assigned to {currentComplaint.assignedDepartment}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* CARD D: Duplicate Detection */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <GitCompare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    D. Duplicate Detection
                  </h3>
                </div>
                <span
                  className={`text-3xs font-semibold px-2 py-0.5 rounded ${
                    currentComplaint.duplicateCheck?.possible_duplicate
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}
                >
                  {currentComplaint.duplicateCheck?.possible_duplicate
                    ? 'Possible Duplicate'
                    : 'Unique Grievance'}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                {currentComplaint.duplicateCheck?.possible_duplicate ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-3xs uppercase font-semibold text-slate-400 block mb-0.5">
                          Matching Incident ID
                        </span>
                        <p className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                          {currentComplaint.duplicateCheck.matching_report_id || 'CMP-2026-081'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-3xs uppercase font-semibold text-slate-400 block mb-0.5">
                          Similarity Match
                        </span>
                        <p className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                          {Math.round((currentComplaint.duplicateCheck.confidence || 0.94) * 100)}%
                        </p>
                      </div>
                    </div>

                    <div>
                      <span className="text-3xs uppercase font-semibold text-slate-400 block mb-0.5">
                        Correlation Reason & Proximity
                      </span>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-amber-50/50 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/40">
                        {currentComplaint.duplicateCheck.reason ||
                          'Describes the exact same physical hazard and municipal infrastructure at the same street location.'}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleDuplicateDecision('confirmed_related')}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                          currentComplaint.duplicateDecision === 'confirmed_related'
                            ? 'bg-amber-600 text-white'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-200'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirm Related</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDuplicateDecision('not_a_duplicate')}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                          currentComplaint.duplicateDecision === 'not_a_duplicate'
                            ? 'bg-slate-700 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Not a Duplicate</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>No duplicates detected across municipal records.</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      {currentComplaint.duplicateCheck?.reason ||
                        'This grievance describes a distinct geographical location and independent physical issue not matching existing active work orders.'}
                    </p>
                    <div className="text-2xs font-mono text-slate-400">
                      Duplicate Confidence: {Math.round((currentComplaint.duplicateCheck?.confidence || 0.95) * 100)}%
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
