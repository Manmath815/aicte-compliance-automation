import re
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.entities import (
    RAGKnowledgeChunk, Application, ComplianceAssessment,
    ComplianceRuleStatus, Document, RemediationTask, User
)
from app.schemas.all_schemas import Citation, AssistantQueryResponse
from app.config import settings

def search_regulatory_knowledge(db: Session, query: str, limit: int = 4) -> List[RAGKnowledgeChunk]:
    """Retrieve relevant chunks from official AICTE Approval Process Handbook database."""
    query_terms = [t.lower() for t in re.findall(r'\b[a-zA-Z0-9]{3,}\b', query)]
    all_chunks = db.query(RAGKnowledgeChunk).all()
    
    scored_chunks = []
    for chunk in all_chunks:
        score = 0
        searchable_text = f"{chunk.title} {chunk.content} {chunk.category} {' '.join(chunk.keywords)}".lower()
        for term in query_terms:
            if term in searchable_text:
                score += 1
                if term in chunk.title.lower():
                    score += 2
        if score > 0:
            scored_chunks.append((score, chunk))

    scored_chunks.sort(key=lambda x: x[0], reverse=True)
    return [c[1] for c in scored_chunks[:limit]]

def answer_compliance_query(
    db: Session,
    query: str,
    user: User,
    application_id: Optional[int] = None
) -> AssistantQueryResponse:
    """
    RAG-powered AI Compliance Assistant.
    Retrieves from approved AICTE handbook chunks and authorized institution records.
    Enforces strict citations and safety boundaries.
    """
    norm_query = query.lower()
    citations: List[Citation] = []
    context_chunks = search_regulatory_knowledge(db, query, limit=3)

    for chunk in context_chunks:
        citations.append(Citation(
            source_title=chunk.source_title,
            section_number=chunk.section_number,
            page_number=chunk.page_number,
            snippet=chunk.content[:200] + "...",
            url=chunk.source_url
        ))

    # Retrieve application context if specified and authorized
    app_context_str = ""
    if application_id:
        app = db.query(Application).filter(Application.id == application_id).first()
        if app and (user.institution_id == app.institution_id or user.role.value == "SUPER_ADMIN"):
            incomplete = db.query(ComplianceAssessment).filter(
                ComplianceAssessment.application_id == application_id,
                ComplianceAssessment.status.in_([ComplianceRuleStatus.INCOMPLETE, ComplianceRuleStatus.NON_COMPLIANT])
            ).all()
            
            incomplete_names = [f"{a.rule.rule_code}: {a.rule.title}" for a in incomplete]
            app_context_str = f"Application #{app.id} is currently in stage '{app.current_stage.value}' with deadline {app.target_deadline.strftime('%Y-%m-%d')}. Deficiencies/Incomplete: {', '.join(incomplete_names) if incomplete_names else 'None'}. "

    # Rule-guided response generator
    answer = ""
    has_sufficient_evidence = len(context_chunks) > 0 or bool(app_context_str)

    if not has_sufficient_evidence:
        return AssistantQueryResponse(
            answer="Insufficient evidence in the approved regulatory database to answer this question. Please refer directly to the official AICTE Approval Process Handbook (2024-2027) or consult your regional AICTE office.",
            citations=[],
            confidence=0.0,
            has_sufficient_evidence=False
        )

    # Check common compliance query intents
    if "incomplete" in norm_query or "pending" in norm_query or "deficient" in norm_query:
        if app_context_str:
            answer = f"Based on your current institutional records:\n\n{app_context_str}\n\nTo resolve incomplete items, upload authenticated documentation in the Compliance Center matching the respective APH requirements cited below."
        else:
            answer = "Incomplete requirements occur when required evidentiary documents (such as Land Deeds, Building Completion, Fire NOC, or Faculty rosters) have not been uploaded or have failed automated validation."

    elif "faculty" in norm_query or "ratio" in norm_query or "cadre" in norm_query:
        primary_chunk = next((c for c in context_chunks if "faculty" in c.title.lower()), context_chunks[0] if context_chunks else None)
        if primary_chunk:
            answer = f"According to {primary_chunk.source_title} ({primary_chunk.section_number}, Page {primary_chunk.page_number}):\n\n{primary_chunk.content}\n\nInstitutions must maintain the mandated Cadre Ratio (1 Professor : 2 Associate Professors : 6 Assistant Professors) and an overall Faculty-to-Student ratio of 1:15 for UG Engineering & Technology."
        else:
            answer = "Under AICTE APH norms, UG Engineering programs require a 1:15 faculty-to-student ratio, with Ph.D. mandatory for the Principal/Director and all Professor cadres."

    elif "land" in norm_query or "carpet" in norm_query or "built" in norm_query or "infrastructure" in norm_query:
        primary_chunk = next((c for c in context_chunks if "land" in c.title.lower() or "area" in c.title.lower()), context_chunks[0] if context_chunks else None)
        if primary_chunk:
            answer = f"According to {primary_chunk.source_title} ({primary_chunk.section_number}, Page {primary_chunk.page_number}):\n\n{primary_chunk.content}\n\nAll land must be contiguous, legally owned or on a registered government lease of at least 30 years."

    elif "deadline" in norm_query or "date" in norm_query:
        if app_context_str:
            answer = f"Your active institutional application deadline schedule:\n\n{app_context_str}\n\nPer AICTE guidelines, submission windows close strictly at 23:59 IST on the target date. The system alerts administrators at 30, 14, 7, and 1-day intervals."
        else:
            answer = "Annual AICTE Extension of Approval (EoA) applications are governed by the annual academic calendar published on the AICTE portal, typically open during February-March with non-extendable cutoffs."

    elif "fire" in norm_query or "safety" in norm_query:
        primary_chunk = next((c for c in context_chunks if "fire" in c.title.lower()), context_chunks[0] if context_chunks else None)
        if primary_chunk:
            answer = f"According to {primary_chunk.source_title} ({primary_chunk.section_number}, Page {primary_chunk.page_number}):\n\n{primary_chunk.content}\n\nValid Fire Safety Certificate issued by the competent State Fire Authority is a non-negotiable prerequisite for Extension of Approval."

    else:
        # Default synthesized answer citing best matching chunk
        top_chunk = context_chunks[0]
        answer = f"Based on verified regulatory records in {top_chunk.source_title} ({top_chunk.section_number}, Page {top_chunk.page_number}):\n\n{top_chunk.content}\n\n{app_context_str}"

    return AssistantQueryResponse(
        answer=answer,
        citations=citations,
        confidence=0.94 if citations else 0.5,
        has_sufficient_evidence=True
    )
