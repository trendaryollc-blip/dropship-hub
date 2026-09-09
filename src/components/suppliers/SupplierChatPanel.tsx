"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { MessageCircle, Send, FileText, Loader2 } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { useAPI, useMutation } from "@/hooks/useAPI";
import type { SupplierConversation, SupplierMessageItem, MessageTemplate } from "@/types/supplier";

const TEMPLATES: MessageTemplate[] = [
  { id: "1", name: "Sample Request", category: "sample_request", subject: "Sample Order Inquiry", body: "Hi, I'd like to order a sample of your product. Can you provide pricing and shipping details?", variables: [] },
  { id: "2", name: "Bulk Pricing", category: "negotiation", subject: "Bulk Pricing Inquiry", body: "I'm interested in ordering in bulk. What pricing tiers do you offer for orders of 100+ units?", variables: [] },
  { id: "3", name: "Quality Issue", category: "quality_issue", subject: "Quality Concern", body: "I received my recent order and noticed some quality issues. Can we discuss resolution?", variables: [] },
  { id: "4", name: "Stock Check", category: "stock_inquiry", subject: "Stock Availability", body: "Could you confirm current stock levels for the following products?", variables: [] },
];

function MessageBubble({ message }: { message: SupplierMessageItem }) {
  const isOutgoing = message.direction === "outgoing";
  return (
    <div className={`flex ${isOutgoing ? "justify-end" : "justify-start"} mb-2`}>
      <div className={`max-w-[80%] rounded-xl px-3 py-2 ${
        isOutgoing ? "bg-accent/20 border border-accent/20" : "bg-white/5 border border-border"
      }`}>
        {message.subject && <p className="text-[10px] font-semibold text-foreground mb-0.5">{message.subject}</p>}
        <p className="text-[11px] text-foreground">{message.body}</p>
        <div className="flex items-center justify-end gap-1 mt-1">
          <span className="text-[8px] text-muted-foreground">{new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          {isOutgoing && <span className={`text-[8px] ${message.status === "read" ? "text-emerald-400" : "text-muted-foreground"}`}>✓✓</span>}
        </div>
      </div>
    </div>
  );
}

export default function SupplierChatPanel() {
  const { ref, isInView } = useInView();
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: convosData } = useAPI<{ conversations: (SupplierConversation & { id: string })[] }>(
    isInView ? "/api/suppliers/chat" : null
  );

  const { data: messagesData } = useAPI<{ messages: (SupplierMessageItem & { id: string })[] }>(
    selectedConvo ? `/api/suppliers/chat?supplierId=${selectedConvo}` : null
  );

  const { trigger, isMutating } = useMutation("/api/suppliers/chat", {
    onSuccess: () => { setMessageText(""); },
  });

  const conversations = convosData?.conversations || [];
  const messages = useMemo(() => messagesData?.messages || [], [messagesData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!messageText.trim() || !selectedConvo) return;
    await trigger({
      body: {
        supplierId: selectedConvo,
        subject: "Message",
        body: messageText,
      },
    });
  };

  const handleTemplate = (template: MessageTemplate) => {
    setMessageText(template.body);
    setShowTemplates(false);
  };

  return (
    <div ref={ref} className="glass rounded-2xl border border-border p-4">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold text-foreground">Supplier Chat</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-1 space-y-1 max-h-[300px] overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="text-[10px] text-muted-foreground text-center py-4">No conversations yet</p>
          ) : (
            conversations.map((convo) => (
              <button
                key={convo.id}
                onClick={() => setSelectedConvo(convo.supplierId)}
                className={`w-full text-left p-2 rounded-lg text-[10px] transition-colors ${
                  selectedConvo === convo.supplierId ? "bg-accent/15 text-accent" : "text-muted-foreground hover:bg-white/5"
                }`}
              >
                <p className="font-medium truncate">{convo.supplierName}</p>
                <p className="text-[9px] text-muted-foreground truncate">{convo.subject}</p>
              </button>
            ))
          )}
        </div>

        <div className="md:col-span-2">
          {!selectedConvo ? (
            <div className="text-center py-8">
              <MessageCircle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Select a conversation to start chatting</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="h-[200px] overflow-y-auto space-y-1 p-2 rounded-lg bg-white/5">
                {messages.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground text-center py-4">No messages yet</p>
                ) : (
                  messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="relative">
                {showTemplates && (
                  <div className="absolute bottom-full mb-2 left-0 right-0 glass rounded-xl border border-border p-2 z-10">
                    <p className="text-[9px] text-muted-foreground mb-2">Templates</p>
                    {TEMPLATES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleTemplate(t)}
                        className="w-full text-left p-2 rounded-lg text-[10px] text-muted-foreground hover:bg-white/5 transition-colors"
                      >
                        <p className="font-medium text-foreground">{t.name}</p>
                        <p className="text-[9px] text-muted-foreground truncate">{t.body}</p>
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5" />
                  </button>
                  <input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Type a message..."
                    className="flex-1 text-xs bg-white/5 border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!messageText.trim() || isMutating}
                    className="p-2 rounded-lg bg-accent text-white hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    {isMutating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
