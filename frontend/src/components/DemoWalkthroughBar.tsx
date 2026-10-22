import React, { useState } from 'react';
import { PlayCircle, CheckCircle2, ChevronRight, ChevronLeft, Sparkles, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface DemoWalkthroughBarProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
}

export const DemoWalkthroughBar: React.FC<DemoWalkthroughBarProps> = ({ onNavigate }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const { demoLogin, user } = useAuth();

  const steps = [
    {
      title: "1. Create Approval Application",
      role: "INSTITUTION_ADMIN" as UserRole,
      tab: "workflows",
      description: "Institution Admin sets up the Extension of Approval (EoA) application for 2025-2026.",
      actionLabel: "Go to Workflows"
    },
    {
      title: "2. Upload Regulatory Documents",
      role: "INSTITUTION_ADMIN" as UserRole,
      tab: "documents",
      description: "Upload Land Title, Fire NOC, Building Completion, and Faculty roster.",
      actionLabel: "View Document Intelligence"
    },
    {
      title: "3. Document Intelligence & OCR Extraction",
      role: "INSTITUTION_ADMIN" as UserRole,
      tab: "documents",
      description: "Inspect PyMuPDF extracted fields (Carpet area, Fire NOC expiry, F:S ratio, PhD proofs).",
      actionLabel: "Inspect Extracted Fields"
    },
    {
      title: "4. Compliance Engine Rule Evaluation",
      role: "COMPLIANCE_OFFICER" as UserRole,
      tab: "compliance",
      description: "Run deterministic rule engine against AICTE APH 2024-27 chapters.",
      actionLabel: "Review Compliance Center"
    },
    {
      title: "5. Transparent Risk Assessment",
      role: "COMPLIANCE_OFFICER" as UserRole,
      tab: "risk",
      description: "Inspect 0-100 risk score breakdown, ranked issues, and suggested remediation.",
      actionLabel: "Inspect Risk Gauge"
    },
    {
      title: "6. Automated Deadline & Expiry Alerts",
      role: "COMPLIANCE_OFFICER" as UserRole,
      tab: "alerts",
      description: "View proactive alerts for Fire Safety NOC expiring in 18 days and submission deadline.",
      actionLabel: "Check Alerts & Notifications"
    },
    {
      title: "7. Assign Remediation Task",
      role: "COMPLIANCE_OFFICER" as UserRole,
      tab: "compliance",
      description: "Assign faculty Ph.D. certificate upload task to Director with 5-day SLA.",
      actionLabel: "View Remediation Tasks"
    },
    {
      title: "8. Reviewer Verification & Correction Request",
      role: "REVIEWER" as UserRole,
      tab: "documents",
      description: "Reviewer flags missing Form-16 proofs and logs 'Correction Requested'.",
      actionLabel: "Switch to Reviewer"
    },
    {
      title: "9. Corrected Evidence Rectification",
      role: "INSTITUTION_ADMIN" as UserRole,
      tab: "documents",
      description: "Institution Admin provides verified credential and re-triggers OCR validation.",
      actionLabel: "View Document Versions"
    },
    {
      title: "10. Reviewer Verification Sign-Off",
      role: "REVIEWER" as UserRole,
      tab: "documents",
      description: "Reviewer marks document 'VERIFIED', unlocking stage progression.",
      actionLabel: "Verify Evidence"
    },
    {
      title: "11. Executive Dashboard Compliance Update",
      role: "INSTITUTION_ADMIN" as UserRole,
      tab: "dashboard",
      description: "Dashboard updates KPIs, compliance trend chart, and risk reduction.",
      actionLabel: "Open Dashboard"
    },
    {
      title: "12. Audit Report & PDF / CSV Export",
      role: "INSTITUTION_ADMIN" as UserRole,
      tab: "reports",
      description: "Download ReportLab-generated official PDF compliance report & audit logs.",
      actionLabel: "Export Reports"
    },
    {
      title: "13. RAG AI Assistant with Verified Citations",
      role: "INSTITUTION_ADMIN" as UserRole,
      tab: "assistant",
      description: "Ask AI Assistant regulatory questions with verified citations from AICTE Handbook.",
      actionLabel: "Chat with AI Assistant"
    }
  ];

  const activeStep = steps[currentStep];

  const handleExecuteStep = async () => {
    if (user?.role !== activeStep.role) {
      await demoLogin(activeStep.role);
    }
    onNavigate(activeStep.tab);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 bg-gradient-to-r from-sky-600 to-cyan-600 text-white px-3.5 py-2 rounded-full shadow-lg flex items-center gap-2 text-xs font-semibold hover:shadow-cyan-500/25 transition-all"
      >
        <Sparkles className="w-4 h-4" />
        Hackathon Demo Tour
      </button>
    );
  }

  return (
    <div className="bg-slate-900 border-b border-sky-500/30 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs shadow-md">
      <div className="flex items-center gap-2.5">
        <div className="bg-sky-500/20 text-sky-400 p-1.5 rounded-md flex items-center gap-1 font-bold">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>HACKATHON DEMO SCENARIO</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200">{activeStep.title}</span>
          <span className="text-slate-400 hidden sm:inline">— {activeStep.description}</span>
          <span className="bg-slate-800 text-cyan-300 px-2 py-0.5 rounded border border-slate-700 text-[10px] font-mono">
            Persona: {activeStep.role.replace('_', ' ')}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleExecuteStep}
          className="bg-primary hover:bg-primary-hover text-white px-3 py-1 rounded font-medium flex items-center gap-1.5 transition-all shadow-sm shadow-sky-500/20"
        >
          <PlayCircle className="w-3.5 h-3.5" />
          <span>{activeStep.actionLabel}</span>
        </button>

        <div className="flex items-center border border-slate-700 rounded bg-slate-800/80">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
            title="Previous Step"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 font-mono text-[11px] text-slate-300">
            {currentStep + 1}/{steps.length}
          </span>
          <button
            onClick={nextStep}
            disabled={currentStep === steps.length - 1}
            className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
            title="Next Step"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={() => setIsOpen(false)}
          className="text-slate-500 hover:text-slate-300 p-1 ml-1"
          title="Minimize tour"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
