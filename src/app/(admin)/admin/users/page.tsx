"use client";

import { useState, useEffect } from "react";
import {
  Users, Shield, Ban, CheckCircle2, Loader2, Search,
  ChevronDown, Mail, Calendar, Crown,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { safeFetch } from "@/lib/safe-fetch";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface UserRecord {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: "owner" | "admin" | "user";
  createdAt: string;
  lastActiveAt: string;
  banned: boolean;
  tier: string;
}

const roleColors: Record<string, string> = {
  owner: "text-red-400 bg-red-400/10 border-red-400/20",
  admin: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  user: "text-blue-400 bg-blue-400/10 border-blue-400/20",
};

const tierColors: Record<string, string> = {
  free: "text-muted-foreground bg-surface border-border",
  pro: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  enterprise: "text-amber-400 bg-amber-400/10 border-amber-400/20",
};

export default function AdminUsersPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [confirmBan, setConfirmBan] = useState<{ uid: string; banned: boolean } | null>(null);

  const fetchUsers = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const data = await safeFetch<{ users?: UserRecord[] }>("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data?.users) setUsers(data.users);
    } catch (err) {
      console.warn("[AdminUsers] Failed to fetch:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [user]);

  const handleBanToggle = async (uid: string, banned: boolean) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      await safeFetch("/api/admin/users", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ uid, banned }),
      });
      setUsers((prev) => prev.map((u) => u.uid === uid ? { ...u, banned } : u));
      toast.success(banned ? "User banned" : "User unbanned");
    } catch {
      toast.error("Failed to update user");
    }
    setConfirmBan(null);
  };

  const handleRoleChange = async (uid: string, role: string) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      await safeFetch("/api/admin/users", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ uid, role }),
      });
      setUsers((prev) => prev.map((u) => u.uid === uid ? { ...u, role: role as UserRecord["role"] } : u));
      toast.success("Role updated");
    } catch {
      toast.error("Failed to update role");
    }
  };

  const filtered = users.filter((u) => {
    const matchesSearch = !search || u.email?.toLowerCase().includes(search.toLowerCase()) || u.displayName?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole === "all" || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading users...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
          User Management
        </h1>
        <p className="text-sm text-muted-foreground">
          View and manage user accounts, roles, and access.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by email or name..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/30 transition-colors" />
        </div>
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground focus:outline-none focus:border-accent/30 transition-colors">
          <option value="all">All Roles</option>
          <option value="owner">Owner</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass rounded-2xl p-5 border border-border">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-blue-400/10 border border-blue-400/20"><Users className="h-4 w-4 text-blue-400" /></div>
            <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">Total</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{users.length}</p>
        </div>
        <div className="glass rounded-2xl p-5 border border-border">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-purple-400/10 border border-purple-400/20"><Crown className="h-4 w-4 text-purple-400" /></div>
            <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">Pro+</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{users.filter((u) => u.tier === "pro" || u.tier === "enterprise").length}</p>
        </div>
        <div className="glass rounded-2xl p-5 border border-border">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-red-400/10 border border-red-400/20"><Ban className="h-4 w-4 text-red-400" /></div>
            <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">Banned</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{users.filter((u) => u.banned).length}</p>
        </div>
        <div className="glass rounded-2xl p-5 border border-border">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-amber-400/10 border border-amber-400/20"><Shield className="h-4 w-4 text-amber-400" /></div>
            <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">Admins</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{users.filter((u) => u.role === "owner" || u.role === "admin").length}</p>
        </div>
      </div>

      {/* User List */}
      <div className="glass rounded-2xl border border-border overflow-hidden">
        <div className="divide-y divide-border">
          {filtered.map((u) => (
            <div key={u.uid} className={`px-6 py-4 hover:bg-surface-hover/50 transition-colors ${u.banned ? "opacity-50" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-sm font-bold text-accent shrink-0">
                    {u.displayName?.[0] || u.email?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{u.displayName || "Unknown"}</p>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${roleColors[u.role]}`}>
                        {u.role === "owner" && <Crown className="h-2.5 w-2.5 inline mr-0.5" />}
                        {u.role.toUpperCase()}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${tierColors[u.tier] || tierColors.free}`}>
                        {u.tier.toUpperCase()}
                      </span>
                      {u.banned && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-400/10 text-red-400 border border-red-400/20">BANNED</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{u.email || "No email"}</span>
                      {u.createdAt && (
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Joined {new Date(u.createdAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {u.role !== "owner" && (
                    <select value={u.role} onChange={(e) => handleRoleChange(u.uid, e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg bg-surface border border-border text-xs text-muted-foreground focus:outline-none focus:border-accent/30 transition-colors">
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  )}
                  {u.role !== "owner" && (
                    <button onClick={() => setConfirmBan({ uid: u.uid, banned: !u.banned })}
                      className={`p-2 rounded-lg transition-colors ${u.banned ? "text-emerald-400 hover:bg-emerald-400/10" : "text-red-400/60 hover:text-red-400 hover:bg-red-400/10"}`}
                      title={u.banned ? "Unban user" : "Ban user"}>
                      {u.banned ? <CheckCircle2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="px-6 py-12 text-center">
            <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No users found</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmBan}
        title={confirmBan?.banned ? "Ban User" : "Unban User"}
        danger={!!confirmBan?.banned}
        description={confirmBan?.banned ? "This user will be banned from accessing the platform." : "This user will be unbanned and regain access."}
        confirmLabel={confirmBan?.banned ? "Ban" : "Unban"}
        cancelLabel="Cancel"
        onConfirm={() => confirmBan && handleBanToggle(confirmBan.uid, confirmBan.banned)}
        onCancel={() => setConfirmBan(null)}
      />
    </div>
  );
}
