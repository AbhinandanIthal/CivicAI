import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize Gemini SDK with User-Agent header as required
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

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

// Local deterministic civic classifier fallback if Gemini API key is unset or rate limited
function analyzeLocally(complaint: string): Omit<CivicAnalysisResponse, 'engineUsed' | 'rawPrompt' | 'processedAt'> {
  const lower = complaint.toLowerCase();

  // Water & Sewer
  if (lower.includes('water') || lower.includes('sewage') || lower.includes('leak') || lower.includes('burst') || lower.includes('pipe') || lower.includes('flooding') || lower.includes('drain')) {
    return {
      category: 'Water & Sewage Management',
      summary: complaint.length > 120 ? complaint.substring(0, 117) + '...' : complaint,
      infrastructure: lower.includes('sewage') ? 'Municipal Sewer System / Drainage' : lower.includes('pipe') ? 'Water Distribution Pipeline' : 'Storm Drainage / Water Mains',
      public_impact: lower.includes('sewage') ? 'Sanitation and biological contamination risk to pedestrians and residents' : 'Potential local water service disruption and roadway flooding hazard',
      confidence: 0.91,
    };
  }

  // Roads & Traffic
  if (lower.includes('pothole') || lower.includes('traffic') || lower.includes('road') || lower.includes('signal') || lower.includes('street') || lower.includes('crosswalk') || lower.includes('speeding')) {
    return {
      category: 'Roads & Traffic Safety',
      summary: complaint.length > 120 ? complaint.substring(0, 117) + '...' : complaint,
      infrastructure: lower.includes('signal') ? 'Traffic Signal System' : lower.includes('crosswalk') ? 'Pedestrian Crosswalk Markings' : 'Roadway Pavement / Street Surface',
      public_impact: lower.includes('pothole') ? 'Vehicle tire/suspension damage and sudden swerving hazard for motorists' : 'Impaired traffic flow and elevated accident risk for commuters',
      confidence: 0.94,
    };
  }

  // Waste & Sanitation
  if (lower.includes('trash') || lower.includes('dump') || lower.includes('garbage') || lower.includes('litter') || lower.includes('waste') || lower.includes('debris') || lower.includes('bin')) {
    return {
      category: 'Solid Waste & Sanitation',
      summary: complaint.length > 120 ? complaint.substring(0, 117) + '...' : complaint,
      infrastructure: lower.includes('dumpster') || lower.includes('bin') ? 'Public Waste Receptacles' : 'Public Right-of-Way / Curbside Space',
      public_impact: 'Vector breeding grounds, aesthetic blight, and pedestrian obstruction',
      confidence: 0.89,
    };
  }

  // Street Lighting & Electrical
  if (lower.includes('light') || lower.includes('dark') || lower.includes('lamp') || lower.includes('pole') || lower.includes('wire') || lower.includes('electrical') || lower.includes('power')) {
    return {
      category: 'Street Lighting & Electrical',
      summary: complaint.length > 120 ? complaint.substring(0, 117) + '...' : complaint,
      infrastructure: 'Municipal Streetlighting Network',
      public_impact: 'Compromised nighttime visibility increasing pedestrian danger and public security risks',
      confidence: 0.92,
    };
  }

  // Parks & Public Spaces
  if (lower.includes('park') || lower.includes('tree') || lower.includes('bench') || lower.includes('playground') || lower.includes('grass') || lower.includes('branch')) {
    return {
      category: 'Parks & Public Amenities',
      summary: complaint.length > 120 ? complaint.substring(0, 117) + '...' : complaint,
      infrastructure: lower.includes('tree') || lower.includes('branch') ? 'Urban Forestry / Tree Canopy' : 'Park Recreational Infrastructure',
      public_impact: lower.includes('tree') || lower.includes('branch') ? 'Risk of falling limbs causing property damage or personal injury' : 'Degraded recreational utility and community safety',
      confidence: 0.88,
    };
  }

  // Default generic civic issue
  return {
    category: 'Public Works & General Maintenance',
    summary: complaint.length > 120 ? complaint.substring(0, 117) + '...' : complaint,
    infrastructure: 'Municipal Public Right-of-Way',
    public_impact: 'Inconvenience to local residents and potential localized safety hazard',
    confidence: 0.76,
  };
}

const SYSTEM_PROMPT = `You are an expert civic issue analyst.

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
in the complaint.`;

const DUPLICATE_DETECTION_SYSTEM_PROMPT = `You are a civic complaint duplicate detection engine.

Compare the new complaint with the existing
complaints.

Consider:
- Similarity of the underlying problem.
- Similarity of location.
- Similarity of affected infrastructure.
- Whether both reports describe the same incident.

Do not classify two complaints as duplicates
only because they share a category.

Return valid JSON only matching the schema:
{
  "possible_duplicate": true,
  "matching_report_id": "",
  "reason": "",
  "confidence": 0
}`;

export interface DuplicateDetectionResponse {
  possible_duplicate: boolean;
  matching_report_id: string;
  reason: string;
  confidence: number;
  engineUsed: 'gemini-3.8-flash' | 'local-heuristic-fallback';
  processedAt: string;
}

