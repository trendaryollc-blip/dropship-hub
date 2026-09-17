"use client";

import { motion } from "framer-motion";
import { Package, Search, Clock, Globe, History, Bookmark, Truck, FileText } from "lucide-react";

interface EmptyStateProps {
  type: "compare" | "auto" | "predict" | "customs" | "history" | "saved" | "bulk" | "no-results";
  onAction?: () => void;
}

const emptyConfig = {
  compare: {
    icon: Search,
    title: "Compare Shipping Rates",
    description: "Enter your shipment details above and click Compare to see rates from 5 carriers side by side.",
    action: "Compare All Carriers",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  auto: {
    icon: Package,
    title: "Auto-Select Best Carrier",
    description: "Choose your optimization mode and constraints, then let our engine find the perfect carrier for you.",
    action: "Find Best Carrier",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
  },
  predict: {
    icon: Clock,
    title: "Predict Delivery Time",
    description: "Select a carrier and service level to get AI-powered delivery predictions with detailed risk analysis.",
    action: "Get Prediction",
    color: "text-purple-400",
    bg: "bg-purple-400/10",
  },
  customs: {
    icon: Globe,
    title: "Calculate Customs & Duties",
    description: "Add items to your shipment to calculate import duties, VAT, and total landed cost for your destination.",
    action: "Calculate Customs",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  history: {
    icon: History,
    title: "No Comparison History",
    description: "Your past shipping comparisons will appear here. Start by comparing rates above.",
    action: null,
    color: "text-muted-foreground",
    bg: "bg-surface",
  },
  saved: {
    icon: Bookmark,
    title: "No Saved Shipments",
    description: "Save frequently used shipment configurations for quick access later.",
    action: null,
    color: "text-muted-foreground",
    bg: "bg-surface",
  },
  bulk: {
    icon: Truck,
    title: "Bulk Shipping",
    description: "Add multiple packages to compare bulk shipping rates across all carriers at once.",
    action: "Add Package",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  "no-results": {
    icon: Search,
    title: "No Results Found",
    description: "Try adjusting your filters or search criteria to find matching rates.",
    action: "Clear Filters",
    color: "text-muted-foreground",
    bg: "bg-surface",
  },
};

export default function EmptyState({ type, onAction }: EmptyStateProps) {
  const config = emptyConfig[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="glass rounded-xl p-8 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
        className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl ${config.bg} mb-4`}
      >
        <Icon className={`h-7 w-7 ${config.color}`} />
      </motion.div>
      <motion.h4
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="font-display text-sm font-semibold text-foreground mb-2"
      >
        {config.title}
      </motion.h4>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto leading-relaxed"
      >
        {config.description}
      </motion.p>
      {config.action && onAction && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={onAction}
          className="px-5 py-2.5 bg-accent text-white rounded-xl text-xs font-medium hover:bg-accent/90 transition-all shadow-lg shadow-accent/20 hover:shadow-accent/30"
        >
          {config.action}
        </motion.button>
      )}
    </motion.div>
  );
}

export function CustomsDocumentEmpty() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass rounded-xl p-6 text-center"
    >
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-surface mb-4 text-muted-foreground">
        <FileText className="h-6 w-6" />
      </div>
      <h4 className="font-display text-sm font-semibold text-foreground mb-2">Customs Documents</h4>
      <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">
        Calculate customs first to generate printable customs declaration forms and commercial invoices.
      </p>
    </motion.div>
  );
}
