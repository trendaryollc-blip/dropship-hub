export interface SupplierMessage {
  id: string;
  supplierId: string;
  supplierName: string;
  direction: "outgoing" | "incoming";
  subject: string;
  body: string;
  status: "sent" | "delivered" | "read" | "failed";
  messageType: "inquiry" | "negotiation" | "order_issue" | "quality" | "general";
  relatedOrderId?: string;
  cjMessageId?: string;
  createdAt: string;
  readAt?: string;
}

export interface NegotiationRecord {
  id: string;
  supplierId: string;
  supplierName: string;
  productTitle: string;
  productId?: string;
  status: "active" | "accepted" | "rejected" | "expired" | "counter_offered";
  rounds: NegotiationRound[];
  initialPrice: number;
  currentOffer: number;
  targetPrice: number;
  finalPrice?: number;
  quantity: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
  concludedAt?: string;
}

export interface NegotiationRound {
  roundNumber: number;
  initiator: "us" | "supplier";
  price: number;
  message: string;
  timestamp: string;
}

export interface SupplierScorecard {
  supplierId: string;
  supplierName: string;
  overallScore: number;
  criteria: ScorecardCriteria;
  grade: "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "C-" | "D" | "F";
  trend: "improving" | "stable" | "declining";
  lastEvaluated: string;
  history: ScorecardSnapshot[];
}

export interface ScorecardCriteria {
  speed: ScorecardMetric;
  quality: ScorecardMetric;
  communication: ScorecardMetric;
  price: ScorecardMetric;
  reliability: ScorecardMetric;
}

export interface ScorecardMetric {
  score: number;
  weight: number;
  weightedScore: number;
  details: string;
  dataPoints: number;
}

export interface ScorecardSnapshot {
  date: string;
  overallScore: number;
  criteria: {
    speed: number;
    quality: number;
    communication: number;
    price: number;
    reliability: number;
  };
}

export interface AutoSwitchRule {
  id: string;
  supplierId: string;
  supplierName: string;
  enabled: boolean;
  threshold: number;
  metric: "overall_score" | "speed" | "quality" | "communication" | "price" | "reliability";
  action: "alert" | "auto_switch" | "notify_only";
  fallbackSupplierId?: string;
  fallbackSupplierName?: string;
  lastTriggered?: string;
  triggerCount: number;
  createdAt: string;
}

export interface SupplierSwitchLog {
  id: string;
  fromSupplierId: string;
  fromSupplierName: string;
  toSupplierId: string;
  toSupplierName: string;
  reason: string;
  triggerType: "auto" | "manual" | "threshold";
  productIds: string[];
  switchedAt: string;
}

export interface SRMDashboardSummary {
  totalSuppliers: number;
  activeNegotiations: number;
  pendingMessages: number;
  avgScorecardScore: number;
  alertsCount: number;
  recentSwitches: number;
  topPerformers: {
    supplierId: string;
    supplierName: string;
    score: number;
  }[];
  bottomPerformers: {
    supplierId: string;
    supplierName: string;
    score: number;
  }[];
}
