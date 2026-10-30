import React, { useState } from 'react';
import {
  Send,
  Upload,
  MapPin,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  Building2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Loader2,
  FileText,
} from 'lucide-react';
import { ComplaintRecord, StandardDepartment, ActivityLogItem } from '../types';

interface ReportGrievanceProps {
  complaints: ComplaintRecord[];
  onAddComplaint: (newComplaint: ComplaintRecord) => void;
  onNavigateToTrack: (complaintId: string) => void;
  onNavigateToCommand: (complaintId: string) => void;
}

const PRESET_LOCATIONS = [
  { name: 'Elm Street Corridor (near St. Jude Hospital)', lat: 40.7306, lng: -73.9925 },
  { name: '240 Pinehurst Avenue (Sidewalk)', lat: 40.7484, lng: -73.9857 },
  { name: 'Oakway Boulevard (between 14th & 16th St)', lat: 40.7589, lng: -73.9851 },
  { name: 'Central Park (Near Carousel)', lat: 40.7688, lng: -73.9712 },
  { name: 'Northcrest Road (Overhead Utility Corridor)', lat: 40.7829, lng: -73.9654 },
  { name: 'Highland Terrace & Valley Road Intersection', lat: 40.7282, lng: -74.0042 },
  { name: '5th Street & Market Commercial District', lat: 40.7512, lng: -73.9821 },
  { name: 'King Street near I-80 On-Ramp', lat: 40.7391, lng: -74.0112 },
];

const QUICK_EXAMPLES = [
  {
    title: 'Water Main Gushing at 5th & Market',
    text: 'A clean water pipe burst beneath the sidewalk at 5th Street and Market. Fresh water is flooding into storefronts and tap water pressure in neighboring apartments has completely failed.',
    location: '5th Street & Market Commercial District',
    category: 'Water Supply Department',
  },
  {
    title: 'Dangerous Deep Pothole on King St',
    text: 'Deep crater-sized pothole in the center lane of King Street just before the expressway entrance. Drivers are braking sharply and cars are taking rim damage.',
    location: 'King Street near I-80 On-Ramp',
    category: 'Roads and Infrastructure',
  },
  {
    title: 'Sparking Transformer on Oakway Blvd',
    text: 'Overhead transformer box is sparking and making a loud buzzing sound near 15th St on Oakway Boulevard. Streetlights flickered out and a burnt smell is noticeable.',
    location: 'Oakway Boulevard (between 14th & 16th St)',
    category: 'Electricity Department',
  },
];