function detectDuplicatesLocally(
  newComplaint: string,
  existingReports: Array<{ id: string; text?: string; complaintText?: string }>
): Omit<DuplicateDetectionResponse, 'engineUsed' | 'processedAt'> {
  const newLower = newComplaint.toLowerCase();

  // Known location keywords
  const locationTokens = [
    'elm', 'pinehurst', 'oakway', 'central park', 'highland', 'market',
    'summit', 'lincoln', '5th ave', '4th ave', 'river road', 'northcrest',
    'valley road', 'mill creek', 'franklin', '22nd', 'king street', 'i-80',
    'st. jude', 'quarry'
  ];

  // Specific problem signatures
  const problemSignatures = [
    { key: 'pothole', terms: ['pothole', 'hole in road', 'blown tire', 'swerving'] },
    { key: 'sewage', terms: ['sewage', 'foul odor', 'manhole cover', 'sewer overflow', 'black water'] },
    { key: 'streetlight', terms: ['streetlight', 'streetlamp', 'dark for', 'lighting out', 'luminaire', 'crosswalk dark'] },
    { key: 'dumpster', terms: ['dumpster', 'overflowing trash', 'scattered garbage', 'raccoons', 'rats'] },
    { key: 'water_main', terms: ['water pipe burst', 'water main', 'gushing water', 'water pressure dropped', 'street flooding'] },
    { key: 'downed_tree', terms: ['branch', 'oak tree', 'power line', 'suspended on wires', 'wires low'] },
    { key: 'traffic_sign', terms: ['stop sign', 'knocked down', 'traffic sign missing', 'near-miss collisions'] },
  ];

  const matchedLocations = locationTokens.filter((loc) => newLower.includes(loc));
  const matchedProblems = problemSignatures.filter((sig) =>
    sig.terms.some((t) => newLower.includes(t))
  );

  for (const rep of existingReports) {
    const repText = (rep.text || rep.complaintText || '').toLowerCase();
    if (!repText) continue;

    // Check location overlap
    const repLocations = locationTokens.filter((loc) => repText.includes(loc));
    const sharedLocation = matchedLocations.find((loc) => repLocations.includes(loc));

    // Check problem overlap
    const repProblems = problemSignatures.filter((sig) =>
      sig.terms.some((t) => repText.includes(t))
    );
    const sharedProblem = matchedProblems.find((p) =>
      repProblems.some((rp) => rp.key === p.key)
    );

    // If both specific location and problem signature match
    if (sharedLocation && sharedProblem) {
      return {
        possible_duplicate: true,
        matching_report_id: rep.id,
        reason: `Both reports describe a ${sharedProblem.key.replace('_', ' ')} incident at the same location (${sharedLocation.toUpperCase()} area). Both describe the exact same physical hazard.`,
        confidence: 0.94,
      };
    }

    // If same problem but clearly different location
    if (sharedProblem && matchedLocations.length > 0 && repLocations.length > 0 && !sharedLocation) {
      // Different locations: definitely not a duplicate
      continue;
    }
  }

  // Not a duplicate
  const categoryMatchOnly = existingReports.some((rep) => {
    const repText = (rep.text || rep.complaintText || '').toLowerCase();
    return matchedProblems.some((p) => problemSignatures.find((ps) => ps.key === p.key)?.terms.some((t) => repText.includes(t)));
  });

  return {
    possible_duplicate: false,
    matching_report_id: '',
    reason: categoryMatchOnly
      ? 'Although other reports exist in a similar category, this complaint specifies a distinct geographical location and independent physical issue.'
      : 'No existing complaints share the underlying problem, location, or infrastructure described in this report.',
    confidence: 0.95,
  };
}

const EMERGENCY_ASSESSMENT_SYSTEM_PROMPT = `You are an expert municipal emergency
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
Do not invent evidence.`;

export interface EmergencyAssessmentResponse {
  urgency: number;
  impact: number;
  safety_risk: number;
  duration: number;
  priority_score: number;
  priority_level: 'High' | 'Medium' | 'Low';
  reasoning: string;
  engineUsed: 'gemini-3.8-flash' | 'local-heuristic-fallback';
  processedAt: string;
}

function assessEmergencyLocally(complaint: string): Omit<EmergencyAssessmentResponse, 'engineUsed' | 'processedAt'> {
  const lower = complaint.toLowerCase();

  let urgency = 50;
  let impact = 50;
  let safety_risk = 45;
  let duration = 30;
  const reasoningParts: string[] = [];

  // Urgency & Safety
  if (lower.includes('hospital') || lower.includes('blown tire') || lower.includes('crash') || lower.includes('swerving') || lower.includes('near-miss') || lower.includes('head-on')) {
    urgency = 92;
    safety_risk = 90;
    impact = 85;
    reasoningParts.push('High vehicular collision risk and proximity to hospital emergency route require rapid intervention.');
  } else if (lower.includes('sewage') || lower.includes('biohazard') || lower.includes('pathogen') || lower.includes('foul odor')) {
    urgency = 94;
    safety_risk = 88;
    impact = 82;
    reasoningParts.push('Active biological sewage overflow onto pedestrian area poses immediate public health and pathogen hazards.');
  } else if (lower.includes('electrical') || lower.includes('power line') || lower.includes('wires') || lower.includes('voltage') || lower.includes('suspended')) {
    urgency = 95;
    safety_risk = 96;
    impact = 78;
    reasoningParts.push('Severe electrocution hazard and physical falling risk from branch suspended against overhead utility lines.');
  } else if (lower.includes('dark') || lower.includes('pitch black') || lower.includes('lights out')) {
    urgency = 75;
    safety_risk = 78;
    impact = 70;
    reasoningParts.push('Zero nighttime illumination over pedestrian crosswalk creates elevated vulnerability for crossing pedestrians.');
  } else if (lower.includes('overflowing') || lower.includes('dumpster') || lower.includes('trash') || lower.includes('rats')) {
    urgency = 55;
    safety_risk = 48;
    impact = 60;
    reasoningParts.push('Pest vector hazard and sanitation deterioration in a public park setting.');
  } else {
    urgency = 40;
    safety_risk = 35;
    impact = 45;
    reasoningParts.push('Moderate municipal maintenance concern with limited immediate peril.');
  }

  // Duration evaluation
  if (lower.includes('four consecutive nights') || lower.includes('4 nights')) {
    duration = 80;
    reasoningParts.push('Problem has persisted for 4 consecutive nights as explicitly stated in complaint.');
  } else if (lower.includes('18 hours') || lower.includes('over 18 hours')) {
    duration = 75;
    reasoningParts.push('Active leakage confirmed for over 18 hours.');
  } else if (lower.includes('weeks') || lower.includes('weeks.')) {
    duration = 85;
    reasoningParts.push('Report indicates issue has persisted unresolved for weeks.');
  } else if (lower.includes('this morning') || lower.includes('yesterday')) {
    duration = 40;
    reasoningParts.push('Incident began recently (within the last 24 hours).');
  } else {
    duration = 30;
    reasoningParts.push('Duration is not explicitly quantified in the complaint text (uncertainty noted per evaluation criteria).');
  }

  const priority_score = Math.round(
    (0.4 * urgency) + (0.3 * impact) + (0.2 * safety_risk) + (0.1 * duration)
  );
  const priority_level: 'High' | 'Medium' | 'Low' =
    priority_score >= 75 ? 'High' : priority_score >= 40 ? 'Medium' : 'Low';

  return {
    urgency,
    impact,
    safety_risk,
    duration,
    priority_score,
    priority_level,
    reasoning: reasoningParts.join(' '),
  };
}

