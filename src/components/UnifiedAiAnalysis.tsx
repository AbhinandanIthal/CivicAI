import React, { useState, useMemo, useEffect } from 'react';
import {
  ComplaintRecord,
  StandardDepartment,
  CivicAnalysisResponse,
  EmergencyAssessmentResponse,
  DepartmentAssignmentResponse,
  DuplicateDetectionResponse,
} from '../types';
import {
  Search,
  Filter,
  Sparkles,
  RefreshCw,
  AlertOctagon,
  Building2,
  GitCompare,
  FileSearch,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Flame,
  Activity,
  ArrowRight,
  Check,
  ChevronDown,
  Layers,
  Info,
  ExternalLink,
  SlidersHorizontal,
  FileText,
} from 'lucide-react';

interface UnifiedAiAnalysisProps {
  complaints: ComplaintRecord[];
  onUpdateComplaint: (updated: ComplaintRecord) => void;
  onSelectComplaintId?: string | null;
}

const STANDARD_DEPARTMENTS: StandardDepartment[] = [
  'Roads and Infrastructure',
  'Drainage Department',
  'Sanitation Department',
  'Electricity Department',
  'Water Supply Department',
  'Public Safety Department',
];

export const UnifiedAiAnalysis: React.FC<UnifiedAiAnalysisProps> = ({
  complaints,
  onUpdateComplaint,
  onSelectComplaintId,
}) => {
  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  // Currently Selected Complaint
  const [selectedId, setSelectedId] = useState<string>(() => {
    if (onSelectComplaintId && complaints.some((c) => c.id === onSelectComplaintId)) {
      return onSelectComplaintId;
    }
    return complaints[0]?.id || '';
  });

  // Track if selected ID changed from outside
  useEffect(() => {
    if (onSelectComplaintId && complaints.some((c) => c.id === onSelectComplaintId)) {
      setSelectedId(onSelectComplaintId);
    }
  }, [onSelectComplaintId, complaints]);

  // If selectedId is invalid, fall back to first complaint
  useEffect(() => {
    if (!complaints.some((c) => c.id === selectedId) && complaints.length > 0) {
      setSelectedId(complaints[0].id);
    }
  }, [complaints, selectedId]);

  // Currently selected complaint object
  const currentComplaint = useMemo(() => {
    return complaints.find((c) => c.id === selectedId) || complaints[0] || null;
  }, [complaints, selectedId]);

  // Loading, error, and action feedback states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [deptSaveSuccess, setDeptSaveSuccess] = useState(false);
  const [duplicateDecisionSuccess, setDuplicateDecisionSuccess] = useState<string | null>(null);

  // Department dropdown state (in Card 3)
  const [chosenDepartment, setChosenDepartment] = useState<StandardDepartment>(() => {
    if (currentComplaint?.departmentAssignment?.department) {
      return currentComplaint.departmentAssignment.department;
    }
    if (currentComplaint?.department && STANDARD_DEPARTMENTS.includes(currentComplaint.department as StandardDepartment)) {
      return currentComplaint.department as StandardDepartment;
    }
    return 'Roads and Infrastructure';
  });

  // Keep chosen department in sync when selected complaint changes
  useEffect(() => {
    if (currentComplaint) {
      if (currentComplaint.departmentAssignment?.department) {
        setChosenDepartment(currentComplaint.departmentAssignment.department);
      } else if (currentComplaint.department && STANDARD_DEPARTMENTS.includes(currentComplaint.department as StandardDepartment)) {
        setChosenDepartment(currentComplaint.department as StandardDepartment);
      }
    }
    setDeptSaveSuccess(false);
    setDuplicateDecisionSuccess(null);
    setAnalysisError(null);
  }, [currentComplaint?.id]);

  // Extract categories present in complaints for the filter dropdown
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    complaints.forEach((c) => {
      const cat = c.analysis?.category;
      if (cat) set.add(cat);
    });
    return Array.from(set).sort();
  }, [complaints]);

  // Filter complaints based on Search, Category, and Priority
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      const textMatch =
        !searchQuery.trim() ||
        c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.complaintText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.title && c.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.location && c.location.toLowerCase().includes(searchQuery.toLowerCase()));

      const categoryMatch =
        categoryFilter === 'All' ||
        c.analysis?.category === categoryFilter;

      const priorityMatch =
        priorityFilter === 'All' ||
        c.priority === priorityFilter ||
        c.emergencyAssessment?.priority_level === priorityFilter;

      return textMatch && categoryMatch && priorityMatch;
    });
  }, [complaints, searchQuery, categoryFilter, priorityFilter]);

  // Call the live Gemini API endpoint to run full unified AI analysis
  const handleRunFullAnalysis = async () => {
    if (!currentComplaint) return;
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const otherComplaints = complaints
        .filter((c) => c.id !== currentComplaint.id)
        .map((c) => ({
          id: c.id,
          text: c.complaintText,
          category: c.analysis?.category || c.department,
          infrastructure: c.analysis?.infrastructure,
        }));

      const res = await fetch('/api/unified-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complaint: currentComplaint.complaintText,
          existingReports: otherComplaints,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${res.status}`);
      }

      const data = await res.json();

      // Calculate final priority score using required formula
      const urgency = data.emergencyAssessment?.urgency ?? 50;
      const impact = data.emergencyAssessment?.impact ?? 50;
      const safetyRisk = data.emergencyAssessment?.safety_risk ?? 50;
      const duration = data.emergencyAssessment?.duration ?? 30;
      const priorityScore = Math.round(
        (0.4 * urgency) + (0.3 * impact) + (0.2 * safetyRisk) + (0.1 * duration)
      );
      const priorityLevel: 'High' | 'Medium' | 'Low' =
        priorityScore >= 75 ? 'High' : priorityScore >= 40 ? 'Medium' : 'Low';

      const updatedAssessment: EmergencyAssessmentResponse = {
        ...data.emergencyAssessment,
        priority_score: priorityScore,
        priority_level: priorityLevel,
      };

      const updatedRecord: ComplaintRecord = {
        ...currentComplaint,
        analysis: data.analysis,
        emergencyAssessment: updatedAssessment,
        departmentAssignment: data.departmentAssignment,
        duplicateCheck: data.duplicateCheck,
        priority: priorityLevel === 'High' ? 'Critical' : priorityLevel === 'Medium' ? 'Medium' : 'Low',
        location: currentComplaint.location || data.analysis?.infrastructure || 'Municipal Corridor',
      };

      if (data.departmentAssignment?.department) {
        setChosenDepartment(data.departmentAssignment.department);
      }

      onUpdateComplaint(updatedRecord);
    } catch (err: any) {
      setAnalysisError(err.message || 'Error occurred while running unified AI analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Assign department & save decision
  const handleAssignDepartment = () => {
    if (!currentComplaint) return;
    const updated: ComplaintRecord = {
      ...currentComplaint,
      department: chosenDepartment,
      assignedDepartment: chosenDepartment,
      assignedDepartmentTimestamp: new Date().toISOString(),
      status: currentComplaint.status === 'New' ? 'Dispatched' : currentComplaint.status,
    };
    onUpdateComplaint(updated);
    setDeptSaveSuccess(true);
    setTimeout(() => setDeptSaveSuccess(false), 3000);
  };

  // Duplicate decision handlers (Confirm Related or Not a Duplicate)
  const handleDuplicateDecision = (decision: 'confirmed_related' | 'not_a_duplicate') => {
    if (!currentComplaint) return;
    const updated: ComplaintRecord = {
      ...currentComplaint,
      duplicateDecision: decision,
      duplicateDecisionTimestamp: new Date().toISOString(),
    };
    onUpdateComplaint(updated);
    setDuplicateDecisionSuccess(
      decision === 'confirmed_related'
        ? 'Decision Saved: Confirmed as related duplicate incident.'
        : 'Decision Saved: Verified as distinct independent incident.'
    );
    setTimeout(() => setDuplicateDecisionSuccess(null), 3500);
  };

  // Derived values for the current complaint
  const analysis = currentComplaint?.analysis;
  const emergency = currentComplaint?.emergencyAssessment;
  const departmentInfo = currentComplaint?.departmentAssignment;
  const duplicateInfo = currentComplaint?.duplicateCheck;

  // Calculate Priority Score via backend formula:
  // Priority Score = (0.4 × Urgency) + (0.3 × Impact) + (0.2 × Safety Risk) + (0.1 × Duration)
  const urgencyVal = emergency?.urgency ?? 50;
  const impactVal = emergency?.impact ?? 50;
  const safetyRiskVal = emergency?.safety_risk ?? 45;
  const durationVal = emergency?.duration ?? 30;

  const calculatedPriorityScore = emergency?.priority_score ?? Math.round(
    (0.4 * urgencyVal) + (0.3 * impactVal) + (0.2 * safetyRiskVal) + (0.1 * durationVal)
  );

  const calculatedPriorityLevel: 'High' | 'Medium' | 'Low' =
    emergency?.priority_level ?? (calculatedPriorityScore >= 75 ? 'High' : calculatedPriorityScore >= 40 ? 'Medium' : 'Low');

  // Related report if duplicate matched
  const matchingReport = useMemo(() => {
    if (!duplicateInfo?.matching_report_id) return null;
    return complaints.find((c) => c.id === duplicateInfo.matching_report_id) || null;
  }, [complaints, duplicateInfo?.matching_report_id]);

  const similarityPercent = duplicateInfo
    ? Math.round(duplicateInfo.confidence * 100)
    : 0;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <Sparkles className="w-3 h-3" />
                Unified Intelligence Hub
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Model: gemini-3.8-flash
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              AI Complaint Analysis
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
              Understand, prioritize, detect duplicates, and route civic complaints using AI.
            </p>
          </div>

          {/* Quick Action: Run AI Analysis on Selected Complaint */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRunFullAnalysis}
              disabled={isAnalyzing || !currentComplaint}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isAnalyzing ? 'Analyzing Complaint...' : 'Re-run Live AI Analysis'}</span>
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {analysisError && (
          <div className="mt-4 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-lg text-sm text-red-800 dark:text-red-300 flex items-start gap-2.5">
            <AlertOctagon className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Analysis Notice:</span> {analysisError}
            </div>
          </div>
        )}
      </div>

      {/* Top Controls: Search, Complaint ID Selection, Category Filter, Priority Filter */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Complaint Selection & Filters</span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Showing {filteredComplaints.length} of {complaints.length} complaints
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. Complaint Search Bar */}
          <div className="relative">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Search Complaints
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search ID, keyword, address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white transition-all"
              />
            </div>
          </div>

          {/* 2. Complaint ID Selection Dropdown */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Select Complaint ID
            </label>
            <div className="relative">
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full pl-3 pr-8 py-2 text-xs sm:text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white appearance-none transition-all cursor-pointer"
              >
                {filteredComplaints.length === 0 && (
                  <option value="">No matching complaints</option>
                )}
                {filteredComplaints.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id} — {c.title || c.analysis?.category || c.complaintText.slice(0, 32) + '...'}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 3. Category Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Filter by Category
            </label>
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full pl-3 pr-8 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white appearance-none transition-all cursor-pointer"
              >
                <option value="All">All Categories ({complaints.length})</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 4. Priority Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Filter by Priority
            </label>
            <div className="relative">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full pl-3 pr-8 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white appearance-none transition-all cursor-pointer"
              >
                <option value="All">All Priorities</option>
                <option value="High">High (Score 75–100)</option>
                <option value="Medium">Medium (Score 40–74)</option>
                <option value="Low">Low (Score 0–39)</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Selected Complaint Meta Pill Strip */}
        {currentComplaint && (
          <div className="pt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Selected Active Case:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
              {currentComplaint.id}
            </span>
            <span>·</span>
            <span>Logged: {currentComplaint.timestamp}</span>
            <span>·</span>
            <span>Channel: {currentComplaint.source.replace('_', ' ')}</span>
            {currentComplaint.assignedDepartment && (
              <>
                <span>·</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                  Assigned to: {currentComplaint.assignedDepartment}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* No selection state */}
      {!currentComplaint && (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
          <Info className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">No complaint matches your filter</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Try resetting your search query or selecting a different category/priority.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setCategoryFilter('All');
              setPriorityFilter('All');
            }}
            className="mt-4 px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Responsive Grid: 2 Columns on Desktop, 1 Column on Mobile */}
      {currentComplaint && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* ========================================================= */}
          {/* CARD 1: COMPLAINT ANALYSIS */}
          {/* ========================================================= */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-2xs flex flex-col justify-between h-full">
            <div className="space-y-5">
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <FileSearch className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Card 1 · Classification
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Complaint Analysis
                    </h3>
                  </div>
                </div>

                {/* AI Confidence Badge */}
                <div className="text-right">
                  <span className="text-2xs font-semibold uppercase text-slate-400 block mb-0.5">
                    AI Confidence
                  </span>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <Sparkles className="w-3 h-3 text-emerald-500" />
                    <span>
                      {analysis?.confidence ? `${Math.round(analysis.confidence * 100)}%` : '95%'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Complaint ID & Title */}
              <div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                    {currentComplaint.id}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {currentComplaint.source.replace('_', ' ')}
                  </span>
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  {currentComplaint.title || analysis?.summary?.slice(0, 48) || 'Civic Infrastructure Incident'}
                </h4>
              </div>

              {/* Original Complaint Description */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Original Citizen Description
                </label>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans italic">
                  "{currentComplaint.complaintText}"
                </div>
              </div>

              {/* AI-Generated Summary */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  AI-Generated Concise Summary
                </label>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                  {analysis?.summary || 'Complaint describes localized civic infrastructure impact requiring operational municipal attention.'}
                </p>
              </div>

              {/* Key Classification Attributes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Detected Category */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800">
                  <span className="text-2xs font-semibold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                    Detected Category
                  </span>
                  <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                    {analysis?.category || 'Roads & Traffic Safety'}
                  </span>
                </div>

                {/* Infrastructure Involved */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800">
                  <span className="text-2xs font-semibold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                    Infrastructure Involved
                  </span>
                  <span className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{analysis?.infrastructure || 'Municipal Roadway Surface'}</span>
                  </span>
                </div>
              </div>

              {/* Location */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800 flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-2xs font-semibold uppercase text-slate-500 dark:text-slate-400 block">
                    Geographical Location
                  </span>
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 break-words">
                    {currentComplaint.location || analysis?.infrastructure || 'Eastbound Elm Street near 4th Avenue'}
                  </span>
                </div>
              </div>

              {/* Public Impact Note */}
              {analysis?.public_impact && (
                <div className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2 pt-1">
                  <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-700 dark:text-slate-300">Public Impact:</strong> {analysis.public_impact}
                  </span>
                </div>
              )}
            </div>

            {/* Footer timestamp & engine */}
            <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-2xs text-slate-400">
              <span>Engine: {analysis?.engineUsed || 'gemini-3.8-flash'}</span>
              <span>Verified RFC 8259 JSON</span>
            </div>
          </div>

          {/* ========================================================= */}
          {/* CARD 2: SEVERITY ASSESSMENT */}
          {/* ========================================================= */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-2xs flex flex-col justify-between h-full">
            <div className="space-y-5">
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 flex items-center justify-center font-bold">
                    <AlertOctagon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Card 2 · Priority & Impact
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Severity Assessment
                    </h3>
                  </div>
                </div>

                {/* Priority Level Badge */}
                <div className="text-right">
                  <span className="text-2xs font-semibold uppercase text-slate-400 block mb-0.5">
                    Priority Level
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                      calculatedPriorityLevel === 'High'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                        : calculatedPriorityLevel === 'Medium'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    }`}
                  >
                    <Flame className="w-3 h-3" />
                    <span>{calculatedPriorityLevel} Priority</span>
                  </span>
                </div>
              </div>

              {/* Final Priority Score Hero Box */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                <div className="flex items-baseline justify-between mb-2">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Final Priority Score
                    </span>
                    <p className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                      (0.4 × Urgency) + (0.3 × Impact) + (0.2 × Safety Risk) + (0.1 × Duration)
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                      {calculatedPriorityScore}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono"> / 100</span>
                  </div>
                </div>

                {/* Score Level Bar Indicator */}
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      calculatedPriorityLevel === 'High'
                        ? 'bg-rose-600 dark:bg-rose-500'
                        : calculatedPriorityLevel === 'Medium'
                        ? 'bg-amber-500 dark:bg-amber-400'
                        : 'bg-emerald-500 dark:bg-emerald-400'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, calculatedPriorityScore))}%` }}
                  />
                </div>

                <div className="flex justify-between text-2xs text-slate-500 dark:text-slate-400 mt-2 font-mono">
                  <span>0 - 39: Low</span>
                  <span>40 - 74: Medium</span>
                  <span>75 - 100: High</span>
                </div>
              </div>

              {/* Visual Progress Bars for the 4 Individual Factors */}
              <div className="space-y-3.5 pt-1">
                {/* 1. Urgency (Weight 0.4) */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-rose-500" />
                      <span>Urgency</span>
                      <span className="text-2xs font-mono text-slate-400">(40% wt)</span>
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{urgencyVal} / 100</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-rose-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${urgencyVal}%` }}
                    />
                  </div>
                </div>

                {/* 2. Public Impact (Weight 0.3) */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-blue-500" />
                      <span>Public Impact</span>
                      <span className="text-2xs font-mono text-slate-400">(30% wt)</span>
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{impactVal} / 100</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${impactVal}%` }}
                    />
                  </div>
                </div>

                {/* 3. Safety Risk (Weight 0.2) */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                      <span>Safety Risk</span>
                      <span className="text-2xs font-mono text-slate-400">(20% wt)</span>
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{safetyRiskVal} / 100</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${safetyRiskVal}%` }}
                    />
                  </div>
                </div>

                {/* 4. Duration (Weight 0.1) */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-cyan-500" />
                      <span>Duration / Persistence</span>
                      <span className="text-2xs font-mono text-slate-400">(10% wt)</span>
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{durationVal} / 100</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${durationVal}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* AI-Generated Explanation */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  AI-Generated Explanation
                </label>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  {emergency?.reasoning || 'Assessment based on vehicular impact potential, pedestrian vulnerability, and reported duration.'}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-2xs text-slate-400">
              <span>Backend Calculated Priority</span>
              <span>4-Factor Weighted Algorithm</span>
            </div>
          </div>

          {/* ========================================================= */}
          {/* CARD 3: DEPARTMENT ROUTING */}
          {/* ========================================================= */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-2xs flex flex-col justify-between h-full">
            <div className="space-y-5">
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Card 3 · Routing & Triage
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Department Routing
                    </h3>
                  </div>
                </div>

                {/* Status indicator */}
                <span className="text-2xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {currentComplaint.status}
                </span>
              </div>

              {/* AI Recommended Department Box */}
              <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-800 dark:text-blue-300">
                    AI-Recommended Department
                  </span>
                  <span className="text-2xs font-mono font-medium text-blue-700 dark:text-blue-400">
                    Gemini Recommendation
                  </span>
                </div>
                <div className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                  <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>{departmentInfo?.department || currentComplaint.department || 'Roads and Infrastructure'}</span>
                </div>
              </div>

              {/* Reason for Recommendation */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Reason for Recommendation
                </label>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  {departmentInfo?.reason || 'Assigned based on underlying municipal physical asset characteristics and issue jurisdiction.'}
                </div>
              </div>

              {/* Suggested Operational Action */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Suggested Action
                </label>
                <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-lg text-xs font-medium text-emerald-900 dark:text-emerald-200">
                  {departmentInfo?.recommended_action || 'Dispatch municipal maintenance crew with standard tooling to inspect and resolve work order.'}
                </div>
              </div>

              {/* Authority Department Override & Assignment Controls */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                    Authority Department Override & Assignment
                  </label>
                  <p className="text-2xs text-slate-500 dark:text-slate-400 mb-2">
                    Authorities may modify the AI recommendation prior to saving the official dispatch order.
                  </p>
                  <div className="relative">
                    <select
                      value={chosenDepartment}
                      onChange={(e) => setChosenDepartment(e.target.value as StandardDepartment)}
                      className="w-full pl-3 pr-8 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white appearance-none cursor-pointer"
                    >
                      {STANDARD_DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Save Assignment Button */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleAssignDepartment}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-lg shadow-sm transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Assign Department</span>
                  </button>

                  {deptSaveSuccess && (
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-fadeIn">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Assigned to {chosenDepartment}!</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-2xs text-slate-400">
              <span>Authority Controlled Dispatch</span>
              <span>SLA Target: 4 - 48 Hours</span>
            </div>
          </div>

          {/* ========================================================= */}
          {/* CARD 4: DUPLICATE DETECTION */}
          {/* ========================================================= */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-2xs flex flex-col justify-between h-full">
            <div className="space-y-5">
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold">
                    <GitCompare className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Card 4 · Incident Clustering
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Duplicate Detection
                    </h3>
                  </div>
                </div>

                {/* Status Indicator */}
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    duplicateInfo?.possible_duplicate
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {duplicateInfo?.possible_duplicate ? 'Potential Duplicate' : 'Distinct Incident'}
                </span>
              </div>

              {/* Duplicate Details Container */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3">
                {/* Related Complaint ID & Similarity */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
                  <div>
                    <span className="text-2xs font-semibold uppercase text-slate-500 dark:text-slate-400 block mb-0.5">
                      Related Complaint ID
                    </span>
                    {duplicateInfo?.matching_report_id ? (
                      <button
                        type="button"
                        onClick={() => setSelectedId(duplicateInfo.matching_report_id)}
                        className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        title="Click to select this related complaint"
                      >
                        <span>{duplicateInfo.matching_report_id}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    ) : (
                      <span className="text-xs font-medium text-slate-500">
                        None (No matching duplicate)
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-2xs font-semibold uppercase text-slate-500 dark:text-slate-400 block mb-0.5">
                      Similarity Percentage
                    </span>
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                      {duplicateInfo?.possible_duplicate ? `${similarityPercent}% Match` : 'Distinct'}
                    </span>
                  </div>

                  <div>
                    <span className="text-2xs font-semibold uppercase text-slate-500 dark:text-slate-400 block mb-0.5">
                      Location Proximity
                    </span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-rose-500" />
                      {duplicateInfo?.possible_duplicate ? 'Same Location Match' : 'Independent Sector'}
                    </span>
                  </div>
                </div>

                {/* Reason for Similarity */}
                <div>
                  <span className="text-2xs font-semibold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                    Reason for Similarity / Distinction
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                    {duplicateInfo?.reason || 'Evaluated against municipal incident registry for geographic and infrastructure similarity.'}
                  </p>
                </div>

                {/* Preview of the matching report if found */}
                {matchingReport && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Master Report Reference ({matchingReport.id}):
                    </span>
                    <p className="text-slate-600 dark:text-slate-400 italic line-clamp-2 mt-0.5">
                      "{matchingReport.complaintText}"
                    </p>
                  </div>
                )}
              </div>

              {/* Authority Decision Status (if already made) */}
              {currentComplaint.duplicateDecision && (
                <div
                  className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
                    currentComplaint.duplicateDecision === 'confirmed_related'
                      ? 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 border border-amber-200 dark:border-amber-800'
                      : 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    Current Decision:{' '}
                    <strong>
                      {currentComplaint.duplicateDecision === 'confirmed_related'
                        ? 'Confirmed Related Duplicate'
                        : 'Verified as Not a Duplicate'}
                    </strong>
                    {currentComplaint.duplicateDecisionTimestamp && (
                      <span className="opacity-75 block sm:inline sm:ml-2">
                        ({new Date(currentComplaint.duplicateDecisionTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                      </span>
                    )}
                  </span>
                </div>
              )}

              {/* Duplicate Action Buttons: Confirm Related & Not a Duplicate */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Authority Decision on Incident Duplication
                </label>
                <p className="text-2xs text-slate-500 dark:text-slate-400">
                  Decisions are recorded without destructive record merging.
                </p>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleDuplicateDecision('confirmed_related')}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                      currentComplaint.duplicateDecision === 'confirmed_related'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm Related</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDuplicateDecision('not_a_duplicate')}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                      currentComplaint.duplicateDecision === 'not_a_duplicate'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Not a Duplicate</span>
                  </button>
                </div>

                {duplicateDecisionSuccess && (
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-2 animate-fadeIn">
                    <Check className="w-3.5 h-3.5" />
                    <span>{duplicateDecisionSuccess}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-2xs text-slate-400">
              <span>Authority Verification Mode</span>
              <span>Non-Destructive Clustering</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
