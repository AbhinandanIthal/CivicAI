import React, { useState } from 'react';
import { ComplaintRecord, DuplicateDetectionResponse } from '../types';
import { DUPLICATE_TEST_SCENARIOS } from '../data/sampleComplaints';
import {
  CopyCheck,
  GitCompare,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  FileCode2,
  ExternalLink,
  Link2,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  RefreshCw,
  MapPin,
  Building,
} from 'lucide-react';

interface DuplicateDetectorProps {
  complaints: ComplaintRecord[];
  onLinkDuplicate: (newComplaintText: string, masterId: string, reason: string) => void;
}

export const DuplicateDetector: React.FC<DuplicateDetectorProps> = ({
  complaints,
  onLinkDuplicate,
}) => {
  const [newComplaintText, setNewComplaintText] = useState(
    'There is a severe crater-like pothole on eastbound Elm Street right opposite St. Jude Hospital near 4th. My tire rim got cracked this morning. Cars are almost crashing trying to avoid it.'
  );
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<DuplicateDetectionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'visual' | 'json'>('visual');
  const [copied, setCopied] = useState(false);
  const [linkedSuccess, setLinkedSuccess] = useState(false);

  const matchingRecord = result?.matching_report_id
    ? complaints.find((c) => c.id === result.matching_report_id)
    : null;

  const handleEvaluate = async (textToEvaluate?: string) => {
    const text = (textToEvaluate ?? newComplaintText).trim();
    if (!text) return;

    setIsEvaluating(true);
    setError(null);
    setLinkedSuccess(false);

    try {
      const payload = {
        newComplaint: text,
        existingReports: complaints.map((c) => ({
          id: c.id,
          text: c.complaintText,
          category: c.analysis?.category || c.department,
          infrastructure: c.analysis?.infrastructure,
        })),
      };

      const res = await fetch('/api/detect-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Duplicate detection failed with status ${res.status}`);
      }

      const data: DuplicateDetectionResponse = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Error executing duplicate detection.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleSelectScenario = (scenarioText: string) => {
    setNewComplaintText(scenarioText);
    setResult(null);
    setError(null);
    setLinkedSuccess(false);
  };

  const handleLink = () => {
    if (!result?.matching_report_id) return;
    onLinkDuplicate(newComplaintText, result.matching_report_id, result.reason);
    setLinkedSuccess(true);
  };

  const jsonPayload = result
    ? JSON.stringify(
        {
          possible_duplicate: result.possible_duplicate,
          matching_report_id: result.matching_report_id,
          reason: result.reason,
          confidence: result.confidence,
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

  return (
    <div className="space-y-8">
      {/* Editorial Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Complaint Duplicate Detection
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-3xl">
          Automated deduplication comparing incoming reports against existing municipal complaint logs. Evaluates problem similarity, geographic location, affected infrastructure, and incident identity without falsely merging distinct issues of the same category.
        </p>
      </div>

      {/* Main Grid: Input & Evaluation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Input and Preset Scenarios (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm transition-colors">
            <div className="flex items-center justify-between mb-3">
              <label
                htmlFor="new-complaint"
                className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
              >
                New Incoming Citizen Complaint
              </label>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono tabular-nums">
                {newComplaintText.length} characters
              </span>
            </div>

            <textarea
              id="new-complaint"
              rows={5}
              value={newComplaintText}
              onChange={(e) => setNewComplaintText(e.target.value)}
              placeholder="Paste new citizen complaint to evaluate for duplicates..."
              className="w-full p-3.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900 dark:focus:ring-white transition-all font-normal leading-relaxed resize-y"
            />

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Comparing against <strong className="text-slate-900 dark:text-white font-mono">{complaints.length}</strong> registered reports
              </span>

              <button
                type="button"
                onClick={() => handleEvaluate()}
                disabled={isEvaluating || !newComplaintText.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 transition-colors shadow-xs"
              >
                {isEvaluating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Cross-Referencing...</span>
                  </>
                ) : (
                  <>
                    <GitCompare className="w-3.5 h-3.5" />
                    <span>Run Duplicate Check</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preset Test Scenarios */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Deduplication Test Scenarios
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">Includes anti-false-positive checks</span>
            </div>

            <div className="space-y-2.5">
              {DUPLICATE_TEST_SCENARIOS.map((scenario) => {
                const isSelected = newComplaintText === scenario.newComplaint;
                const isExpectedDup = scenario.expectedOutcome === 'duplicate';

                return (
                  <button
                    key={scenario.id}
                    type="button"
                    onClick={() => handleSelectScenario(scenario.newComplaint)}
                    className={`w-full text-left p-3 rounded-lg border text-xs transition-all ${
                      isSelected
                        ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800/80 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {scenario.title}
                      </span>
                      <span
                        className={`text-[11px] font-mono px-2 py-0.5 rounded-sm ${
                          isExpectedDup
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                            : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                        }`}
                      >
                        Expected: {isExpectedDup ? 'Duplicate' : 'Distinct Case'}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 line-clamp-1 mb-1.5">
                      {scenario.description}
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 italic line-clamp-1 text-[11px]">
                      &ldquo;{scenario.newComplaint}&rdquo;
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Output & Comparison Matrix (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          {error && (
            <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isEvaluating && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm animate-pulse space-y-4">
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
              <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded"></div>
              <div className="h-28 bg-slate-100 dark:bg-slate-800 rounded"></div>
              <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded"></div>
            </div>
          )}

          {!isEvaluating && result && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-colors">
              {/* Header Strip with Result Status */}
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
                    <span>Incident Deduplication</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      Confidence: {(result.confidence <= 1 ? result.confidence * 100 : result.confidence).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {result.possible_duplicate ? (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span>Possible Duplicate Detected</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Distinct Civic Issue (No Duplicate)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* View switcher */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setActiveView('visual')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      activeView === 'visual'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Comparison
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

              {activeView === 'visual' ? (
                <div className="p-5 sm:p-6 space-y-6">
                  {/* Deduplication Reason */}
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 block mb-1.5">
                      Detection Rationale
                    </span>
                    <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                      {result.reason}
                    </p>
                  </div>

                  {/* Side-by-Side Comparison if duplicate */}
                  {result.possible_duplicate && matchingRecord && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        <span>Side-by-Side Incident Comparison</span>
                        <span className="font-mono text-slate-900 dark:text-white">
                          Target: {result.matching_report_id}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* New report */}
                        <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                          <span className="text-[11px] font-semibold uppercase text-slate-400 dark:text-slate-500 block">
                            Incoming Complaint
                          </span>
                          <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
                            &ldquo;{newComplaintText}&rdquo;
                          </p>
                        </div>

                        {/* Existing match */}
                        <div className="p-3.5 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold uppercase text-amber-800 dark:text-amber-400">
                              Registered Incident ({matchingRecord.id})
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">
                              {matchingRecord.timestamp}
                            </span>
                          </div>
                          <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
                            &ldquo;{matchingRecord.complaintText}&rdquo;
                          </p>
                          {matchingRecord.analysis && (
                            <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/40 text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5">
                              <div>
                                <strong>Category:</strong> {matchingRecord.analysis.category}
                              </div>
                              <div>
                                <strong>Asset:</strong> {matchingRecord.analysis.infrastructure}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Merge / Link Action */}
                      <div className="pt-2 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={handleLink}
                          disabled={linkedSuccess}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
                            linkedSuccess
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                              : 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                          }`}
                        >
                          {linkedSuccess ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                          <span>
                            {linkedSuccess
                              ? `Linked to Master ${result.matching_report_id}`
                              : `Link as Duplicate to ${result.matching_report_id}`}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={handleCopyJson}
                          className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {!result.possible_duplicate && (
                    <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        Independent Work Order Recommended
                      </p>
                      <p>
                        This complaint does not refer to any previously reported incident. Safe to triage as a new distinct municipal case.
                      </p>
                    </div>
                  )}
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

          {!isEvaluating && !result && !error && (
            <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 mx-auto flex items-center justify-center mb-3">
                <GitCompare className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Awaiting Duplicate Cross-Reference
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                Click &ldquo;Run Duplicate Check&rdquo; or select a test scenario on the left to evaluate similarity and incident identity.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
