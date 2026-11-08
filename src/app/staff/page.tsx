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
  Pencil,
  Trash2,
  X,
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

  // Edit staff state
  const [editingStaff, setEditingStaff] = useState<StaffItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("STAFF");
  const [editNewPassword, setEditNewPassword] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete staff state
  const [staffToDelete, setStaffToDelete] = useState<StaffItem | null>(null);
  const [deletingStaff, setDeletingStaff] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((res) => {
        if (!res.authenticated || res.user?.role !== "OWNER") {
          window.location.href = "/rentals";
        }
      })
      .catch(() => {});
  }, []);

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

  const openEditStaff = (member: StaffItem) => {
    setEditingStaff(member);
    setEditName(member.name);
    setEditPhone(member.phone);
    setEditRole(member.role);
    setEditNewPassword("");
  };

  const handleEditStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff || !editName.trim() || !editPhone.trim()) return;
    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/staff/${editingStaff._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          phone: editPhone.trim(),
          role: editRole,
          newPassword: editNewPassword.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to update staff member");
        return;
      }
      setEditingStaff(null);
      setSuccess(`Updated "${editName}" successfully!`);
      fetchStaff();
    } catch {
      alert("Error updating staff member");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteStaff = async () => {
    if (!staffToDelete) return;
    setDeletingStaff(true);
    try {
      const res = await fetch(`/api/staff/${staffToDelete._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to delete staff member");
        return;
      }
      setStaffToDelete(null);
      setSuccess(`Removed "${staffToDelete.name}" from system.`);
      fetchStaff();
    } catch {
      alert("Error deleting staff member");
    } finally {
      setDeletingStaff(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F6F3] text-[#29221E]">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E9D9C5]">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6 text-[#D96827]" />
              <h1 className="text-2xl font-bold tracking-tight text-[#29221E]">Staff Management</h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#FFF4E5] text-[#D96827] border border-[#E9D9C5]">
                Owner Only
              </span>
            </div>
            <p className="mt-1 text-sm text-[#8B8179]">
              Register new counter staff, assign login credentials with phone numbers, and manage terminal access.
            </p>
          </div>

          <button
            onClick={fetchStaff}
            disabled={loading}
            className="self-start sm:self-auto flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#29221E] hover:text-[#D96827] bg-white border border-[#E9D9C5] rounded-xl hover:bg-[#FFF4E5] transition-colors shadow-xs"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-xl bg-[#D94B45]/10 border border-[#D94B45]/20 p-4 text-sm text-[#D94B45]">
            <AlertCircle className="h-5 w-5 text-[#D94B45] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Action Failed</p>
              <p className="text-xs text-[#D94B45]/90 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mt-6 flex items-start gap-3 rounded-xl bg-[#26845B]/10 border border-[#26845B]/20 p-4 text-sm text-[#26845B]">
            <CheckCircle2 className="h-5 w-5 text-[#26845B] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Success</p>
              <p className="text-xs text-[#26845B]/90 mt-0.5">{success}</p>
            </div>
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Register New Staff Form */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-[#E9D9C5] rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-base font-bold text-[#29221E]">
                <UserPlus className="h-5 w-5 text-[#D96827]" />
                <span>Register New Staff</span>
              </div>
              <p className="text-xs text-[#8B8179] mb-6">
                The owner sets up the employee account. The staff member uses this phone number and password to log in at the counter.
              </p>

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#29221E] mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Almaz Bekele"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F7F6F3] border border-[#E9D9C5] rounded-xl text-[#29221E] placeholder-[#8B8179] text-sm focus:outline-none focus:ring-2 focus:ring-[#D96827]/30 focus:border-[#D96827]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#29221E] mb-1">
                    Phone Number (Login ID)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8B8179]">
                      <Phone className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="0912345678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-[#F7F6F3] border border-[#E9D9C5] rounded-xl text-[#29221E] placeholder-[#8B8179] text-sm focus:outline-none focus:ring-2 focus:ring-[#D96827]/30 focus:border-[#D96827]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#29221E] mb-1">
                    Initial Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8B8179]">
                      <KeyRound className="h-4 w-4" />
                    </div>
                    <input
                      type="password"
                      required
                      placeholder="Min. 4 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-[#F7F6F3] border border-[#E9D9C5] rounded-xl text-[#29221E] placeholder-[#8B8179] text-sm focus:outline-none focus:ring-2 focus:ring-[#D96827]/30 focus:border-[#D96827]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#29221E] mb-1">
                    Role & Permissions
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole("STAFF")}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        role === "STAFF"
                          ? "bg-[#FFF4E5] border-[#D96827] text-[#D96827]"
                          : "bg-white border-[#E9D9C5] text-[#8B8179] hover:text-[#29221E]"
                      }`}
                    >
                      <Shield className="h-4 w-4" />
                      Staff Operator
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("OWNER")}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        role === "OWNER"
                          ? "bg-[#FFF4E5] border-[#D96827] text-[#D96827]"
                          : "bg-white border-[#E9D9C5] text-[#8B8179] hover:text-[#29221E]"
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
                  className="w-full mt-2 py-3 px-4 bg-[#D96827] hover:bg-[#c25a1e] text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {actionLoading ? "Registering..." : "Register Staff Member"}
                </button>
              </form>
            </div>
          </div>

          {/* Staff Directory Table */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-[#E9D9C5] rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-[#E9D9C5] bg-[#F7F6F3]/50 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#29221E]">Registered Team Members</h2>
                  <p className="text-xs text-[#8B8179]">Total: {staffList.length} accounts</p>
                </div>
              </div>

              {loading ? (
                <div className="p-12 text-center text-[#8B8179]">
                  <div className="h-8 w-8 border-2 border-[#D96827] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm">Loading staff members...</p>
                </div>
              ) : staffList.length === 0 ? (
                <div className="p-12 text-center text-[#8B8179]">
                  <Users className="h-10 w-10 mx-auto mb-2 opacity-40 text-[#8B8179]" />
                  <p className="text-sm">No staff members found.</p>
                </div>
              ) : (
              <div>
                {/* 1. Mobile Cards View */}
                <div className="md:hidden divide-y divide-[#E9D9C5]">
                  {staffList.map((member) => (
                    <div key={member._id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-[#FFF4E5] border border-[#E9D9C5] flex items-center justify-center font-bold text-[#D96827]">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-[#29221E] text-sm">{member.name}</div>
                            <div className="text-[11px] text-[#8B8179]">
                              Joined {new Date(member.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold tracking-wide border ${
                            member.role === "OWNER"
                              ? "bg-[#FFF4E5] text-[#D96827] border-[#E9D9C5]"
                              : "bg-[#F7F6F3] text-[#29221E] border-[#E9D9C5]"
                          }`}
                        >
                          {member.role}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <div className="font-mono text-xs text-[#29221E] font-semibold">
                          📞 {member.phone}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleToggleActive(member._id, member.isActive)}
                            className={`text-xs px-2.5 py-1 rounded-xl border font-bold transition-colors cursor-pointer ${
                              member.isActive
                                ? "border-[#D94B45]/30 text-[#D94B45] hover:bg-[#D94B45]/10"
                                : "border-[#26845B]/30 text-[#26845B] hover:bg-[#26845B]/10"
                            }`}
                          >
                            {member.isActive ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            onClick={() => openEditStaff(member)}
                            className="p-1.5 text-[#8B8179] hover:text-[#D96827] rounded-lg hover:bg-[#FFF4E5] transition-colors cursor-pointer"
                            title="Edit staff member"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setStaffToDelete(member)}
                            className="p-1.5 text-[#8B8179] hover:text-[#D94B45] rounded-lg hover:bg-[#FDF0EF] transition-colors cursor-pointer"
                            title="Delete staff member"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 2. Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#F7F6F3] text-xs uppercase tracking-wider text-[#8B8179] border-b border-[#E9D9C5]">
                      <tr>
                        <th className="px-6 py-3 font-semibold">Member</th>
                        <th className="px-6 py-3 font-semibold">Phone (Login)</th>
                        <th className="px-6 py-3 font-semibold">Role</th>
                        <th className="px-6 py-3 font-semibold">Status</th>
                        <th className="px-6 py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E9D9C5]">
                      {staffList.map((member) => (
                        <tr key={member._id} className="hover:bg-[#FFF4E5]/40 transition-colors">
                          <td className="px-6 py-4 font-medium text-[#29221E]">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-[#FFF4E5] border border-[#E9D9C5] flex items-center justify-center font-bold text-[#D96827]">
                                {member.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-[#29221E]">{member.name}</div>
                                <div className="text-[11px] text-[#8B8179]">
                                  Joined {new Date(member.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-[#29221E] text-xs">
                            {member.phone}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold tracking-wide border ${
                                member.role === "OWNER"
                                  ? "bg-[#FFF4E5] text-[#D96827] border-[#E9D9C5]"
                                  : "bg-[#F7F6F3] text-[#29221E] border-[#E9D9C5]"
                              }`}
                            >
                              {member.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {member.isActive ? (
                              <span className="inline-flex items-center gap-1.5 text-xs text-[#26845B] font-bold">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs text-[#D94B45] font-bold">
                                <XCircle className="h-3.5 w-3.5" />
                                Deactivated
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleToggleActive(member._id, member.isActive)}
                                className={`text-xs px-3 py-1.5 rounded-xl border font-bold transition-colors cursor-pointer ${
                                  member.isActive
                                    ? "border-[#D94B45]/30 text-[#D94B45] hover:bg-[#D94B45]/10"
                                    : "border-[#26845B]/30 text-[#26845B] hover:bg-[#26845B]/10"
                                }`}
                              >
                                {member.isActive ? "Deactivate" : "Activate"}
                              </button>
                              <button
                                onClick={() => openEditStaff(member)}
                                className="p-1.5 text-[#8B8179] hover:text-[#D96827] rounded-lg hover:bg-[#FFF4E5] transition-colors cursor-pointer"
                                title="Edit staff member"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setStaffToDelete(member)}
                                className="p-1.5 text-[#8B8179] hover:text-[#D94B45] rounded-lg hover:bg-[#FDF0EF] transition-colors cursor-pointer"
                                title="Delete staff member"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              )}
            </div>
          </div>
        </div>

        {/* Edit Staff Modal */}
        {editingStaff && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white border border-[#E9D9C5] rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative my-auto text-[#29221E] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E9D9C5]">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#FFF4E5] text-[#D96827]">
                    <Pencil className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#29221E]">Edit Staff Member</h3>
                    <p className="text-xs text-[#8B8179]">Update account credentials</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="p-1 text-[#8B8179] hover:text-[#29221E] rounded-lg cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleEditStaff} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#29221E] mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-xs sm:text-sm text-[#29221E] focus:outline-none focus:ring-2 focus:ring-[#D96827]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#29221E] mb-1">
                    Phone Number (Login)
                  </label>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-xs font-mono text-[#29221E] focus:outline-none focus:ring-2 focus:ring-[#D96827]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#29221E] mb-1">
                    Role
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditRole("STAFF")}
                      className={`p-2.5 rounded-xl border text-center font-bold text-xs cursor-pointer transition-all ${
                        editRole === "STAFF"
                          ? "bg-[#29221E] text-white border-[#29221E]"
                          : "bg-[#F7F6F3] text-[#8B8179] border-[#E9D9C5]"
                      }`}
                    >
                      Staff Member
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditRole("OWNER")}
                      className={`p-2.5 rounded-xl border text-center font-bold text-xs cursor-pointer transition-all ${
                        editRole === "OWNER"
                          ? "bg-[#D96827] text-white border-[#D96827]"
                          : "bg-[#F7F6F3] text-[#8B8179] border-[#E9D9C5]"
                      }`}
                    >
                      Owner
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#29221E] mb-1">
                    New Password (Leave blank to keep unchanged)
                  </label>
                  <input
                    type="password"
                    placeholder="Enter new password if changing..."
                    value={editNewPassword}
                    onChange={(e) => setEditNewPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E9D9C5] rounded-xl text-xs text-[#29221E] focus:outline-none focus:ring-2 focus:ring-[#D96827]"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E9D9C5]">
                  <button
                    type="button"
                    onClick={() => setEditingStaff(null)}
                    className="px-4 py-2 text-xs font-semibold text-[#8B8179] hover:text-[#29221E] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="px-5 py-2.5 bg-[#D96827] hover:bg-[#C2571A] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                  >
                    {editSubmitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Staff Confirmation Modal */}
        {staffToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white border border-[#E9D9C5] rounded-2xl max-w-sm w-full p-5 shadow-2xl relative my-auto text-[#29221E]">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-[#FDF0EF] text-[#D94B45]">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#29221E]">Remove Staff Member?</h3>
                  <p className="text-xs text-[#8B8179]">This permanently removes account access.</p>
                </div>
              </div>

              <div className="bg-[#F7F6F3] p-3 rounded-xl border border-[#E9D9C5] my-3 text-xs space-y-1">
                <div className="font-bold text-[#29221E]">{staffToDelete.name}</div>
                <div className="text-[11px] text-[#8B8179] font-mono">
                  📞 {staffToDelete.phone} • {staffToDelete.role}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E9D9C5]">
                <button
                  type="button"
                  onClick={() => setStaffToDelete(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#8B8179] hover:text-[#29221E] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deletingStaff}
                  onClick={handleDeleteStaff}
                  className="px-5 py-2.5 bg-[#D94B45] hover:bg-[#c23e38] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  {deletingStaff ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