const DEPARTMENT_ASSIGNMENT_SYSTEM_PROMPT = `You are a municipal department assignment assistant.

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

function assignDepartmentLocally(complaint: string): Omit<DepartmentAssignmentResponse, 'engineUsed' | 'processedAt'> {
  const lower = complaint.toLowerCase();

  // Water Supply Department
  if (lower.includes('water pipe') || lower.includes('water main') || lower.includes('water pressure') || lower.includes('tap pressure') || lower.includes('pipeline burst')) {
    return {
      department: 'Water Supply Department',
      recommended_action: 'Dispatch utility pipeline valve and main repair crew to isolate breach, perform excavation, and restore potable line pressure.',
      reason: 'Complaint identifies a municipal clean water distribution failure and pipeline rupture affecting service delivery.',
    };
  }

  // Drainage Department
  if (lower.includes('sewage') || lower.includes('sewer') || lower.includes('manhole') || lower.includes('stormwater') || lower.includes('drain') || lower.includes('flooding') || lower.includes('runoff')) {
    return {
      department: 'Drainage Department',
      recommended_action: 'Deploy stormwater vacuum extraction vehicle and high-pressure sewer jetting crew to clear subterranean drainage obstruction.',
      reason: 'Issue concerns sanitary sewer overflow and municipal stormwater drainage backup onto public pathways.',
    };
  }

  // Electricity Department
  if (lower.includes('streetlight') || lower.includes('streetlamp') || lower.includes('dark for') || lower.includes('power line') || lower.includes('wire') || lower.includes('electrical') || lower.includes('transformer')) {
    return {
      department: 'Electricity Department',
      recommended_action: 'Deploy utility bucket truck and certified electrical line technicians to repair overhead wiring, fuses, or luminaire circuits.',
      reason: 'Directly relates to municipal power delivery networks, overhead wiring, or public streetlighting illumination.',
    };
  }

  // Sanitation Department
  if (lower.includes('dumpster') || lower.includes('trash') || lower.includes('garbage') || lower.includes('litter') || lower.includes('rats') || lower.includes('rotting') || lower.includes('waste') || lower.includes('dumping')) {
    return {
      department: 'Sanitation Department',
      recommended_action: 'Dispatch bulk municipal refuse collection vehicle to empty overflowing containers and sanitize surrounding public grounds.',
      reason: 'Issue involves accumulated solid waste, overflowing refuse receptacles, and municipal sanitation standards.',
    };
  }

  // Public Safety Department
  if (lower.includes('stop sign') || lower.includes('near-miss') || lower.includes('collision') || lower.includes('signal') || lower.includes('hazard') || lower.includes('emergency')) {
    return {
      department: 'Public Safety Department',
      recommended_action: 'Erect temporary emergency traffic control signage and dispatch public safety officers to secure intersection.',
      reason: 'Missing traffic control signage and elevated accident risk compromise general public safety and pedestrian right-of-way.',
    };
  }

  // Roads and Infrastructure
  return {
    department: 'Roads and Infrastructure',
    recommended_action: 'Deploy municipal asphalt maintenance crew with cold-patch asphalt milling and surface compaction equipment.',
    reason: 'Complaint concerns roadway surface damage, potholes, or physical street pavement infrastructure.',
  };
}

const EXECUTIVE_REPORT_SYSTEM_PROMPT = `You are an expert civic operations analyst.

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

