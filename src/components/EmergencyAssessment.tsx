import React, { useState } from 'react';
import { EmergencyAssessmentResponse } from '../types';
import { BENCHMARK_SAMPLES } from '../data/sampleComplaints';
import {
  AlertOctagon,
  Flame,
  Activity,
  Clock,
  ShieldAlert,
  Copy,
  Check,
  FileCode2,
  HelpCircle,
  RefreshCw,
  Send,
  Zap,
} from 'lucide-react';

export const EmergencyAssessment: React.FC = () => {
  const [complaintText, setComplaintText] = useState(
    'A heavy oak branch broke during yesterday’s storm and is suspended precariously on electrical wires directly above the sidewalk on Northcrest Road. It looks ready to fall on passing pedestrians.'
  );
  const [isAssessing, setIsAssessing] = useState(false);
  const [result, setResult] = useState<EmergencyAssessmentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'scorecard' | 'json'>('scorecard');
  const [copied, setCopied] = useState(false);

  const handleAssess = async (textToAssess?: string) => {
    const text = (textToAssess ?? complaintText).trim();
    if (!text) return;

    setIsAssessing(true);
    setError(null);

    try {
      const res = await fetch('/api/assess-emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complaint: text }),
      });

      if (!res.ok) {
        throw new Error(`Assessment failed with status ${res.status}`);
      }

      const data: EmergencyAssessmentResponse = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Error executing emergency assessment.');
    } finally {
      setIsAssessing(false);
    }
  };

  const jsonPayload = result
    ? JSON.stringify(
        {
          urgency: result.urgency,
          impact: result.impact,
          safety_risk: result.safety_risk,
          duration: result.duration,
          reasoning: result.reasoning,
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

  // Composite Priority calculation
  const compositeScore = result
    ? Math.round(
        result.urgency * 0.35 +
          result.safety_risk * 0.35 +
          result.impact * 0.2 +
          result.duration * 0.1
      )
    : 0;

  const getPriorityTier = (score: number) => {
    if (score >= 80) {
      return {
        label: 'Tier 1 · Immediate Emergency Dispatch',
        subtext: 'High public safety peril or imminent infrastructure failure (< 2 Hours SLA)',
        color: 'text-red-700 dark:text-red-400',
        bg: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900',
        bar: 'bg-red-600 dark:bg-red-500',
      };
    }
    if (score >= 60) {
      return {
        label: 'Tier 2 · Expedited Municipal Priority',
        subtext: 'Substantial public disruption or escalating risk (< 24 Hours SLA)',
        color: 'text-amber-700 dark:text-amber-400',
        bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900',
        bar: 'bg-amber-600 dark:bg-amber-500',
      };
    }
    if (score >= 40) {
      return {
        label: 'Tier 3 · Standard Scheduled Work Order',
        subtext: 'Routine civic maintenance and localized inconvenience (< 72 Hours SLA)',
        color: 'text-blue-700 dark:text-blue-400',
        bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900',
        bar: 'bg-blue-600 dark:bg-blue-500',
      };
    }
    return {
      label: 'Tier 4 · Monitored / Low Impact',
      subtext: 'Minor cosmetic or low-risk citizen report (Deferred backlog queue)',
      color: 'text-slate-700 dark:text-slate-400',
      bg: 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800',
      bar: 'bg-slate-500',
    };
  };

  const priorityInfo = getPriorityTier(compositeScore);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Emergency & Severity Assessment Assistant
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-3xl">
          Four-factor multi-dimensional quantitative triage assessing Urgency, Public Impact, Safety Risk, and Persistence Duration (0-100 scale). Strictly preserves uncertainty when evidence is missing.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Complaint Input & Presets (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm transition-colors">
            <div className="flex items-center justify-between mb-3">
              <label
                htmlFor="emergency-complaint"
                className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
              >
                Complaint for Severity Triage
              </label>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono tabular-nums">
                {complaintText.length} characters
              </span>
            </div>

            <textarea
              id="emergency-complaint"
              rows={5}
              value={complaintText}
              onChange={(e) => setComplaintText(e.target.value)}
              placeholder="Paste civic complaint to calculate 4-factor emergency metrics..."
              className="w-full p-3.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900 dark:focus:ring-white transition-all font-normal leading-relaxed resize-y"
            />

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Evaluates: Urgency · Impact · Safety Risk · Duration
              </span>

              <button
                type="button"
                onClick={() => handleAssess()}
                disabled={isAssessing || !complaintText.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 transition-colors shadow-xs"
              >
                {isAssessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Evaluating Severity...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Assess 4 Factors</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Presets */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Curated Severity Scenarios
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">Click to evaluate</span>
            </div>

            <div className="space-y-2">
              {BENCHMARK_SAMPLES.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setComplaintText(sample.text);
                    setResult(null);
                    setError(null);
                  }}
                  className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800 transition-all text-xs"
                >
                  <div className="flex items-center justify-between font-semibold text-slate-900 dark:text-white mb-0.5">
                    <span>{sample.title}</span>
                    <span className="text-[11px] text-slate-500 font-normal">{sample.categoryHint}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 line-clamp-1 italic text-[11px]">
                    &ldquo;{sample.text}&rdquo;
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Scorecard & 4 Factors (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          {error && (
            <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isAssessing && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm animate-pulse space-y-4">
              <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded"></div>
                <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded"></div>
                <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded"></div>
                <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded"></div>
              </div>
              <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded"></div>
            </div>
          )}

          {!isAssessing && result && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-colors">
              {/* Top View Selector */}
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
                    <span>Municipal Impact Evaluation</span>
                    <span aria-hidden="true">·</span>
                    <span>4-Factor Infrastructure Assessment</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Emergency Impact Profile
                  </h3>
                </div>

                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setActiveView('scorecard')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      activeView === 'scorecard'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Scorecard
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

              {activeView === 'scorecard' ? (
                <div className="p-5 sm:p-6 space-y-6">
                  {/* Composite Tier Badge */}
                  <div className={`p-4 rounded-xl border ${priorityInfo.bg}`}>
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <span className={`text-sm font-bold ${priorityInfo.color}`}>
                        {priorityInfo.label}
                      </span>
                      <span className="font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-white">
                        {compositeScore} / 100
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                      {priorityInfo.subtext}
                    </p>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${priorityInfo.bar} transition-all duration-500`}
                        style={{ width: `${compositeScore}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* 4 Factor Scorecard Grid */}
                  <div className="grid grid-cols-2 gap-3.5">
                    {/* 1. Urgency */}
                    <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-red-500" />
                          <span>1. Urgency</span>
                        </span>
                        <span className="font-mono font-bold text-sm tabular-nums text-slate-900 dark:text-white">
                          {result.urgency}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mb-1">
                        <div
                          className="h-full bg-red-500 rounded-full"
                          style={{ width: `${result.urgency}%` }}
                        ></div>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {result.urgency >= 80 ? 'Immediate action required' : result.urgency >= 50 ? 'Timely review' : 'Deferred priority'}
                      </span>
                    </div>

                    {/* 2. Public Impact */}
                    <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-blue-500" />
                          <span>2. Public Impact</span>
                        </span>
                        <span className="font-mono font-bold text-sm tabular-nums text-slate-900 dark:text-white">
                          {result.impact}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mb-1">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${result.impact}%` }}
                        ></div>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {result.impact >= 80 ? 'Widespread population' : result.impact >= 50 ? 'Corridor disruption' : 'Localized/Individual'}
                      </span>
                    </div>

                    {/* 3. Safety Risk */}
                    <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                          <span>3. Safety Risk</span>
                        </span>
                        <span className="font-mono font-bold text-sm tabular-nums text-slate-900 dark:text-white">
                          {result.safety_risk}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mb-1">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${result.safety_risk}%` }}
                        ></div>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {result.safety_risk >= 80 ? 'Severe bodily injury risk' : result.safety_risk >= 50 ? 'Hazardous obstacle' : 'Minimal injury risk'}
                      </span>
                    </div>

                    {/* 4. Duration */}
                    <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-purple-500" />
                          <span>4. Duration</span>
                        </span>
                        <span className="font-mono font-bold text-sm tabular-nums text-slate-900 dark:text-white">
                          {result.duration}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mb-1">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${result.duration}%` }}
                        ></div>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {result.duration >= 70 ? 'Chronic/Multi-day' : result.duration >= 40 ? 'Recent onset' : 'Unspecified/Uncertain'}
                      </span>
                    </div>
                  </div>

                  {/* Factual Reasoning & Uncertainty Guardrail */}
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 block">
                      Factual Grounding & Uncertainty Assessment
                    </span>
                    <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
                      {result.reasoning}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-xs text-slate-500">
                      Evaluated on strictly verified facts without invented evidence.
                    </span>

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

          {!isAssessing && !result && !error && (
            <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 mx-auto flex items-center justify-center mb-3">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Awaiting Severity Triage
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                Click &ldquo;Assess 4 Factors&rdquo; or select a scenario to calculate Urgency, Public Impact, Safety Risk, and Persistence Duration.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
