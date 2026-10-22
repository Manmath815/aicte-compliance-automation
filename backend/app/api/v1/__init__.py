from fastapi import APIRouter
from app.api.v1 import (
    auth, institutions, applications, documents,
    compliance, risk, alerts, assistant, reports, dashboard, admin
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(institutions.router)
api_router.include_router(applications.router)
api_router.include_router(documents.router)
api_router.include_router(compliance.router)
api_router.include_router(risk.router)
api_router.include_router(alerts.router)
api_router.include_router(assistant.router)
api_router.include_router(reports.router)
api_router.include_router(dashboard.router)
api_router.include_router(admin.router)
