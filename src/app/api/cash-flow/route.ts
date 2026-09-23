import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { calculateCashFlowForecast, calculateCashFlowSnapshot, generateCashFlowAlerts } from "@/lib/cash-flow";
import {
  getCashFlowEntries,
  addCashFlowEntry,
  updateCashFlowEntry,
  deleteCashFlowEntry,
  getCashFlowSettings,
  saveCashFlowSettings,
} from "@/lib/data/cash-flow";
import { safeErrorMessage } from "@/lib/api-errors";

// ── Validation helpers ───────────────────────────────────────────────────────

const ENTRY_TYPES = ["inflow", "outflow"];
const ENTRY_CATEGORIES = ["sales", "refunds", "supplier_payment", "shipping", "platform_fee", "ads", "subscription", "other"];
const ENTRY_STATUSES = ["pending", "confirmed", "completed"];

const isEnum = (list: string[], value: unknown): boolean =>
  typeof value === "string" && list.includes(value);

const str = (v: unknown, max = 300): string => (typeof v === "string" ? v.slice(0, max) : "");
const isoDate = (v: unknown): string | null => {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return Number.isNaN(new Date(`${v}T00:00:00Z`).getTime()) ? null : v;
};

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "snapshot";

    if (type === "entries") {
      const entries = await getCashFlowEntries(uid);
      return NextResponse.json({ entries });
    }

    // All computed views derive from the user's real entries + saved balance.
    const settings = await getCashFlowSettings(uid);
    const entries = await getCashFlowEntries(uid);

    const forecast = calculateCashFlowForecast({
      currentBalance: settings.startingBalance,
      entries: entries.map((e) => ({ type: e.type, amount: e.amount, expectedDate: e.expectedDate, status: e.status })),
      days: 30,
    });

    if (type === "forecast") {
      return NextResponse.json({ forecast });
    }

    if (type === "alerts") {
      const today = new Date().toISOString().split("T")[0];
      const alerts = generateCashFlowAlerts({
        balance: settings.startingBalance,
        forecast,
        pendingPayments: entries
          .filter((e) => e.type === "outflow" && e.status !== "completed")
          .map((e) => ({
            description: e.description || e.category,
            amount: e.amount,
            dueDate: e.expectedDate,
            status: e.expectedDate < today ? "pending" : "upcoming",
          })),
      });
      return NextResponse.json({ alerts });
    }

    if (type === "settings") {
      return NextResponse.json({ settings });
    }

    // Default: snapshot
    const pendingInflows = entries
      .filter((e) => e.type === "inflow" && e.status !== "completed")
      .reduce((sum, e) => sum + e.amount, 0);
    const pendingOutflows = entries
      .filter((e) => e.type === "outflow" && e.status !== "completed")
      .reduce((sum, e) => sum + e.amount, 0);
    const snapshot = calculateCashFlowSnapshot({
      currentBalance: settings.startingBalance,
      pendingInflows,
      pendingOutflows,
      forecast,
    });
    return NextResponse.json({ snapshot });
  } catch (error) {
    return NextResponse.json({ error: safeErrorMessage(error, "Failed") }, { status: 500 });
  }
});

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "add_entry") {
      const { type, category, amount, description, expectedDate, status, notes, orderId, supplierId, platform } = body;
      const validDate = isoDate(expectedDate);
      if (!isEnum(ENTRY_TYPES, type) || !isEnum(ENTRY_CATEGORIES, category) || !validDate) {
        return NextResponse.json({ error: "type, category and a valid expectedDate (YYYY-MM-DD) are required" }, { status: 400 });
      }
      const parsedAmount = Number(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > 1_000_000) {
        return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
      }
      const id = await addCashFlowEntry(uid, {
        type: type as "inflow" | "outflow",
        category: category as Parameters<typeof addCashFlowEntry>[1]["category"],
        amount: Math.round(parsedAmount * 100) / 100,
        description: str(description, 200) || (type === "inflow" ? "Inflow" : "Outflow"),
        ...(typeof orderId === "string" && orderId ? { orderId: orderId.slice(0, 100) } : {}),
        ...(typeof supplierId === "string" && supplierId ? { supplierId: supplierId.slice(0, 100) } : {}),
        ...(typeof platform === "string" && platform ? { platform: platform.slice(0, 100) } : {}),
        status: (isEnum(ENTRY_STATUSES, status) ? status : "pending") as "pending" | "confirmed" | "completed",
        expectedDate: validDate,
        recurring: false,
        ...(typeof notes === "string" && notes ? { notes: notes.slice(0, 500) } : {}),
      });
      return NextResponse.json({ success: !!id, id });
    }

    if (action === "update_entry_status") {
      const { id, status, actualDate } = body;
      if (!id || !isEnum(ENTRY_STATUSES, status)) {
        return NextResponse.json({ error: "id and a valid status are required" }, { status: 400 });
      }
      const updates: Record<string, unknown> = { status };
      const parsedActual = isoDate(actualDate);
      if (parsedActual) updates.actualDate = parsedActual;
      const ok = await updateCashFlowEntry(uid, String(id), updates);
      return NextResponse.json({ success: ok });
    }

    if (action === "set_balance") {
      const parsed = Number(body.startingBalance);
      if (!Number.isFinite(parsed) || Math.abs(parsed) > 10_000_000) {
        return NextResponse.json({ error: "startingBalance must be a finite number" }, { status: 400 });
      }
      const ok = await saveCashFlowSettings(uid, { startingBalance: Math.round(parsed * 100) / 100 });
      return NextResponse.json({ success: ok });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: safeErrorMessage(error, "Failed") }, { status: 500 });
  }
});

export const DELETE = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const deleted = await deleteCashFlowEntry(uid, id);
    return NextResponse.json({ success: deleted });
  } catch (error) {
    return NextResponse.json({ error: safeErrorMessage(error, "Failed") }, { status: 500 });
  }
});

