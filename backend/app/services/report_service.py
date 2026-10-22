import io
import csv
from datetime import datetime
from typing import List, Dict, Any, Optional
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from sqlalchemy.orm import Session
from app.models.entities import (
    Application, ComplianceAssessment, Document, RemediationTask, RiskAssessment, AuditLog
)

def generate_compliance_pdf_report(db: Session, application_id: int) -> bytes:
    """Generate professional, publication-ready PDF compliance audit report using ReportLab."""
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        return b""

    assessments = db.query(ComplianceAssessment).filter(
        ComplianceAssessment.application_id == application_id
    ).all()

    risk = db.query(RiskAssessment).filter(
        RiskAssessment.application_id == application_id
    ).first()

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0f172a"),
        alignment=1 # Center
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor("#475569"),
        alignment=1
    )
    h2_style = ParagraphStyle(
        'Heading2',
        parent=styles['Heading2'],
        fontSize=13,
        leading=16,
        textColor=colors.HexColor("#0284c7")
    )
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#1e293b")
    )

    story = []

    # Title & Header
    story.append(Paragraph("<b>AICTE SmartFlow — Institutional Compliance Audit Report</b>", title_style))
    story.append(Paragraph(f"Institution: <b>{app.institution.name}</b> (AICTE Permanent ID: {app.institution.aicte_id})", subtitle_style))
    story.append(Paragraph(f"Report Generated: {datetime.utcnow().strftime('%d %B %Y, %H:%M UTC')} | Academic Year: {app.academic_year.name}", subtitle_style))
    story.append(Spacer(1, 12))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284c7"), spaceAfter=14))

    # Application Summary Box
    risk_level_str = risk.risk_level.value if risk else "N/A"
    risk_score_str = f"{risk.overall_score}/100" if risk else "N/A"
    
    summary_data = [
        [Paragraph("<b>Application Type</b>", body_style), Paragraph(app.application_type, body_style),
         Paragraph("<b>Workflow Stage</b>", body_style), Paragraph(app.current_stage.value, body_style)],
        [Paragraph("<b>Target Deadline</b>", body_style), Paragraph(app.target_deadline.strftime("%Y-%m-%d"), body_style),
         Paragraph("<b>Overall Risk Level</b>", body_style), Paragraph(f"<b>{risk_level_str}</b> ({risk_score_str})", body_style)],
        [Paragraph("<b>Submission Ref</b>", body_style), Paragraph(app.submission_ref_number or "Pending Internal Sign-off", body_style),
         Paragraph("<b>External Decision</b>", body_style), Paragraph(app.external_decision or "Awaiting AICTE Order", body_style)]
    ]
    summary_table = Table(summary_data, colWidths=[110, 160, 110, 160])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 16))

    # Compliance Findings Table
    story.append(Paragraph("<b>Detailed Regulatory Compliance Assessments</b>", h2_style))
    story.append(Spacer(1, 8))

    assess_data = [
        [Paragraph("<b>Rule Code</b>", body_style),
         Paragraph("<b>Norm Title & Handbook Ref</b>", body_style),
         Paragraph("<b>Status</b>", body_style),
         Paragraph("<b>Finding / Evidence</b>", body_style)]
    ]

    for a in assessments:
        status_color = "#10b981" if a.status.value == "COMPLIANT" else "#f59e0b" if a.status.value == "UNDER_REVIEW" else "#ef4444"
        assess_data.append([
            Paragraph(f"<b>{a.rule.rule_code}</b>", body_style),
            Paragraph(f"{a.rule.title}<br/><font color='#64748b' size=7>{a.rule.official_source_section}</font>", body_style),
            Paragraph(f"<font color='{status_color}'><b>{a.status.value}</b></font>", body_style),
            Paragraph(a.findings or "Awaiting verification", body_style)
        ])

    assess_table = Table(assess_data, colWidths=[80, 180, 80, 200])
    assess_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(assess_table)
    story.append(Spacer(1, 16))

    # Disclaimer Footer
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cbd5e1"), spaceAfter=8))
    story.append(Paragraph("<font size=7 color='#64748b'><b>Notice:</b> This document is an internal institutional compliance assessment prepared via AICTE SmartFlow. It does not represent an official AICTE inspection report or certificate of approval.</font>", subtitle_style))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()

def generate_compliance_csv_report(db: Session, application_id: int) -> str:
    """Generate structured CSV export of compliance assessments and remediation tasks."""
    output = io.StringIO()
    writer = csv.writer(output)

    # Headers
    writer.writerow([
        "Application ID", "Rule Code", "Rule Title", "Category", "Severity",
        "Official Handbook Section", "Status", "Score", "Findings",
        "Evidence Document ID", "Evaluated At"
    ])

    assessments = db.query(ComplianceAssessment).filter(
        ComplianceAssessment.application_id == application_id
    ).all()

    for a in assessments:
        writer.writerow([
            a.application_id,
            a.rule.rule_code,
            a.rule.title,
            a.rule.category.value,
            a.rule.severity.value,
            a.rule.official_source_section,
            a.status.value,
            a.score,
            a.findings or "",
            a.evidence_document_id or "MISSING",
            a.evaluated_at.strftime("%Y-%m-%d %H:%M")
        ])

    return output.getvalue()
