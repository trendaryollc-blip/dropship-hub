import { NextRequest } from "next/server";
import { verifyAuth } from "@/lib/auth";

const MAX_CONNECTIONS_PER_USER = 3;
const userConnections = new Map<string, Set<ReadableStreamDefaultController>>();

export function broadcast(uid: string, event: string, data: unknown) {
  const conns = userConnections.get(uid);
  if (!conns) return;
  const encoder = new TextEncoder();
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const controller of conns) {
    try {
      controller.enqueue(encoder.encode(msg));
    } catch {
      conns.delete(controller);
    }
  }
}

export async function GET(req: NextRequest) {
  let uid: string;
  try {
    const authUid = await verifyAuth(req);
    if (!authUid) return new Response("Unauthorized", { status: 401 });
    uid = authUid;
  } catch {
    return new Response("Invalid token", { status: 401 });
  }

  // Enforce per-user connection limit
  const existing = userConnections.get(uid);
  if (existing && existing.size >= MAX_CONNECTIONS_PER_USER) {
    return new Response("Too many connections", { status: 429 });
  }

  let activeController: ReadableStreamDefaultController | null = null;

  const stream = new ReadableStream({
    start(controller) {
      activeController = controller;
      if (!userConnections.has(uid)) {
        userConnections.set(uid, new Set());
      }
      userConnections.get(uid)!.add(controller);

      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ uid })}\n\n`));

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`event: heartbeat\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30_000);

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        userConnections.get(uid)?.delete(controller);
        if (userConnections.get(uid)?.size === 0) userConnections.delete(uid);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
    cancel() {
      if (activeController) {
        userConnections.get(uid)?.delete(activeController);
        if (userConnections.get(uid)?.size === 0) userConnections.delete(uid);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
