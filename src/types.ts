export interface CivicAnalysisResponse {
  category: string;
  summary: string;
  infrastructure: string;
  public_impact: string;
  confidence: number;
  engineUsed: 'gemini-3.8-flash' | 'local-heuristic-fallback';
  rawPrompt?: string;
  processedAt: string;
}

export interface DuplicateDetectionResponse {
  possible_duplicate: boolean;
  matching_report_id: string;
  reason: string;
  confidence: number;
  engineUsed: 'gemini-3.8-flash' | 'local-heuristic-fallback';
  processedAt: string;
}

export interface EmergencyAssessmentResponse {
  urgency: number; // 0-100
  impact: number; // 0-100
  safety_risk: number; // 0-100
  duration: number; // 0-100
  priority_score?: number; // 0-100
  priority_level?: 'High' | 'Medium' | 'Low';
  reasoning: string;
  engineUsed: 'gemini-3.8-flash' | 'local-heuristic-fallback';
  processedAt: string;
}

export type StandardDepartment =
  | 'Roads and Infrastructure'
  | 'Drainage Department'
  | 'Sanitation Department'
  | 'Electricity Department'
  | 'Water Supply Department'
  | 'Public Safety Department';

export interface DepartmentAssignmentResponse {
  department: StandardDepartment;
  recommended_action: string;
  reason: string;
  engineUsed: 'gemini-3.8-flash' | 'local-heuristic-fallback';
  processedAt: string;
}

export interface ExecutiveReportResponse {
  problem: string;
  location: string;
  related_complaints: number;
  priority: string;
  public_impact: string;
  recommended_action: string;
  briefing_text: string;
  engineUsed: 'gemini-3.8-flash' | 'local-heuristic-fallback';
  processedAt: string;
}

export type TriageStatus = 'New' | 'Triaged' | 'Dispatched' | 'In Progress' | 'Resolved';

export type PriorityLevel = 'Critical' | 'High' | 'Medium' | 'Low';

export interface DuplicateMatchInfo {
  matchingReportId: string;
  similarityPercentage: number;
  locationProximity: string;
  reason: string;
}

export interface ActivityLogItem {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  actor: 'Citizen' | 'AI System' | 'Municipal Authority';
  type:
    | 'submission'
    | 'ai_analysis'
    | 'severity_assessment'
    | 'department_assignment'
    | 'duplicate_decision'
    | 'status_change'
    | 'note'
    | 'resolution';
}

export interface ComplaintRecord {
  id: string;
  title?: string;
  complaintText: string;
  source: 'citizen_portal' | 'hotline_311' | 'field_inspector' | 'mobile_app';
  timestamp: string;
  lastUpdated?: string;
  status: TriageStatus;
  priority?: PriorityLevel;
  department?: string;
  location?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  imageUrl?: string;
  resolutionNotes?: string;
  authorityNotes?: string[];
  duplicateOf?: string; // ID of the master complaint if this is a duplicate
  duplicateDecision?: 'confirmed_related' | 'not_a_duplicate';
  duplicateDecisionTimestamp?: string;
  assignedDepartment?: StandardDepartment | string;
  assignedDepartmentTimestamp?: string;
  analysis?: CivicAnalysisResponse;
  duplicateCheck?: DuplicateDetectionResponse;
  emergencyAssessment?: EmergencyAssessmentResponse;
  departmentAssignment?: DepartmentAssignmentResponse;
  executiveReport?: ExecutiveReportResponse;
  activities?: ActivityLogItem[];
}

export interface CivicCategoryMeta {
  name: string;
  description: string;
  department: StandardDepartment;
  slaHours: number;
}

export interface DuplicateTestScenario {
  id: string;
  title: string;
  expectedOutcome: 'duplicate' | 'distinct';
  description: string;
  newComplaint: string;
  targetReportId?: string;
}
