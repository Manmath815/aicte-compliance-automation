export type UserRole = 'SUPER_ADMIN' | 'INSTITUTION_ADMIN' | 'COMPLIANCE_OFFICER' | 'REVIEWER';

export type ApplicationStage =
  | 'DRAFT'
  | 'DOCUMENT_COLLECTION'
  | 'AUTOMATED_VALIDATION'
  | 'OFFICER_REVIEW'
  | 'CORRECTIONS_REQUIRED'
  | 'INTERNAL_APPROVAL'
  | 'READY_FOR_SUBMISSION'
  | 'SUBMITTED_MANUAL'
  | 'EXTERNAL_DECISION_RECORDED';

export type DocumentCategory =
  | 'LAND_AND_BUILDING'
  | 'FACULTY_AND_STAFF'
  | 'AFFILIATION_AND_ACCREDITATION'
  | 'FIRE_AND_SAFETY'
  | 'FINANCIAL_AND_AUDIT'
  | 'GOVERNING_BODY'
  | 'STUDENT_AMENITIES';

export type DocumentVerificationStatus =
  | 'PENDING'
  | 'VERIFIED'
  | 'CORRECTION_REQUESTED'
  | 'REJECTED'
  | 'OUTDATED';

export type ComplianceRuleStatus =
  | 'COMPLIANT'
  | 'INCOMPLETE'
  | 'NON_COMPLIANT'
  | 'UNDER_REVIEW'
  | 'NOT_APPLICABLE'
  | 'OUTDATED_EVIDENCE';

export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'WARNING' | 'MEDIUM' | 'LOW' | 'INFO';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'ESCALATED';

export type AlertStatus = 'UNREAD' | 'READ' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface User {
  id: number;
  email: string;
  full_name: string;
  designation?: string;
  role: UserRole;
  phone?: string;
  institution_id?: number;
  is_active: boolean;
  created_at: string;
}

export interface Institution {
  id: number;
  name: string;
  aicte_id: string;
  institution_type: string;
  state: string;
  city: string;
  address?: string;
  contact_email: string;
  contact_phone: string;
  approval_category: string;
  active_academic_year: string;
  is_active: boolean;
  created_at: string;
}

export interface AcademicYear {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

export interface Application {
  id: number;
  institution_id: number;
  academic_year_id: number;
  application_type: string;
  current_stage: ApplicationStage;
  priority: SeverityLevel;
  target_deadline: string;
  submission_ref_number?: string;
  submission_date?: string;
  external_decision?: string;
  external_decision_date?: string;
  external_decision_remarks?: string;
  created_by_user_id: number;
  assigned_officer_id?: number;
  assigned_reviewer_id?: number;
  created_at: string;
  updated_at: string;
  institution_name?: string;
  academic_year_name?: string;
  assigned_officer_name?: string;
  assigned_reviewer_name?: string;
  documents_count?: number;
  compliance_score?: number;
}

export interface ApplicationTimelineEvent {
  id: number;
  application_id: number;
  from_stage: ApplicationStage;
  to_stage: ApplicationStage;
  action_by_user_id: number;
  user_name?: string;
  user_role?: string;
  comments?: string;
  created_at: string;
}

export interface ExtractedDocumentField {
  id: number;
  document_id: number;
  field_name: string;
  extracted_value: string;
  confidence_score: number;
  source_page: number;
  raw_snippet?: string;
  is_verified: boolean;
  corrected_value?: string;
}

export interface DocumentItem {
  id: number;
  application_id: number;
  institution_id: number;
  category: DocumentCategory;
  title: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  sha256_hash: string;
  version: number;
  is_current_version: boolean;
  verification_status: DocumentVerificationStatus;
  verified_by_user_id?: number;
  verified_at?: string;
  verification_notes?: string;
  ocr_status: string;
  ocr_confidence: number;
  ocr_text?: string;
  expiry_date?: string;
  uploaded_by_user_id: number;
  created_at: string;
  extracted_fields: ExtractedDocumentField[];
}

export interface ComplianceRule {
  id: number;
  rule_code: string;
  version: string;
  title: string;
  category: DocumentCategory;
  description: string;
  applicable_institution_types: string[];
  required_document_categories: string[];
  validation_method: string;
  severity: SeverityLevel;
  official_source_title: string;
  official_source_section: string;
  official_source_url: string;
  is_verified_rule: boolean;
}

export interface RemediationTask {
  id: number;
  assessment_id?: number;
  application_id: number;
  institution_id: number;
  title: string;
  description: string;
  priority: SeverityLevel;
  due_date: string;
  status: TaskStatus;
  assigned_to_user_id?: number;
  assigned_to_name?: string;
  created_by_user_id: number;
  resolution_notes?: string;
  resolved_at?: string;
  created_at: string;
}

export interface ComplianceAssessment {
  id: number;
  application_id: number;
  rule_id: number;
  rule: ComplianceRule;
  status: ComplianceRuleStatus;
  score: number;
  findings?: string;
  evidence_document_id?: number;
  evidence_document_title?: string;
  evaluated_at: string;
  evaluated_by_system: boolean;
  override_reason?: string;
  remediation_tasks: RemediationTask[];
}

export interface RankedIssue {
  title: string;
  severity: string;
  rule_code?: string;
  impact_score: number;
  description: string;
  suggested_action: string;
}

export interface RiskAssessment {
  id: number;
  application_id: number;
  institution_id: number;
  overall_score: number;
  risk_level: RiskLevel;
  missing_docs_score: number;
  overdue_tasks_score: number;
  expiring_docs_score: number;
  non_compliance_score: number;
  ranked_issues: RankedIssue[];
  suggested_actions: string[];
  computed_at: string;
}

export interface AlertItem {
  id: number;
  institution_id: number;
  application_id?: number;
  alert_type: string;
  severity: SeverityLevel;
  title: string;
  message: string;
  target_role?: UserRole;
  status: AlertStatus;
  trigger_date: string;
  due_date?: string;
  acknowledged_at?: string;
  email_sent: boolean;
  created_at: string;
}

export interface Citation {
  source_title: string;
  section_number: string;
  page_number: number;
  snippet: string;
  url?: string;
}

export interface AssistantQueryResponse {
  answer: string;
  citations: Citation[];
  confidence: number;
  has_sufficient_evidence: boolean;
}

export interface ExecutiveDashboard {
  active_workflows_count: number;
  completed_compliance_count: number;
  pending_compliance_count: number;
  missing_docs_count: number;
  unresolved_high_priority_issues: number;
  upcoming_deadlines_count: number;
  overdue_deadlines_count: number;
  overall_risk_score: number;
  overall_risk_level: string;
  stage_distribution: { stage: string; label: string; count: number }[];
  compliance_trends: { month: string; compliant_percent: number; issues_count: number }[];
  recent_alerts: AlertItem[];
  recent_audit_events: {
    id: number;
    action: string;
    entity_type: string;
    user_name: string;
    created_at: string;
  }[];
}
