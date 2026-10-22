import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, AlertTriangle, CheckCircle, ArrowRight,
  TrendingUp, Info, ListOrdered, Sparkles, RefreshCw
} from 'lucide-react';
import { RiskAssessment } from '../types';
import { api } from '../services/api';

export const RiskView: React.FC = () => {
  const [risk, setRisk] = useState<RiskAssessment | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRisk = async () => {
    setLoading(true);
    try {
      const data = await api.getRiskAssessment(1); // Default demo app ID
      setRisk(data);
    } catch (e) {
      console.error('Failed to load risk:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRisk();
  }, []);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'text-rose-500 border-rose-500/30 bg-rose-500/10';
      case 'HIGH':
        return 'text-orange-400 border-orange-500/30 bg-orange-500/10';
      case 'MEDIUM':
        return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
      default:
        return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            AI Compliance Risk Assessment & Prioritization Engine
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Deterministic, explainable risk scoring across missing documents, task SLAs, expiring certifications, and non-compliance
          </p>
        </div>

        <button
          onClick={fetchRisk}
          className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Recompute Risk</span>
        </button>
      </div>

      {/* Main Risk Overview Hero Card */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Risk Gauge Box */}
          <div className="md:col-span-4 flex flex-col items-center justify-center p-5 bg-slate-950 rounded-2xl border border-slate-800 text-center">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-1">
              Composite Risk Index
            </span>
            <div className="text-5xl font-extrabold text-white tracking-tight my-2">
              {risk?.overall_score || 32.5}
              <span className="text-xl text-slate-500 font-normal">/100</span>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-bold border mt-1 ${getRiskColor(risk?.risk_level || 'MEDIUM')}`}>
              Level: {risk?.risk_level || 'MEDIUM'} RISK
            </div>
            <p className="text-[10px] text-slate-500 mt-3 max-w-[220px]">
              Internal institutional prioritization aid. Does not represent official AICTE rating or approval forecast.
            </p>
          </div>

          {/* 4 Factor Breakdown Progress Bars */}
          <div className="md:col-span-8 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Deterministic Weighted Factor Breakdown
            </h2>

            {/* Factor 1 */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between font-medium">
                <span className="text-slate-300">1. Missing Mandatory Evidence (Weight: 30%)</span>
                <span className="font-mono text-cyan-400">{risk?.missing_docs_score || 0}% Sub-score</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="bg-cyan-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${risk?.missing_docs_score || 0}%` }}
                ></div>
              </div>
            </div>

            {/* Factor 2 */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between font-medium">
                <span className="text-slate-300">2. Overdue Remediation Tasks (Weight: 25%)</span>
                <span className="font-mono text-orange-400">{risk?.overdue_tasks_score || 0}% Sub-score</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${risk?.overdue_tasks_score || 0}%` }}
                ></div>
              </div>
            </div>

            {/* Factor 3 */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between font-medium">
                <span className="text-slate-300">3. Expiring Regulatory Certifications (Weight: 20%)</span>
                <span className="font-mono text-amber-400">{risk?.expiring_docs_score || 0}% Sub-score</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${risk?.expiring_docs_score || 0}%` }}
                ></div>
              </div>
            </div>

            {/* Factor 4 */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between font-medium">
                <span className="text-slate-300">4. Unresolved High-Severity Norms (Weight: 25%)</span>
                <span className="font-mono text-rose-400">{risk?.non_compliance_score || 0}% Sub-score</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="bg-rose-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${risk?.non_compliance_score || 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Suggested Actions Callout */}
      <div className="bg-sky-950/30 border border-sky-800/40 rounded-xl p-4 space-y-2">
        <h2 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          Recommended Institutional Corrective Actions
        </h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-300 pt-1">
          {(risk?.suggested_actions || []).map((action, i) => (
            <li key={i} className="flex items-start gap-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
              <span className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-[10px] shrink-0 font-bold mt-0.5">
                {i + 1}
              </span>
              <span>{action}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Ranked Issues Requiring Immediate Attention */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <ListOrdered className="w-4 h-4 text-sky-400" />
            Ranked Deficiencies & Priority Issues ({risk?.ranked_issues?.length || 0})
          </h2>
          <span className="text-[11px] text-slate-500">Ordered by impact score descending</span>
        </div>

        <div className="space-y-2.5">
          {(risk?.ranked_issues || []).map((issue, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-200 text-sm">{issue.title}</span>
                  <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                    issue.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  }`}>
                    {issue.severity}
                  </span>
                  {issue.rule_code && (
                    <span className="font-mono text-cyan-400 text-[10px] bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                      {issue.rule_code}
                    </span>
                  )}
                </div>
                <p className="text-slate-400 text-xs">{issue.description}</p>
                <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 pt-0.5">
                  <span className="font-semibold">Suggested Action:</span>
                  <span>{issue.suggested_action}</span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-lg font-bold font-mono text-white">{issue.impact_score}</div>
                <div className="text-[10px] text-slate-500 uppercase">Impact Score</div>
              </div>
            </div>
          ))}
          {(!risk?.ranked_issues || risk.ranked_issues.length === 0) && (
            <p className="text-xs text-slate-500 text-center py-6">No outstanding critical compliance issues detected.</p>
          )}
        </div>
      </div>
    </div>
  );
};
