import React, { useState } from 'react';
import { Copy, Check, Terminal, Shield, CheckCircle2, Cpu } from 'lucide-react';

const CIVIC_ANALYST_PROMPT = `You are an expert civic issue analyst.

Analyse the following citizen complaint.

Your tasks:
1. Identify the main civic issue.
2. Assign one appropriate category.
3. Generate a concise summary.
4. Identify the affected infrastructure.
5. Identify possible public impact.

Return valid JSON only.

{
  "category": "",
  "summary": "",
  "infrastructure": "",
  "public_impact": "",
  "confidence": 0
}

Do not invent information that is not present
in the complaint.

Complaint:
{{complaint}}`;

const CIVIC_ANALYST_SCHEMA = `{
  "type": "OBJECT",
  "properties": {
    "category": {
      "type": "STRING",
      "description": "One appropriate civic issue category"
    },
    "summary": {
      "type": "STRING",
      "description": "A concise summary strictly based on the complaint"
    },
    "infrastructure": {
      "type": "STRING",
      "description": "The specific affected municipal infrastructure"
    },
    "public_impact": {
      "type": "STRING",
      "description": "Possible public, health, safety, or transit impact"
    },
    "confidence": {
      "type": "NUMBER",
      "description": "Confidence score between 0.0 and 1.0"
    }
  },
  "required": ["category", "summary", "infrastructure", "public_impact", "confidence"]
}`;

const DUPLICATE_DETECTION_PROMPT = `You are a civic complaint duplicate detection engine.

Compare the new complaint with the existing
complaints.

Consider:
- Similarity of the underlying problem.
- Similarity of location.
- Similarity of affected infrastructure.
- Whether both reports describe the same incident.

Do not classify two complaints as duplicates
only because they share a category.

Return:
{
  "possible_duplicate": true,
  "matching_report_id": "",
  "reason": "",
  "confidence": 0
}

New complaint:
{{new_complaint}}

Existing complaints:
{{existing_reports}}`;

const DUPLICATE_DETECTION_SCHEMA = `{
  "type": "OBJECT",
  "properties": {
    "possible_duplicate": {
      "type": "BOOLEAN",
      "description": "True if complaint refers to the same incident & location"
    },
    "matching_report_id": {
      "type": "STRING",
      "description": "ID of matching report, or empty string if distinct"
    },
    "reason": {
      "type": "STRING",
      "description": "Detailed explanation comparing problem, location, and infrastructure"
    },
    "confidence": {
      "type": "NUMBER",
      "description": "Confidence score between 0.0 and 1.0"
    }
  },
  "required": ["possible_duplicate", "matching_report_id", "reason", "confidence"]
}`;

const EMERGENCY_ASSESSMENT_PROMPT = `You are an expert municipal emergency
and infrastructure assessment assistant.

Evaluate the complaint using four factors:

1. Urgency: 0-100
2. Public impact: 0-100
3. Safety risk: 0-100
4. Duration: 0-100

Return structured JSON.

{
  "urgency": 0,
  "impact": 0,
  "safety_risk": 0,
  "duration": 0,
  "reasoning": ""
}

Use only information supported by the complaint.
If information is missing, indicate uncertainty.
Do not invent evidence.

Complaint:
{{complaint}}`;

const EMERGENCY_ASSESSMENT_SCHEMA = `{
  "type": "OBJECT",
  "properties": {
    "urgency": {
      "type": "INTEGER",
      "description": "Urgency score (0-100)"
    },
    "impact": {
      "type": "INTEGER",
      "description": "Public impact score (0-100)"
    },
    "safety_risk": {
      "type": "INTEGER",
      "description": "Safety risk factor (0-100)"
    },
    "duration": {
      "type": "INTEGER",
      "description": "Duration score (0-100); indicate uncertainty if unstated"
    },
    "reasoning": {
      "type": "STRING",
      "description": "Factual justification strictly grounded in complaint"
    }
  },
  "required": ["urgency", "impact", "safety_risk", "duration", "reasoning"]
}`;

const DEPARTMENT_ASSIGNMENT_PROMPT = `You are a municipal department assignment assistant.

Based on the complaint, identify the most
appropriate responsible department.

Available departments:
- Roads and Infrastructure
- Drainage Department
- Sanitation Department
- Electricity Department
- Water Supply Department
- Public Safety Department

Return:
{
  "department": "",
  "recommended_action": "",
  "reason": ""
}

Complaint:
{{complaint}}`;

const DEPARTMENT_ASSIGNMENT_SCHEMA = `{
  "type": "OBJECT",
  "properties": {
    "department": {
      "type": "STRING",
      "description": "One of 6 authoritative municipal departments"
    },
    "recommended_action": {
      "type": "STRING",
      "description": "Concrete operational field work order recommendation"
    },
    "reason": {
      "type": "STRING",
      "description": "Factual assignment rationale matching complaint"
    }
  },
  "required": ["department", "recommended_action", "reason"]
}`;

