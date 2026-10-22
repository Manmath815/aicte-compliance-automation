import React, { useState, useEffect } from 'react';
import {
  GitBranch, Check, Clock, AlertTriangle, ArrowRight, FileCheck,
  Plus, Calendar, UserCheck, ShieldAlert, CheckCircle, ExternalLink, MessageSquare
} from 'lucide-react';
import { Application, ApplicationStage, ApplicationTimelineEvent, SeverityLevel } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const WorkflowView: React.FC = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [timeline, setTimeline] = useState<ApplicationTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [transitionComment, setTransitionComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for new application
  const [newType, setNewType] = useState('Extension of Approval (EoA)');
  const [newDeadline, setNewDeadline] = useState('2026-03-31');
  const [newPriority, setNewPriority] = useState<SeverityLevel>('HIGH');

  // Form states for official AICTE submission record
  const [submissionRef, setSubmissionRef] = useState('');
  const [decision, setDecision] = useState('APPROVED');
  const [decisionRemarks, setDecisionRemarks] = useState('');

  const stages: { stage: ApplicationStage; label: string; desc: string }[] = [
    { stage: 'DRAFT', label: 'Draft', desc: 'Application initiated' },
    { stage: 'DOCUMENT_COLLECTION', label: 'Document Collection', desc: 'Uploading regulatory evidence' },
    { stage: 'AUTOMATED_VALIDATION', label: 'Automated Validation', desc: 'PyMuPDF OCR & Rule analysis' },
    { stage: 'OFFICER_REVIEW', label: 'Officer Review', desc: 'Compliance officer inspection' },
    { stage: 'CORRECTIONS_REQUIRED', label: 'Corrections Required', desc: 'Deficiencies flagged' },
    { stage: 'INTERNAL_APPROVAL', label: 'Internal Approval', desc: 'Institutional sign-off' },
    { stage: 'READY_FOR_SUBMISSION', label: 'Ready for Submission', desc: 'Prepared for official portal' },
    { stage: 'SUBMITTED_MANUAL', label: 'Submitted (Manual Entry)', desc: 'Reference logged' },
    { stage: 'EXTERNAL_DECISION_RECORDED', label: 'AICTE Decision Recorded', desc: 'Official order finalized' },
  ];

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const apps = await api.getApplications();
      setApplications(apps);
      if (apps.length > 0 && !selectedApp) {
        setSelectedApp(apps[0]);
        loadTimeline(apps[0].id);
      } else if (selectedApp) {
        const updated = apps.find(a => a.id === selectedApp.id);
        if (updated) setSelectedApp(updated);
        loadTimeline(selectedApp.id);
      }
    } catch (e) {
      console.error('Failed to load applications:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadTimeline = async (appId: number) => {
    try {
      const t = await api.getApplicationTimeline(appId);
      setTimeline(t);
    } catch (e) {
      console.error('Failed to load timeline:', e);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleStageTransition = async (targetStage: ApplicationStage) => {
    if (!selectedApp) return;
    setIsSubmitting(true);
    try {
      await api.transitionApplicationStage(selectedApp.id, targetStage, transitionComment);
      setTransitionComment('');
      await fetchApplications();
    } catch (e: any) {
      alert(`Transition error: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const newApp = await api.createApplication({
        academic_year_id: 2, // 2025-2026
        application_type: newType,
        target_deadline: new Date(newDeadline).toISOString(),
        priority: newPriority,
      });
      setShowCreateModal(false);
      await fetchApplications();
      setSelectedApp(newApp);
    } catch (e: any) {
      alert(`Creation error: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    setIsSubmitting(true);
    try {
      await api.recordExternalDecision(selectedApp.id, {
        submission_ref_number: submissionRef,
        external_decision: decision,
        external_decision_date: new Date().toISOString(),
        external_decision_remarks: decisionRemarks,
      });
      setShowDecisionModal(false);
      await fetchApplications();
    } catch (e: any) {
      alert(`Decision recording error: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentStageIndex = selectedApp
    ? stages.findIndex(s => s.stage === selectedApp.current_stage)
    : 0;

  // Next logical stage in sequence
  const getNextStage = (): ApplicationStage | null => {
    if (!selectedApp) return null;
    switch (selectedApp.current_stage) {
      case 'DRAFT':
        return 'DOCUMENT_COLLECTION';
      case 'DOCUMENT_COLLECTION':
        return 'AUTOMATED_VALIDATION';
      case 'AUTOMATED_VALIDATION':
        return 'OFFICER_REVIEW';
      case 'OFFICER_REVIEW':
        return 'INTERNAL_APPROVAL';
      case 'CORRECTIONS_REQUIRED':
        return 'DOCUMENT_COLLECTION';
      case 'INTERNAL_APPROVAL':
        return 'READY_FOR_SUBMISSION';
      case 'READY_FOR_SUBMISSION':
        return 'SUBMITTED_MANUAL';
      case 'SUBMITTED_MANUAL':
        return 'EXTERNAL_DECISION_RECORDED';
      default:
        return null;
    }
  };

  const nextStage = getNextStage();

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-sky-400" />
            Approval Workflow Automation & Governance
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Strict sequential institutional approval lifecycle with role gates and audit timestamps
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary hover:bg-primary-hover text-white text-xs font-medium px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Approval Application</span>
        </button>
      </div>

      {/* Applications Selector Pill Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {applications.map((app) => (
          <button
            key={app.id}
            onClick={() => {
              setSelectedApp(app);
              loadTimeline(app.id);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium border flex items-center gap-2.5 transition-all shrink-0 ${
              selectedApp?.id === app.id
                ? 'bg-sky-500/20 border-sky-500/50 text-white shadow-sm shadow-sky-500/20'
                : 'bg-surface-card border-surface-border text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="font-semibold">{app.application_type}</span>
            <span className="text-[10px] font-mono bg-slate-900 px-1.5 py-0.5 rounded text-sky-300">
              #{app.id}
            </span>
            <span className="text-[11px] text-slate-400">
              ({app.current_stage.replace(/_/g, ' ')})
            </span>
          </button>
        ))}
      </div>

      {selectedApp && (
        <>
          {/* Visual Interactive Timeline Stepper */}
          <div className="bg-surface-card border border-surface-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-sm font-semibold text-white">Visual Workflow Progress Timeline</h2>
                <p className="text-xs text-slate-400">Current Phase: <span className="font-semibold text-sky-300">{selectedApp.current_stage.replace(/_/g, ' ')}</span></p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Target Deadline:</span>
                <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {new Date(selectedApp.target_deadline).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Stepper Steps Grid */}
            <div className="grid grid-cols-1 md:grid-cols-9 gap-2 relative">
              {stages.map((st, idx) => {
                const isPassed = idx < currentStageIndex;
                const isCurrent = idx === currentStageIndex;
                return (
                  <div key={st.stage} className="flex flex-col items-center text-center relative group">
                    {/* Circle icon */}
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                        isCurrent
                          ? 'bg-sky-500 text-white ring-4 ring-sky-500/20 shadow-lg shadow-sky-500/40 scale-110'
                          : isPassed
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-800 text-slate-500 border border-slate-700'
                      }`}
                    >
                      {isPassed ? <Check className="w-4 h-4 stroke-[3]" /> : idx + 1}
                    </div>

                    {/* Step label */}
                    <div className="mt-2.5">
                      <div className={`text-[11px] font-semibold leading-tight ${isCurrent ? 'text-sky-300' : isPassed ? 'text-slate-200' : 'text-slate-500'}`}>
                        {st.label}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5 line-clamp-1 hidden md:block">
                        {st.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Transition Controls Bar */}
            <div className="mt-8 pt-5 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 flex-1">
                <MessageSquare className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Optional review notes / transition comments..."
                  value={transitionComment}
                  onChange={(e) => setTransitionComment(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-xs text-slate-200 px-3 py-1.5 rounded-lg focus:outline-none focus:border-sky-500 w-full max-w-md"
                />
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                {/* Corrections Required Button if in Officer Review */}
                {selectedApp.current_stage === 'OFFICER_REVIEW' && (
                  <button
                    onClick={() => handleStageTransition('CORRECTIONS_REQUIRED')}
                    disabled={isSubmitting}
                    className="bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Request Corrections</span>
                  </button>
                )}

                {/* Submit Decision Dialog Trigger */}
                {selectedApp.current_stage === 'SUBMITTED_MANUAL' && (
                  <button
                    onClick={() => setShowDecisionModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Record AICTE Order Outcome</span>
                  </button>
                )}

                {/* Advance Stage Button */}
                {nextStage && selectedApp.current_stage !== 'SUBMITTED_MANUAL' && (
                  <button
                    onClick={() => handleStageTransition(nextStage)}
                    disabled={isSubmitting}
                    className="bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-md shadow-sky-500/20 disabled:opacity-50"
                  >
                    <span>Advance to {nextStage.replace(/_/g, ' ')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Details & Audit History */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Meta Information Box */}
            <div className="bg-surface-card border border-surface-border rounded-xl p-4 space-y-3">
              <h2 className="text-sm font-semibold text-white">Application Parameters</h2>
              <div className="space-y-2 text-xs divide-y divide-slate-800">
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Application Type</span>
                  <span className="text-slate-200 font-medium">{selectedApp.application_type}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Target Submission Deadline</span>
                  <span className="text-amber-400 font-mono font-medium">{new Date(selectedApp.target_deadline).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Assigned Compliance Officer</span>
                  <span className="text-slate-200">{selectedApp.assigned_officer_name || 'Prof. Sunita Deshmukh'}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Assigned Internal Reviewer</span>
                  <span className="text-slate-200">{selectedApp.assigned_reviewer_name || 'Prof. Arvind Swaminathan'}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Official Submission Reference</span>
                  <span className="text-cyan-400 font-mono font-medium">
                    {selectedApp.submission_ref_number || 'Pending Final Internal Sign-Off'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">External AICTE Decision</span>
                  <span className="font-semibold text-emerald-400">
                    {selectedApp.external_decision || 'Awaiting Official AICTE Order'}
                  </span>
                </div>
              </div>
            </div>

            {/* Timeline Event Log */}
            <div className="lg:col-span-2 bg-surface-card border border-surface-border rounded-xl p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-400" />
                Audit Trail & State Transition History
              </h2>
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {timeline.map((event) => (
                  <div key={event.id} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200">{event.from_stage.replace(/_/g, ' ')}</span>
                        <ArrowRight className="w-3 h-3 text-slate-500" />
                        <span className="font-semibold text-sky-400">{event.to_stage.replace(/_/g, ' ')}</span>
                      </div>
                      {event.comments && (
                        <p className="text-slate-400 text-[11px] italic">"{event.comments}"</p>
                      )}
                      <div className="text-[10px] text-slate-500">
                        Action by <span className="text-slate-300 font-medium">{event.user_name}</span> ({event.user_role})
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {new Date(event.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal: Create Application */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-card border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-base font-bold text-white mb-1">Create Approval Application</h2>
            <p className="text-xs text-slate-400 mb-4">Initialize new AICTE regulatory workflow for this institution.</p>
            <form onSubmit={handleCreateApplication} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Application Category / Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-2 rounded-lg text-xs"
                >
                  <option value="Extension of Approval (EoA)">Extension of Approval (EoA)</option>
                  <option value="Increase in Intake">Increase in Intake (Tier-1 Programs)</option>
                  <option value="Introduction of New Course / Division">Introduction of New Course / Division</option>
                  <option value="Conversion of Diploma to Degree">Conversion of Diploma to Degree</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Target AICTE Cutoff Deadline</label>
                <input
                  type="date"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-2 rounded-lg text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Priority Level</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as SeverityLevel)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-2 rounded-lg text-xs"
                >
                  <option value="HIGH">High (Mandatory EoA Deadline)</option>
                  <option value="CRITICAL">Critical (Deficiency Window)</option>
                  <option value="MEDIUM">Medium</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-primary-hover text-white font-semibold px-4 py-1.5 rounded-lg"
                >
                  Initialize Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record External AICTE Decision */}
      {showDecisionModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-card border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-base font-bold text-white mb-1">Record Official AICTE Order</h2>
            <p className="text-xs text-slate-400 mb-4">
              Enter the verified submission reference number and official decision issued by AICTE.
            </p>
            <form onSubmit={handleRecordDecision} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">AICTE Official Application / Submission Reference</label>
                <input
                  type="text"
                  placeholder="e.g. AICTE/EOA/2025/1-109283741"
                  value={submissionRef}
                  onChange={(e) => setSubmissionRef(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-2 rounded-lg text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Official AICTE Decision</label>
                <select
                  value={decision}
                  onChange={(e) => setDecision(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-2 rounded-lg text-xs"
                >
                  <option value="APPROVED">APPROVED (Extension of Approval Granted)</option>
                  <option value="DEFICIENCIES_COMMUNICATED">DEFICIENCIES COMMUNICATED (Hearing Required)</option>
                  <option value="REJECTED">REJECTED (No Admission Year)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Order Remarks & Date</label>
                <textarea
                  placeholder="e.g. Order Letter AICTE/RO/DELHI/2025/891 dated 15-May-2025 approved with sanctioned intake 480 seats."
                  value={decisionRemarks}
                  onChange={(e) => setDecisionRemarks(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-2 rounded-lg text-xs h-20"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDecisionModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-1.5 rounded-lg"
                >
                  Record Official Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
