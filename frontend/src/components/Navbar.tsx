import React, { useState } from 'react';
import {
  Bell, Building2, User as UserIcon, LogOut, ChevronDown,
  Shield, Check, ArrowRightLeft, Calendar
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface NavbarProps {
  onNavigate: (tab: string) => void;
  unreadAlertsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, unreadAlertsCount }) => {
  const { user, demoLogin, logout } = useAuth();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [selectedAY, setSelectedAY] = useState('2025-2026');

  const roles: { role: UserRole; label: string; desc: string }[] = [
    { role: 'SUPER_ADMIN', label: 'Super Admin', desc: 'AICTE Headquarters / System Overseer' },
    { role: 'INSTITUTION_ADMIN', label: 'Institution Admin', desc: 'College Director / Principal' },
    { role: 'COMPLIANCE_OFFICER', label: 'Compliance Officer', desc: 'Dean Academics & Regulatory Lead' },
    { role: 'REVIEWER', label: 'Internal Reviewer', desc: 'Senior Committee Member / Document Verifier' },
  ];

  const handleRoleSwitch = async (role: UserRole) => {
    setShowRoleMenu(false);
    await demoLogin(role);
  };

  return (
    <header className="bg-surface border-b border-surface-border sticky top-0 z-40 px-4 py-2.5 flex items-center justify-between shadow-lg">
      {/* Brand & Institution Info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onNavigate('dashboard')}>
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center shadow-md shadow-sky-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base tracking-tight text-white">AICTE SmartFlow</span>
              <span className="bg-sky-500/20 text-sky-400 text-[10px] font-mono px-1.5 py-0.2 rounded border border-sky-500/30 font-semibold">
                SaaS
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">Smarter Approvals. Proactive Compliance.</p>
          </div>
        </div>

        {/* Institution Badge */}
        <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-slate-700/60">
          <Building2 className="w-4 h-4 text-cyan-400" />
          <div>
            <div className="text-xs font-medium text-slate-200">Aryabhata Inst. of Tech & Mgmt</div>
            <div className="text-[10px] text-slate-400 font-mono">AICTE Permanent ID: 1-109283741</div>
          </div>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Academic Year Selector */}
        <div className="hidden sm:flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-md px-2.5 py-1 text-xs text-slate-300">
          <Calendar className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-slate-400 text-[11px]">AY:</span>
          <select
            value={selectedAY}
            onChange={(e) => setSelectedAY(e.target.value)}
            className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer text-xs"
          >
            <option value="2025-2026" className="bg-slate-900 text-white">2025-2026 (Active)</option>
            <option value="2024-2025" className="bg-slate-900 text-white">2024-2025</option>
            <option value="2026-2027" className="bg-slate-900 text-white">2026-2027</option>
          </select>
        </div>

        {/* Role Switcher Pill */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-2 bg-slate-800/90 hover:bg-slate-750 border border-slate-700 text-xs px-2.5 py-1.5 rounded-lg text-slate-200 transition-colors shadow-sm"
            title="Switch demo persona for testing permissions"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" />
            <div className="text-left">
              <span className="text-[10px] text-slate-400 block leading-none">Persona</span>
              <span className="font-semibold text-sky-300 text-xs">{user?.role?.replace('_', ' ') || 'Guest'}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50">
              <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                Switch Hackathon Persona
              </div>
              <div className="mt-1 space-y-1">
                {roles.map((r) => {
                  const isCurrent = user?.role === r.role;
                  return (
                    <button
                      key={r.role}
                      onClick={() => handleRoleSwitch(r.role)}
                      className={`w-full text-left p-2 rounded-lg text-xs flex items-start justify-between transition-colors ${
                        isCurrent
                          ? 'bg-sky-500/15 border border-sky-500/40 text-white'
                          : 'hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="font-semibold flex items-center gap-1.5">
                          {r.label}
                          {isCurrent && <span className="text-[10px] text-sky-400">(Current)</span>}
                        </div>
                        <div className="text-[10px] text-slate-400">{r.desc}</div>
                      </div>
                      {isCurrent && <Check className="w-4 h-4 text-sky-400 mt-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Notifications Bell */}
        <button
          onClick={() => onNavigate('alerts')}
          className="relative p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          title="Alerts and Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadAlertsCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
              {unreadAlertsCount}
            </span>
          )}
        </button>

        {/* User Avatar & Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-200">
            {user?.full_name ? user.full_name[0] : <UserIcon className="w-3.5 h-3.5" />}
          </div>
          <div className="hidden md:block text-left text-xs">
            <div className="font-medium text-slate-200 truncate max-w-[130px]">{user?.full_name || 'Admin'}</div>
            <div className="text-[10px] text-slate-400 truncate max-w-[130px]">{user?.designation || 'Staff'}</div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-slate-500 hover:text-rose-400 rounded-md hover:bg-slate-800 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
