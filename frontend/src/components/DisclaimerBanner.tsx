import React from 'react';
import { ShieldAlert, Info } from 'lucide-react';

export const DisclaimerBanner: React.FC = () => {
  return (
    <aside aria-label="Regulatory Notice" className="bg-slate-900/90 border-b border-surface-border px-4 py-1.5 text-xs text-slate-300 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1 font-semibold text-cyan-400">
          <ShieldAlert className="w-3.5 h-3.5" />
          INTERNAL INSTITUTIONAL AUDIT SYSTEM:
        </span>
        <span className="text-slate-400">
          AICTE SmartFlow automates internal regulatory preparation. It does not grant official approval or submit to the official AICTE portal without authorized verification.
        </span>
      </div>
      <div className="hidden md:flex items-center gap-1.5 text-slate-400">
        <Info className="w-3.5 h-3.5 text-sky-400" />
        <span>APH 2024-2027 Rule Engine v1.0</span>
      </div>
    </aside>
  );
};
