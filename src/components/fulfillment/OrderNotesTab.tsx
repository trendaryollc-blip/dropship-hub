"use client";

import { useState, useEffect, useCallback } from "react";
import type { User } from "firebase/auth";
import {
  MessageSquare, Send, Trash2, Loader2, Lock, Globe,
} from "lucide-react";
import type { OrderNote } from "@/types/fulfillment";

interface OrderNotesTabProps {
  orderId: string;
  authFetch: (url: string, init?: RequestInit) => Promise<unknown>;
  user: User | null;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return "1 day ago";
  if (diffDay < 30) return `${diffDay} days ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function OrderNotesTab({ orderId, authFetch, user }: OrderNotesTabProps) {
  const [notes, setNotes] = useState<OrderNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    if (!user || !orderId) return;
    setLoading(true);
    try {
      const data = await authFetch(`/api/fulfillment/notes?orderId=${orderId}`) as {
        notes?: OrderNote[];
      };
      setNotes(data.notes || []);
    } catch {
      setNotes([]);
    }
    setLoading(false);
  }, [user, orderId, authFetch]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleAddNote = async () => {
    if (!newContent.trim() || !user) return;
    setSubmitting(true);
    try {
      await authFetch("/api/fulfillment/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, content: newContent.trim(), isInternal }),
      });
      setNewContent("");
      setIsInternal(false);
      await fetchNotes();
    } catch {}
    setSubmitting(false);
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!user) return;
    setDeletingId(noteId);
    try {
      await authFetch(`/api/fulfillment/notes/${noteId}`, { method: "DELETE" });
      await fetchNotes();
    } catch {}
    setDeletingId(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-accent" />
        <h3 className="font-display text-sm font-semibold text-foreground">Order Notes</h3>
        <span className="text-[10px] text-muted-foreground">({notes.length})</span>
      </div>

      {/* Notes List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 text-accent animate-spin" />
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No notes yet</p>
          <p className="text-[11px] text-muted-foreground/60">Add a note below to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => {
            const isOwn = note.uid === user?.uid;
            const canDelete = isOwn && !note.isSystemGenerated;

            return (
              <div
                key={note.id}
                className={`glass rounded-lg p-3 ${
                  note.isSystemGenerated
                    ? "border-l-2 border-l-muted-foreground/20 opacity-70"
                    : note.isInternal
                    ? "border-l-2 border-l-amber-500/50"
                    : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-semibold text-foreground">{note.author}</span>
                      {note.isSystemGenerated && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface text-muted-foreground">
                          System
                        </span>
                      )}
                      {note.isInternal && (
                        <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                          <Lock className="h-2.5 w-2.5" />
                          Internal
                        </span>
                      )}
                      {!note.isInternal && !note.isSystemGenerated && (
                        <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                          <Globe className="h-2.5 w-2.5" />
                          Visible
                        </span>
                      )}
                    </div>
                    <p className={`text-xs whitespace-pre-wrap ${note.isSystemGenerated ? "text-muted-foreground" : "text-foreground"}`}>
                      {note.content}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1.5">{timeAgo(note.createdAt)}</p>
                  </div>

                  {canDelete && (
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      disabled={deletingId === note.id}
                      className="flex-shrink-0 p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-all disabled:opacity-50"
                    >
                      {deletingId === note.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Note Form */}
      <div className="glass rounded-lg p-3 space-y-3">
        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="Add a note..."
          rows={3}
          className="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent resize-none"
        />
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsInternal(!isInternal)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
              isInternal
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "bg-surface border border-white/10 text-muted-foreground hover:text-foreground"
            }`}
          >
            {isInternal ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
            {isInternal ? "Internal" : "Public"}
          </button>
          <button
            onClick={handleAddNote}
            disabled={!newContent.trim() || submitting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg text-[11px] font-medium hover:bg-accent/90 transition-all disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
            Add Note
          </button>
        </div>
      </div>
    </div>
  );
}
