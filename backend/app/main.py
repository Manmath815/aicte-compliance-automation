import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from apscheduler.schedulers.background import BackgroundScheduler

from app.config import settings
from app.database import engine, Base
from app.api.v1 import api_router
from app.seed_data import seed_database
from app.services.alert_scheduler import run_deadline_and_compliance_checks

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("aicte_smartflow")

scheduler = BackgroundScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables and seed default demo data
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    logger.info("Checking and seeding demo data...")
    seed_database()

    # Start background scheduler for deadline and compliance checks
    try:
        scheduler.add_job(
            run_deadline_and_compliance_checks,
            "interval",
            minutes=10,
            id="deadline_and_compliance_check",
            replace_existing=True
        )
        scheduler.start()
        logger.info("Background deadline and alert scheduler started successfully.")
    except Exception as e:
        logger.warning(f"Could not start background scheduler: {e}")

    yield

    # Shutdown
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Background scheduler shutdown completed.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Integrated AICTE Approval Workflow Automation, Compliance Monitoring and Alert Management System",
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development, allow frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount local uploads directory for document access
app.mount("/uploads", StaticFiles(directory=str(settings.UPLOAD_DIR)), name="uploads")

# Include API Routers
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": "development"
    }

@app.get("/", tags=["Root"])
def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "tagline": settings.TAGLINE,
        "docs_url": "/docs",
        "notice": "Institutional compliance automation engine. Does not grant official AICTE approval."
    }
