import React, { useState } from 'react';
import { CivicAnalysisResponse, ComplaintRecord } from '../types';
import { BENCHMARK_SAMPLES } from '../data/sampleComplaints';
import { AnalysisResultCard } from './AnalysisResultCard';
import {
  Sparkles,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  ClipboardCheck,
  Send,
  HelpCircle,
} from 'lucide-react';

interface SingleAnalyzerProps {
  onSaveToRegistry: (record: ComplaintRecord) => void;
  savedIds: Set<string>;
}

export const SingleAnalyzer: React.FC<SingleAnalyzerProps> = ({
  onSaveToRegistry,
  savedIds,
}) => {
  const [complaintInput, setComplaintInput] = useState(
    'Deep pothole in the right eastbound lane of Elm Street, just past 4th Avenue near St. Jude Hospital. Two cars blew front tires this morning, and drivers are swerving into oncoming traffic to dodge it.'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CivicAnalysisResponse | null>(null);
  const [currentRecordId, setCurrentRecordId] = useState<string>('CMP-LIVE-001');

  const handleAnalyze = async () => {
    if (!complaintInput.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/analyze-complaint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complaint: complaintInput.trim() }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${res.status}`);
      }

      const data: CivicAnalysisResponse = await res.json();
      setResult(data);
      setCurrentRecordId(`CMP-${Date.now().toString().slice(-4)}`);
    } catch (err: any) {
      setError(err.message || 'An error occurred while analyzing the complaint.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleAnalyze();
    }
  };

  const handleSelectSample = (sampleText: string) => {
    setComplaintInput(sampleText);
    setResult(null);
    setError(null);
  };

  const handleSaveCurrent = (analysis: CivicAnalysisResponse) => {
    const newRecord: ComplaintRecord = {
      id: currentRecordId,
      complaintText: complaintInput,
      source: 'citizen_portal',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'Triaged',
      priority: analysis.confidence > 0.9 ? 'High' : 'Medium',
      department: analysis.category,
      analysis,
    };
    onSaveToRegistry(newRecord);
  };

  const isCurrentSaved = savedIds.has(currentRecordId);

  return (
    <div className="space-y-8">
      {/* Editorial Section Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Citizen Complaint Intelligence
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-3xl">
          Enter raw civic feedback, hotline transcripts, or public reports to extract primary issue category, affected municipal infrastructure, public impact assessment, and confidence score.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Input Workspace (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm transition-colors">
            <div className="flex items-center justify-between mb-3">
              <label
                htmlFor="complaint-text"
                className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
              >
                Citizen Complaint Input
              </label>
              <span className="text-xs font-mono text-slate-400 dark:text-slate-500 tabular-nums">
                {complaintInput.length} chars · {complaintInput.trim() ? complaintInput.trim().split(/\s+/).length : 0} words
              </span>
            </div>

            <textarea
              id="complaint-text"
              rows={6}
              value={complaintInput}
              onChange={(e) => setComplaintInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Paste citizen complaint here... (e.g., Deep pothole on 4th Ave near the crosswalk, sewer odor leaking from corner manhole, streetlamp completely out at nighttime...)"
              className="w-full p-3.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-slate-900 dark:focus:ring-white transition-all font-normal leading-relaxed resize-y"
            />

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-sm">
                  Ctrl
                </kbd>
                <span>+</span>
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-sm">
                  Enter
                </kbd>
                <span>to run</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setComplaintInput('')}
                  disabled={!complaintInput}
                  className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 transition-colors"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={loading || !complaintInput.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 transition-colors shadow-xs"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Execute Civic Analysis</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Benchmark Complaints Picker */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Curated Benchmark Test Scenarios
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">Click scenario to load</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {BENCHMARK_SAMPLES.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSample(sample.text)}
                  className="text-left p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800 transition-all group"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-white mb-1">
                    <span>{sample.title}</span>
                    <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                      {sample.categoryHint}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {sample.text}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Output Workspace (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {error && (
            <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300 text-xs flex items-start gap-3">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <div>
                <p className="font-semibold">Analysis Failed</p>
                <p className="mt-1">{error}</p>
                <button
                  type="button"
                  onClick={handleAnalyze}
                  className="mt-2 inline-flex items-center gap-1 font-semibold underline text-red-700 dark:text-red-300"
                >
                  <span>Retry analysis</span>
                </button>
              </div>
            </div>
          )}

          {loading && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm animate-pulse space-y-4">
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
              <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-2/3"></div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded"></div>
                <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded"></div>
              </div>
              <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded"></div>
              <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded"></div>
            </div>
          )}

          {!loading && result && (
            <AnalysisResultCard
              analysis={result}
              complaintText={complaintInput}
              onSaveToRegistry={handleSaveCurrent}
              isSaved={isCurrentSaved}
            />
          )}

          {!loading && !result && !error && (
            <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 mx-auto flex items-center justify-center mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Awaiting Complaint Analysis
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                Click &ldquo;Execute Civic Analysis&rdquo; or pick one of the benchmark scenarios to trigger classification and impact assessment.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
