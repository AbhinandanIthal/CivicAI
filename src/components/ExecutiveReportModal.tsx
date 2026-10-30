import React, { useState, useEffect } from 'react';
import { ComplaintRecord, ExecutiveReportResponse } from '../types';
import {
  FileText,
  Building,
  MapPin,
  Users,
  AlertTriangle,
  ArrowRight,
  Copy,
  Check,
  Printer,
  X,
  FileCode2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface ExecutiveReportModalProps {
  complaint: ComplaintRecord;
  onClose: () => void;
  relatedComplaintsCount?: number;
}

export const ExecutiveReportModal: React.FC<ExecutiveReportModalProps> = ({
  complaint,
  onClose,
  relatedComplaintsCount = 1,
}) => {
  const [report, setReport] = useState<ExecutiveReportResponse | null>(complaint.executiveReport || null);
  const [loading, setLoading] = useState(!complaint.executiveReport);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'briefing' | 'json'>('briefing');

  const fetchReport = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = {
        complaintData: {
          complaintText: complaint.complaintText,
          category: complaint.analysis?.category || complaint.department,
          infrastructure: complaint.analysis?.infrastructure,
          publicImpact: complaint.analysis?.public_impact,
          relatedCount: relatedComplaintsCount,
          priority: complaint.priority || 'High',
          status: complaint.status,
        },
      };

      const res = await fetch('/api/generate-executive-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Report generation failed: ${res.status}`);
      }

      const data: ExecutiveReportResponse = await res.json();
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Error generating executive report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!complaint.executiveReport) {
      fetchReport();
    }
  }, [complaint]);

  const jsonPayload = report
    ? JSON.stringify(
        {
          problem: report.problem,
          location: report.location,
          related_complaints: report.related_complaints,
          priority: report.priority,
          public_impact: report.public_impact,
          recommended_action: report.recommended_action,
          briefing_text: report.briefing_text,
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>Ref: {complaint.id}</span>
                <span aria-hidden="true">·</span>
                <span>Municipal Leadership Briefing</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Executive Actionable Report
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <button
                type="button"
                onClick={() => setViewMode('briefing')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'briefing'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Briefing
              </button>
              <button
                type="button"
                onClick={() => setViewMode('json')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'json'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                JSON
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 flex-1">
          {loading && (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Synthesizing Decision-Maker Report...
              </p>
              <p className="text-xs text-slate-500">
                Consolidating problem, location, related complaints, priority, and recommended action.
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 text-xs flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={fetchReport}
                className="font-semibold underline ml-2"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && report && viewMode === 'briefing' && (
            <div className="space-y-6">
              {/* Executive Briefing Memo Strip */}
              <div className="p-4 rounded-xl bg-slate-900 text-white dark:bg-slate-800 space-y-1.5 shadow-xs">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                  Executive Decision-Maker Summary
                </span>
                <p className="text-sm font-medium leading-relaxed">
                  {report.briefing_text}
                </p>
              </div>

              {/* 6 Required Report Items */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Problem Identified */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-1 sm:col-span-2">
                  <span className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400 block">
                    1. Problem Identified
                  </span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                    {report.problem}
                  </p>
                </div>

                {/* 2. Location */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>2. Location</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white leading-relaxed">
                    {report.location}
                  </p>
                </div>

                {/* 3. Number of Related Complaints */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>3. Related Complaints</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-white">
                      {report.related_complaints}
                    </span>
                    <span className="text-xs text-slate-500">
                      {report.related_complaints > 1 ? 'verified duplicate reports' : 'single initial report'}
                    </span>
                  </div>
                </div>

                {/* 4. Priority */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span>4. Priority</span>
                  </div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {report.priority}
                  </p>
                </div>

                {/* 5. Public Impact */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
                  <span className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400 block">
                    5. Public Impact
                  </span>
                  <p className="text-xs text-slate-800 dark:text-slate-200 leading-snug font-normal">
                    {report.public_impact}
                  </p>
                </div>

                {/* 6. Recommended Action */}
                <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-1 sm:col-span-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-emerald-800 dark:text-emerald-400">
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>6. Recommended Operational Action</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                    {report.recommended_action}
                  </p>
                </div>
              </div>

              {/* Source Reference */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                <div>
                  <strong>Original Citizen Complaint:</strong> &ldquo;{complaint.complaintText}&rdquo;
                </div>
              </div>
            </div>
          )}

          {!loading && report && viewMode === 'json' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Executive Report JSON Payload</span>
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-lg bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
                {jsonPayload}
              </pre>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950 rounded-b-2xl">
          <button
            type="button"
            onClick={handleCopyJson}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copy Briefing JSON</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Briefing</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
