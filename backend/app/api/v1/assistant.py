from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.entities import User
from app.schemas.all_schemas import AssistantQueryRequest, AssistantQueryResponse
from app.services.auth_service import get_current_user
from app.services.rag_service import answer_compliance_query
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/assistant", tags=["AI Compliance Assistant"])

@router.post("/query", response_model=AssistantQueryResponse)
def query_ai_assistant(
    payload: AssistantQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    response = answer_compliance_query(
        db=db,
        query=payload.query,
        user=current_user,
        application_id=payload.application_id
    )
    log_audit_event(
        db, "AI_ASSISTANT_QUERY", "AI_QUERY", None,
        user=current_user,
        after_state={"query": payload.query, "citations_count": len(response.citations)}
    )
    return response
