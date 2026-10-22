import React, { useState, useEffect } from 'react';
import {
  Settings, Users, Building, Calendar, ShieldCheck,
  Plus, Edit2, Lock, CheckCircle2, RefreshCw
} from 'lucide-react';
import { User, Institution, AcademicYear, UserRole } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const AdminView: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);

  // New user form
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('Pass@2026');
  const [newName, setNewName] = useState('');
  const [newDesignation, setNewDesignation] = useState('Assistant Professor');
  const [newRole, setNewRole] = useState<UserRole>('REVIEWER');
  const [newPhone, setNewPhone] = useState('+91 98100 00000');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [uList, instList, ayList] = await Promise.all([
        api.getUsers(),
        api.getInstitutions(),
        api.getAcademicYears()
      ]);
      setUsers(uList);
      if (instList.length > 0) setInstitution(instList[0]);
      setAcademicYears(ayList);
    } catch (e) {
      console.error('Failed to load admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createUser({
        email: newEmail,
        password: newPassword,
        full_name: newName,
        designation: newDesignation,
        role: newRole,
        phone: newPhone,
      });
      setShowUserModal(false);
      setNewEmail('');
      setNewName('');
      await fetchData();
    } catch (e: any) {
      alert(`User creation error: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-sky-400" />
            Administration & System Configuration
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage institutional profile, regulatory rule versions, staff roles, and access controls
          </p>
        </div>

        <button
          onClick={() => setShowUserModal(true)}
          className="bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* Institution Details Card */}
      {institution && (
        <div className="bg-surface-card border border-surface-border rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Building className="w-5 h-5 text-cyan-400" />
              <div>
                <h2 className="text-sm font-bold text-white">{institution.name}</h2>
                <span className="text-xs text-slate-400 font-mono">AICTE Permanent ID: {institution.aicte_id}</span>
              </div>
            </div>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-2.5 py-1 rounded-full font-semibold">
              Active Institute
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs pt-2 border-t border-slate-800">
            <div>
              <span className="text-slate-500 block text-[11px]">Institution Category</span>
              <span className="text-slate-200 font-medium">{institution.institution_type}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Location</span>
              <span className="text-slate-200 font-medium">{institution.city}, {institution.state}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Contact Email</span>
              <span className="text-slate-200 font-medium">{institution.contact_email}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Contact Phone</span>
              <span className="text-slate-200 font-medium">{institution.contact_phone}</span>
            </div>
          </div>
        </div>
      )}

      {/* Users & Staff Directory Table */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-400" />
            Institutional Staff & Reviewer Permissions Directory ({users.length})
          </h2>
          <span className="text-[10px] text-slate-500 font-mono">Backend RBAC Enforced</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Name & Designation</th>
                <th className="py-2.5 px-3">Email</th>
                <th className="py-2.5 px-3">Assigned Role</th>
                <th className="py-2.5 px-3">Phone</th>
                <th className="py-2.5 px-3">Account Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-200">{u.full_name}</div>
                    <div className="text-[10px] text-slate-400">{u.designation || 'Staff'}</div>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-300">{u.email}</td>
                  <td className="py-2.5 px-3">
                    <span className="bg-slate-800 text-sky-300 px-2 py-0.5 rounded text-[10px] font-semibold border border-slate-700">
                      {u.role.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">{u.phone || '—'}</td>
                  <td className="py-2.5 px-3">
                    <span className="text-emerald-400 flex items-center gap-1 font-semibold text-[11px]">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Academic Year Cycle Table */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Calendar className="w-4 h-4 text-cyan-400" />
          Configured Approval Academic Years
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {academicYears.map((ay) => (
            <div
              key={ay.id}
              className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                ay.is_current
                  ? 'bg-sky-500/10 border-sky-500/30'
                  : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 text-sm">Session {ay.name}</span>
                {ay.is_current && (
                  <span className="bg-sky-500/20 text-sky-300 text-[10px] font-semibold px-2 py-0.2 rounded">
                    Current Cycle
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-[11px]">
                Valid: {new Date(ay.start_date).toLocaleDateString()} to {new Date(ay.end_date).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Add User */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-card border border-slate-700 rounded-xl p-5 w-full max-w-sm shadow-2xl">
            <h2 className="text-sm font-bold text-white mb-1">Add Staff or Reviewer Member</h2>
            <p className="text-[11px] text-slate-400 mb-3">Enforce role-based access for regulatory workflows.</p>

            <form onSubmit={handleCreateUser} className="space-y-2.5 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Kavita Nair"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-2 rounded-lg text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. kavita@aitm.edu.in"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-2 rounded-lg text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Designation</label>
                <input
                  type="text"
                  value={newDesignation}
                  onChange={(e) => setNewDesignation(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-2 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Assigned Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 p-2 rounded-lg text-xs"
                >
                  <option value="REVIEWER">Reviewer (Verifies documents & adds review notes)</option>
                  <option value="COMPLIANCE_OFFICER">Compliance Officer (Evaluates rules & assigns tasks)</option>
                  <option value="INSTITUTION_ADMIN">Institution Admin (Full college management)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary-hover text-white font-semibold px-3 py-1.5 rounded-lg"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