export const ReportGrievance: React.FC<ReportGrievanceProps> = ({
  complaints,
  onAddComplaint,
  onNavigateToTrack,
  onNavigateToCommand,
}) => {
  const [title, setTitle] = useState('');
  const [complaintText, setComplaintText] = useState('');
  const [location, setLocation] = useState(PRESET_LOCATIONS[0].name);
  const [customLocation, setCustomLocation] = useState('');
  const [categoryPreference, setCategoryPreference] = useState<string>('Auto-detect with AI');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<ComplaintRecord | null>(null);
  const [analysisPhase, setAnalysisPhase] = useState<string>('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        alert('Please choose an image under 4MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
  };

  const handleSelectExample = (ex: typeof QUICK_EXAMPLES[0]) => {
    setTitle(ex.title);
    setComplaintText(ex.text);
    setLocation(ex.location);
    setCustomLocation('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintText.trim()) return;

    setIsSubmitting(true);
    setAnalysisPhase('Submitting incident to municipal ledger...');

    const now = new Date();
    const dateFormatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const isoString = now.toISOString();

    // Determine highest existing ID to generate clean sequence
    let nextNum = 88;
    const ids = complaints
      .map((c) => {
        const match = c.id.match(/CMP-2026-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => !isNaN(n));
    if (ids.length > 0) {
      nextNum = Math.max(...ids) + 1;
    }
    const newId = `CMP-2026-${String(nextNum).padStart(3, '0')}`;

    const resolvedLocation = customLocation.trim() || location;
    const preset = PRESET_LOCATIONS.find((p) => p.name === resolvedLocation);
    const coordinates = preset
      ? { lat: preset.lat, lng: preset.lng }
      : {
          lat: 40.7128 + (Math.random() - 0.5) * 0.08,
          lng: -74.0060 + (Math.random() - 0.5) * 0.08,
        };

    const initialActivity: ActivityLogItem = {
      id: `act-${newId}-1`,
      timestamp: dateFormatted,
      actor: 'Citizen',
      action: 'Grievance Submitted',
      details: `Citizen submitted report "${title || 'Civic Grievance'}" at ${resolvedLocation}.`,
      type: 'submission',
    };

    let newRecord: ComplaintRecord = {
      id: newId,
      title: title.trim() || `Civic Issue at ${resolvedLocation.split('(')[0].trim()}`,
      complaintText: complaintText.trim(),
      source: 'citizen_portal',
      timestamp: dateFormatted,
      lastUpdated: dateFormatted,
      status: 'New',
      priority: 'Medium',
      location: resolvedLocation,
      coordinates,
      imageUrl: imagePreview || undefined,
      activities: [initialActivity],
    };

    try {
      setAnalysisPhase('Running Gemini AI multi-task analysis (Categorization, Severity, Routing, Duplicates)...');

      // Prepare existing reports payload for duplicate comparison
      const existingReportsPayload = complaints.map((c) => ({
        id: c.id,
        category: c.analysis?.category || c.department,
        infrastructure: c.analysis?.infrastructure,
        text: c.complaintText,
      }));

      const res = await fetch('/api/unified-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complaint: newRecord.complaintText,
          existingReports: existingReportsPayload,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const { analysis, emergencyAssessment, departmentAssignment, duplicateCheck } = data;

        // Build activity entries
        const aiAnalysisAct: ActivityLogItem = {
          id: `act-${newId}-2`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          actor: 'AI System',
          action: 'AI Categorization & Extraction',
          details: `Category: ${analysis.category} (${Math.round(analysis.confidence * 100)}% conf). Infrastructure: ${analysis.infrastructure}.`,
          type: 'ai_analysis',
        };

        const severityAct: ActivityLogItem = {
          id: `act-${newId}-3`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          actor: 'AI System',
          action: 'Severity Assessment Calculated',
          details: `Priority Score: ${emergencyAssessment.priority_score} (${emergencyAssessment.priority_level}). Urgency: ${emergencyAssessment.urgency}, Impact: ${emergencyAssessment.impact}, Safety: ${emergencyAssessment.safety_risk}, Duration: ${emergencyAssessment.duration}.`,
          type: 'severity_assessment',
        };

        const routingAct: ActivityLogItem = {
          id: `act-${newId}-4`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          actor: 'AI System',
          action: 'Department Routing Recommendation',
          details: `Recommended: ${departmentAssignment.department}. Action: ${departmentAssignment.recommended_action}`,
          type: 'department_assignment',
        };

        const activitiesList = [initialActivity, aiAnalysisAct, severityAct, routingAct];

        if (duplicateCheck.possible_duplicate && duplicateCheck.matching_report_id) {
          activitiesList.push({
            id: `act-${newId}-5`,
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            actor: 'AI System',
            action: 'Duplicate Flag Detected',
            details: `Identified potential duplicate of ${duplicateCheck.matching_report_id}: ${duplicateCheck.reason}`,
            type: 'duplicate_decision',
          });
        }

        newRecord = {
          ...newRecord,
          analysis,
          emergencyAssessment,
          departmentAssignment,
          duplicateCheck,
          department: departmentAssignment.department,
          assignedDepartment: departmentAssignment.department,
          priority: emergencyAssessment.priority_level as any,
          status: 'Triaged',
          duplicateOf: duplicateCheck.possible_duplicate ? duplicateCheck.matching_report_id : undefined,
          activities: activitiesList,
          lastUpdated: new Date().toISOString().replace('T', ' ').substring(0, 16),
        };
      }
    } catch (err) {
      console.error('Unified analysis error:', err);
    } finally {
      onAddComplaint(newRecord);
      setSubmissionSuccess(newRecord);
      setIsSubmitting(false);
      setAnalysisPhase('');
    }
  };

  const handleStartAnother = () => {
    setTitle('');
    setComplaintText('');
    setCustomLocation('');
    setImagePreview(null);
    setSubmissionSuccess(null);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Page Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Citizen Grievance Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Report a Civic Grievance
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
              Submit public works, road hazards, water leaks, electrical blackouts, or sanitation issues. Every report triggers immediate AI categorization, priority calculation, and department routing.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <span className="text-xs text-slate-500 dark:text-slate-400">Response standard:</span>
            <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-md font-mono text-xs font-semibold">
              Instant AI Triage
            </span>
          </div>
        </div>
      </div>

      {/* Success State View */}
      {submissionSuccess ? (
        <div className="bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in duration-300">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono text-base font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
                  {submissionSuccess.id}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Status: {submissionSuccess.status}
                </span>
                <span className="text-xs text-slate-500">
                  Logged at {submissionSuccess.timestamp}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-2">
                {submissionSuccess.title}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Your complaint has been successfully recorded in the municipal registry and processed by the AI intelligence engine.
              </p>
            </div>
          </div>

          {/* AI Extraction Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <span className="text-xs font-semibold uppercase text-slate-500 block mb-1">
                Detected Category
              </span>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {submissionSuccess.analysis?.category || 'General Civic Issue'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Confidence: {Math.round((submissionSuccess.analysis?.confidence || 0.9) * 100)}%
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <span className="text-xs font-semibold uppercase text-slate-500 block mb-1">
                Priority Score
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                  {submissionSuccess.emergencyAssessment?.priority_score || 75}
                </span>
                <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                  / 100 ({submissionSuccess.emergencyAssessment?.priority_level || 'High'})
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Calculated via 4-factor formula</p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <span className="text-xs font-semibold uppercase text-slate-500 block mb-1">
                Assigned Department
              </span>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {submissionSuccess.departmentAssignment?.department || 'Roads and Infrastructure'}
              </p>
              <p className="text-xs text-slate-500 mt-1">Dispatch recommendation ready</p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <span className="text-xs font-semibold uppercase text-slate-500 block mb-1">
                Duplicate Status
              </span>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {submissionSuccess.duplicateCheck?.possible_duplicate ? 'Flagged Duplicate' : 'Unique Incident'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {submissionSuccess.duplicateCheck?.possible_duplicate
                  ? `Linked to ${submissionSuccess.duplicateCheck.matching_report_id}`
                  : 'Master incident report'}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => onNavigateToTrack(submissionSuccess.id)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-xs transition-colors"
            >
              <span>Track Complaint Status</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigateToCommand(submissionSuccess.id)}
              className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-sm font-semibold hover:bg-slate-800 dark:hover:bg-slate-200 flex items-center gap-2 transition-colors"
            >
              <Building2 className="w-4 h-4" />
              <span>View in Command Center</span>
            </button>

            <button
              onClick={handleStartAnother}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-semibold transition-colors ml-auto"
            >
              Submit Another Grievance
            </button>
          </div>
        </div>
      ) : (
        /* Grievance Submission Form */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form (2 cols) */}
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6"
          >
            {/* Title */}
            <div>
              <label htmlFor="complaint-title" className="block text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
                Grievance Title <span className="text-slate-400 font-normal">(Optional summary)</span>
              </label>
              <input
                id="complaint-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Hazardous Roadway Crater near Hospital"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="complaint-desc" className="block text-sm font-semibold text-slate-900 dark:text-white">
                  Complaint Description <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs text-slate-400">Be as specific as possible</span>
              </div>
              <textarea
                id="complaint-desc"
                rows={5}
                required
                value={complaintText}
                onChange={(e) => setComplaintText(e.target.value)}
                placeholder="Describe what happened, exact physical observations, hazards, duration, and any vehicle or pedestrian impacts..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm resize-y"
              />
            </div>

            {/* Location Selector */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-900 dark:text-white">
                Location & Incident Zone
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="location-select" className="text-xs font-medium text-slate-500 block mb-1">
                    Select Common Sector / Corridor
                  </label>
                  <select
                    id="location-select"
                    value={location}
                    onChange={(e) => {
                      setLocation(e.target.value);
                      setCustomLocation('');
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {PRESET_LOCATIONS.map((loc) => (
                      <option key={loc.name} value={loc.name}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="custom-loc" className="text-xs font-medium text-slate-500 block mb-1">
                    Or Enter Custom Address / Cross Street
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      id="custom-loc"
                      type="text"
                      value={customLocation}
                      onChange={(e) => setCustomLocation(e.target.value)}
                      placeholder="e.g. 782 Broadway Ave & 9th St"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Category Preference */}
            <div>
              <label htmlFor="category-select" className="block text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
                Category
              </label>
              <select
                id="category-select"
                value={categoryPreference}
                onChange={(e) => setCategoryPreference(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Auto-detect with AI">Auto-detect with Gemini AI (Recommended)</option>
                <option value="Roads and Infrastructure">Roads and Infrastructure</option>
                <option value="Drainage Department">Drainage Department</option>
                <option value="Sanitation Department">Sanitation Department</option>
                <option value="Electricity Department">Electricity Department</option>
                <option value="Water Supply Department">Water Supply Department</option>
                <option value="Public Safety Department">Public Safety Department</option>
              </select>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
                Attach Photo Evidence <span className="text-slate-400 font-normal">(Optional)</span>
              </label>

              {imagePreview ? (
                <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 p-2">
                  <div className="flex items-center gap-3">
                    <img
                      src={imagePreview}
                      alt="Complaint attachment preview"
                      className="w-20 h-20 object-cover rounded-lg border border-slate-300 dark:border-slate-600"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        Attached photo evidence
                      </p>
                      <p className="text-xs text-slate-500">Ready for automated visual reference</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline px-3 py-1"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <Upload className="w-6 h-6 text-slate-400 mb-2" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Click to upload photo evidence
                  </span>
                  <span className="text-2xs text-slate-400 mt-0.5">PNG, JPG up to 4MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !complaintText.trim()}
                className="w-full py-3 px-5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                    <span>{analysisPhase || 'Processing Report with Gemini AI...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Grievance & Run AI Analysis</span>
                  </>
                )}
              </button>
              <p className="text-2xs text-slate-500 text-center mt-2">
                Submissions automatically generate unique ID, calculate severity scores, and route to the correct municipal authority.
              </p>
            </div>
          </form>

          {/* Quick Examples Sidebar (1 col) */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Quick Scenario Templates</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Click a preset test complaint to auto-fill the form and test the live AI classification pipeline:
              </p>

              <div className="space-y-3">
                {QUICK_EXAMPLES.map((ex, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectExample(ex)}
                    className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-all text-xs"
                  >
                    <div className="font-semibold text-slate-900 dark:text-white mb-1">
                      {ex.title}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 line-clamp-2">
                      {ex.text}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-2xs text-emerald-700 dark:text-emerald-400 font-mono">
                      <span>{ex.category}</span>
                      <span>Click to fill &rarr;</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Service Guarantee Badge */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-xs space-y-2">
              <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Automated AI SLA Guarantee</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Every grievance is assessed using the formula:
                <br />
                <code className="text-2xs bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded font-mono text-emerald-600 dark:text-emerald-400 block my-1">
                  (0.4 × Urgency) + (0.3 × Impact) + (0.2 × Safety Risk) + (0.1 × Duration)
                </code>
                High-priority scores (&gt;= 75) trigger immediate field dispatch alerts.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
