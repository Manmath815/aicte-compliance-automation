import React, { useState, useEffect } from 'react';
import {
  GitBranch, CheckCircle2, AlertCircle, FileX2, Clock,
  TrendingUp, ShieldAlert, ArrowUpRight, ArrowDownRight, RefreshCw,
  Search, Filter, Calendar, ExternalLink
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import { ExecutiveDashboard } from '../types';
import { api } from '../services/api';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const [data, setData] = useState<ExecutiveDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('All Academic Year');

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.getExecutiveDashboard();
      setData(res);
    } catch (e) {
      console.error('Failed to load dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
        <p className="text-xs text-slate-400">Loading AICTE SmartFlow executive metrics...</p>
      </div>
    );
  }

  const kpis = [
    {
      title: 'Active Approval Workflows',
      value: data?.active_workflows_count || 1,
      subtitle: 'Extension of Approval (EoA)',
      icon: GitBranch,
      color: 'text-sky-400',
      bg: 'bg-sky-500/10 border-sky-500/20',
      onClick: () => onNavigate('workflows'),
    },
    {
      title: 'Completed Compliance',
      value: `${data?.completed_compliance_count || 0}`,
      total: `${(data?.completed_compliance_count || 0) + (data?.pending_compliance_count || 0)} Total Norms`,
      subtitle: `${Math.round(((data?.completed_compliance_count || 1) / Math.max(1, (data?.completed_compliance_count || 1) + (data?.pending_compliance_count || 0))) * 100)}% Pass Rate`,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      onClick: () => onNavigate('compliance'),
    },
    {
      title: 'Missing / Deficient Evidence',
      value: data?.missing_docs_count || 0,
      subtitle: 'Mandatory items unverified',
      icon: FileX2,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
      onClick: () => onNavigate('documents'),
    },
    {
      title: 'Institutional Risk Score',
      value: `${data?.overall_risk_score || 32.5}/100`,
      subtitle: `Level: ${data?.overall_risk_level || 'MEDIUM'}`,
      icon: ShieldAlert,
      color: (data?.overall_risk_score || 0) > 50 ? 'text-rose-400' : 'text-amber-400',
      bg: (data?.overall_risk_score || 0) > 50 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-amber-500/10 border-amber-500/20',
      onClick: () => onNavigate('risk'),
    },
    {
      title: 'Approaching Deadlines',
      value: data?.upcoming_deadlines_count || 1,
      subtitle: `${data?.overdue_deadlines_count || 0} overdue items`,
      icon: Clock,
      color: (data?.overdue_deadlines_count || 0) > 0 ? 'text-rose-400' : 'text-sky-400',
      bg: 'bg-slate-800/80 border-slate-700/80',
      onClick: () => onNavigate('alerts'),
    },
  ];

  const stageColors = ['#0284c7', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#10b981', '#14b8a6', '#0ea5e9'];

  return (
    <div className="space-y-6">
      {/* Top Header & Search/Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Institutional Compliance & Approval Overview
            <span className="text-[11px] bg-slate-800 text-slate-300 font-normal px-2.5 py-0.5 rounded-full border border-slate-700">
              Live Monitor
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time status for Aryabhata Institute of Technology & Management (AICTE ID: 1-109283741)
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search norms, rules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-xs text-slate-200 pl-8 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-sky-500 w-44"
            />
          </div>

          {/* Date range filter */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-transparent text-slate-300 focus:outline-none text-xs cursor-pointer"
            >
              <option value="All Academic Year" className="bg-slate-900">All Academic Year</option>
              <option value="Last 30 Days" className="bg-slate-900">Last 30 Days</option>
              <option value="Next 30 Days" className="bg-slate-900">Next 30 Days (Cutoffs)</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchDashboard}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-slate-300 transition-colors"
            title="Refresh metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              onClick={kpi.onClick}
              className={`p-4 rounded-xl border ${kpi.bg} cursor-pointer hover:border-slate-600 transition-all card-glow relative group`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-400 truncate">{kpi.title}</span>
                <Icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white tracking-tight">{kpi.value}</span>
                {kpi.total && <span className="text-[11px] text-slate-400">/ {kpi.total}</span>}
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                <span>{kpi.subtitle}</span>
                <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-sky-400" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Compliance Trend Chart */}
        <div className="lg:col-span-2 bg-surface-card border border-surface-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-sky-400" />
                Institutional Compliance Progression Trend
              </h2>
              <p className="text-[11px] text-slate-400">Percentage of validated AICTE APH requirements fulfilled</p>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Target: 100%
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.compliance_trends || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCompliant" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(val: any) => [`${val}%`, 'Compliance Score']}
                />
                <Area type="monotone" dataKey="compliant_percent" stroke="#0284c7" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCompliant)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Workflow Stage Distribution Chart */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-cyan-400" />
                Workflow Stage Breakdown
              </h2>
              <p className="text-[11px] text-slate-400">Application pipeline status</p>
            </div>
            <button
              onClick={() => onNavigate('workflows')}
              className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-0.5"
            >
              Timeline <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data?.stage_distribution?.filter(s => s.count > 0) || []}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis dataKey="label" type="category" stroke="#94a3b8" tick={{ fontSize: 10 }} width={110} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {(data?.stage_distribution || []).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={stageColors[index % stageColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Alerts & Audit Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Alerts Card */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-rose-400" />
              Recent Regulatory & Deadline Alerts
            </h2>
            <button
              onClick={() => onNavigate('alerts')}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium"
            >
              View All ({data?.recent_alerts?.length || 0})
            </button>
          </div>

          <div className="space-y-2">
            {(data?.recent_alerts || []).slice(0, 4).map((alert) => (
              <div
                key={alert.id}
                className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${alert.severity === 'CRITICAL' ? 'bg-rose-500' : 'bg-amber-400'}`}></span>
                    {alert.title}
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-1">{alert.message}</p>
                </div>
                <span className="text-[10px] text-slate-400 font-mono shrink-0">
                  {alert.due_date ? new Date(alert.due_date).toLocaleDateString() : 'Active'}
                </span>
              </div>
            ))}
            {(!data?.recent_alerts || data.recent_alerts.length === 0) && (
              <p className="text-xs text-slate-500 text-center py-4">No active alerts recorded.</p>
            )}
          </div>
        </div>

        {/* Recent Audit Activities */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Append-Only Audit Trail
            </h2>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium"
            >
              Full Audit Trail
            </button>
          </div>

          <div className="space-y-2">
            {(data?.recent_audit_events || []).slice(0, 4).map((event) => (
              <div
                key={event.id}
                className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-mono text-cyan-400 text-[11px] font-semibold">{event.action}</span>
                  <div className="text-[11px] text-slate-400">By {event.user_name} on {event.entity_type}</div>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
