import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet, Download, FileText, CheckCircle2,
  Clock, Shield, Filter, Search, ArrowRight, User
} from 'lucide-react';
import { api } from '../services/api';

export const ReportsView: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const logs = await api.getAuditLogs();
      setAuditLogs(logs);
    } catch (e) {
      console.error('Failed to load audit logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = auditLogs.filter((log) => {
    return (
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-sky-400" />
            Compliance Reports & Append-Only Audit Trail
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Download authoritative institutional audit dossiers and verify immutable timestamps and state modifications
          </p>
        </div>

        {/* Download Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="/api/v1/reports/compliance-pdf/1"
            download
            className="bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Compliance Dossier (PDF)</span>
          </a>
          <a
            href="/api/v1/reports/compliance-csv/1"
            download
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Reports Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-card border border-surface-border rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200 text-sm">Full Institutional Compliance Dossier</span>
            <FileText className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-xs text-slate-400">
            Comprehensive audit report covering Land, Faculty Cadre, Fire NOC, Built-up area, and Accreditation.
          </p>
          <div className="pt-2">
            <a
              href="/api/v1/reports/compliance-pdf/1"
              download
              className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1"
            >
              Generate Official PDF <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="bg-surface-card border border-surface-border rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200 text-sm">Norms & Deficiencies Matrix</span>
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xs text-slate-400">
            Structured spreadsheet containing rule scores, handbook references, findings, and remediation status.
          </p>
          <div className="pt-2">
            <a
              href="/api/v1/reports/compliance-csv/1"
              download
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
            >
              Export CSV Dataset <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="bg-surface-card border border-surface-border rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200 text-sm">Institutional Risk & Action Plan</span>
            <Shield className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xs text-slate-400">
            Internal executive briefing detailing top ranked issues, impact scores, and SLA remediation schedules.
          </p>
          <div className="pt-2">
            <span className="text-xs text-slate-500 font-mono">Integrated in PDF Dossier</span>
          </div>
        </div>
      </div>

      {/* Append-Only Audit Trail Table */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" />
              Append-Only System Audit Log ({filteredLogs.length})
            </h2>
            <p className="text-xs text-slate-400">Immutable trace of user actions, transitions, and state diffs</p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search audit trail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-xs text-slate-200 pl-8 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-sky-500 w-56"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Timestamp (UTC)</th>
                <th className="py-2.5 px-3">Action Type</th>
                <th className="py-2.5 px-3">Entity</th>
                <th className="py-2.5 px-3">Actor / User</th>
                <th className="py-2.5 px-3">State Modification Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-cyan-400">
                    {log.action}
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">
                    <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-400 font-mono">
                      {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-200">
                    {log.user_name}
                    <div className="text-[10px] text-slate-500">{log.user_email}</div>
                  </td>
                  <td className="py-2.5 px-3 text-[11px] font-mono text-slate-400 max-w-xs truncate">
                    {log.after_state ? JSON.stringify(log.after_state) : log.before_state ? JSON.stringify(log.before_state) : '—'}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-500">
                    No matching audit records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
