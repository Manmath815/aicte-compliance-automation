from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from app.models.entities import (
    UserRole, ApplicationStage, DocumentCategory, DocumentVerificationStatus,
    ComplianceRuleStatus, SeverityLevel, RiskLevel, TaskStatus, AlertStatus
)

# ================= Auth & User =================
class Token(BaseModel):
    access_token: str
    token_type: str
    user: "UserResponse"

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    institution_id: Optional[int] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    designation: Optional[str] = None
    role: UserRole
    phone: Optional[str] = None
    institution_id: Optional[int] = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    designation: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    designation: Optional[str] = None
    role: UserRole
    phone: Optional[str] = None
    institution_id: Optional[int] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# ================= Institution & Academic Year =================
class AcademicYearResponse(BaseModel):
    id: int
    name: str
    start_date: datetime
    end_date: datetime
    is_current: bool

    class Config:
        from_attributes = True

class InstitutionCreate(BaseModel):
    name: str
    aicte_id: str
    institution_type: str
    state: str
    city: str
    address: Optional[str] = None
    contact_email: str
    contact_phone: str
    approval_category: Optional[str] = "Extension of Approval (EoA)"
    active_academic_year: Optional[str] = "2025-2026"

class InstitutionUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    approval_category: Optional[str] = None
    active_academic_year: Optional[str] = None

class InstitutionResponse(BaseModel):
    id: int
    name: str
    aicte_id: str
    institution_type: str
    state: str
    city: str
    address: Optional[str] = None
    contact_email: str
    contact_phone: str
    approval_category: str
    active_academic_year: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# ================= Documents =================
class ExtractedFieldCorrectionRequest(BaseModel):
    corrected_value: str

class ExtractedFieldResponse(BaseModel):
    id: int
    document_id: int
    field_name: str
    extracted_value: str
    confidence_score: float
    source_page: int
    raw_snippet: Optional[str] = None
    is_verified: bool
    corrected_value: Optional[str] = None

    class Config:
        from_attributes = True

class DocumentVerificationRequest(BaseModel):
    verification_status: DocumentVerificationStatus
    verification_notes: Optional[str] = None

class DocumentResponse(BaseModel):
    id: int
    application_id: int
    institution_id: int
    category: DocumentCategory
    title: str
    file_name: str
    file_path: str
    file_size: int
    mime_type: str
    sha256_hash: str
    version: int
    is_current_version: bool
    verification_status: DocumentVerificationStatus
    verified_by_user_id: Optional[int] = None
    verified_at: Optional[datetime] = None
    verification_notes: Optional[str] = None
    ocr_status: str
    ocr_confidence: float
    ocr_text: Optional[str] = None
    expiry_date: Optional[datetime] = None
    uploaded_by_user_id: int
    created_at: datetime
    extracted_fields: List[ExtractedFieldResponse] = []

    class Config:
        from_attributes = True

# ================= Applications =================
class ApplicationCreate(BaseModel):
    institution_id: Optional[int] = None # Will default to current user's institution
    academic_year_id: int
    application_type: Optional[str] = "Extension of Approval (EoA)"
    priority: Optional[SeverityLevel] = SeverityLevel.HIGH
    target_deadline: datetime
    assigned_officer_id: Optional[int] = None
    assigned_reviewer_id: Optional[int] = None

class ApplicationTransitionRequest(BaseModel):
    target_stage: ApplicationStage
    comments: Optional[str] = None

class ExternalDecisionRequest(BaseModel):
    submission_ref_number: Optional[str] = None
    submission_date: Optional[datetime] = None
    external_decision: str # "APPROVED", "REJECTED", "DEFICIENCIES_COMMUNICATED"
    external_decision_date: datetime
    external_decision_remarks: Optional[str] = None

class ApplicationTimelineResponse(BaseModel):
    id: int
    application_id: int
    from_stage: ApplicationStage
    to_stage: ApplicationStage
    action_by_user_id: int
    user_name: Optional[str] = None
    user_role: Optional[str] = None
    comments: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ApplicationResponse(BaseModel):
    id: int
    institution_id: int
    academic_year_id: int
    application_type: str
    current_stage: ApplicationStage
    priority: SeverityLevel
    target_deadline: datetime
    submission_ref_number: Optional[str] = None
    submission_date: Optional[datetime] = None
    external_decision: Optional[str] = None
    external_decision_date: Optional[datetime] = None
    external_decision_remarks: Optional[str] = None
    created_by_user_id: int
    assigned_officer_id: Optional[int] = None
    assigned_reviewer_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    institution_name: Optional[str] = None
    academic_year_name: Optional[str] = None
    assigned_officer_name: Optional[str] = None
    assigned_reviewer_name: Optional[str] = None
    documents_count: Optional[int] = 0
    compliance_score: Optional[float] = 0.0

    class Config:
        from_attributes = True

