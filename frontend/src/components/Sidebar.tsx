import React from 'react';
import {
  LayoutDashboard, GitBranch, FileSearch, CheckCircle2,
  AlertTriangle, Bell, Bot, FileSpreadsheet, Settings,
  ShieldCheck, HelpCircle
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onNavigate,
  isCollapsed
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { id: 'workflows', label: 'Approval Workflows', icon: GitBranch, badge: 'Active' },
    { id: 'documents', label: 'Document Intelligence', icon: FileSearch, badge: 'OCR' },
    { id: 'compliance', label: 'Compliance Center', icon: CheckCircle2, badge: 'Rules' },
    { id: 'risk', label: 'Risk Monitoring', icon: AlertTriangle, badge: 'AI' },
    { id: 'alerts', label: 'Alerts & Deadlines', icon: Bell, badge: 'Live' },
    { id: 'assistant', label: 'AI Assistant', icon: Bot, badge: 'RAG' },
    { id: 'reports', label: 'Reports & Audit Log', icon: FileSpreadsheet, badge: 'PDF' },
    { id: 'admin', label: 'Administration', icon: Settings, badge: null },
  ];

  return (
    <aside
      className={`bg-surface border-r border-surface-border transition-all duration-300 flex flex-col justify-between ${
        isCollapsed ? 'w-16' : 'w-64'
      } shrink-0 min-h-[calc(100vh-6rem)]`}
    >
      <div className="py-4 px-2.5">
        <div className="text-[10px] font-semibold tracking-wider uppercase text-slate-500 px-3 mb-2">
          {!isCollapsed && 'Main Modules'}
        </div>
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-sky-500/15 text-white border border-sky-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
                title={item.label}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform ${
                    isActive ? 'text-sky-400 scale-105' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                {!isCollapsed && (
                  <div className="flex items-center justify-between flex-1 truncate">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                          isActive
                            ? 'bg-sky-400/20 text-sky-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer System Status */}
      <div className="p-3 border-t border-surface-border bg-slate-900/50">
        {!isCollapsed ? (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <div className="text-[11px] text-slate-400 flex items-center justify-between w-full">
              <span>Rule Engine Online</span>
              <span className="font-mono text-[10px] text-slate-500">v1.0</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="System Online"></div>
          </div>
        )}
      </div>
    </aside>
  );
};
