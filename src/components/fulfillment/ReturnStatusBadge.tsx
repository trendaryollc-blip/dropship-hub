"use client";

import { RETURN_STATUS_CONFIG, type ReturnStatus } from "@/types/fulfillment";

export default function ReturnStatusBadge({ status }: { status: ReturnStatus }) {
  const config = RETURN_STATUS_CONFIG[status] || RETURN_STATUS_CONFIG.requested;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${config.bg} ${config.color}`}>
      {config.icon} {config.label}
    </span>
  );
}