# ================= Compliance & Remediation =================
class ComplianceRuleResponse(BaseModel):
    id: int
    rule_code: str
    version: str
    title: str
    category: DocumentCategory
    description: str
    applicable_institution_types: List[str]
    required_document_categories: List[str]
    validation_method: str
    severity: SeverityLevel
    official_source_title: str
    official_source_section: str
    official_source_url: str
    is_verified_rule: bool

    class Config:
        from_attributes = True

class RemediationTaskCreate(BaseModel):
    assessment_id: Optional[int] = None
    application_id: int
    title: str
    description: str
    priority: Optional[SeverityLevel] = SeverityLevel.HIGH
    due_date: datetime
    assigned_to_user_id: Optional[int] = None

class RemediationTaskUpdate(BaseModel):
    status: Optional[TaskStatus] = None
    resolution_notes: Optional[str] = None
    assigned_to_user_id: Optional[int] = None

class RemediationTaskResponse(BaseModel):
    id: int
    assessment_id: Optional[int] = None
    application_id: int
    institution_id: int
    title: str
    description: str
    priority: SeverityLevel
    due_date: datetime
    status: TaskStatus
    assigned_to_user_id: Optional[int] = None
    assigned_to_name: Optional[str] = None
    created_by_user_id: int
    resolution_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ComplianceOverrideRequest(BaseModel):
    new_status: ComplianceRuleStatus
    override_reason: str

class ComplianceAssessmentResponse(BaseModel):
    id: int
    application_id: int
    rule_id: int
    rule: ComplianceRuleResponse
    status: ComplianceRuleStatus
    score: float
    findings: Optional[str] = None
    evidence_document_id: Optional[int] = None
    evidence_document_title: Optional[str] = None
    evaluated_at: datetime
    evaluated_by_system: bool
    override_reason: Optional[str] = None
    remediation_tasks: List[RemediationTaskResponse] = []

    class Config:
        from_attributes = True

# ================= Risk Assessment =================
class RankedIssue(BaseModel):
    title: str
    severity: str
    rule_code: Optional[str] = None
    impact_score: float
    description: str
    suggested_action: str

class RiskAssessmentResponse(BaseModel):
    id: int
    application_id: int
    institution_id: int
    overall_score: float # 0 to 100
    risk_level: RiskLevel
    missing_docs_score: float
    overdue_tasks_score: float
    expiring_docs_score: float
    non_compliance_score: float
    ranked_issues: List[Dict[str, Any]]
    suggested_actions: List[str]
    computed_at: datetime

    class Config:
        from_attributes = True

# ================= Alerts =================
class AlertAcknowledgeRequest(BaseModel):
    status: AlertStatus = AlertStatus.ACKNOWLEDGED

class AlertResponse(BaseModel):
    id: int
    institution_id: int
    application_id: Optional[int] = None
    alert_type: str
    severity: SeverityLevel
    title: str
    message: str
    target_role: Optional[UserRole] = None
    status: AlertStatus
    trigger_date: datetime
    due_date: Optional[datetime] = None
    acknowledged_at: Optional[datetime] = None
    email_sent: bool
    created_at: datetime

    class Config:
        from_attributes = True

# ================= AI Assistant (RAG) =================
class Citation(BaseModel):
    source_title: str
    section_number: str
    page_number: int
    snippet: str
    url: Optional[str] = None

class AssistantQueryRequest(BaseModel):
    query: str
    application_id: Optional[int] = None

class AssistantQueryResponse(BaseModel):
    answer: str
    citations: List[Citation] = []
    confidence: float
    has_sufficient_evidence: bool

# ================= Executive Dashboard =================
class StageCount(BaseModel):
    stage: str
    label: str
    count: int

class ComplianceTrend(BaseModel):
    month: str
    compliant_percent: float
    issues_count: int

class ExecutiveDashboardResponse(BaseModel):
    active_workflows_count: int
    completed_compliance_count: int
    pending_compliance_count: int
    missing_docs_count: int
    unresolved_high_priority_issues: int
    upcoming_deadlines_count: int
    overdue_deadlines_count: int
    overall_risk_score: float
    overall_risk_level: str
    stage_distribution: List[StageCount]
    compliance_trends: List[ComplianceTrend]
    recent_alerts: List[AlertResponse]
    recent_audit_events: List[Dict[str, Any]]