const EXECUTIVE_REPORT_PROMPT = `You are an expert civic operations analyst.

Convert the following complaint information
into a short actionable report for municipal
decision-makers.

Include:
1. Problem identified.
2. Location.
3. Number of related complaints.
4. Priority.
5. Public impact.
6. Recommended action.

Keep the report concise and understandable.

Complaint information:
{{complaint_data}}`;

const EXECUTIVE_REPORT_SCHEMA = `{
  "type": "OBJECT",
  "properties": {
    "problem": {
      "type": "STRING",
      "description": "1. Problem identified"
    },
    "location": {
      "type": "STRING",
      "description": "2. Specific location or cross streets"
    },
    "related_complaints": {
      "type": "INTEGER",
      "description": "3. Number of related complaints in registry"
    },
    "priority": {
      "type": "STRING",
      "description": "4. Priority (Critical, High, Medium, Low)"
    },
    "public_impact": {
      "type": "STRING",
      "description": "5. Public impact assessment"
    },
    "recommended_action": {
      "type": "STRING",
      "description": "6. Recommended operational action"
    },
    "briefing_text": {
      "type": "STRING",
      "description": "Concise executive briefing memo for municipal leadership"
    }
  },
  "required": [
    "problem",
    "location",
    "related_complaints",
    "priority",
    "public_impact",
    "recommended_action",
    "briefing_text"
  ]
}`;

