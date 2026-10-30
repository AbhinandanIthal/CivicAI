import React, { useState } from 'react';
import { DepartmentAssignmentResponse, StandardDepartment, ComplaintRecord } from '../types';
import { BENCHMARK_SAMPLES } from '../data/sampleComplaints';
import {
  Building2,
  HardHat,
  Droplets,
  Trash2,
  Zap,
  Waves,
  ShieldAlert,
  Check,
  Copy,
  FileCode2,
  RefreshCw,
  ArrowRight,
  ClipboardCheck,
} from 'lucide-react';

interface DepartmentAssignmentProps {
  complaints: ComplaintRecord[];
  onDispatchToDepartment: (complaintText: string, department: StandardDepartment, action: string, reason: string) => void;
}

const DEPARTMENTS_METADATA: Record<
  StandardDepartment,
  {
    icon: React.ElementType;
    description: string;
    slaHours: number;
    color: string;
    bg: string;
    border: string;
  }
> = {
  'Roads and Infrastructure': {
    icon: HardHat,
    description: 'Pothole repairs, asphalt resurfacing, sidewalk maintenance, bridges, and right-of-way structures.',
    slaHours: 48,
    color: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800',
  },
  'Drainage Department': {
    icon: Waves,
    description: 'Sanitary sewers, stormwater culverts, maintenance manholes, and localized street flooding control.',
    slaHours: 12,
    color: 'text-cyan-700 dark:text-cyan-400',
    bg: 'bg-cyan-50 dark:bg-cyan-950/40',
    border: 'border-cyan-200 dark:border-cyan-800',
  },
  'Sanitation Department': {
    icon: Trash2,
    description: 'Public litter collection, commercial dumpsters, illegal dumping removal, and street sweeping.',
    slaHours: 24,
    color: 'text-emerald-700 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  'Electricity Department': {
    icon: Zap,
    description: 'Streetlight luminaire networks, traffic signals electrical supply, overhead wiring, and transformers.',
    slaHours: 8,
    color: 'text-violet-700 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    border: 'border-violet-200 dark:border-violet-800',
  },
  'Water Supply Department': {
    icon: Droplets,
    description: 'Potable water distribution mains, fire hydrants, municipal meters, and household pressure lines.',
    slaHours: 4,
    color: 'text-blue-700 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-200 dark:border-blue-800',
  },
  'Public Safety Department': {
    icon: ShieldAlert,
    description: 'Regulatory traffic signage (Stop/Yield), crosswalk pavement markings, hazard barricades, and sightline safety.',
    slaHours: 6,
    color: 'text-rose-700 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    border: 'border-rose-200 dark:border-rose-800',
  },
};

