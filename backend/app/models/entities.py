import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Float, DateTime, ForeignKey, Enum as SQLEnum, JSON, Index
)
from sqlalchemy.orm import relationship
from app.database import Base

# ================= Enums =================
class UserRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    INSTITUTION_ADMIN = "INSTITUTION_ADMIN"
    COMPLIANCE_OFFICER = "COMPLIANCE_OFFICER"
    REVIEWER = "REVIEWER"

class ApplicationStage(str, enum.Enum):
    DRAFT = "DRAFT"
    DOCUMENT_COLLECTION = "DOCUMENT_COLLECTION"
    AUTOMATED_VALIDATION = "AUTOMATED_VALIDATION"
    OFFICER_REVIEW = "OFFICER_REVIEW"
    CORRECTIONS_REQUIRED = "CORRECTIONS_REQUIRED"
    INTERNAL_APPROVAL = "INTERNAL_APPROVAL"
    READY_FOR_SUBMISSION = "READY_FOR_SUBMISSION"
    SUBMITTED_MANUAL = "SUBMITTED_MANUAL"
    EXTERNAL_DECISION_RECORDED = "EXTERNAL_DECISION_RECORDED"

class DocumentCategory(str, enum.Enum):
    LAND_AND_BUILDING = "LAND_AND_BUILDING"
    FACULTY_AND_STAFF = "FACULTY_AND_STAFF"
    AFFILIATION_AND_ACCREDITATION = "AFFILIATION_AND_ACCREDITATION"
    FIRE_AND_SAFETY = "FIRE_AND_SAFETY"
    FINANCIAL_AND_AUDIT = "FINANCIAL_AND_AUDIT"
    GOVERNING_BODY = "GOVERNING_BODY"
    STUDENT_AMENITIES = "STUDENT_AMENITIES"