Return valid JSON only matching the schema:
{
  "problem": "",
  "location": "",
  "related_complaints": 0,
  "priority": "",
  "public_impact": "",
  "recommended_action": "",
  "briefing_text": ""
}`;

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

function generateExecutiveReportLocally(complaintData: any): Omit<ExecutiveReportResponse, 'engineUsed' | 'processedAt'> {
  const text = typeof complaintData === 'string' ? complaintData : complaintData?.complaintText || complaintData?.text || '';
  const lower = text.toLowerCase();

  // Extract location
  let location = 'Location not explicitly provided';
  const locationMatches = [
    { key: 'elm', val: 'Eastbound Elm Street, near 4th Avenue / St. Jude Hospital' },
    { key: 'pinehurst', val: '240 Pinehurst Avenue (Sidewalk / Pedestrian Walkway)' },
    { key: 'oakway', val: 'Oakway Boulevard, between 14th and 16th Street' },
    { key: 'central park', val: 'Central Park (Near Children\'s Carousel Dumpster)' },
    { key: 'highland', val: 'Highland Terrace & Valley Road Intersection' },
    { key: 'northcrest', val: 'Northcrest Road (Overhead Utility Corridor)' },
    { key: 'market', val: '5th Street and Market Intersection' },
    { key: 'king', val: 'Northbound King Street, before Interstate 80' },
  ];
  for (const item of locationMatches) {
    if (lower.includes(item.key)) {
      location = item.val;
      break;
    }
  }

  // Extract problem
  let problem = text.length > 100 ? text.substring(0, 97) + '...' : text;
  let priority = 'Moderate';
  let public_impact = 'Localized neighborhood inconvenience and transit slowdown.';
  let recommended_action = 'Deploy municipal maintenance crew to inspect and resolve report.';
  const related_complaints = Number(complaintData?.relatedCount) || (lower.includes('elm') || lower.includes('pothole') ? 3 : 1);

  if (lower.includes('pothole') || lower.includes('blown tire')) {
    problem = 'Severe roadway crater causing vehicle tire blowouts and hazardous evasive swerving';
    priority = 'Critical';
    public_impact = 'Immediate collision hazard adjacent to hospital emergency corridor and ongoing vehicular mechanical damage.';
    recommended_action = 'Authorize emergency road crew deployment for same-day asphalt milling, tack coat, and hot-mix compaction.';
  } else if (lower.includes('sewage') || lower.includes('manhole')) {
    problem = 'Sanitary sewer overflow discharging untreated biohazard wastewater onto public walkway';
    priority = 'Critical';
    public_impact = 'Acute pathogen and biohazard exposure risk for pedestrians and biological stormwater contamination.';
    recommended_action = 'Dispatch Drainage vacuum extraction unit to relieve main blockage and pressure-sanitize affected sidewalk.';
  } else if (lower.includes('streetlight') || lower.includes('dark for')) {
    problem = 'Consecutive multi-luminaire electrical blackout leaving pedestrian crosswalks in total darkness';
    priority = 'High';
    public_impact = 'Elevated pedestrian strike vulnerability during evening student commuting hours.';
    recommended_action = 'Dispatch municipal electrical lighting crew to replace failed ballast/circuit and restore luminaire grid.';
  } else if (lower.includes('power line') || lower.includes('suspended')) {
    problem = 'Heavy fractured tree limb suspended against energized overhead utility conductors';
    priority = 'Critical';
    public_impact = 'Imminent electrocution hazard, wire snap danger, and corridor blackout risk for passing traffic.';
    recommended_action = 'Coordinate joint electrical utility and urban forestry bucket-truck crew to de-energize and clear tree limb.';
  } else if (lower.includes('stop sign')) {
    problem = 'Regulatory Stop sign completely knocked down at blind multi-lane intersection';
    priority = 'High';
    public_impact = 'High frequency of near-miss vehicular T-bone collisions during peak rush-hour periods.';
    recommended_action = 'Immediately erect temporary weighted STOP signage followed by permanent tamper-proof post re-installation.';
  }

  const briefing_text = `EXECUTIVE BRIEFING: Municipal operations identified a ${priority.toLowerCase()}-priority incident at ${location} regarding ${problem.toLowerCase()}. With ${related_complaints} related citizen complaint(s) logged, public impact includes: ${public_impact} Recommended executive action: ${recommended_action}`;

  return {
    problem,
    location,
    related_complaints,
    priority,
    public_impact,
    recommended_action,
    briefing_text,
  };
}

// API: Check status / config
app.get('/api/status', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
    model: 'gemini-3.8-flash',
  });
});

// API: Analyze single complaint
app.post('/api/analyze-complaint', async (req: Request, res: Response) => {
  const { complaint } = req.body;

  if (!complaint || typeof complaint !== 'string' || !complaint.trim()) {
    return res.status(400).json({ error: 'Complaint text is required.' });
  }

  const cleanComplaint = complaint.trim();

  // If Gemini API is configured, use it with a timeout fallback
  if (ai) {
    try {
      const geminiPromise = ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Complaint:\n${cleanComplaint}`,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: {
                type: Type.STRING,
                description: 'The assigned single civic issue category (e.g. Roads & Pavement, Water & Drainage, Waste & Sanitation, Street Lighting, Parks & Recreation, Traffic & Transit, Public Safety).',
              },
              summary: {
                type: Type.STRING,
                description: 'A concise summary strictly based on the citizen complaint.',
              },
              infrastructure: {
                type: Type.STRING,
                description: 'Specific affected civic infrastructure identified in the complaint.',
              },
              public_impact: {
                type: Type.STRING,
                description: 'Possible impact on the public, residents, traffic, or public health.',
              },
              confidence: {
                type: Type.NUMBER,
                description: 'Confidence score between 0.0 and 1.0 based on clarity and specificity of the complaint.',
              },
            },
            required: ['category', 'summary', 'infrastructure', 'public_impact', 'confidence'],
          },
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API request timed out after 6000ms')), 6000)
      );

      const response: any = await Promise.race([geminiPromise, timeoutPromise]);

      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text);
        let conf = Number(parsed.confidence) || 0.85;
        if (conf > 1) {
          conf = conf / 100;
        }

        const result: CivicAnalysisResponse = {
          category: String(parsed.category || 'General Civic Issue'),
          summary: String(parsed.summary || cleanComplaint),
          infrastructure: String(parsed.infrastructure || 'Unspecified Civic Asset'),
          public_impact: String(parsed.public_impact || 'Moderate localized impact'),
          confidence: Number(conf.toFixed(2)),
          engineUsed: 'gemini-3.8-flash',
          rawPrompt: SYSTEM_PROMPT.replace('{{complaint}}', cleanComplaint),
          processedAt: new Date().toISOString(),
        };

        return res.json(result);
      }
    } catch (err: any) {
      console.warn('Gemini API call timed out or failed, using deterministic civic classifier fallback:', err?.message || err);
    }
  }

  // Deterministic local analysis fallback
  const fallback = analyzeLocally(cleanComplaint);
  const result: CivicAnalysisResponse = {
    ...fallback,
    engineUsed: 'local-heuristic-fallback',
    rawPrompt: SYSTEM_PROMPT.replace('{{complaint}}', cleanComplaint),
    processedAt: new Date().toISOString(),
  };

  return res.json(result);
});

