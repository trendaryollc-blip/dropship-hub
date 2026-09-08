import { serve } from "inngest/next";
import { inngest } from "@/lib/jobs/client";
import {
  priceCheckJob,
  inventorySyncJob,
  orderProcessingJob,
  digestEmailJob,
  scheduledPriceCheckJob,
  scheduledInventorySyncJob,
  scheduledDigestJob,
  autoModeExecutionJob,
  autoOrderFulfillmentJob,
  supplierDueDiligenceJob,
} from "@/lib/jobs/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    priceCheckJob,
    inventorySyncJob,
    orderProcessingJob,
    digestEmailJob,
    scheduledPriceCheckJob,
    scheduledInventorySyncJob,
    scheduledDigestJob,
    autoModeExecutionJob,
    autoOrderFulfillmentJob,
    supplierDueDiligenceJob,
  ],
});