class DocumentVerificationStatus(str, enum.Enum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    CORRECTION_REQUESTED = "CORRECTION_REQUESTED"
    REJECTED = "REJECTED"
    OUTDATED = "OUTDATED"

class ComplianceRuleStatus(str, enum.Enum):
    COMPLIANT = "COMPLIANT"
    INCOMPLETE = "INCOMPLETE"
    NON_COMPLIANT = "NON_COMPLIANT"
    UNDER_REVIEW = "UNDER_REVIEW"
    NOT_APPLICABLE = "NOT_APPLICABLE"
    OUTDATED_EVIDENCE = "OUTDATED_EVIDENCE"

class SeverityLevel(str, enum.Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    WARNING = "WARNING"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"

class RiskLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class TaskStatus(str, enum.Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    ESCALATED = "ESCALATED"

class AlertStatus(str, enum.Enum):
    UNREAD = "UNREAD"
    READ = "READ"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED = "RESOLVED"

# ================= Entities =================

class Institution(Base):
    __tablename__ = "institutions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    aicte_id = Column(String(100), unique=True, nullable=False, index=True)
    institution_type = Column(String(100), nullable=False) # Engineering & Tech, Management, Pharmacy, etc.
    state = Column(String(100), nullable=False)
    city = Column(String(100), nullable=False)
    address = Column(Text, nullable=True)
    contact_email = Column(String(255), nullable=False)
    contact_phone = Column(String(50), nullable=False)
    approval_category = Column(String(100), default="Extension of Approval (EoA)")
    active_academic_year = Column(String(50), default="2025-2026")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    users = relationship("User", back_populates="institution")
    applications = relationship("Application", back_populates="institution")
    documents = relationship("Document", back_populates="institution")
    alerts = relationship("Alert", back_populates="institution")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    designation = Column(String(150), nullable=True)
    role = Column(SQLEnum(UserRole), nullable=False, index=True)
    phone = Column(String(50), nullable=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    institution = relationship("Institution", back_populates="users")

class AcademicYear(Base):
    __tablename__ = "academic_years"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False) # e.g. "2025-2026"
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    is_current = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False, index=True)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"), nullable=False)
    application_type = Column(String(150), default="Extension of Approval (EoA)")
    current_stage = Column(SQLEnum(ApplicationStage), default=ApplicationStage.DRAFT, index=True)
    priority = Column(SQLEnum(SeverityLevel), default=SeverityLevel.MEDIUM)
    target_deadline = Column(DateTime, nullable=False)
    
    # Official submission manual confirmation records
    submission_ref_number = Column(String(150), nullable=True)
    submission_date = Column(DateTime, nullable=True)
    submission_confirmed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    external_decision = Column(String(100), nullable=True) # "APPROVED", "REJECTED", "DEFICIENCIES_COMMUNICATED"
    external_decision_date = Column(DateTime, nullable=True)
    external_decision_remarks = Column(Text, nullable=True)
    
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_officer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    institution = relationship("Institution", back_populates="applications")
    academic_year = relationship("AcademicYear")
    documents = relationship("Document", back_populates="application")
    timeline_events = relationship("ApplicationTimelineEvent", back_populates="application", order_by="ApplicationTimelineEvent.created_at.desc()")
    assessments = relationship("ComplianceAssessment", back_populates="application")
    risk_assessment = relationship("RiskAssessment", uselist=False, back_populates="application")

class ApplicationTimelineEvent(Base):
    __tablename__ = "application_timeline_events"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False, index=True)
    from_stage = Column(SQLEnum(ApplicationStage), nullable=False)
    to_stage = Column(SQLEnum(ApplicationStage), nullable=False)
    action_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    comments = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    application = relationship("Application", back_populates="timeline_events")
    user = relationship("User")

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False, index=True)
    category = Column(SQLEnum(DocumentCategory), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    sha256_hash = Column(String(64), nullable=False, index=True)
    version = Column(Integer, default=1)
    is_current_version = Column(Boolean, default=True)
    parent_document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    
    verification_status = Column(SQLEnum(DocumentVerificationStatus), default=DocumentVerificationStatus.PENDING, index=True)
    verified_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    verification_notes = Column(Text, nullable=True)
    
    ocr_status = Column(String(50), default="COMPLETED") # PENDING, PROCESSING, COMPLETED, FAILED
    ocr_confidence = Column(Float, default=0.92)
    ocr_text = Column(Text, nullable=True)
    expiry_date = Column(DateTime, nullable=True)
    
    uploaded_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    application = relationship("Application", back_populates="documents")
    institution = relationship("Institution", back_populates="documents")
    extracted_fields = relationship("ExtractedDocumentField", back_populates="document", cascade="all, delete-orphan")
    uploader = relationship("User", foreign_keys=[uploaded_by_user_id])
    verifier = relationship("User", foreign_keys=[verified_by_user_id])

class ExtractedDocumentField(Base):
    __tablename__ = "extracted_document_fields"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False, index=True)
    field_name = Column(String(150), nullable=False)
    extracted_value = Column(String(500), nullable=False)
    confidence_score = Column(Float, default=0.95)
    source_page = Column(Integer, default=1)
    raw_snippet = Column(Text, nullable=True)
    
    is_verified = Column(Boolean, default=False)
    corrected_value = Column(String(500), nullable=True)
    corrected_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="extracted_fields")

class ComplianceRule(Base):
    __tablename__ = "compliance_rules"

    id = Column(Integer, primary_key=True, index=True)
    rule_code = Column(String(100), unique=True, nullable=False, index=True)
    version = Column(String(50), default="APH-2024-27-v1")
    title = Column(String(255), nullable=False)
    category = Column(SQLEnum(DocumentCategory), nullable=False)
    description = Column(Text, nullable=False)
    applicable_institution_types = Column(JSON, default=lambda: ["Engineering & Tech", "Management"])
    required_document_categories = Column(JSON, default=list)
    validation_method = Column(String(100), default="DOCUMENT_VERIFICATION")
    validation_parameters = Column(JSON, default=dict)
    severity = Column(SQLEnum(SeverityLevel), default=SeverityLevel.HIGH)
    
    official_source_title = Column(String(255), default="AICTE Approval Process Handbook (2024-2027)")
    official_source_section = Column(String(255), nullable=False)
    official_source_url = Column(String(500), default="https://www.aicte-india.org/bulletins/approval-process-handbook")
    is_verified_rule = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ComplianceAssessment(Base):
    __tablename__ = "compliance_assessments"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False, index=True)
    rule_id = Column(Integer, ForeignKey("compliance_rules.id"), nullable=False, index=True)
    status = Column(SQLEnum(ComplianceRuleStatus), default=ComplianceRuleStatus.INCOMPLETE, index=True)
    score = Column(Float, default=0.0) # 0 to 100
    findings = Column(Text, nullable=True)
    evidence_document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    
    evaluated_at = Column(DateTime, default=datetime.utcnow)
    evaluated_by_system = Column(Boolean, default=True)
    override_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    override_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    application = relationship("Application", back_populates="assessments")
    rule = relationship("ComplianceRule")
    evidence_document = relationship("Document")
    remediation_tasks = relationship("RemediationTask", back_populates="assessment")