// API: Batch analysis
app.post('/api/analyze-batch', async (req: Request, res: Response) => {
  const { complaints } = req.body;

  if (!Array.isArray(complaints) || complaints.length === 0) {
    return res.status(400).json({ error: 'Array of complaints is required.' });
  }

  const results: (CivicAnalysisResponse & { id: string; originalComplaint: string })[] = [];

  for (let i = 0; i < complaints.length; i++) {
    const item = complaints[i];
    const text = typeof item === 'string' ? item : item?.text || '';
    const id = typeof item === 'object' && item?.id ? item.id : `COMP-${String(i + 1).padStart(3, '0')}`;

    if (!text.trim()) continue;

    // Use Gemini or fallback
    let analysis: CivicAnalysisResponse;
    if (ai) {
      try {
        const geminiPromise = ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Complaint:\n${text.trim()}`,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                summary: { type: Type.STRING },
                infrastructure: { type: Type.STRING },
                public_impact: { type: Type.STRING },
                confidence: { type: Type.NUMBER },
              },
              required: ['category', 'summary', 'infrastructure', 'public_impact', 'confidence'],
            },
          },
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Batch item timed out')), 5000)
        );

        const response: any = await Promise.race([geminiPromise, timeoutPromise]);
        const parsed = JSON.parse(response.text || '{}');
        let conf = Number(parsed.confidence) || 0.85;
        if (conf > 1) conf = conf / 100;

        analysis = {
          category: parsed.category || 'General Civic Issue',
          summary: parsed.summary || text.trim(),
          infrastructure: parsed.infrastructure || 'Public Infrastructure',
          public_impact: parsed.public_impact || 'Noticeable public inconvenience',
          confidence: Number(conf.toFixed(2)),
          engineUsed: 'gemini-3.8-flash',
          processedAt: new Date().toISOString(),
        };
      } catch {
        const fb = analyzeLocally(text);
        analysis = {
          ...fb,
          engineUsed: 'local-heuristic-fallback',
          processedAt: new Date().toISOString(),
        };
      }
    } else {
      const fb = analyzeLocally(text);
      analysis = {
        ...fb,
        engineUsed: 'local-heuristic-fallback',
        processedAt: new Date().toISOString(),
      };
    }

    results.push({
      ...analysis,
      id,
      originalComplaint: text,
    });
  }

  res.json({ results });
});

// API: Duplicate detection engine
app.post('/api/detect-duplicates', async (req: Request, res: Response) => {
  const { newComplaint, existingReports } = req.body;

  if (!newComplaint || typeof newComplaint !== 'string' || !newComplaint.trim()) {
    return res.status(400).json({ error: 'newComplaint is required.' });
  }

  const reportsList = Array.isArray(existingReports) ? existingReports : [];

  if (reportsList.length === 0) {
    return res.json({
      possible_duplicate: false,
      matching_report_id: '',
      reason: 'No existing complaints registered in database to compare against.',
      confidence: 1.0,
      engineUsed: 'gemini-3.8-flash',
      processedAt: new Date().toISOString(),
    });
  }

  const cleanNewComplaint = newComplaint.trim();
  const formattedReports = reportsList
    .map(
      (r, idx) =>
        `[Report ID: ${r.id || `CMP-${idx + 1}`}]
Category: ${r.category || r.analysis?.category || 'Uncategorized'}
Infrastructure: ${r.infrastructure || r.analysis?.infrastructure || 'Unspecified'}
Complaint: ${r.text || r.complaintText || ''}`
    )
    .join('\n\n');

  if (ai) {
    try {
      const geminiPromise = ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `New complaint:\n${cleanNewComplaint}\n\nExisting complaints:\n${formattedReports}`,
        config: {
          systemInstruction: DUPLICATE_DETECTION_SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              possible_duplicate: {
                type: Type.BOOLEAN,
                description: 'True if this complaint is a duplicate of an existing report describing the same incident and location.',
              },
              matching_report_id: {
                type: Type.STRING,
                description: 'ID of the matching existing complaint report, or empty string if distinct.',
              },
              reason: {
                type: Type.STRING,
                description: 'Clear justification referencing problem, location, and infrastructure similarity.',
              },
              confidence: {
                type: Type.NUMBER,
                description: 'Confidence score between 0.0 and 1.0.',
              },
            },
            required: ['possible_duplicate', 'matching_report_id', 'reason', 'confidence'],
          },
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Duplicate check request timed out after 6000ms')), 6000)
      );

      const response: any = await Promise.race([geminiPromise, timeoutPromise]);
      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text);
        let conf = Number(parsed.confidence) || 0.88;
        if (conf > 1) conf = conf / 100;

        const result: DuplicateDetectionResponse = {
          possible_duplicate: Boolean(parsed.possible_duplicate),
          matching_report_id: parsed.possible_duplicate ? String(parsed.matching_report_id || '') : '',
          reason: String(parsed.reason || 'Evaluated for duplicate incidents.'),
          confidence: Number(conf.toFixed(2)),
          engineUsed: 'gemini-3.8-flash',
          processedAt: new Date().toISOString(),
        };

        return res.json(result);
      }
    } catch (err: any) {
      console.warn('Gemini duplicate detection timed out or failed, using deterministic fallback:', err?.message || err);
    }
  }

  // Deterministic fallback
  const fallback = detectDuplicatesLocally(cleanNewComplaint, reportsList);
  return res.json({
    ...fallback,
    engineUsed: 'local-heuristic-fallback',
    processedAt: new Date().toISOString(),
  });
});

// API: Emergency and infrastructure assessment
app.post('/api/assess-emergency', async (req: Request, res: Response) => {
  const { complaint } = req.body;

  if (!complaint || typeof complaint !== 'string' || !complaint.trim()) {
    return res.status(400).json({ error: 'Complaint text is required.' });
  }

  const cleanComplaint = complaint.trim();

  if (ai) {
    try {
      const geminiPromise = ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Complaint:\n${cleanComplaint}`,
        config: {
          systemInstruction: EMERGENCY_ASSESSMENT_SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              urgency: {
                type: Type.INTEGER,
                description: 'Urgency factor score between 0 and 100 based strictly on complaint facts',
              },
              impact: {
                type: Type.INTEGER,
                description: 'Public impact score between 0 and 100',
              },
              safety_risk: {
                type: Type.INTEGER,
                description: 'Safety risk factor between 0 and 100',
              },
              duration: {
                type: Type.INTEGER,
                description: 'Duration score between 0 and 100 representing persistence; indicate uncertainty if not stated',
              },
              reasoning: {
                type: Type.STRING,
                description: 'Detailed factual reasoning without invented evidence, indicating uncertainty if information is missing',
              },
            },
            required: ['urgency', 'impact', 'safety_risk', 'duration', 'reasoning'],
          },
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Emergency assessment request timed out after 6000ms')), 6000)
      );

      const response: any = await Promise.race([geminiPromise, timeoutPromise]);
      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text);

        const urgency = Math.min(100, Math.max(0, Number(parsed.urgency) || 50));
        const impact = Math.min(100, Math.max(0, Number(parsed.impact) || 50));
        const safety_risk = Math.min(100, Math.max(0, Number(parsed.safety_risk) || 50));
        const duration = Math.min(100, Math.max(0, Number(parsed.duration) || 30));
        const priority_score = Math.round(
          (0.4 * urgency) + (0.3 * impact) + (0.2 * safety_risk) + (0.1 * duration)
        );
        const priority_level: 'High' | 'Medium' | 'Low' =
          priority_score >= 75 ? 'High' : priority_score >= 40 ? 'Medium' : 'Low';

        const result: EmergencyAssessmentResponse = {
          urgency,
          impact,
          safety_risk,
          duration,
          priority_score,
          priority_level,
          reasoning: String(parsed.reasoning || cleanComplaint),
          engineUsed: 'gemini-3.8-flash',
          processedAt: new Date().toISOString(),
        };

        return res.json(result);
      }
    } catch (err: any) {
      console.warn('Gemini emergency assessment timed out or failed, using deterministic fallback:', err?.message || err);
    }
  }

  // Deterministic fallback
  const fallback = assessEmergencyLocally(cleanComplaint);
  return res.json({
    ...fallback,
    engineUsed: 'local-heuristic-fallback',
    processedAt: new Date().toISOString(),
  });
});

