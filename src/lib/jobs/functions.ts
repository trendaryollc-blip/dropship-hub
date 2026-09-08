import { inngest } from "./client";

export const priceCheckJob = inngest.createFunction(
  {
    id: "price-check",
    name: "Price Check",
    retries: 5,
    triggers: [{ event: "app/price-check" }],
  },
  async ({ event, step }) => {
    const { uid, productId } = event.data;

    const result = await step.run("run-price-check", async () => {
      const { runPriceCheckForUser, runPriceCheckForProduct } = await import("@/lib/monitoring/scheduler");
      if (productId) {
        return runPriceCheckForProduct(uid, productId);
      }
      return runPriceCheckForUser(uid);
    });

    await step.run("log-result", async () => {
      const { logger } = await import("@/lib/logger");
      logger.info("Price check completed", { uid, result });
    });

    return result;
  }
);

export const inventorySyncJob = inngest.createFunction(
  {
    id: "inventory-sync",
    name: "Inventory Sync",
    retries: 3,
    triggers: [{ event: "app/inventory-sync" }],
  },
  async ({ event, step }) => {
    const { uid, storeId } = event.data;

    const result = await step.run("sync-inventory", async () => {
      const { getAdminDB } = await import("@/lib/firebase-admin");
      const db = await getAdminDB();

      const storesSnap = storeId
        ? await db.collection("users").doc(uid).collection("storeConnections").doc(storeId).get()
        : await db.collection("users").doc(uid).collection("storeConnections").where("status", "==", "connected").get();

      const stores = storeId ? ((storesSnap as any).exists ? [storesSnap] : []) : ((storesSnap as any).docs || []);

      let synced = 0;
      let errors = 0;

      for (const storeDoc of stores) {
        try {
          const monitoredSnap = await db.collection("users").doc(uid).collection("monitoredProducts").get();
          for (const prod of monitoredSnap.docs) {
            const product = prod.data();
            if (product.storeConnections?.some((sc: any) => sc.storeId === storeDoc.id)) {
              synced++;
            }
          }
        } catch {
          errors++;
        }
      }

      return { synced, errors, storeCount: stores.length };
    });

    return result;
  }
);

export const orderProcessingJob = inngest.createFunction(
  {
    id: "order-processing",
    name: "Order Processing",
    retries: 5,
    triggers: [{ event: "app/order-processing" }],
  },
  async ({ event, step }) => {
    const { uid, orderId } = event.data;

    const result = await step.run("process-order", async () => {
      const { getAdminDB } = await import("@/lib/firebase-admin");
      const db = await getAdminDB();

      const orderDoc = await db.collection("users").doc(uid).collection("fulfillmentOrders").doc(orderId).get();
      if (!orderDoc.exists) return { success: false, error: "Order not found" };

      const order = orderDoc.data();
      if (!order) return { success: false, error: "Order data missing" };

      if (order.status !== "pending") {
        return { success: true, skipped: true, reason: `Order already ${order.status}` };
      }

      await orderDoc.ref.update({
        status: "processing",
        updatedAt: new Date().toISOString(),
      });

      return { success: true, orderId };
    });

    await step.run("log-processing", async () => {
      const { logger } = await import("@/lib/logger");
      logger.info("Order processing completed", { uid, orderId, result });
    });

    return result;
  }
);