class RemediationTask(Base):
    __tablename__ = "remediation_tasks"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("compliance_assessments.id"), nullable=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(SQLEnum(SeverityLevel), default=SeverityLevel.HIGH)
    due_date = Column(DateTime, nullable=False)
    status = Column(SQLEnum(TaskStatus), default=TaskStatus.OPEN, index=True)
    
    assigned_to_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    resolution_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    assessment = relationship("ComplianceAssessment", back_populates="remediation_tasks")
    assignee = relationship("User", foreign_keys=[assigned_to_user_id])
    creator = relationship("User", foreign_keys=[created_by_user_id])

class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False, unique=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False)
    overall_score = Column(Float, default=0.0) # 0 to 100
    risk_level = Column(SQLEnum(RiskLevel), default=RiskLevel.MEDIUM)
    
    missing_docs_score = Column(Float, default=0.0)
    overdue_tasks_score = Column(Float, default=0.0)
    expiring_docs_score = Column(Float, default=0.0)
    non_compliance_score = Column(Float, default=0.0)
    
    ranked_issues = Column(JSON, default=list)
    suggested_actions = Column(JSON, default=list)
    computed_at = Column(DateTime, default=datetime.utcnow)

    application = relationship("Application", back_populates="risk_assessment")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=True, index=True)
    alert_type = Column(String(100), nullable=False) # DEADLINE_APPROACHING, DOCUMENT_EXPIRING, etc.
    severity = Column(SQLEnum(SeverityLevel), default=SeverityLevel.WARNING)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    target_role = Column(SQLEnum(UserRole), nullable=True)
    target_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(SQLEnum(AlertStatus), default=AlertStatus.UNREAD, index=True)
    
    trigger_date = Column(DateTime, default=datetime.utcnow)
    due_date = Column(DateTime, nullable=True)
    deduplication_key = Column(String(255), unique=True, nullable=False, index=True)
    
    acknowledged_at = Column(DateTime, nullable=True)
    acknowledged_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    email_sent = Column(Boolean, default=False)
    email_sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    institution = relationship("Institution", back_populates="alerts")
    acknowledger = relationship("User", foreign_keys=[acknowledged_by_user_id])

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=True, index=True)
    action = Column(String(150), nullable=False, index=True) # e.g. "DOCUMENT_UPLOAD", "STAGE_TRANSITION", etc.
    entity_type = Column(String(100), nullable=False)
    entity_id = Column(String(100), nullable=True)
    before_state = Column(JSON, nullable=True)
    after_state = Column(JSON, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User")

class RAGKnowledgeChunk(Base):
    __tablename__ = "rag_knowledge_chunks"

    id = Column(Integer, primary_key=True, index=True)
    source_title = Column(String(255), default="AICTE Approval Process Handbook (2024-2027)")
    section_number = Column(String(100), nullable=False)
    page_number = Column(Integer, nullable=False)
    category = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    keywords = Column(JSON, default=list)
    source_url = Column(String(500), default="https://www.aicte-india.org")
    version = Column(String(50), default="APH-2024-27")
    created_at = Column(DateTime, default=datetime.utcnow)