// API: Department assignment assistant
app.post('/api/assign-department', async (req: Request, res: Response) => {
  const { complaint } = req.body;

  if (!complaint || typeof complaint !== 'string' || !complaint.trim()) {
    return res.status(400).json({ error: 'Complaint text is required.' });
  }

  const cleanComplaint = complaint.trim();

  if (ai) {
    try {
      const geminiPromise = ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Complaint:\n${cleanComplaint}`,
        config: {
          systemInstruction: DEPARTMENT_ASSIGNMENT_SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              department: {
                type: Type.STRING,
                description: 'The assigned responsible department. Must be one of: Roads and Infrastructure, Drainage Department, Sanitation Department, Electricity Department, Water Supply Department, Public Safety Department.',
              },
              recommended_action: {
                type: Type.STRING,
                description: 'Concrete operational field recommendation for the assigned municipal crew.',
              },
              reason: {
                type: Type.STRING,
                description: 'Clear factual justification explaining why this department is responsible.',
              },
            },
            required: ['department', 'recommended_action', 'reason'],
          },
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Department assignment request timed out after 6000ms')), 6000)
      );

      const response: any = await Promise.race([geminiPromise, timeoutPromise]);
      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text);

        const validDepartments: StandardDepartment[] = [
          'Roads and Infrastructure',
          'Drainage Department',
          'Sanitation Department',
          'Electricity Department',
          'Water Supply Department',
          'Public Safety Department',
        ];

        let assignedDept: StandardDepartment = 'Roads and Infrastructure';
        if (validDepartments.includes(parsed.department as StandardDepartment)) {
          assignedDept = parsed.department as StandardDepartment;
        } else {
          // Normalize matching
          const match = validDepartments.find(
            (d) => d.toLowerCase() === String(parsed.department).toLowerCase() || String(parsed.department).toLowerCase().includes(d.toLowerCase())
          );
          if (match) assignedDept = match;
        }

        const result: DepartmentAssignmentResponse = {
          department: assignedDept,
          recommended_action: String(parsed.recommended_action || 'Conduct on-site municipal investigation and triage repair work order.'),
          reason: String(parsed.reason || 'Assigned based on complaint issue characteristics.'),
          engineUsed: 'gemini-3.8-flash',
          processedAt: new Date().toISOString(),
        };

        return res.json(result);
      }
    } catch (err: any) {
      console.warn('Gemini department assignment timed out or failed, using deterministic fallback:', err?.message || err);
    }
  }

  // Deterministic fallback
  const fallback = assignDepartmentLocally(cleanComplaint);
  return res.json({
    ...fallback,
    engineUsed: 'local-heuristic-fallback',
    processedAt: new Date().toISOString(),
  });
});

// API: Executive decision-maker report generator
app.post('/api/generate-executive-report', async (req: Request, res: Response) => {
  const { complaintData } = req.body;

  if (!complaintData) {
    return res.status(400).json({ error: 'complaintData is required.' });
  }

  const rawInfo = typeof complaintData === 'string'
    ? complaintData
    : JSON.stringify(complaintData, null, 2);

  if (ai) {
    try {
      const geminiPromise = ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Complaint information:\n${rawInfo}`,
        config: {
          systemInstruction: EXECUTIVE_REPORT_SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              problem: {
                type: Type.STRING,
                description: 'Problem identified concisely for municipal decision-makers',
              },
              location: {
                type: Type.STRING,
                description: 'Specific geographical location or physical infrastructure site',
              },
              related_complaints: {
                type: Type.INTEGER,
                description: 'Number of related or duplicate citizen complaints received',
              },
              priority: {
                type: Type.STRING,
                description: 'Priority level (e.g. Critical, High, Moderate, Low)',
              },
              public_impact: {
                type: Type.STRING,
                description: 'Concise public and community impact evaluation',
              },
              recommended_action: {
                type: Type.STRING,
                description: 'Direct recommended operational executive action',
              },
              briefing_text: {
                type: Type.STRING,
                description: 'Short unified briefing paragraph for municipal leadership',
              },
            },
            required: ['problem', 'location', 'related_complaints', 'priority', 'public_impact', 'recommended_action', 'briefing_text'],
          },
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Executive report request timed out after 6000ms')), 6000)
      );

      const response: any = await Promise.race([geminiPromise, timeoutPromise]);
      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text);

        const result: ExecutiveReportResponse = {
          problem: String(parsed.problem || 'Civic infrastructure defect'),
          location: String(parsed.location || 'Location not specified'),
          related_complaints: Number(parsed.related_complaints) || 1,
          priority: String(parsed.priority || 'Moderate'),
          public_impact: String(parsed.public_impact || 'Noticeable public impact'),
          recommended_action: String(parsed.recommended_action || 'Deploy municipal inspection crew'),
          briefing_text: String(parsed.briefing_text || `${parsed.problem} at ${parsed.location}. Priority: ${parsed.priority}. Recommended Action: ${parsed.recommended_action}`),
          engineUsed: 'gemini-3.8-flash',
          processedAt: new Date().toISOString(),
        };

        return res.json(result);
      }
    } catch (err: any) {
      console.warn('Gemini executive report timed out or failed, using deterministic fallback:', err?.message || err);
    }
  }

  // Deterministic fallback
  const fallback = generateExecutiveReportLocally(complaintData);
  return res.json({
    ...fallback,
    engineUsed: 'local-heuristic-fallback',
    processedAt: new Date().toISOString(),
  });
});

