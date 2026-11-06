"use client";

import { useEffect, useState } from "react";
import { UserRole } from "@/models/User";
import {
  Users,
  UserPlus,
  Phone,
  Shield,
  CheckCircle2,
  XCircle,
  AlertCircle,
  KeyRound,
  RefreshCw,
} from "lucide-react";

interface StaffItem {
  _id: string;
  name: string;
  phone: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export default function StaffManagementPage() {
  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New staff form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("STAFF");

  const fetchStaff = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/staff");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load staff");
      }
      const data = await res.json();
      setStaffList(data.staff || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error fetching staff members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, password, role }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to register staff member");
      }

      setSuccess(`Staff member "${name}" registered successfully with phone ${phone}!`);
      setName("");
      setPhone("");
      setPassword("");
      setRole("STAFF");
      fetchStaff();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error registering staff member");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/staff/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to update staff status");
        return;
      }
      fetchStaff();
    } catch (e) {
      console.error(e);
      alert("Error toggling staff account");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6 text-amber-400" />
              <h1 className="text-2xl font-bold tracking-tight text-white">Staff Management</h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Owner Only
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-400">
              Register new counter staff, assign login credentials with phone numbers, and manage terminal access.
            </p>
          </div>

          <button
            onClick={fetchStaff}
            disabled={loading}
            className="self-start sm:self-auto flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-xl bg-rose-500/10 border border-rose-500/30 p-4 text-sm text-rose-300">
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Action Failed</p>
              <p className="text-xs text-rose-300/90 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mt-6 flex items-start gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-sm text-emerald-300">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Success</p>
              <p className="text-xs text-emerald-300/90 mt-0.5">{success}</p>
            </div>
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Register New Staff Form */}
          <div className="lg:col-span-1">
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-2 mb-4 text-base font-semibold text-white">
                <UserPlus className="h-5 w-5 text-emerald-400" />
                <span>Register New Staff</span>
              </div>
              <p className="text-xs text-zinc-400 mb-6">
                The owner sets up the employee account. The staff member uses this phone number and password to log in at the counter.
              </p>

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Almaz Bekele"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Phone Number (Login ID)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                      <Phone className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="0912345678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Initial Password / PIN
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                      <KeyRound className="h-4 w-4" />
                    </div>
                    <input
                      type="password"
                      required
                      placeholder="Min. 4 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Role & Permissions
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole("STAFF")}
                      className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        role === "STAFF"
                          ? "bg-cyan-500/20 border-cyan-500 text-cyan-300 font-semibold"
                          : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Shield className="h-4 w-4" />
                      Staff Operator
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("OWNER")}
                      className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        role === "OWNER"
                          ? "bg-amber-500/20 border-amber-500 text-amber-300 font-semibold"
                          : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Shield className="h-4 w-4" />
                      Co-Owner
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full mt-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-600/20"
                >
                  {actionLoading ? "Registering..." : "Register Staff Member"}
                </button>
              </form>
            </div>
          </div>

          {/* Staff Directory Table */}
          <div className="lg:col-span-2">
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-white">Registered Team Members</h2>
                  <p className="text-xs text-zinc-400">Total: {staffList.length} accounts</p>
                </div>
              </div>

              {loading ? (
                <div className="p-12 text-center text-zinc-500">
                  <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm">Loading staff members...</p>
                </div>
              ) : staffList.length === 0 ? (
                <div className="p-12 text-center text-zinc-500">
                  <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No staff members found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-950/60 text-xs uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                      <tr>
                        <th className="px-6 py-3">Member</th>
                        <th className="px-6 py-3">Phone (Login)</th>
                        <th className="px-6 py-3">Role</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/80">
                      {staffList.map((member) => (
                        <tr key={member._id} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="px-6 py-4 font-medium text-white">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-zinc-300">
                                {member.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div>{member.name}</div>
                                <div className="text-[11px] text-zinc-500">
                                  Joined {new Date(member.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-zinc-300 text-xs">
                            {member.phone}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`text-[11px] px-2.5 py-0.5 rounded-md font-semibold tracking-wide border ${
                                member.role === "OWNER"
                                  ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                                  : "bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
                              }`}
                            >
                              {member.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {member.isActive ? (
                              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs text-rose-400 font-medium">
                                <XCircle className="h-3.5 w-3.5" />
                                Deactivated
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleToggleActive(member._id, member.isActive)}
                              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors cursor-pointer ${
                                member.isActive
                                  ? "border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                                  : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                              }`}
                            >
                              {member.isActive ? "Deactivate" : "Activate"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
