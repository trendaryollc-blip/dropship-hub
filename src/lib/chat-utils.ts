export function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

export function formatMessage(content: string): string {
  return escapeHtml(content)
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>')
    .replace(/•/g, '<span class="text-accent mr-1">•</span>')
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-white/5 text-accent text-[11px] font-mono">$1</code>');
}

let msgIdCounter = 0;
export function generateChatMessageId(baseId: string): string {
  return `${baseId}-${Date.now()}-${++msgIdCounter}`;
}
