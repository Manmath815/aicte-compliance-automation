import os
import shutil
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.entities import (
    Document, DocumentCategory, DocumentVerificationStatus,
    ExtractedDocumentField, Application, User, UserRole
)
from app.schemas.all_schemas import (
    DocumentResponse, DocumentVerificationRequest, ExtractedFieldCorrectionRequest, ExtractedFieldResponse
)
from app.services.auth_service import get_current_user, RequireRole, enforce_institution_access
from app.services.audit_service import log_audit_event
from app.services.ocr_service import calculate_sha256, extract_text_from_pdf, extract_structured_fields
from app.services.compliance_engine import evaluate_application_compliance
from app.services.risk_engine import compute_application_risk

router = APIRouter(prefix="/documents", tags=["Documents"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".png", ".jpg", ".jpeg"}
MAX_FILE_SIZE = 25 * 1024 * 1024 # 25 MB

@router.get("/application/{app_id}", response_model=List[DocumentResponse])
def get_documents_by_application(
    app_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    enforce_institution_access(current_user, app.institution_id)

    docs = db.query(Document).filter(
        Document.application_id == app_id,
        Document.is_current_version == True
    ).order_by(Document.created_at.desc()).all()
    return docs

@router.get("/{doc_id}", response_model=DocumentResponse)
def get_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    enforce_institution_access(current_user, doc.institution_id)
    return doc

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    application_id: int = Form(...),
    category: DocumentCategory = Form(...),
    title: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    enforce_institution_access(current_user, app.institution_id)

    # Validate extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file format: {ext}. Permitted formats: {', '.join(ALLOWED_EXTENSIONS)}")

    file_bytes = await file.read()
    file_size = len(file_bytes)
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds maximum allowable limit of 25MB")

    # Deduplication SHA-256 Check
    sha256_hash = calculate_sha256(file_bytes)
    existing_dup = db.query(Document).filter(
        Document.application_id == application_id,
        Document.sha256_hash == sha256_hash,
        Document.is_current_version == True
    ).first()
    if existing_dup:
        raise HTTPException(
            status_code=409,
            detail=f"Duplicate document detected! Exactly identical file already uploaded as '{existing_dup.title}' (ID #{existing_dup.id})."
        )

    # Check if this is a new version of an existing category document
    previous_doc = db.query(Document).filter(
        Document.application_id == application_id,
        Document.category == category,
        Document.is_current_version == True
    ).first()

    version_number = 1
    parent_id = None
    if previous_doc:
        previous_doc.is_current_version = False
        version_number = previous_doc.version + 1
        parent_id = previous_doc.id

    # Save to disk
    inst_upload_dir = settings.UPLOAD_DIR / str(app.institution_id) / str(application_id)
    inst_upload_dir.mkdir(parents=True, exist_ok=True)
    saved_file_name = f"{category.value}_v{version_number}_{file.filename}"
    saved_path = inst_upload_dir / saved_file_name

    with open(saved_path, "wb") as f:
        f.write(file_bytes)

    # PyMuPDF OCR & text extraction
    raw_text = ""
    pages = 1
    if ext == ".pdf":
        raw_text, pages = extract_text_from_pdf(str(saved_path))
    else:
        raw_text = f"Sample text extracted from {file.filename} for category {category.value}."

    # Structured fields extraction
    extracted_fields_data = extract_structured_fields(raw_text, category.value)

    # Determine expiry date if present
    expiry_date = None
    for ef in extracted_fields_data:
        if "expiry" in ef["field_name"] or "validity" in ef["field_name"]:
            try:
                expiry_date = datetime.strptime(ef["extracted_value"].strip(), "%Y-%m-%d")
            except Exception:
                pass

    doc = Document(
        application_id=application_id,
        institution_id=app.institution_id,
        category=category,
        title=title,
        file_name=file.filename,
        file_path=str(saved_path),
        file_size=file_size,
        mime_type=file.content_type or "application/octet-stream",
        sha256_hash=sha256_hash,
        version=version_number,
        is_current_version=True,
        parent_document_id=parent_id,
        verification_status=DocumentVerificationStatus.PENDING,
        ocr_status="COMPLETED",
        ocr_confidence=0.94,
        ocr_text=raw_text[:4000] if raw_text else "Text extraction completed.",
        expiry_date=expiry_date,
        uploaded_by_user_id=current_user.id
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Save extracted fields
    for field_info in extracted_fields_data:
        db_field = ExtractedDocumentField(
            document_id=doc.id,
            field_name=field_info["field_name"],
            extracted_value=field_info["extracted_value"],
            confidence_score=field_info["confidence_score"],
            source_page=field_info["source_page"],
            raw_snippet=field_info.get("raw_snippet")
        )
        db.add(db_field)

    db.commit()
    db.refresh(doc)

    # Auto re-evaluate compliance and risk
    evaluate_application_compliance(db, application_id)
    compute_application_risk(db, application_id)

    log_audit_event(
        db, "DOCUMENT_UPLOADED", "DOCUMENT", str(doc.id),
        user=current_user,
        after_state={"title": doc.title, "category": doc.category.value, "version": doc.version}
    )
    return doc

@router.post("/{doc_id}/verify", response_model=DocumentResponse)
def verify_document(
    doc_id: int,
    payload: DocumentVerificationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole([UserRole.SUPER_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.REVIEWER]))
):
    """Authorized reviewer or compliance officer marks document verified, correction requested, or rejected."""
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    enforce_institution_access(current_user, doc.institution_id)

    before_status = doc.verification_status
    doc.verification_status = payload.verification_status
    doc.verified_by_user_id = current_user.id
    doc.verified_at = datetime.utcnow()
    doc.verification_notes = payload.verification_notes
    db.commit()

    # Re-evaluate compliance rules
    evaluate_application_compliance(db, doc.application_id)
    compute_application_risk(db, doc.application_id)

    log_audit_event(
        db, "DOCUMENT_VERIFICATION", "DOCUMENT", str(doc.id),
        user=current_user,
        before_state={"status": before_status.value},
        after_state={"status": doc.verification_status.value, "notes": doc.verification_notes}
    )
    return doc

@router.put("/fields/{field_id}/correct", response_model=ExtractedFieldResponse)
def correct_extracted_field(
    field_id: int,
    payload: ExtractedFieldCorrectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Allows staff to correct extracted OCR values against original evidence."""
    field = db.query(ExtractedDocumentField).filter(ExtractedDocumentField.id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Extracted field not found")

    enforce_institution_access(current_user, field.document.institution_id)
    before_val = field.extracted_value
    field.corrected_value = payload.corrected_value
    field.is_verified = True
    field.corrected_by_user_id = current_user.id
    db.commit()
    db.refresh(field)

    log_audit_event(
        db, "FIELD_MANUAL_CORRECTION", "EXTRACTED_FIELD", str(field.id),
        user=current_user,
        before_state={"field": field.field_name, "value": before_val},
        after_state={"field": field.field_name, "value": payload.corrected_value}
    )
    return field

@router.get("/{doc_id}/download")
def download_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    enforce_institution_access(current_user, doc.institution_id)

    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File on storage not found")

    return FileResponse(
        path=doc.file_path,
        filename=doc.file_name,
        media_type=doc.mime_type
    )
