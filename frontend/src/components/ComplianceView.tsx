import React, { useState, useEffect } from 'react';
import {
  CheckCircle2, AlertTriangle, XCircle, Clock, ShieldAlert,
  Play, Filter, Search, Plus, BookOpen, ExternalLink, RefreshCw,
  Check, ArrowRight, User
} from 'lucide-react';
import {
  ComplianceAssessment, ComplianceRule, RemediationTask,
  ComplianceRuleStatus, SeverityLevel, TaskStatus
} from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const ComplianceView: React.FC = () => {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState<ComplianceAssessment[]>([]);
  const [rules, setRules] = useState<ComplianceRule[]>([]);
  const [tasks, setTasks] = useState<RemediationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<ComplianceAssessment | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Override Modal
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideStatus, setOverrideStatus] = useState<ComplianceRuleStatus>('COMPLIANT');
  const [overrideReason, setOverrideReason] = useState('');

  // Task Creation Modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('2026-03-15');
  const [taskPriority, setTaskPriority] = useState<SeverityLevel>('HIGH');

  const appId = 1; // Default demo application

  const fetchData = async () => {
    setLoading(true);
    try {
      const [assList, ruleList, taskList] = await Promise.all([
        api.getAssessments(appId),
        api.getComplianceRules(),
        api.getRemediationTasks(appId)
      ]);
      setAssessments(assList);
      setRules(ruleList);
      setTasks(taskList);
      if (assList.length > 0 && !selectedAssessment) {
        setSelectedAssessment(assList[0]);
      }
    } catch (e) {
      console.error('Failed to load compliance data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRunEvaluation = async () => {
    setIsEvaluating(true);
    try {
      const updated = await api.evaluateCompliance(appId);
      setAssessments(updated);
      const updatedTasks = await api.getRemediationTasks(appId);
      setTasks(updatedTasks);
      if (selectedAssessment) {
        const found = updated.find(a => a.id === selectedAssessment.id);
        if (found) setSelectedAssessment(found);
      }
    } catch (e: any) {
      alert(`Evaluation error: ${e.message}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssessment || !overrideReason) return;
    try {
      await api.overrideAssessment(selectedAssessment.id, overrideStatus, overrideReason);
      setShowOverrideModal(false);
      setOverrideReason('');
      await fetchData();
    } catch (e: any) {
      alert(`Override error: ${e.message}`);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createRemediationTask({
        application_id: appId,
        assessment_id: selectedAssessment?.id,
        title: taskTitle,
        description: taskDesc,
        due_date: new Date(taskDueDate).toISOString(),
        priority: taskPriority,
      });
      setShowTaskModal(false);
      setTaskTitle('');
      setTaskDesc('');
      const updatedTasks = await api.getRemediationTasks(appId);
      setTasks(updatedTasks);
    } catch (e: any) {
      alert(`Task creation error: ${e.message}`);
    }
  };

  const handleToggleTaskStatus = async (task: RemediationTask) => {
    const nextStatus = task.status === 'RESOLVED' ? 'OPEN' : 'RESOLVED';
    try {
      await api.updateRemediationTask(task.id, {
        status: nextStatus,
        resolution_notes: nextStatus === 'RESOLVED' ? 'Remediation completed by staff.' : '',
      });
      const updatedTasks = await api.getRemediationTasks(appId);
      setTasks(updatedTasks);
    } catch (e: any) {
      alert(`Error updating task: ${e.message}`);
    }
  };

  const getStatusBadge = (status: ComplianceRuleStatus) => {
    switch (status) {
      case 'COMPLIANT':
        return <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Compliant</span>;
      case 'NON_COMPLIANT':
        return <span className="bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1"><XCircle className="w-3 h-3" /> Non-Compliant</span>;
      case 'INCOMPLETE':
        return <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Incomplete</span>;
      case 'UNDER_REVIEW':
        return <span className="bg-sky-500/15 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1"><Clock className="w-3 h-3" /> Under Review</span>;
      case 'OUTDATED_EVIDENCE':
        return <span className="bg-amber-600/20 text-amber-300 border border-amber-600/30 px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1"><Clock className="w-3 h-3" /> Expired Evidence</span>;
      default:
        return <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px]">N/A</span>;
    }
  };

  const filteredAssessments = assessments.filter((a) => {
    const matchesStatus = filterStatus === 'ALL' || a.status === filterStatus;
    const matchesSearch =
      a.rule.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.rule.rule_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.rule.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            AICTE Regulatory Compliance Monitoring & Rule Engine
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Deterministic rule validation against official AICTE Approval Process Handbook (2024-2027) norms
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRunEvaluation}
            disabled={isEvaluating}
            className="bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isEvaluating ? 'animate-spin' : ''}`} />
            <span>{isEvaluating ? 'Evaluating Rules...' : 'Run Compliance Evaluator'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-surface-card border border-surface-border p-3 rounded-xl">
        <div className="flex items-center gap-2 flex-wrap">
          {['ALL', 'COMPLIANT', 'INCOMPLETE', 'NON_COMPLIANT', 'UNDER_REVIEW', 'OUTDATED_EVIDENCE'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                filterStatus === st
                  ? 'bg-sky-500/20 text-white border border-sky-500/40'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              {st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search rule ID or norm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs text-slate-200 pl-8 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-sky-500 w-52"
          />
        </div>
      </div>

      {/* Split Layout: Assessments List and Details Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Rules Table */}
        <div className="lg:col-span-7 bg-surface-card border border-surface-border rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Evaluated Regulatory Rules ({filteredAssessments.length})
            </h2>
            <span className="text-[10px] font-mono text-cyan-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              APH 2024-2027 v1
            </span>
          </div>

          <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
            {filteredAssessments.map((ass) => {
              const isSelected = selectedAssessment?.id === ass.id;
              return (
                <div
                  key={ass.id}
                  onClick={() => setSelectedAssessment(ass)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-sky-500/15 border-sky-500/50 shadow-md shadow-sky-500/10'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-cyan-400 font-bold text-[11px] block">
                        {ass.rule.rule_code}
                      </span>
                      <div className="font-semibold text-slate-200 text-xs mt-0.5">{ass.rule.title}</div>
                    </div>
                    {getStatusBadge(ass.status)}
                  </div>

                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                    {ass.findings || ass.rule.description}
                  </p>

                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="truncate max-w-[200px]">{ass.rule.official_source_section}</span>
                    <span className="font-mono text-slate-400">Score: {ass.score}/100</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Assessment Inspector & Remediation Tasks */}
        <div className="lg:col-span-5 bg-surface-card border border-surface-border rounded-xl p-5 shadow-sm space-y-5">
          {selectedAssessment ? (
            <>
              {/* Header */}
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-800">
                <div>
                  <span className="font-mono text-cyan-400 text-xs font-bold block">
                    {selectedAssessment.rule.rule_code}
                  </span>
                  <h2 className="text-sm font-bold text-white mt-0.5">{selectedAssessment.rule.title}</h2>
                  <div className="mt-1 flex items-center gap-2">
                    {getStatusBadge(selectedAssessment.status)}
                    <span className="text-[10px] text-slate-400 font-mono">Severity: {selectedAssessment.rule.severity}</span>
                  </div>
                </div>

                {/* Compliance Officer Override Button */}
                {(user?.role === 'COMPLIANCE_OFFICER' || user?.role === 'SUPER_ADMIN') && (
                  <button
                    onClick={() => {
                      setOverrideStatus(selectedAssessment.status);
                      setShowOverrideModal(true);
                    }}
                    className="text-[11px] text-sky-400 hover:text-sky-300 font-medium bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-lg"
                  >
                    Override Status
                  </button>
                )}
              </div>

              {/* Handbook Source Citation Box */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                  <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                  <span>Official Handbook Citation</span>
                </div>
                <p className="text-slate-400 text-[11px]">{selectedAssessment.rule.description}</p>
                <div className="pt-1.5 flex items-center justify-between text-[10px] text-slate-500 font-mono border-t border-slate-900">
                  <span>{selectedAssessment.rule.official_source_title}</span>
                  <span className="text-sky-400">{selectedAssessment.rule.official_source_section}</span>
                </div>
              </div>

              {/* Evaluated Findings Box */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5 text-xs">
                <span className="font-semibold text-slate-300">Automated Findings & Evidence Match</span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  {selectedAssessment.findings || 'No specific findings logged.'}
                </p>
                {selectedAssessment.evidence_document_title && (
                  <div className="text-[10px] text-cyan-400 font-mono pt-1">
                    Matched Evidence: {selectedAssessment.evidence_document_title}
                  </div>
                )}
                {selectedAssessment.override_reason && (
                  <div className="mt-2 p-2 bg-sky-950/40 border border-sky-800/40 rounded text-[11px] text-sky-300 italic">
                    Officer Override Justification: "{selectedAssessment.override_reason}"
                  </div>
                )}
              </div>

              {/* Remediation Tasks for this Rule */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Remediation Tasks ({tasks.length})
                  </span>
                  <button
                    onClick={() => setShowTaskModal(true)}
                    className="text-[11px] text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Task
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {tasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">{t.title}</span>
                        <button
                          onClick={() => handleToggleTaskStatus(t)}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-colors ${
                            t.status === 'RESOLVED'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {t.status}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400">{t.description}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>Due: {new Date(t.due_date).toLocaleDateString()}</span>
                        <span>Assignee: {t.assigned_to_name || 'Staff'}</span>
                      </div>
                    </div>
                  ))}
                  {tasks.length === 0 && (
                    <p className="text-xs text-slate-500 py-3 text-center">No remediation tasks required for this norm.</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-slate-500 text-xs">
              Select a rule from the left table to inspect compliance findings.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Compliance Override */}
      {showOverrideModal && selectedAssessment && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-card border border-slate-700 rounded-xl p-5 w-full max-w-sm shadow-2xl">
            <h2 className="text-sm font-bold text-white mb-1">Override Compliance Assessment</h2>
            <p className="text-[11px] text-slate-400 mb-3 font-mono">Rule: {selectedAssessment.rule.rule_code}</p>

            <form onSubmit={handleSaveOverride} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">New Compliance Status</label>
                <select
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value as ComplianceRuleStatus)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-2 rounded-lg text-xs"
                >
                  <option value="COMPLIANT">COMPLIANT (Audited Evidence Satisfied)</option>
                  <option value="NON_COMPLIANT">NON_COMPLIANT (Deficiency Upheld)</option>
                  <option value="UNDER_REVIEW">UNDER_REVIEW (Pending Re-inspection)</option>
                  <option value="NOT_APPLICABLE">NOT_APPLICABLE (Exempt Institution)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Mandatory Justification / Committee Note</label>
                <textarea
                  placeholder="Provide authoritative explanation for overriding the automated rule check..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-2 rounded-lg text-xs h-20"
                  required
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary-hover text-white font-semibold px-3 py-1.5 rounded-lg"
                >
                  Commit Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Task */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-card border border-slate-700 rounded-xl p-5 w-full max-w-sm shadow-2xl">
            <h2 className="text-sm font-bold text-white mb-1">Assign Remediation Task</h2>
            <p className="text-[11px] text-slate-400 mb-3">Assign corrective action to resolve deficient compliance evidence.</p>

            <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Task Action Title</label>
                <input
                  type="text"
                  placeholder="e.g. Obtain Fire Dept Interim Renewal Acknowledgement"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-2 rounded-lg text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Remediation Instructions</label>
                <textarea
                  placeholder="Specify exact documentation or rectification required by AICTE norms..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-2 rounded-lg text-xs h-16"
                  required
                ></textarea>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Target Resolution Date</label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-2 rounded-lg text-xs"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary-hover text-white font-semibold px-3 py-1.5 rounded-lg"
                >
                  Assign Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
