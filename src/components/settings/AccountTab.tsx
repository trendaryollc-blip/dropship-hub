"use client";

import {
  User,
  Trash2,
  Loader2,
  Save,
} from "lucide-react";

interface AccountTabProps {
  user: { email?: string | null } | null;
  newPassword: string;
  confirmPassword: string;
  updatingPassword: boolean;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onChangePassword: () => void;
  onDeleteConfirm: () => void;
}

export default function AccountTab({
  user,
  newPassword,
  confirmPassword,
  updatingPassword,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onChangePassword,
  onDeleteConfirm,
}: AccountTabProps) {
  return (
    <div className="space-y-4 animate-slide-up">
      <div className="glass rounded-2xl p-5 border border-accent/10">
        <div className="flex items-start gap-3">
          <User className="h-5 w-5 text-accent shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Account Management</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Manage your account settings, password, and preferences.
            </p>
          </div>
        </div>
      </div>

      {/* Email */}
      <div className="glass rounded-2xl p-5 border border-border">
        <p className="text-sm font-semibold text-foreground mb-1">Email</p>
        <p className="text-xs text-muted-foreground mb-3">{user?.email || "Not signed in"}</p>
        <p className="text-[10px] text-muted-foreground/60">Email is managed through your Firebase Authentication provider.</p>
      </div>

      {/* Change Password */}
      <div className="glass rounded-2xl p-5 border border-border space-y-3">
        <p className="text-sm font-semibold text-foreground">Change Password</p>
        <input
          type="password"
          placeholder="New password"
          value={newPassword}
          onChange={(e) => onNewPasswordChange(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/30 transition-all"
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => onConfirmPasswordChange(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/30 transition-all"
        />
        <button
          onClick={onChangePassword}
          disabled={updatingPassword || !newPassword}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-all disabled:opacity-50"
        >
          {updatingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Update Password
        </button>
      </div>

      {/* Danger Zone */}
      <div className="glass rounded-2xl p-5 border border-red-400/20">
        <p className="text-sm font-semibold text-red-400 mb-1">Danger Zone</p>
        <p className="text-xs text-muted-foreground mb-3">Permanently delete your account and all associated data.</p>
        <button
          onClick={onDeleteConfirm}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-400/10 border border-red-400/20 text-red-400 text-sm font-semibold hover:bg-red-400/20 transition-all"
        >
          <Trash2 className="h-4 w-4" />
          Delete Account
        </button>
      </div>
    </div>
  );
}
