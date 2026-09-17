import { Timestamp } from "firebase/firestore";

// ── Cash Flow Types ──────────────────────────────────────────────────────────

export interface CashFlowEntry {
  id: string;
  type: "inflow" | "outflow";
  category: "sales" | "refunds" | "supplier_payment" | "shipping" | "platform_fee" | "ads" | "subscription" | "other";
  amount: number;
  description: string;
  orderId?: string;
  supplierId?: string;
  platform?: string;
  status: "pending" | "confirmed" | "completed";
  expectedDate: string;
  actualDate?: string;
  recurring: boolean;
  recurringFrequency?: "daily" | "weekly" | "monthly";
  notes?: string;
  createdAt: string;
}

export interface CashFlowForecast {
  date: string;
  inflows: number;
  outflows: number;
  net: number;
  runningBalance: number;
}

export interface CashFlowSnapshot {
  id: string;
  currentBalance: number;
  availableBalance: number;
  pendingInflows: number;
  pendingOutflows: number;
  netPending: number;
  runwayDays: number; // days until cash runs out at current burn rate
  burnRate: number; // daily net outflow
  monthlyInflows: number;
  monthlyOutflows: number;
  cashConversionCycle: number; // days from paying supplier to receiving customer payment
  forecast: CashFlowForecast[];
  calculatedAt: string;
  createdAt: Timestamp;
}

export interface PaymentTiming {
  id: string;
  orderId: string;
  orderNumber: string;
  customerPaidDate: string;
  supplierDueDate: string;
  platformPayoutDate: string;
  daysUntilPayout: number;
  daysUntilSupplierDue: number;
  gap: number; // days between supplier due and platform payout
  amount: number;
  status: "waiting" | "received" | "overdue" | "paid";
}

export interface CashFlowAlert {
  id: string;
  type: "low_balance" | "large_outflow" | "payment_due" | "negative_forecast" | "overdue_payment";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  amount?: number;
  dueDate?: string;
  createdAt: string;
  read: boolean;
}

export interface CashFlowStats {
  currentBalance: number;
  monthlyInflows: number;
  monthlyOutflows: number;
  netCashFlow: number;
  runwayDays: number;
  burnRate: number;
  avgPaymentGap: number;
  alertCount: number;
}

// ── Firestore Doc ────────────────────────────────────────────────────────────

export interface CashFlowEntryDoc {
  id: string;
  type: string;
  category: string;
  amount: number;
  description: string;
  orderId?: string;
  supplierId?: string;
  platform?: string;
  status: string;
  expectedDate: string;
  actualDate?: string;
  recurring: boolean;
  notes?: string;
  createdAt: Timestamp;
}