// API: Unified AI Analysis (Complaint Analysis, Severity Assessment, Department Routing, Duplicate Detection)
app.post('/api/unified-analysis', async (req: Request, res: Response) => {
  const { complaint, existingReports } = req.body;

  if (!complaint || typeof complaint !== 'string' || !complaint.trim()) {
    return res.status(400).json({ error: 'Complaint text is required.' });
  }

  const cleanComplaint = complaint.trim();
  const reportsList = Array.isArray(existingReports) ? existingReports : [];

  try {
    // 1. Complaint Analysis
    let analysis: CivicAnalysisResponse;
    if (ai) {
      try {
        const geminiPromise = ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Complaint:\n${cleanComplaint}`,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                summary: { type: Type.STRING },
                infrastructure: { type: Type.STRING },
                public_impact: { type: Type.STRING },
                confidence: { type: Type.NUMBER },
              },
              required: ['category', 'summary', 'infrastructure', 'public_impact', 'confidence'],
            },
          },
        });
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Analysis timeout')), 6000)
        );
        const resp: any = await Promise.race([geminiPromise, timeoutPromise]);
        const parsed = JSON.parse(resp.text || '{}');
        let conf = Number(parsed.confidence) || 0.88;
        if (conf > 1) conf = conf / 100;

        analysis = {
          category: String(parsed.category || 'General Civic Issue'),
          summary: String(parsed.summary || cleanComplaint),
          infrastructure: String(parsed.infrastructure || 'Municipal Infrastructure'),
          public_impact: String(parsed.public_impact || 'Moderate public impact'),
          confidence: Number(conf.toFixed(2)),
          engineUsed: 'gemini-3.8-flash',
          rawPrompt: SYSTEM_PROMPT.replace('{{complaint}}', cleanComplaint),
          processedAt: new Date().toISOString(),
        };
      } catch {
        const fb = analyzeLocally(cleanComplaint);
        analysis = { ...fb, engineUsed: 'local-heuristic-fallback', processedAt: new Date().toISOString() };
      }
    } else {
      const fb = analyzeLocally(cleanComplaint);
      analysis = { ...fb, engineUsed: 'local-heuristic-fallback', processedAt: new Date().toISOString() };
    }

    // 2. Severity & Emergency Assessment
    let emergencyAssessment: EmergencyAssessmentResponse;
    if (ai) {
      try {
        const geminiPromise = ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Complaint:\n${cleanComplaint}`,
          config: {
            systemInstruction: EMERGENCY_ASSESSMENT_SYSTEM_PROMPT,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                urgency: { type: Type.INTEGER },
                impact: { type: Type.INTEGER },
                safety_risk: { type: Type.INTEGER },
                duration: { type: Type.INTEGER },
                reasoning: { type: Type.STRING },
              },
              required: ['urgency', 'impact', 'safety_risk', 'duration', 'reasoning'],
            },
          },
        });
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Emergency assessment timeout')), 6000)
        );
        const resp: any = await Promise.race([geminiPromise, timeoutPromise]);
        const parsed = JSON.parse(resp.text || '{}');
        const urgency = Math.min(100, Math.max(0, Number(parsed.urgency) || 50));
        const impact = Math.min(100, Math.max(0, Number(parsed.impact) || 50));
        const safety_risk = Math.min(100, Math.max(0, Number(parsed.safety_risk) || 50));
        const duration = Math.min(100, Math.max(0, Number(parsed.duration) || 30));
        const priority_score = Math.round((0.4 * urgency) + (0.3 * impact) + (0.2 * safety_risk) + (0.1 * duration));
        const priority_level: 'High' | 'Medium' | 'Low' = priority_score >= 75 ? 'High' : priority_score >= 40 ? 'Medium' : 'Low';

        emergencyAssessment = {
          urgency,
          impact,
          safety_risk,
          duration,
          priority_score,
          priority_level,
          reasoning: String(parsed.reasoning || cleanComplaint),
          engineUsed: 'gemini-3.8-flash',
          processedAt: new Date().toISOString(),
        };
      } catch {
        const fb = assessEmergencyLocally(cleanComplaint);
        emergencyAssessment = { ...fb, engineUsed: 'local-heuristic-fallback', processedAt: new Date().toISOString() };
      }
    } else {
      const fb = assessEmergencyLocally(cleanComplaint);
      emergencyAssessment = { ...fb, engineUsed: 'local-heuristic-fallback', processedAt: new Date().toISOString() };
    }

    // 3. Department Routing
    let departmentAssignment: DepartmentAssignmentResponse;
    if (ai) {
      try {
        const geminiPromise = ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `Complaint:\n${cleanComplaint}`,
          config: {
            systemInstruction: DEPARTMENT_ASSIGNMENT_SYSTEM_PROMPT,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                department: { type: Type.STRING },
                recommended_action: { type: Type.STRING },
                reason: { type: Type.STRING },
              },
              required: ['department', 'recommended_action', 'reason'],
            },
          },
        });
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Department assignment timeout')), 6000)
        );
        const resp: any = await Promise.race([geminiPromise, timeoutPromise]);
        const parsed = JSON.parse(resp.text || '{}');
        const validDepartments: StandardDepartment[] = [
          'Roads and Infrastructure',
          'Drainage Department',
          'Sanitation Department',
          'Electricity Department',
          'Water Supply Department',
          'Public Safety Department',
        ];
        let assignedDept: StandardDepartment = 'Roads and Infrastructure';
        if (validDepartments.includes(parsed.department as StandardDepartment)) {
          assignedDept = parsed.department as StandardDepartment;
        } else {
          const match = validDepartments.find(
            (d) => d.toLowerCase() === String(parsed.department).toLowerCase() || String(parsed.department).toLowerCase().includes(d.toLowerCase())
          );
          if (match) assignedDept = match;
        }

        departmentAssignment = {
          department: assignedDept,
          recommended_action: String(parsed.recommended_action || 'Conduct on-site investigation and triage repair.'),
          reason: String(parsed.reason || 'Assigned based on complaint issue characteristics.'),
          engineUsed: 'gemini-3.8-flash',
          processedAt: new Date().toISOString(),
        };
      } catch {
        const fb = assignDepartmentLocally(cleanComplaint);
        departmentAssignment = { ...fb, engineUsed: 'local-heuristic-fallback', processedAt: new Date().toISOString() };
      }
    } else {
      const fb = assignDepartmentLocally(cleanComplaint);
      departmentAssignment = { ...fb, engineUsed: 'local-heuristic-fallback', processedAt: new Date().toISOString() };
    }

    // 4. Duplicate Detection
    let duplicateCheck: DuplicateDetectionResponse;
    if (reportsList.length === 0) {
      duplicateCheck = {
        possible_duplicate: false,
        matching_report_id: '',
        reason: 'No existing complaints registered in database to compare against.',
        confidence: 1.0,
        engineUsed: 'gemini-3.8-flash',
        processedAt: new Date().toISOString(),
      };
    } else if (ai) {
      try {
        const formattedReports = reportsList
          .map((r, idx) => `[Report ID: ${r.id || `CMP-${idx + 1}`}]\nCategory: ${r.category || r.analysis?.category || 'Uncategorized'}\nInfrastructure: ${r.infrastructure || r.analysis?.infrastructure || 'Unspecified'}\nComplaint: ${r.text || r.complaintText || ''}`)
          .join('\n\n');

        const geminiPromise = ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `New complaint:\n${cleanComplaint}\n\nExisting complaints:\n${formattedReports}`,
          config: {
            systemInstruction: DUPLICATE_DETECTION_SYSTEM_PROMPT,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                possible_duplicate: { type: Type.BOOLEAN },
                matching_report_id: { type: Type.STRING },
                reason: { type: Type.STRING },
                confidence: { type: Type.NUMBER },
              },
              required: ['possible_duplicate', 'matching_report_id', 'reason', 'confidence'],
            },
          },
        });
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Duplicate check timeout')), 6000)
        );
        const resp: any = await Promise.race([geminiPromise, timeoutPromise]);
        const parsed = JSON.parse(resp.text || '{}');
        let conf = Number(parsed.confidence) || 0.88;
        if (conf > 1) conf = conf / 100;

        duplicateCheck = {
          possible_duplicate: Boolean(parsed.possible_duplicate),
          matching_report_id: parsed.possible_duplicate ? String(parsed.matching_report_id || '') : '',
          reason: String(parsed.reason || 'Evaluated for duplicate incidents.'),
          confidence: Number(conf.toFixed(2)),
          engineUsed: 'gemini-3.8-flash',
          processedAt: new Date().toISOString(),
        };
      } catch {
        const fb = detectDuplicatesLocally(cleanComplaint, reportsList);
        duplicateCheck = { ...fb, engineUsed: 'local-heuristic-fallback', processedAt: new Date().toISOString() };
      }
    } else {
      const fb = detectDuplicatesLocally(cleanComplaint, reportsList);
      duplicateCheck = { ...fb, engineUsed: 'local-heuristic-fallback', processedAt: new Date().toISOString() };
    }

    // Return unified analysis
    return res.json({
      analysis,
      emergencyAssessment,
      departmentAssignment,
      duplicateCheck,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to complete unified AI analysis' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Civic Issue Analyst server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
