import React, { useState } from 'react';
import { ComplaintRecord, TriageStatus } from '../types';
import {
  Search,
  CheckCircle2,
  Clock,
  MapPin,
  Building2,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  FileText,
  User,
  Sparkles,
  Check,
  Image as ImageIcon,
} from 'lucide-react';

interface TrackStatusProps {
  complaints: ComplaintRecord[];
  initialComplaintId?: string | null;
  onNavigateToReport: () => void;
}

const STATUS_STEPS: { status: TriageStatus; label: string; desc: string }[] = [
  { status: 'New', label: 'Report Received', desc: 'Complaint logged in the municipal ledger.' },
  { status: 'Triaged', label: 'AI Triaged & Verified', desc: 'Severity calculated & department assigned.' },
  { status: 'Dispatched', label: 'Field Crew Dispatched', desc: 'Work order assigned to municipal team.' },
  { status: 'In Progress', label: 'Work In Progress', desc: 'On-site repairs or containment underway.' },
  { status: 'Resolved', label: 'Issue Resolved', desc: 'Work inspected and verified complete.' },
];

export const TrackStatus: React.FC<TrackStatusProps> = ({
  complaints,
  initialComplaintId,
  onNavigateToReport,
}) => {
  const [searchId, setSearchId] = useState<string>(initialComplaintId || complaints[0]?.id || '');
  const [activeComplaintId, setActiveComplaintId] = useState<string>(
    initialComplaintId || complaints[0]?.id || ''
  );

  // Sync if prop changes
  React.useEffect(() => {
    if (initialComplaintId) {
      setSearchId(initialComplaintId);
      setActiveComplaintId(initialComplaintId);
    }
  }, [initialComplaintId]);

  const currentComplaint = complaints.find(
    (c) => c.id.trim().toLowerCase() === activeComplaintId.trim().toLowerCase()
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchId.trim()) {
      setActiveComplaintId(searchId.trim());
    }
  };

  const getStepState = (stepStatus: TriageStatus, currentStatus?: TriageStatus) => {
    const statusOrder: TriageStatus[] = ['New', 'Triaged', 'Dispatched', 'In Progress', 'Resolved'];
    const currentIdx = statusOrder.indexOf(currentStatus || 'New');
    const stepIdx = statusOrder.indexOf(stepStatus);

    if (stepIdx < currentIdx) return 'completed';
    if (stepIdx === currentIdx) return 'active';
    return 'pending';
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Citizen Transparency Portal</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Track Grievance Status
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-xl">
          Enter your unique Municipal Grievance ID to inspect live AI analysis, priority tier, assigned city crew, and chronological resolution progress.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mt-6 flex flex-col sm:flex-row gap-2 max-w-xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="e.g. CMP-2026-081"
              className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm"
          >
            Track Status
          </button>
        </form>

        {/* Quick Suggestion Chips */}
        <div className="mt-4 flex items-center gap-2 flex-wrap text-xs text-slate-500">
          <span>Recent Complaints:</span>
          {complaints.slice(0, 5).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setSearchId(c.id);
                setActiveComplaintId(c.id);
              }}
              className={`font-mono px-2 py-0.5 rounded-md border text-3xs font-semibold transition-colors ${
                c.id === activeComplaintId
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
              }`}
            >
              {c.id}
            </button>
          ))}
        </div>
      </div>

      {/* Complaint Status Results View */}
      {currentComplaint ? (
        <div className="space-y-6">
          {/* Main Info Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="font-mono text-base font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
                    {currentComplaint.id}
                  </span>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      currentComplaint.status === 'Resolved'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : currentComplaint.status === 'New'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                    }`}
                  >
                    Current Status: {currentComplaint.status}
                  </span>
                  <span className="text-xs text-slate-400">
                    Logged: {currentComplaint.timestamp}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {currentComplaint.title || 'Civic Incident'}
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{currentComplaint.location || 'Metro Area'}</span>
                </div>
              </div>

              {/* Department badge */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 text-right sm:text-left shrink-0">
                <span className="text-3xs uppercase font-semibold text-slate-400 block mb-1">
                  Assigned Department
                </span>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {currentComplaint.assignedDepartment || currentComplaint.department || 'Roads and Infrastructure'}
                </p>
                <span className="text-3xs text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                  Priority: {currentComplaint.emergencyAssessment?.priority_level || currentComplaint.priority || 'Medium'}
                </span>
              </div>
            </div>

            {/* Stepped Status Timeline */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                Resolution Lifecycle & Progress
              </h3>

              <div className="relative pl-6 sm:pl-0 sm:grid sm:grid-cols-5 gap-3">
                {/* Connecting bar for desktop */}
                <div className="hidden sm:block absolute top-4 left-6 right-6 h-0.5 bg-slate-200 dark:bg-slate-800 -z-0" />

                {STATUS_STEPS.map((step, idx) => {
                  const state = getStepState(step.status, currentComplaint.status);

                  return (
                    <div key={step.status} className="relative mb-6 sm:mb-0 text-left sm:text-center z-10">
                      {/* Step Circle */}
                      <div className="flex sm:justify-center mb-2">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                            state === 'completed'
                              ? 'bg-emerald-600 text-white'
                              : state === 'active'
                              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 ring-4 ring-emerald-500/20'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                          }`}
                        >
                          {state === 'completed' ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <span>{idx + 1}</span>
                          )}
                        </div>
                      </div>

                      <div className="font-semibold text-xs text-slate-900 dark:text-white">
                        {step.label}
                      </div>
                      <div className="text-3xs text-slate-500 mt-0.5">
                        {step.desc}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Complaint details & citizen photo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Original Citizen Report
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 leading-relaxed italic">
                  "{currentComplaint.complaintText}"
                </p>

                {currentComplaint.imageUrl && (
                  <div>
                    <span className="text-3xs font-semibold text-slate-400 uppercase block mb-1">
                      Submitted Photo Evidence
                    </span>
                    <img
                      src={currentComplaint.imageUrl}
                      alt="Citizen evidence"
                      className="w-full max-h-48 object-cover rounded-xl border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                )}
              </div>

              {/* AI & Authority Updates */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Municipal Action & AI Notes
                </span>

                <div className="space-y-2 text-xs">
                  <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                    <div className="flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-300 mb-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>AI Triage & Categorization</span>
                    </div>
                    <p className="text-2xs text-slate-600 dark:text-slate-300">
                      {currentComplaint.analysis?.summary || 'Complaint triaged successfully.'}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="font-semibold text-slate-900 dark:text-white block mb-1">
                      Recommended Field Action
                    </span>
                    <p className="text-2xs text-slate-600 dark:text-slate-300">
                      {currentComplaint.departmentAssignment?.recommended_action || 'Inspection scheduled with municipal crew.'}
                    </p>
                  </div>

                  {/* Resolution or Authority Notes */}
                  {currentComplaint.authorityNotes && currentComplaint.authorityNotes.length > 0 && (
                    <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/40">
                      <span className="font-semibold text-blue-900 dark:text-blue-300 block mb-1">
                        Dispatcher Updates:
                      </span>
                      <ul className="list-disc list-inside space-y-1 text-2xs text-slate-600 dark:text-slate-300">
                        {currentComplaint.authorityNotes.map((note, idx) => (
                          <li key={idx}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {currentComplaint.resolutionNotes && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800">
                      <span className="font-semibold text-emerald-900 dark:text-emerald-200 block mb-1">
                        Resolution Notes
                      </span>
                      <p className="text-2xs text-emerald-800 dark:text-emerald-300">
                        {currentComplaint.resolutionNotes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm space-y-3">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Grievance ID "{searchId}" Not Found
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Please check the spelling of your ID (e.g. CMP-2026-081) or submit a new grievance if this is your first time reporting.
          </p>
          <button
            onClick={onNavigateToReport}
            className="mt-3 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors inline-flex items-center gap-2"
          >
            <span>Submit a New Grievance</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
