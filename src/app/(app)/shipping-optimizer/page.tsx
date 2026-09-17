"use client";

import { motion } from "framer-motion";
import { Truck, ArrowRight } from "lucide-react";
import ShippingOptimizerPanel from "@/components/shipping/ShippingOptimizerPanel";
import { ToastProvider } from "@/components/shipping/Toast";

export default function ShippingOptimizerPage() {
  return (
    <ToastProvider>
      <div className="max-w-6xl mx-auto space-y-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground flex items-center gap-3">
                <motion.div
                  initial={{ rotate: -20, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                >
                  <Truck className="h-6 w-6 text-accent" />
                </motion.div>
                Shipping Optimization Engine
              </h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-sm text-muted-foreground mt-1"
              >
                Compare carriers, predict delivery times, auto-select the best shipping method, and calculate customs duties.
              </motion.p>
            </div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground"
            >
              <span>5 carriers</span>
              <ArrowRight className="h-3 w-3" />
              <span>20 countries</span>
              <ArrowRight className="h-3 w-3" />
              <span>Real-time rates</span>
            </motion.div>
          </div>
        </motion.div>
        <ShippingOptimizerPanel />
      </div>
    </ToastProvider>
  );
}