export const DepartmentAssignment: React.FC<DepartmentAssignmentProps> = ({
  complaints,
  onDispatchToDepartment,
}) => {
  const [complaintText, setComplaintText] = useState(
    'The Stop sign at the intersection of Highland Terrace and Valley Road was knocked down over the weekend. Drivers aren’t stopping and two near-miss collisions happened this morning during rush hour.'
  );
  const [isAssigning, setIsAssigning] = useState(false);
  const [result, setResult] = useState<DepartmentAssignmentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'card' | 'json'>('card');
  const [copied, setCopied] = useState(false);
  const [dispatchedSuccess, setDispatchedSuccess] = useState(false);

  const handleAssign = async (textToAssign?: string) => {
    const text = (textToAssign ?? complaintText).trim();
    if (!text) return;

    setIsAssigning(true);
    setError(null);
    setDispatchedSuccess(false);

    try {
      const res = await fetch('/api/assign-department', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complaint: text }),
      });

      if (!res.ok) {
        throw new Error(`Assignment failed with status ${res.status}`);
      }

      const data: DepartmentAssignmentResponse = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Error executing department assignment.');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleDispatchTicket = () => {
    if (!result) return;
    onDispatchToDepartment(complaintText, result.department, result.recommended_action, result.reason);
    setDispatchedSuccess(true);
  };

  const jsonPayload = result
    ? JSON.stringify(
        {
          department: result.department,
          recommended_action: result.recommended_action,
          reason: result.reason,
        },
        null,
        2
      )
    : '';

  const handleCopyJson = async () => {
    if (!jsonPayload) return;
    try {
      await navigator.clipboard.writeText(jsonPayload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  // Count active cases per department
  const departmentCounts = (Object.keys(DEPARTMENTS_METADATA) as StandardDepartment[]).reduce(
    (acc, dept) => {
      acc[dept] = complaints.filter(
        (c) =>
          c.department === dept ||
          c.analysis?.category?.toLowerCase().includes(dept.toLowerCase()) ||
          c.departmentAssignment?.department === dept
      ).length;
      return acc;
    },
    {} as Record<StandardDepartment, number>
  );

  const meta = result ? DEPARTMENTS_METADATA[result.department] : null;
  const DeptIcon = meta ? meta.icon : Building2;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Municipal Department Assignment Assistant
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-3xl">
          Automated routing mapping citizen complaints to one of the six authoritative municipal departments with operational field recommendations and justification.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Complaint Input & Benchmark Scenarios (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm transition-colors">
            <div className="flex items-center justify-between mb-3">
              <label
                htmlFor="dispatch-complaint"
                className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
              >
                Citizen Complaint for Department Routing
              </label>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono tabular-nums">
                {complaintText.length} characters
              </span>
            </div>

            <textarea
              id="dispatch-complaint"
              rows={5}
              value={complaintText}
              onChange={(e) => setComplaintText(e.target.value)}
              placeholder="Paste civic complaint to assign responsible municipal department..."
              className="w-full p-3.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900 dark:focus:ring-white transition-all font-normal leading-relaxed resize-y"
            />

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Routes across 6 municipal departments
              </span>

              <button
                type="button"
                onClick={() => handleAssign()}
                disabled={isAssigning || !complaintText.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 transition-colors shadow-xs"
              >
                {isAssigning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Assigning Department...</span>
                  </>
                ) : (
                  <>
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Assign Department</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Department Coverage Grid */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Authoritative Department Charters (6 Departments)
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">Live ticket counts</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(Object.keys(DEPARTMENTS_METADATA) as StandardDepartment[]).map((dept) => {
                const item = DEPARTMENTS_METADATA[dept];
                const Icon = item.icon;
                const count = departmentCounts[dept] || 0;

                return (
                  <div
                    key={dept}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                        <Icon className="w-3.5 h-3.5 text-slate-500" />
                        <span className="truncate">{dept}</span>
                      </div>
                      <span className="font-mono text-[11px] font-bold tabular-nums text-slate-500">
                        {count} active
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Routing Recommendation & Output (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          {error && (
            <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isAssigning && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm animate-pulse space-y-4">
              <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
              <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded"></div>
              <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded"></div>
            </div>
          )}

          {!isAssigning && result && meta && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-colors">
              {/* Header */}
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
                    <span>Statutory Routing</span>
                    <span aria-hidden="true">·</span>
                    <span>Standardized Dispatch Workflow</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Work Order Assignment
                  </h3>
                </div>

                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setActiveView('card')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      activeView === 'card'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Assignment Slip
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveView('json')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      activeView === 'json'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Raw JSON
                  </button>
                </div>
              </div>

              {activeView === 'card' ? (
                <div className="p-5 sm:p-6 space-y-6">
                  {/* Department Banner */}
                  <div className={`p-4 rounded-xl border ${meta.bg} ${meta.border} flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center shadow-xs">
                        <DeptIcon className={`w-5 h-5 ${meta.color}`} />
                      </div>
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">
                          Assigned Department
                        </span>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">
                          {result.department}
                        </h4>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] uppercase tracking-wider text-slate-500 block">Standard SLA</span>
                      <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                        {meta.slaHours} Hours
                      </span>
                    </div>
                  </div>

                  {/* Recommended Action */}
                  <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                      <ClipboardCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Recommended Field Operational Action</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
                      {result.recommended_action}
                    </p>
                  </div>

                  {/* Justification Reason */}
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 block">
                      Department Assignment Rationale
                    </span>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                      {result.reason}
                    </p>
                  </div>

                  {/* Dispatch Action */}
                  <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleDispatchTicket}
                      disabled={dispatchedSuccess}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
                        dispatchedSuccess
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 shadow-xs'
                      }`}
                    >
                      {dispatchedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <ArrowRight className="w-3.5 h-3.5" />}
                      <span>
                        {dispatchedSuccess
                          ? `Dispatched to ${result.department}`
                          : `Confirm & Dispatch to ${result.department}`}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyJson}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* JSON Raw View */
                <div className="p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      RFC 8259 Valid JSON Output
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyJson}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy Payload'}</span>
                    </button>
                  </div>

                  <pre className="p-4 rounded-lg bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
                    {jsonPayload}
                  </pre>
                </div>
              )}
            </div>
          )}

          {!isAssigning && !result && !error && (
            <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 mx-auto flex items-center justify-center mb-3">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Awaiting Department Assignment
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                Click &ldquo;Assign Department&rdquo; to identify responsible municipal department and operational action plan.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
