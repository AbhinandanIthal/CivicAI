import React, { useState } from 'react';
import { CivicAnalysisResponse, ComplaintRecord } from '../types';
import { BENCHMARK_SAMPLES } from '../data/sampleComplaints';
import {
  Layers,
  Play,
  Download,
  CheckCircle,
  FileSpreadsheet,
  AlertCircle,
  Plus,
  Trash2,
} from 'lucide-react';

interface BatchProcessorProps {
  onAddBatchToRegistry: (records: ComplaintRecord[]) => void;
}

export const BatchProcessor: React.FC<BatchProcessorProps> = ({
  onAddBatchToRegistry,
}) => {
  const [batchTexts, setBatchTexts] = useState<string[]>(
    BENCHMARK_SAMPLES.map((s) => s.text)
  );
  const [newComplaintLine, setNewComplaintLine] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<
    (CivicAnalysisResponse & { id: string; originalComplaint: string })[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  const handleAddLine = () => {
    if (!newComplaintLine.trim()) return;
    setBatchTexts([...batchTexts, newComplaintLine.trim()]);
    setNewComplaintLine('');
  };

  const handleRemoveLine = (index: number) => {
    setBatchTexts(batchTexts.filter((_, i) => i !== index));
  };

  const handleProcessBatch = async () => {
    if (batchTexts.length === 0) return;

    setIsProcessing(true);
    setError(null);
    setCompleted(false);

    try {
      const payload = batchTexts.map((text, idx) => ({
        id: `CMP-BATCH-${String(idx + 1).padStart(3, '0')}`,
        text,
      }));

      const res = await fetch('/api/analyze-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complaints: payload }),
      });

      if (!res.ok) {
        throw new Error(`Batch analysis failed: ${res.statusText}`);
      }

      const data = await res.json();
      setResults(data.results || []);
      setCompleted(true);
    } catch (err: any) {
      setError(err.message || 'Error processing batch complaints.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportCSV = () => {
    if (results.length === 0) return;

    const headers = ['Complaint ID', 'Category', 'Infrastructure', 'Public Impact', 'Confidence', 'Summary', 'Original Complaint'];
    const rows = results.map((r) => [
      `"${r.id}"`,
      `"${r.category.replace(/"/g, '""')}"`,
      `"${r.infrastructure.replace(/"/g, '""')}"`,
      `"${r.public_impact.replace(/"/g, '""')}"`,
      r.confidence,
      `"${r.summary.replace(/"/g, '""')}"`,
      `"${r.originalComplaint.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `civic_triage_batch_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    if (results.length === 0) return;

    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `civic_triage_batch_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCommitToRegistry = () => {
    const newRecords: ComplaintRecord[] = results.map((r, idx) => ({
      id: r.id || `CMP-REG-${String(idx + 1).padStart(3, '0')}`,
      complaintText: r.originalComplaint,
      source: 'citizen_portal',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'Triaged',
      priority: r.confidence > 0.9 ? 'High' : 'Medium',
      department: r.category,
      analysis: {
        category: r.category,
        summary: r.summary,
        infrastructure: r.infrastructure,
        public_impact: r.public_impact,
        confidence: r.confidence,
        engineUsed: r.engineUsed,
        processedAt: r.processedAt,
      },
    }));

    onAddBatchToRegistry(newRecords);
    alert(`Successfully synced ${newRecords.length} analyzed complaints to the main registry.`);
  };

  return (
    <div className="space-y-8">
      {/* Editorial Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Batch Complaint Triage Pipeline
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
            Process bulk civic intake batches, classify multiple municipal incident logs, and generate dispatch summaries in one automated pass.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleProcessBatch}
            disabled={isProcessing || batchTexts.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 transition-colors shadow-xs"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isProcessing ? 'Processing Queue...' : `Run Batch (${batchTexts.length})`}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Input Batch Queue */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            <Layers className="w-4 h-4 text-slate-500" />
            <span>Pending Intake Queue ({batchTexts.length} items)</span>
          </div>
          <button
            type="button"
            onClick={() => setBatchTexts(BENCHMARK_SAMPLES.map((s) => s.text))}
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline"
          >
            Reset to Standard Benchmarks
          </button>
        </div>

        {/* Add new single line */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newComplaintLine}
            onChange={(e) => setNewComplaintLine(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddLine()}
            placeholder="Add another citizen complaint to batch..."
            className="flex-1 p-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400"
          />
          <button
            type="button"
            onClick={handleAddLine}
            className="px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors inline-flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Item</span>
          </button>
        </div>

        {/* Queue List */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {batchTexts.map((text, idx) => (
            <div
              key={idx}
              className="flex items-start justify-between gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300"
            >
              <div className="flex items-start gap-2.5">
                <span className="font-mono text-slate-400 dark:text-slate-500 shrink-0 mt-0.5">
                  #{String(idx + 1).padStart(2, '0')}
                </span>
                <p className="line-clamp-2 leading-relaxed">{text}</p>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveLine(idx)}
                className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1 transition-colors shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Batch Results Output */}
      {results.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-colors">
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Batch Processing Completed</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{results.length} Complaints Analysed</span>
              </div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                Structured Batch Incident Matrix
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={handleExportJSON}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>
              <button
                type="button"
                onClick={handleCommitToRegistry}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
              >
                <span>Commit to Registry</span>
              </button>
            </div>
          </div>

          {/* High-density Results Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Ref ID</th>
                  <th className="py-3 px-4">Assigned Category</th>
                  <th className="py-3 px-4">Concise Summary</th>
                  <th className="py-3 px-4">Affected Infrastructure</th>
                  <th className="py-3 px-4">Public Impact</th>
                  <th className="py-3 px-4 text-right">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {results.map((r, i) => {
                  const confPct = (r.confidence <= 1 ? r.confidence * 100 : r.confidence).toFixed(0);
                  return (
                    <tr
                      key={i}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {r.id}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        {r.category}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 max-w-xs truncate">
                        {r.summary}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {r.infrastructure}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {r.public_impact}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        {confPct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