export const PromptInspector: React.FC = () => {
  const [selectedPrompt, setSelectedPrompt] = useState<'analyst' | 'duplicate' | 'emergency' | 'department' | 'executive'>('analyst');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);

  const getPrompt = () => {
    switch (selectedPrompt) {
      case 'analyst':
        return CIVIC_ANALYST_PROMPT;
      case 'duplicate':
        return DUPLICATE_DETECTION_PROMPT;
      case 'emergency':
        return EMERGENCY_ASSESSMENT_PROMPT;
      case 'department':
        return DEPARTMENT_ASSIGNMENT_PROMPT;
      case 'executive':
        return EXECUTIVE_REPORT_PROMPT;
    }
  };

  const getSchema = () => {
    switch (selectedPrompt) {
      case 'analyst':
        return CIVIC_ANALYST_SCHEMA;
      case 'duplicate':
        return DUPLICATE_DETECTION_SCHEMA;
      case 'emergency':
        return EMERGENCY_ASSESSMENT_SCHEMA;
      case 'department':
        return DEPARTMENT_ASSIGNMENT_SCHEMA;
      case 'executive':
        return EXECUTIVE_REPORT_SCHEMA;
    }
  };

  const currentPrompt = getPrompt();
  const currentSchema = getSchema();

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(currentPrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleCopySchema = async () => {
    try {
      await navigator.clipboard.writeText(currentSchema);
      setCopiedSchema(true);
      setTimeout(() => setCopiedSchema(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="space-y-8">
      {/* Header and Engine Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Prompt Specifications & Schema Invariants
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
            Inspect the exact system instructions, structured schemas, and grounding constraints governing the AI civic models.
          </p>
        </div>

        {/* Engine Switcher */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <button
            type="button"
            onClick={() => setSelectedPrompt('analyst')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              selectedPrompt === 'analyst'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            1. Civic Issue Analyst
          </button>
          <button
            type="button"
            onClick={() => setSelectedPrompt('duplicate')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              selectedPrompt === 'duplicate'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            2. Duplicate Detection
          </button>
          <button
            type="button"
            onClick={() => setSelectedPrompt('emergency')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              selectedPrompt === 'emergency'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            3. Severity Assessment
          </button>
          <button
            type="button"
            onClick={() => setSelectedPrompt('department')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              selectedPrompt === 'department'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            4. Department Routing
          </button>
          <button
            type="button"
            onClick={() => setSelectedPrompt('executive')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              selectedPrompt === 'executive'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            5. Executive Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Column: Prompt Template */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm transition-colors space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {selectedPrompt === 'analyst'
                  ? 'Civic Analyst Prompt Template'
                  : selectedPrompt === 'duplicate'
                  ? 'Duplicate Detection Prompt Template'
                  : selectedPrompt === 'emergency'
                  ? 'Emergency & Severity Prompt Template'
                  : selectedPrompt === 'department'
                  ? 'Department Assignment Prompt Template'
                  : 'Executive Decision-Maker Report Prompt Template'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyPrompt}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedPrompt ? 'Copied' : 'Copy Prompt'}</span>
            </button>
          </div>

          <pre className="p-4 rounded-lg bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800 whitespace-pre-wrap">
            {currentPrompt}
          </pre>

          <div className="pt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {selectedPrompt === 'analyst' && (
              <>
                Variables: <code className="text-slate-900 dark:text-slate-200 font-mono">{'{{complaint}}'}</code> is substituted dynamically with the sanitized user complaint string.
              </>
            )}
            {selectedPrompt === 'duplicate' && (
              <>
                Variables: <code className="text-slate-900 dark:text-slate-200 font-mono">{'{{new_complaint}}'}</code> and <code className="text-slate-900 dark:text-slate-200 font-mono">{'{{existing_reports}}'}</code> are substituted dynamically with active database records.
              </>
            )}
            {selectedPrompt === 'emergency' && (
              <>
                Variables: <code className="text-slate-900 dark:text-slate-200 font-mono">{'{{complaint}}'}</code> is evaluated across 4 quantitative dimensions with strict anti-hallucination guardrails.
              </>
            )}
            {selectedPrompt === 'department' && (
              <>
                Variables: <code className="text-slate-900 dark:text-slate-200 font-mono">{'{{complaint}}'}</code> is mapped into one of 6 authoritative departments with concrete operational work order directives.
              </>
            )}
            {selectedPrompt === 'executive' && (
              <>
                Variables: <code className="text-slate-900 dark:text-slate-200 font-mono">{'{{complaint_data}}'}</code> compiles complaint summary, verified location, linked duplicates, priority, and public impact into a structured 6-point briefing.
              </>
            )}
          </div>
        </div>

        {/* Right Column: Schema and Invariants */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm transition-colors space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Target JSON Schema (@google/genai Type.OBJECT)
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopySchema}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                {copiedSchema ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSchema ? 'Copied' : 'Copy Schema'}</span>
              </button>
            </div>

            <pre className="p-4 rounded-lg bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
              {currentSchema}
            </pre>
          </div>

          {/* Invariants & Anti-Hallucination Rules */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm transition-colors space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              <Shield className="w-4 h-4 text-slate-500" />
              <span>Mandatory Operational Guardrails</span>
            </div>

            {selectedPrompt === 'analyst' && (
              <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white">Task 1:</strong> Identify the main civic issue accurately.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white">Task 2:</strong> Assign one appropriate category for municipal dispatch.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white">Task 3:</strong> Generate a concise summary suitable for field work orders.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white">Task 4:</strong> Identify affected infrastructure asset.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white">Task 5:</strong> Identify possible public impact on health, safety, and transit.
                  </div>
                </div>
                <div className="flex items-start gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white">Grounding Invariant:</strong> Zero hallucination policy &mdash; information not in the complaint is never invented.
                  </div>
                </div>
              </div>
            )}

            {selectedPrompt === 'duplicate' && (
              <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white">Problem Similarity:</strong> Checks if both reports describe the same core physical failure.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white">Geographic Location Match:</strong> Verifies street, cross street, block, or address proximity.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white">Infrastructure Identity:</strong> Matches specific road, pipe, manhole, lamp, or park equipment.
                  </div>
                </div>
                <div className="flex items-start gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white">Category Independence Rule:</strong> Two complaints MUST NOT be classified as duplicates merely because they share a category.
                  </div>
                </div>
              </div>
            )}

            {selectedPrompt === 'emergency' && (
              <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white">1. Urgency (0-100):</strong> Evaluates dispatch SLA and necessity for immediate intervention.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white">2. Public Impact (0-100):</strong> Evaluates breadth of affected residents, commuters, or services.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white">3. Safety Risk (0-100):</strong> Evaluates bodily injury, vehicular collision, or pathogen exposure.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white">4. Duration (0-100):</strong> Evaluates persistence duration or notes uncertainty if omitted.
                  </div>
                </div>
                <div className="flex items-start gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white">Uncertainty Mandate:</strong> If information is missing, uncertainty MUST be indicated &mdash; no invented evidence.
                  </div>
                </div>
              </div>
            )}

            {selectedPrompt === 'department' && (
              <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white">6 Authoritative Departments:</strong> Must strictly assign to one of the six departments (Roads and Infrastructure, Drainage, Sanitation, Electricity, Water Supply, Public Safety).
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white">Operational Work Order Action:</strong> Generates concrete, field-executable operational recommendations for repair crews.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white">Factual Assignment Rationale:</strong> Links specific complaint physical evidence directly to the department's statutory charter.
                  </div>
                </div>
              </div>
            )}

            {selectedPrompt === 'executive' && (
              <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white">6 Mandatory Report Points:</strong> 1. Problem identified, 2. Location, 3. Related complaints count, 4. Priority tier, 5. Public impact, 6. Recommended operational action.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white">Concise Briefing Text:</strong> Synthesizes a high-level briefing memo for commissioners and senior city officials.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white">Zero Hallucination Location:</strong> Retains factual location from complaint; never guesses nonexistent intersections or addresses.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
