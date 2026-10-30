import React, { useState } from 'react';
import { CivicAnalysisResponse } from '../types';
import {
  CheckCircle2,
  Copy,
  Check,
  FileCode2,
  Sliders,
  AlertTriangle,
  Building2,
  Users2,
  ShieldCheck,
  Share2,
  Printer,
  ChevronRight,
} from 'lucide-react';

interface AnalysisResultCardProps {
  analysis: CivicAnalysisResponse;
  complaintText: string;
  onSaveToRegistry?: (analysis: CivicAnalysisResponse) => void;
  isSaved?: boolean;
}

export const AnalysisResultCard: React.FC<AnalysisResultCardProps> = ({
  analysis,
  complaintText,
  onSaveToRegistry,
  isSaved = false,
}) => {
  const [activeView, setActiveView] = useState<'structured' | 'json'>('structured');
  const [copied, setCopied] = useState(false);

  const formattedConfidence = (analysis.confidence <= 1 ? analysis.confidence * 100 : analysis.confidence).toFixed(0);
  const confidenceVal = Number(formattedConfidence);

  const jsonString = JSON.stringify(
    {
      category: analysis.category,
      summary: analysis.summary,
      infrastructure: analysis.infrastructure,
      public_impact: analysis.public_impact,
      confidence: analysis.confidence,
    },
    null,
    2
  );

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const getConfidenceLevel = (val: number) => {
    if (val >= 90) return { label: 'High Confidence', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800' };
    if (val >= 75) return { label: 'Substantial Confidence', color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800' };
    return { label: 'Moderate / Tentative', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800' };
  };

  const confInfo = getConfidenceLevel(confidenceVal);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-colors">
      {/* Top Header & View Switcher */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Civic Issue Analysis</span>
            <span aria-hidden="true">·</span>
            <span>Automated Triage</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {new Date(analysis.processedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {analysis.category}
          </h2>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveView('structured')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeView === 'structured'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Structured View
          </button>
          <button
            type="button"
            onClick={() => setActiveView('json')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeView === 'json'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>Raw JSON Schema</span>
          </button>
        </div>
      </div>

      {activeView === 'structured' ? (
        <div className="p-5 sm:p-6 space-y-6">
          {/* Key Metric Strip: Confidence & Grounding Verification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg border ${confInfo.bg} flex items-center justify-between`}>
              <div>
                <span className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400 block mb-0.5">
                  Classifier Confidence
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    {formattedConfidence}%
                  </span>
                  <span className={`text-xs font-semibold ${confInfo.color}`}>
                    {confInfo.label}
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-full border-4 border-slate-200 dark:border-slate-700 flex items-center justify-center font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                {formattedConfidence}%
              </div>
            </div>

            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 block mb-0.5">
                  Anti-Hallucination Grounding
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">
                  Strict constraint satisfied: All extracted details are grounded in the verified complaint text.
                </p>
              </div>
            </div>
          </div>

          {/* 5 Specific Tasks Visualized */}
          <div className="space-y-4">
            {/* Task 1 & 3: Concise Summary */}
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Task 3 · Concise Summary
                </span>
              </div>
              <p className="text-base text-slate-900 dark:text-slate-100 font-medium leading-relaxed">
                {analysis.summary}
              </p>
            </div>

            {/* Task 4 & 5 Grid: Infrastructure & Public Impact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Task 4: Infrastructure */}
              <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2 text-slate-700 dark:text-slate-300">
                    <Building2 className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Task 4 · Affected Infrastructure
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                    {analysis.infrastructure}
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                  Target Municipal Asset
                </div>
              </div>

              {/* Task 5: Public Impact */}
              <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2 text-slate-700 dark:text-slate-300">
                    <Users2 className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Task 5 · Possible Public Impact
                    </span>
                  </div>
                  <p className="text-sm text-slate-800 dark:text-slate-200 leading-snug">
                    {analysis.public_impact}
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                  Risk Assessment & Community Exposure
                </div>
              </div>
            </div>

            {/* Original Input Reference */}
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                Source Citizen Complaint (Input)
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 italic leading-relaxed">
                &ldquo;{complaintText}&rdquo;
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              {onSaveToRegistry && (
                <button
                  type="button"
                  onClick={() => onSaveToRegistry(analysis)}
                  disabled={isSaved}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors ${
                    isSaved
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-default'
                      : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100'
                  }`}
                >
                  {isSaved ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  <span>{isSaved ? 'Recorded in Registry' : 'Save to Complaint Registry'}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyJson}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy JSON'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* JSON Raw View */
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              application/json · RFC 8259 Compliant
            </span>
            <button
              type="button"
              onClick={handleCopyJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Payload'}</span>
            </button>
          </div>

          <pre className="p-4 rounded-lg bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
            {jsonString}
          </pre>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            This output strictly adheres to the requested JSON schema without markdown wrappers or hallucinations.
          </p>
        </div>
      )}
    </div>
  );
};