export const digestEmailJob = inngest.createFunction(
  {
    id: "digest-email",
    name: "Digest Email",
    retries: 3,
    triggers: [{ event: "app/digest-email" }],
  },
  async ({ event, step }) => {
    const { uid, frequency } = event.data;

    const result = await step.run("generate-digest", async () => {
      const emailDigest = await import("@/lib/email-digest");
      const generateFn = (emailDigest as any).generateDigest || (emailDigest as any).default;
      if (typeof generateFn === "function") {
        return generateFn(uid, frequency);
      }
      return null;
    });

    await step.run("send-email", async () => {
      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey || !result) return;

      const { getAdminDB } = await import("@/lib/firebase-admin");
      const db = await getAdminDB();
      const userDoc = await db.collection("users").doc(uid).get();
      const email = userDoc.data()?.email;
      if (!email) return;

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: "DropShip Hub <digest@dropshiphub.app>",
          to: email,
          subject: `${frequency === "weekly" ? "Weekly" : "Daily"} DropShip Digest`,
          html: (result as any).html || "Digest content",
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send digest email: ${response.statusText}`);
      }
    });

    return result;
  }
);

export const scheduledPriceCheckJob = inngest.createFunction(
  {
    id: "scheduled-price-check",
    name: "Scheduled Price Check",
    retries: 3,
    triggers: [{ cron: "*/30 * * * *" }],
  },
  async ({ step }) => {
    const result = await step.run("get-all-users", async () => {
      const { getAdminDB } = await import("@/lib/firebase-admin");
      const db = await getAdminDB();
      const usersSnap = await db.collection("users").get();
      return usersSnap.docs.map((doc) => doc.id);
    });

    for (const uid of result) {
      await step.run(`price-check-${uid}`, async () => {
        const { runPriceCheckForUser } = await import("@/lib/monitoring/scheduler");
        return runPriceCheckForUser(uid);
      });
    }

    return { usersChecked: result.length };
  }
);

export const scheduledInventorySyncJob = inngest.createFunction(
  {
    id: "scheduled-inventory-sync",
    name: "Scheduled Inventory Sync",
    retries: 3,
    triggers: [{ cron: "0 */6 * * *" }],
  },
  async ({ step }) => {
    const result = await step.run("get-all-users", async () => {
      const { getAdminDB } = await import("@/lib/firebase-admin");
      const db = await getAdminDB();
      const usersSnap = await db.collection("users").get();
      return usersSnap.docs.map((doc) => doc.id);
    });

    for (const uid of result) {
      await step.run(`inventory-sync-${uid}`, async () => {
        const { getAdminDB } = await import("@/lib/firebase-admin");
        const db = await getAdminDB();
        const storesSnap = await db.collection("users").doc(uid).collection("storeConnections").where("status", "==", "connected").get();
        return { uid, storeCount: storesSnap.size };
      });
    }

    return { usersSynced: result.length };
  }
);

export const scheduledDigestJob = inngest.createFunction(
  {
    id: "scheduled-digest",
    name: "Scheduled Digest",
    retries: 3,
    triggers: [{ cron: "0 8 * * *" }],
  },
  async ({ step }) => {
    const result = await step.run("get-digest-users", async () => {
      const { getAdminDB } = await import("@/lib/firebase-admin");
      const db = await getAdminDB();
      const usersSnap = await db.collection("users").get();
      const dailyUsers: string[] = [];
      for (const doc of usersSnap.docs) {
        const settingsDoc = await doc.ref.collection("settings").doc("notifications").get();
        if (settingsDoc.exists && settingsDoc.data()?.digestEnabled) {
          dailyUsers.push(doc.id);
        }
      }
      return dailyUsers;
    });

    return { usersToDigest: result.length };
  }
);

// ─── Auto Mode Execution Job ─────────────────────────────────────────────────
// Evaluates and executes auto-mode rules for users.

export const autoModeExecutionJob = inngest.createFunction(
  {
    id: "auto-mode-execution",
    name: "Auto Mode Execution",
    retries: 2,
    triggers: [
      { event: "app/auto-mode-check" },
      { cron: "*/15 * * * *" }, // Every 15 minutes
    ],
  },
  async ({ event, step }) => {
    // Get users to process
    const uids = await step.run("get-users", async () => {
      const data = event?.data as Record<string, unknown> | undefined;
      if (data?.uid) {
        return [data.uid as string];
      }
      const { getAdminDB } = await import("@/lib/firebase-admin");
      const db = await getAdminDB();
      const usersSnap = await db.collection("users").get();
      return usersSnap.docs.map((doc) => doc.id);
    });

    const results = [];
    for (const uid of uids) {
      const result = await step.run(`auto-mode-${uid}`, async () => {
        const { evaluateAutoTriggers } = await import("@/lib/ai/modes/auto-rules");
        return evaluateAutoTriggers(uid);
      });
      results.push({ uid, ...result });
    }

    return {
      usersProcessed: results.length,
      totalTriggered: results.reduce((sum, r) => sum + r.triggered.length, 0),
      totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
    };
  }
);

// ─── Auto Order Fulfillment ──────────────────────────────────────────────────
// Automatically routes and fulfills pending orders.

export const autoOrderFulfillmentJob = inngest.createFunction(
  {
    id: "auto-order-fulfillment",
    name: "Auto Order Fulfillment",
    retries: 3,
    triggers: [
      { event: "app/auto-fulfill-order" },
      { cron: "*/30 * * * *" }, // Every 30 minutes
    ],
  },
  async ({ event, step }) => {
    const uids = await step.run("get-users", async () => {
      const data = event?.data as Record<string, unknown> | undefined;
      if (data?.uid) {
        return [data.uid as string];
      }
      const { getAdminDB } = await import("@/lib/firebase-admin");
      const db = await getAdminDB();
      const usersSnap = await db.collection("users").get();
      return usersSnap.docs.map((doc) => doc.id);
    });

    const results = [];
    for (const uid of uids) {
      const result = await step.run(`fulfill-${uid}`, async () => {
        const { getAdminDB } = await import("@/lib/firebase-admin");
        const db = await getAdminDB();

        // Get pending orders
        const ordersSnap = await db
          .collection("users")
          .doc(uid)
          .collection("fulfillmentOrders")
          .where("status", "==", "pending")
          .limit(10)
          .get();

        let processed = 0;
        let failed = 0;

        for (const orderDoc of ordersSnap.docs) {
          try {
            const { orchestrateOrder, createOrchestrationInput } = await import("@/lib/fulfillment/orchestrator");
            const order = orderDoc.data();

            const input = createOrchestrationInput(
              uid,
              order as any,
              "scheduled",
              [],
              [],
              { autoApprove: { "*": true }, optimization: "balanced" }
            );

            await orchestrateOrder(input);
            processed++;
          } catch {
            failed++;
          }
        }

        return { processed, failed };
      });
      results.push({ uid, ...result });
    }

    return {
      usersProcessed: results.length,
      totalProcessed: results.reduce((sum, r) => sum + r.processed, 0),
      totalFailed: results.reduce((sum, r) => sum + r.failed, 0),
    };
  }
);

// ─── Supplier Due Diligence ──────────────────────────────────────────────────
// Periodically re-analyzes due diligence reports that are older than 7 days.

export const supplierDueDiligenceJob = inngest.createFunction(
  {
    id: "supplier-due-diligence",
    name: "Supplier Due Diligence",
    retries: 2,
    triggers: [
      { event: "app/generate-due-diligence" },
      { cron: "0 3 * * 1" }, // Every Monday at 3AM
    ],
  },
  async ({ event, step }) => {
    const uids = await step.run("get-users", async () => {
      const data = event?.data as Record<string, unknown> | undefined;
      if (data?.uid) {
        return [data.uid as string];
      }
      const { getAdminDB } = await import("@/lib/firebase-admin");
      const db = await getAdminDB();
      const usersSnap = await db.collection("users").get();
      return usersSnap.docs.map((doc) => doc.id);
    });

    let totalRefreshed = 0;

    for (const uid of uids) {
      const result = await step.run(`due-diligence-${uid}`, async () => {
        const { getAdminDB } = await import("@/lib/firebase-admin");
        const db = await getAdminDB();

        // Get all due diligence reports for this user
        const reportsSnap = await db.collection("users").doc(uid).collection("supplierDueDiligence").get();
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        let refreshed = 0;
        for (const reportDoc of reportsSnap.docs) {
          const data = reportDoc.data();
          const generatedAt = data.generatedAt ? new Date(data.generatedAt) : new Date(0);

          // Only refresh reports older than 7 days
          if (generatedAt < sevenDaysAgo) {
            try {
              const { getSupplierById } = await import("@/lib/supplier-service");
              const { generateDueDiligenceReport } = await import("@/lib/ai/due-diligence");

              const supplier = await getSupplierById(reportDoc.id);
              if (!supplier) continue;

              const { report } = await generateDueDiligenceReport(supplier);
              const now = new Date();
              const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

              await reportDoc.ref.update({
                ...report,
                generatedAt: now.toISOString(),
                expiresAt,
              });

              refreshed++;
            } catch {
              // Skip failed refreshes
            }
          }
        }

        return { refreshed };
      });

      totalRefreshed += result.refreshed;
    }

    return { usersProcessed: uids.length, totalRefreshed };
  }
);

// ── Search Alert Check Job (Feature 10) ──────────────────────────────────
export const searchAlertCheckJob = inngest.createFunction(
  {
    id: "search-alert-check",
    name: "Search Alert Check",
    retries: 3,
    triggers: [
      { cron: "*/30 * * * *" }, // Every 30 minutes
    ],
  },
  async ({ step }) => {
    const results = await step.run("check-all-alerts", async () => {
      const { getAdminDB } = await import("@/lib/firebase-admin");
      const db = await getAdminDB();

      // Get all active alerts
      const alertsSnap = await db.collection("searchAlerts").where("isActive", "==", true).get();
      let alertsChecked = 0;
      let matchesFound = 0;

      for (const alertDoc of alertsSnap.docs) {
        const alert = alertDoc.data();
        const userId = alert.userId;
        if (!userId) continue;

        try {
          // Import search and merge functions
          const { searchAllPlatforms } = await import("@/lib/platform-search");
          const { mergeProducts } = await import("@/lib/search/dedup");

          // Search for the alert query
          const searchResults = await searchAllPlatforms(alert.query, alert.platforms || []);

          // Normalize and merge results
          const allProducts: Array<{ title: string; price: number | null; image: string | null; link: string; source: string; rating?: number; reviews?: number }> = [];
          for (const r of searchResults) {
            if (r.data?.search_results) {
              for (const item of r.data.search_results) {
                if (item && typeof item === "object") {
                  const p = item as Record<string, unknown>;
                  allProducts.push({
                    title: String(p.title || p.name || ""),
                    price: typeof p.price === "number" ? p.price : null,
                    image: typeof p.image === "string" ? p.image : null,
                    link: String(p.link || p.url || "#"),
                    source: r.platform,
                    rating: typeof p.rating === "number" ? p.rating : undefined,
                    reviews: typeof p.reviews === "number" ? p.reviews : undefined,
                  });
                }
              }
            }
          }

          const merged = mergeProducts(allProducts);

          // Match against alert criteria
          const matched = merged.filter((product) => {
            if (alert.priceMin != null && (product.bestPrice == null || product.bestPrice < alert.priceMin)) return false;
            if (alert.priceMax != null && (product.bestPrice == null || product.bestPrice > alert.priceMax)) return false;
            if (alert.minRating != null && (product.rating == null || product.rating < alert.minRating)) return false;
            if (alert.platforms && alert.platforms.length > 0) {
              const alertPlatforms = new Set(alert.platforms);
              if (!product.platforms.some((p) => alertPlatforms.has(p.platform))) return false;
            }
            return true;
          });

          if (matched.length > 0) {
            matchesFound++;

            // Store match notification
            await db.collection("users").doc(userId).collection("notifications").add({
              type: "alert_match",
              alertId: alertDoc.id,
              query: alert.query,
              matchCount: matched.length,
              products: matched.slice(0, 5).map((p) => ({
                title: p.title,
                price: p.bestPrice,
                image: p.image,
                platform: p.bestPlatform,
              })),
              createdAt: new Date().toISOString(),
              read: false,
            });

            // Update alert lastChecked
            await alertDoc.ref.update({ lastChecked: new Date().toISOString() });
          }

          alertsChecked++;
        } catch {
          // Skip failed alert checks
        }
      }

      return { alertsChecked, matchesFound };
    });

    return results;
  }
);
