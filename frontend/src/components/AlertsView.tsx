import React, { useState, useEffect } from 'react';
import {
  Bell, Clock, AlertTriangle, CheckCircle, CheckCheck,
  ShieldAlert, RefreshCw, Filter, Sparkles, AlertCircle
} from 'lucide-react';
import { AlertItem, AlertStatus, SeverityLevel } from '../types';
import { api } from '../services/api';

export const AlertsView: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isTriggering, setIsTriggering] = useState(false);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const data = await api.getAlerts();
      setAlerts(data);
    } catch (e) {
      console.error('Failed to load alerts:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleAcknowledge = async (id: number) => {
    try {
      await api.acknowledgeAlert(id);
      await fetchAlerts();
    } catch (e: any) {
      alert(`Error acknowledging: ${e.message}`);
    }
  };

  const handleResolve = async (id: number) => {
    try {
      await api.resolveAlert(id);
      await fetchAlerts();
    } catch (e: any) {
      alert(`Error resolving: ${e.message}`);
    }
  };

  const handleTriggerChecks = async () => {
    setIsTriggering(true);
    try {
      const res = await api.triggerAlertChecks();
      alert(res.message);
      await fetchAlerts();
    } catch (e: any) {
      alert(`Scheduler run error: ${e.message}`);
    } finally {
      setIsTriggering(false);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filterStatus === 'ALL') return true;
    return a.status === filterStatus;
  });

  const getSeverityBadge = (sev: SeverityLevel) => {
    switch (sev) {
      case 'CRITICAL':
        return <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded text-[10px] font-bold">CRITICAL</span>;
      case 'HIGH':
        return <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded text-[10px] font-bold">HIGH</span>;
      case 'WARNING':
        return <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-bold">WARNING</span>;
      default:
        return <span className="bg-sky-500/20 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded text-[10px] font-bold">INFO</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Bell className="w-5 h-5 text-sky-400" />
            Alert Management & Proactive Deadline Reminders
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configurable interval checks (30, 14, 7, 1 day), document expiration tracking, deduplicated alerts & officer escalation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTriggerChecks}
            disabled={isTriggering}
            className="bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTriggering ? 'animate-spin' : ''}`} />
            <span>{isTriggering ? 'Checking Schedule...' : 'Trigger Background Checks'}</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-surface-card border border-surface-border p-2 rounded-xl">
        {['ALL', 'UNREAD', 'ACKNOWLEDGED', 'RESOLVED'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterStatus === st
                ? 'bg-sky-500/20 text-white border border-sky-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.map((alert) => (
          <div
            key={alert.id}
            className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              alert.status === 'UNREAD'
                ? 'bg-slate-900/90 border-slate-700 shadow-sm'
                : 'bg-surface-card/60 border-surface-border opacity-85'
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                {getSeverityBadge(alert.severity)}
                <span className="font-bold text-slate-100 text-sm">{alert.title}</span>
                <span className="text-[10px] font-mono text-cyan-400 bg-slate-800 px-1.5 py-0.5 rounded">
                  {alert.alert_type}
                </span>
                {alert.status === 'ACKNOWLEDGED' && (
                  <span className="text-[10px] text-amber-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Acknowledged
                  </span>
                )}
                {alert.status === 'RESOLVED' && (
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <CheckCheck className="w-3 h-3" /> Resolved
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                {alert.message}
              </p>

              <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-0.5">
                {alert.due_date && (
                  <span className="flex items-center gap-1 text-amber-400/90">
                    <Clock className="w-3 h-3" /> Due Cutoff: {new Date(alert.due_date).toLocaleDateString()}
                  </span>
                )}
                <span>Created: {new Date(alert.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                {alert.target_role && (
                  <span>Target Persona: <span className="text-slate-400">{alert.target_role.replace('_', ' ')}</span></span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              {alert.status === 'UNREAD' && (
                <button
                  onClick={() => handleAcknowledge(alert.id)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
                >
                  Acknowledge
                </button>
              )}
              {alert.status !== 'RESOLVED' && (
                <button
                  onClick={() => handleResolve(alert.id)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Mark Resolved</span>
                </button>
              )}
            </div>
          </div>
        ))}

        {filteredAlerts.length === 0 && (
          <div className="text-center py-16 text-slate-500 text-xs bg-surface-card border border-surface-border rounded-xl">
            No alerts found in category '{filterStatus}'.
          </div>
        )}
      </div>
    </div>
  );
};
