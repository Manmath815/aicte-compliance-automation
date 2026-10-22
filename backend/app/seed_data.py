import os
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.database import engine, Base, SessionLocal
from app.models.entities import (
    Institution, User, UserRole, AcademicYear, Application, ApplicationStage,
    ApplicationTimelineEvent, Document, DocumentCategory, DocumentVerificationStatus,
    ExtractedDocumentField, ComplianceRule, ComplianceAssessment, ComplianceRuleStatus,
    RemediationTask, TaskStatus, RiskAssessment, RiskLevel, Alert, AlertStatus,
    SeverityLevel, AuditLog, RAGKnowledgeChunk
)
from app.services.auth_service import get_password_hash
from app.services.compliance_engine import evaluate_application_compliance
from app.services.risk_engine import compute_application_risk
from app.config import settings

def seed_database():
    """Seed comprehensive mock and regulatory data for AICTE SmartFlow hackathon scenario."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(Institution).filter(Institution.aicte_id == "1-109283741").first():
            print("Database already seeded with demo institution.")
            return

        print("Seeding AICTE SmartFlow database...")

        # 1. Academic Years
        ay_prev = AcademicYear(name="2024-2025", start_date=datetime(2024, 6, 1), end_date=datetime(2025, 5, 31), is_current=False)
        ay_curr = AcademicYear(name="2025-2026", start_date=datetime(2025, 6, 1), end_date=datetime(2026, 5, 31), is_current=True)
        ay_next = AcademicYear(name="2026-2027", start_date=datetime(2026, 6, 1), end_date=datetime(2027, 5, 31), is_current=False)
        db.add_all([ay_prev, ay_curr, ay_next])
        db.commit()

        # 2. Demo Institution
        inst = Institution(
            name="Aryabhata Institute of Technology & Management",
            aicte_id="1-109283741",
            institution_type="Engineering & Tech",
            state="Delhi",
            city="New Delhi",
            address="Plot 12, Institutional Area, Sector 5, Vasant Kunj, New Delhi - 110070",
            contact_email="registrar@aitm.edu.in",
            contact_phone="+91 11 2612 8900",
            approval_category="Extension of Approval (EoA)",
            active_academic_year="2025-2026",
            is_active=True
        )
        db.add(inst)
        db.commit()
        db.refresh(inst)

        # 3. Demo Users across 4 personas
        super_admin = User(
            email="superadmin@aicte.gov.in",
            hashed_password=get_password_hash("SuperAdmin@2026"),
            full_name="Rajesh Kumar Verma",
            designation="AICTE Regional Director",
            role=UserRole.SUPER_ADMIN,
            phone="+91 11 2958 1000",
            institution_id=None,
            is_active=True
        )
        inst_admin = User(
            email="admin@aitm.edu.in",
            hashed_password=get_password_hash("Admin@2026"),
            full_name="Dr. Ramesh Chandra Sharma",
            designation="Director / Principal",
            role=UserRole.INSTITUTION_ADMIN,
            phone="+91 98101 23456",
            institution_id=inst.id,
            is_active=True
        )
        comp_officer = User(
            email="compliance@aitm.edu.in",
            hashed_password=get_password_hash("Compliance@2026"),
            full_name="Prof. Sunita Deshmukh",
            designation="Dean of Academic Affairs & Compliance",
            role=UserRole.COMPLIANCE_OFFICER,
            phone="+91 98112 34567",
            institution_id=inst.id,
            is_active=True
        )
        reviewer = User(
            email="reviewer@aitm.edu.in",
            hashed_password=get_password_hash("Reviewer@2026"),
            full_name="Prof. Arvind Swaminathan",
            designation="Internal Review Committee Convenor",
            role=UserRole.REVIEWER,
            phone="+91 98183 45678",
            institution_id=inst.id,
            is_active=True
        )
        db.add_all([super_admin, inst_admin, comp_officer, reviewer])
        db.commit()
        db.refresh(inst_admin)
        db.refresh(comp_officer)
        db.refresh(reviewer)

        # 4. Regulatory Rules from AICTE Approval Process Handbook (APH 2024-2027)
        rules_data = [
            ComplianceRule(
                rule_code="AICTE-APH-LAND-01",
                version="APH-2024-27-v1",
                title="Minimum Land & Campus Area Norms",
                category=DocumentCategory.LAND_AND_BUILDING,
                description="Institutions in Urban / Mega Cities must possess minimum 2.5 contiguous acres (or 7.5 acres in Rural areas) of clear unencumbered land with registered ownership or government lease >= 30 years.",
                applicable_institution_types=["Engineering & Tech", "Management"],
                required_document_categories=["LAND_AND_BUILDING"],
                validation_method="LAND_NORM_CHECK",
                severity=SeverityLevel.CRITICAL,
                official_source_title="AICTE Approval Process Handbook (2024-2027)",
                official_source_section="Chapter I, Clause 1.6 & Appendix 4, Page 29",
                official_source_url="https://www.aicte-india.org/bureaus/approval/handbook",
                is_verified_rule=True
            ),
            ComplianceRule(
                rule_code="AICTE-APH-BLDG-02",
                version="APH-2024-27-v1",
                title="Built-up & Instructional Carpet Area",
                category=DocumentCategory.LAND_AND_BUILDING,
                description="Mandatory carpet area of 4.5 sq.m per student for instructional area, plus administrative, amenities, and circulation spaces certified by registered Architect and local municipality.",
                applicable_institution_types=["Engineering & Tech"],
                required_document_categories=["LAND_AND_BUILDING"],
                validation_method="AREA_THRESHOLD_CHECK",
                severity=SeverityLevel.HIGH,
                official_source_title="AICTE Approval Process Handbook (2024-2027)",
                official_source_section="Chapter II, Clause 2.3 & Appendix 4, Page 34",
                official_source_url="https://www.aicte-india.org/bureaus/approval/handbook",
                is_verified_rule=True
            ),
            ComplianceRule(
                rule_code="AICTE-APH-FAC-03",
                version="APH-2024-27-v1",
                title="Faculty-to-Student Cadre Ratio (1:15)",
                category=DocumentCategory.FACULTY_AND_STAFF,
                description="Institutions must maintain a 1:15 Faculty-to-Student ratio in UG Engineering with Cadre Ratio of 1 Professor : 2 Associate Professors : 6 Assistant Professors. Principal and all Professors must hold Ph.D.",
                applicable_institution_types=["Engineering & Tech"],
                required_document_categories=["FACULTY_AND_STAFF"],
                validation_method="CADRE_RATIO_CHECK",
                severity=SeverityLevel.CRITICAL,
                official_source_title="AICTE Approval Process Handbook (2024-2027)",
                official_source_section="Chapter II, Clause 2.4.1 & Appendix 7, Page 41",
                official_source_url="https://www.aicte-india.org/bureaus/approval/handbook",
                is_verified_rule=True
            ),
            ComplianceRule(
                rule_code="AICTE-APH-FIRE-04",
                version="APH-2024-27-v1",
                title="Fire Safety Certificate (NOC) Validity",
                category=DocumentCategory.FIRE_AND_SAFETY,
                description="Current, non-expired Fire Safety Certificate / NOC issued by the competent State Fire Services Authority certifying functional hydrants, extinguishers, and emergency exits.",
                applicable_institution_types=["Engineering & Tech", "Management", "Pharmacy"],
                required_document_categories=["FIRE_AND_SAFETY"],
                validation_method="DATE_EXPIRY_CHECK",
                severity=SeverityLevel.CRITICAL,
                official_source_title="AICTE Approval Process Handbook (2024-2027)",
                official_source_section="Chapter I, Clause 1.8 & Appendix 16, Page 68",
                official_source_url="https://www.aicte-india.org/bureaus/approval/handbook",
                is_verified_rule=True
            ),
            ComplianceRule(
                rule_code="AICTE-APH-AFF-05",
                version="APH-2024-27-v1",
                title="Affiliating University Annual Continuation Order",
                category=DocumentCategory.AFFILIATION_AND_ACCREDITATION,
                description="Unconditional annual affiliation letter from the designated State/Central University for the programs and approved intake of the active academic session.",
                applicable_institution_types=["Engineering & Tech"],
                required_document_categories=["AFFILIATION_AND_ACCREDITATION"],
                validation_method="DOCUMENT_PRESENCE",
                severity=SeverityLevel.HIGH,
                official_source_title="AICTE Approval Process Handbook (2024-2027)",
                official_source_section="Chapter I, Clause 1.5, Page 22",
                official_source_url="https://www.aicte-india.org/bureaus/approval/handbook",
                is_verified_rule=True
            ),
            ComplianceRule(
                rule_code="AICTE-APH-ACC-06",
                version="APH-2024-27-v1",
                title="NBA / NAAC Accreditation Compliance",
                category=DocumentCategory.AFFILIATION_AND_ACCREDITATION,
                description="Institutions seeking increase in intake or new programs must have NBA accreditation for at least 30% of eligible courses or institutional NAAC CGPA >= 2.51 (Grade B+).",
                applicable_institution_types=["Engineering & Tech"],
                required_document_categories=["AFFILIATION_AND_ACCREDITATION"],
                validation_method="ACCREDITATION_CHECK",
                severity=SeverityLevel.HIGH,
                official_source_title="AICTE Approval Process Handbook (2024-2027)",
                official_source_section="Chapter III, Clause 3.2, Page 52",
                official_source_url="https://www.aicte-india.org/bureaus/approval/handbook",
                is_verified_rule=True
            ),
            ComplianceRule(
                rule_code="AICTE-APH-FIN-07",
                version="APH-2024-27-v1",
                title="Audited Balance Sheet & Corpus Fund FD",
                category=DocumentCategory.FINANCIAL_AND_AUDIT,
                description="Audited statement of accounts by registered Chartered Accountant for preceding financial year along with verified joint Fixed Deposit (FDR) pledged to AICTE.",
                applicable_institution_types=["Engineering & Tech"],
                required_document_categories=["FINANCIAL_AND_AUDIT"],
                validation_method="FINANCIAL_AUDIT_CHECK",
                severity=SeverityLevel.MEDIUM,
                official_source_title="AICTE Approval Process Handbook (2024-2027)",
                official_source_section="Chapter II, Clause 2.12 & Appendix 8, Page 47",
                official_source_url="https://www.aicte-india.org/bureaus/approval/handbook",
                is_verified_rule=True
            )
        ]
        db.add_all(rules_data)
        db.commit()

        # 5. RAG Regulatory Knowledge Chunks
        chunks = [
            RAGKnowledgeChunk(
                source_title="AICTE Approval Process Handbook (2024-2027)",
                section_number="Chapter I, Clause 1.6",
                page_number=29,
                category="Land Norms",
                title="Land Requirements for Engineering & Technology Institutions",
                content="The land requirement for setting up or continuing an Engineering & Technology institution is 2.5 Acres in Mega/Metro cities (Delhi, Mumbai, Kolkata, Chennai, Bangalore, Hyderabad), 4.0 Acres in Urban areas, and 7.5 Acres in Rural areas. The land must be contiguous, in the legal possession of the Society/Trust through an outright registered sale deed or registered government lease for at least 30 years.",
                keywords=["land", "acres", "contiguous", "lease", "sale deed", "campus area"]
            ),
            RAGKnowledgeChunk(
                source_title="AICTE Approval Process Handbook (2024-2027)",
                section_number="Chapter II, Clause 2.4.1",
                page_number=41,
                category="Faculty & Staff",
                title="Faculty-to-Student Ratio and Cadre Distribution",
                content="For Undergraduate Technical Programs in Engineering and Technology, the prescribed Faculty-to-Student ratio is 1:15 based on sanctioned student intake. The cadre ratio shall be 1:2:6 (Professor : Associate Professor : Assistant Professor). Qualifications: Principal/Director must possess a Ph.D. in Engineering with at least 15 years teaching/research experience. All Professors must possess a Ph.D. in the relevant discipline.",
                keywords=["faculty", "ratio", "1:15", "cadre", "principal", "phd", "professors"]
            ),
            RAGKnowledgeChunk(
                source_title="AICTE Approval Process Handbook (2024-2027)",
                section_number="Chapter I, Clause 1.8",
                page_number=68,
                category="Fire & Safety",
                title="Mandatory Fire Safety Certificate & Periodic Inspection",
                content="Every technical institution must submit a valid Fire Safety Certificate (NOC) issued by the competent State Fire Services Authority. In case of expiry, the institution must immediately upload an official receipt of application for renewal along with an interim safety compliance affidavit. Institutions operating with expired fire safety certificates face immediate withholding of Extension of Approval (EoA).",
                keywords=["fire", "noc", "safety", "hazard", "certificate", "renewal"]
            ),
            RAGKnowledgeChunk(
                source_title="AICTE Approval Process Handbook (2024-2027)",
                section_number="Chapter III, Clause 3.2",
                page_number=52,
                category="Accreditation",
                title="NBA and NAAC Requirements for Intake Expansion",
                content="An institution is eligible to apply for an increase in approved student intake or launch of new technical programs only if at least 30% of its eligible engineering programs are accredited by the National Board of Accreditation (NBA) with valid accreditation on the date of application, or the institution possesses NAAC accreditation with a minimum CGPA of 2.51 (Grade B+ or higher).",
                keywords=["nba", "naac", "accreditation", "intake", "expansion", "new courses"]
            ),
            RAGKnowledgeChunk(
                source_title="AICTE Approval Process Handbook (2024-2027)",
                section_number="Chapter IV, Clause 4.1",
                page_number=60,
                category="Workflow Timelines",
                title="Extension of Approval Application Windows & Deadlines",
                content="The annual application cycle for Extension of Approval (EoA) typically commences in the 2nd week of February and closes strictly after 21 calendar days. AICTE strictly enforces non-extendable cutoffs. All deficiencies communicated during Scrutiny or Re-Scrutiny must be remediated and uploaded within 7 working days of notification.",
                keywords=["deadline", "extension of approval", "eoa", "calendar", "timeline", "cutoff"]
            )
        ]
        db.add_all(chunks)
        db.commit()

        # 6. Sample Application (Aryabhata Institute EoA 2025-2026)
        target_deadline = datetime.utcnow() + timedelta(days=22) # 22 days left
        app = Application(
            institution_id=inst.id,
            academic_year_id=ay_curr.id,
            application_type="Extension of Approval (EoA)",
            current_stage=ApplicationStage.OFFICER_REVIEW,
            priority=SeverityLevel.HIGH,
            target_deadline=target_deadline,
            created_by_user_id=inst_admin.id,
            assigned_officer_id=comp_officer.id,
            assigned_reviewer_id=reviewer.id
        )
        db.add(app)
        db.commit()
        db.refresh(app)

        # Timeline events
        events = [
            ApplicationTimelineEvent(
                application_id=app.id,
                from_stage=ApplicationStage.DRAFT,
                to_stage=ApplicationStage.DOCUMENT_COLLECTION,
                action_by_user_id=inst_admin.id,
                comments="Application created and checklist initialized for Academic Session 2025-2026."
            ),
            ApplicationTimelineEvent(
                application_id=app.id,
                from_stage=ApplicationStage.DOCUMENT_COLLECTION,
                to_stage=ApplicationStage.AUTOMATED_VALIDATION,
                action_by_user_id=inst_admin.id,
                comments="Initial bundle of institutional evidence documents uploaded."
            ),
            ApplicationTimelineEvent(
                application_id=app.id,
                from_stage=ApplicationStage.AUTOMATED_VALIDATION,
                to_stage=ApplicationStage.OFFICER_REVIEW,
                action_by_user_id=comp_officer.id,
                comments="Automated OCR and rule checks completed. Forwarded to Officer Review."
            )
        ]
        db.add_all(events)
        db.commit()

        # 7. Create Sample PDF/DOCX Document files on disk and records
        inst_dir = settings.UPLOAD_DIR / str(inst.id) / str(app.id)
        inst_dir.mkdir(parents=True, exist_ok=True)

        # Sample 1: Land Title Deed (Verified)
        land_file_path = inst_dir / "LAND_AND_BUILDING_v1_Land_Title_Deed_AITM.pdf"
        with open(land_file_path, "wb") as f:
            f.write(b"%PDF-1.4\n1 0 obj\n<<\n/Title (AITM Registered Land Deed)\n>>\nendobj\ntrailer\n<<\n>>\n%%EOF\nSample Land Title Deed for 7.5 contiguous acres at Vasant Kunj, New Delhi.")

        doc_land = Document(
            application_id=app.id,
            institution_id=inst.id,
            category=DocumentCategory.LAND_AND_BUILDING,
            title="Registered Land Title Deed & Ownership Registry",
            file_name="Land_Title_Deed_AITM.pdf",
            file_path=str(land_file_path),
            file_size=1048576, # 1 MB
            mime_type="application/pdf",
            sha256_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            version=1,
            is_current_version=True,
            verification_status=DocumentVerificationStatus.VERIFIED,
            verified_by_user_id=reviewer.id,
            verified_at=datetime.utcnow() - timedelta(days=2),
            verification_notes="Verified against Delhi Development Authority (DDA) registered land record. 7.5 Acres confirmed unencumbered.",
            ocr_status="COMPLETED",
            ocr_confidence=0.96,
            ocr_text="Land Title Deed: Total contiguous land measuring 7.5 Acres situated at Survey No. 42, Vasant Kunj Institutional Area, New Delhi. Freehold ownership registered in favour of Aryabhata Educational Trust.",
            uploaded_by_user_id=inst_admin.id
        )
        db.add(doc_land)
        db.commit()
        db.refresh(doc_land)

        field_land = ExtractedDocumentField(
            document_id=doc_land.id,
            field_name="total_land_acres",
            extracted_value="7.5 Acres",
            confidence_score=0.96,
            source_page=1,
            raw_snippet="Total contiguous land measuring 7.5 Acres situated at Survey No. 42",
            is_verified=True
        )
        db.add(field_land)

        # Sample 2: Fire Safety NOC (Approaching Expiry in 18 days!)
        fire_expiry = datetime.utcnow() + timedelta(days=18)
        fire_file_path = inst_dir / "FIRE_AND_SAFETY_v1_Fire_Safety_NOC_2025.pdf"
        with open(fire_file_path, "wb") as f:
            f.write(b"%PDF-1.4\n1 0 obj\n<<\n/Title (Delhi Fire Service NOC)\n>>\nendobj\ntrailer\n<<\n>>\n%%EOF\nDelhi Fire Service NOC No DFS/HQ/2024/782 Valid Upto: " + fire_expiry.strftime("%Y-%m-%d").encode())

        doc_fire = Document(
            application_id=app.id,
            institution_id=inst.id,
            category=DocumentCategory.FIRE_AND_SAFETY,
            title="Delhi Fire Service NOC & Safety Clearance",
            file_name="Fire_Safety_NOC_2025.pdf",
            file_path=str(fire_file_path),
            file_size=820000,
            mime_type="application/pdf",
            sha256_hash="11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff",
            version=1,
            is_current_version=True,
            verification_status=DocumentVerificationStatus.VERIFIED,
            verified_by_user_id=reviewer.id,
            verified_at=datetime.utcnow() - timedelta(days=1),
            verification_notes="Fire clearance authenticated; note that certificate expires in 18 days. Renewal in progress.",
            ocr_status="COMPLETED",
            ocr_confidence=0.95,
            ocr_text=f"Government of NCT of Delhi, Directorate of Delhi Fire Service. Certificate No: DFS/HQ/2024/782. Valid Upto: {fire_expiry.strftime('%Y-%m-%d')}.",
            expiry_date=fire_expiry,
            uploaded_by_user_id=inst_admin.id
        )
        db.add(doc_fire)
        db.commit()
        db.refresh(doc_fire)

        field_fire = ExtractedDocumentField(
            document_id=doc_fire.id,
            field_name="fire_noc_validity_date",
            extracted_value=fire_expiry.strftime("%Y-%m-%d"),
            confidence_score=0.98,
            source_page=1,
            raw_snippet=f"Certificate No: DFS/HQ/2024/782. Valid Upto: {fire_expiry.strftime('%Y-%m-%d')}",
            is_verified=True
        )
        db.add(field_fire)

        # Sample 3: Faculty Roster (Correction Requested)
        fac_file_path = inst_dir / "FACULTY_AND_STAFF_v1_AITM_Faculty_List_2025.pdf"
        with open(fac_file_path, "wb") as f:
            f.write(b"%PDF-1.4\n1 0 obj\n<<\n/Title (Faculty Roll Call)\n>>\nendobj\ntrailer\n<<\n>>\n%%EOF\nAITM Faculty Roll: 128 Full-Time Faculty members.")

        doc_fac = Document(
            application_id=app.id,
            institution_id=inst.id,
            category=DocumentCategory.FACULTY_AND_STAFF,
            title="Approved Faculty Cadre Roll & Qualifications",
            file_name="AITM_Faculty_List_2025.pdf",
            file_path=str(fac_file_path),
            file_size=1420000,
            mime_type="application/pdf",
            sha256_hash="aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899",
            version=1,
            is_current_version=True,
            verification_status=DocumentVerificationStatus.CORRECTION_REQUESTED,
            verified_by_user_id=reviewer.id,
            verified_at=datetime.utcnow() - timedelta(hours=6),
            verification_notes="Correction Requested: Form-16 and PhD degree certificates missing for 2 newly recruited Associate Professors in AI & Data Science department.",
            ocr_status="COMPLETED",
            ocr_confidence=0.92,
            ocr_text="Aryabhata Institute of Technology & Management. Total Approved Faculty: 128. Cadre: 14 Professors, 28 Associate Professors, 86 Assistant Professors. F:S Ratio = 1:15.2.",
            uploaded_by_user_id=inst_admin.id
        )
        db.add(doc_fac)
        db.commit()
        db.refresh(doc_fac)

        field_fac = ExtractedDocumentField(
            document_id=doc_fac.id,
            field_name="total_approved_faculty",
            extracted_value="128",
            confidence_score=0.94,
            source_page=1,
            raw_snippet="Total Approved Faculty: 128. Cadre: 14 Professors, 28 Associate Professors, 86 Assistant Professors.",
            is_verified=False
        )
        db.add(field_fac)

        # 8. Evaluate initial compliance and risk
        evaluate_application_compliance(db, app.id)
        compute_application_risk(db, app.id)

        # 9. Remediation Task assigned to Institution Admin
        fac_assessment = db.query(ComplianceAssessment).filter(
            ComplianceAssessment.application_id == app.id,
            ComplianceAssessment.rule_id == 3 # AICTE-APH-FAC-03
        ).first()

        task1 = RemediationTask(
            assessment_id=fac_assessment.id if fac_assessment else None,
            application_id=app.id,
            institution_id=inst.id,
            title="Upload Ph.D. Verification & Joining Orders for 2 CSE Faculty",
            description="Reviewer identified missing Ph.D. certificates for Dr. Vivek Gupta and Dr. Anita Sen. Upload authenticated copies signed by Registrar.",
            priority=SeverityLevel.HIGH,
            due_date=datetime.utcnow() + timedelta(days=5),
            status=TaskStatus.OPEN,
            assigned_to_user_id=inst_admin.id,
            created_by_user_id=reviewer.id
        )
        db.add(task1)
        db.commit()

        # 10. Sample Alerts
        alert1 = Alert(
            institution_id=inst.id,
            application_id=app.id,
            alert_type="DOCUMENT_EXPIRING",
            severity=SeverityLevel.HIGH,
            title="Fire Safety NOC Expiring in 18 Days",
            message=f"Delhi Fire Service certificate for Campus AITM expires on {fire_expiry.strftime('%Y-%m-%d')}. Ensure renewal submission is logged.",
            target_role=UserRole.COMPLIANCE_OFFICER,
            status=AlertStatus.UNREAD,
            due_date=fire_expiry,
            deduplication_key=f"demo_fire_alert_{app.id}"
        )
        alert2 = Alert(
            institution_id=inst.id,
            application_id=app.id,
            alert_type="CORRECTION_REQUESTED",
            severity=SeverityLevel.HIGH,
            title="Corrections Requested: Faculty Roster",
            message="Internal reviewer Prof. Arvind Swaminathan requested rectifications on the Faculty Roster. Remediation task created.",
            target_role=UserRole.INSTITUTION_ADMIN,
            status=AlertStatus.UNREAD,
            due_date=datetime.utcnow() + timedelta(days=5),
            deduplication_key=f"demo_faculty_corr_{app.id}"
        )
        alert3 = Alert(
            institution_id=inst.id,
            application_id=app.id,
            alert_type="DEADLINE_APPROACHING",
            severity=SeverityLevel.WARNING,
            title="AICTE EoA Target Deadline in 22 Days",
            message=f"Application #{app.id} deadline is {target_deadline.strftime('%Y-%m-%d')}. 2 compliance requirements still pending.",
            target_role=UserRole.INSTITUTION_ADMIN,
            status=AlertStatus.UNREAD,
            due_date=target_deadline,
            deduplication_key=f"demo_deadline_alert_{app.id}"
        )
        db.add_all([alert1, alert2, alert3])
        db.commit()

        # 11. Initial Audit Logs
        log1 = AuditLog(
            user_id=inst_admin.id,
            institution_id=inst.id,
            action="APPLICATION_CREATED",
            entity_type="APPLICATION",
            entity_id=str(app.id),
            after_state={"stage": "DRAFT", "type": "Extension of Approval (EoA)"}
        )
        log2 = AuditLog(
            user_id=reviewer.id,
            institution_id=inst.id,
            action="DOCUMENT_VERIFICATION",
            entity_type="DOCUMENT",
            entity_id=str(doc_land.id),
            before_state={"status": "PENDING"},
            after_state={"status": "VERIFIED"}
        )
        log3 = AuditLog(
            user_id=reviewer.id,
            institution_id=inst.id,
            action="DOCUMENT_VERIFICATION",
            entity_type="DOCUMENT",
            entity_id=str(doc_fac.id),
            before_state={"status": "PENDING"},
            after_state={"status": "CORRECTION_REQUESTED", "notes": "Missing 2 faculty PhD proofs"}
        )
        db.add_all([log1, log2, log3])
        db.commit()

        # Final re-computation of risk with the tasks and alerts
        compute_application_risk(db, app.id)

        print("Database successfully seeded with realistic AICTE hackathon scenario!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
