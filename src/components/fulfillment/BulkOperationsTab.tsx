"use client";

import { useState, useMemo, useCallback } from "react";
import type { User } from "firebase/auth";
import {
  Upload, Trash2, CheckSquare, Square, FileText, Loader2,
  AlertCircle, Play, Filter, X, Clock, Check, AlertTriangle,
} from "lucide-react";
import type { FulfillmentOrder, BulkOperation, CSVImportRow } from "@/types/fulfillment";
import { BULK_ACTION_CONFIG, DEFAULT_FULFILLMENT_SETTINGS } from "@/types/fulfillment";

type BulkAction = "status_update" | "supplier_assignment" | "cancel" | "fulfill" | "export" | "csv_import";

interface Props {
  orders: FulfillmentOrder[];
  user: User | null;
  authFetch: <T = unknown>(url: string, init?: RequestInit) => Promise<T>;
}

export default function BulkOperationsTab({ orders, user, authFetch }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeAction, setActiveAction] = useState<BulkAction | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [operation, setOperation] = useState<BulkOperation | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);
  const [operationResult, setOperationResult] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [history, setHistory] = useState<BulkOperation[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [newStatus, setNewStatus] = useState<string>("pending");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<CSVImportRow[]>([]);
  const [csvParseError, setCsvParseError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const suppliers = DEFAULT_FULFILLMENT_SETTINGS.supplierPreferences;

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesStatus = statusFilter === "all" || o.status === statusFilter;
      const matchesSearch = !searchQuery ||
        o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customerName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [orders, statusFilter, searchQuery]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === filteredOrders.length) return new Set();
      return new Set(filteredOrders.map((o) => o.id));
    });
  }, [filteredOrders]);

  const parseCSV = useCallback((file: File) => {
    setCsvParseError(null);
    setCsvPreview([]);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter((l) => l.trim());
        if (lines.length < 2) {
          setCsvParseError("CSV must have a header row and at least one data row");
          return;
        }
        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
        const requiredHeaders = ["ordernumber", "customername", "customeremail", "street", "city", "state", "zipcode", "country", "productname", "quantity", "unitprice", "source"];
        const missing = requiredHeaders.filter((h) => !headers.includes(h));
        if (missing.length > 0) {
          setCsvParseError(`Missing required columns: ${missing.join(", ")}`);
          return;
        }
        const rows: CSVImportRow[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map((v) => v.trim());
          if (values.length < headers.length) continue;
          const row: Record<string, string> = {};
          headers.forEach((h, idx) => { row[h] = values[idx] || ""; });
          rows.push({
            orderNumber: row["ordernumber"] || "",
            customerName: row["customername"] || "",
            customerEmail: row["customeremail"] || "",
            street: row["street"] || "",
            city: row["city"] || "",
            state: row["state"] || "",
            zipCode: row["zipcode"] || "",
            country: row["country"] || "",
            phone: row["phone"] || "",
            productName: row["productname"] || "",
            productSku: row["productsku"] || "",
            quantity: parseInt(row["quantity"] || "1", 10),
            unitPrice: parseFloat(row["unitprice"] || "0"),
            source: row["source"] || "custom",
            supplierId: row["supplierid"] || "",
          });
        }
        setCsvPreview(rows);
      } catch {
        setCsvParseError("Failed to parse CSV file");
      }
    };
    reader.readAsText(file);
  }, []);

  const exportCSV = useCallback(() => {
    const selected = orders.filter((o) => selectedIds.has(o.id));
    if (selected.length === 0) return;
    const headers = ["Order Number", "Customer", "Email", "Status", "Revenue", "Profit", "Created", "Store"];
    const rows = selected.map((o) => [
      o.orderNumber, o.customerName, o.customerEmail, o.status,
      o.totalRevenue.toFixed(2), o.profit.toFixed(2), o.createdAt, o.storePlatform || "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setOperationResult(`Exported ${selected.length} orders to CSV`);
  }, [orders, selectedIds]);

  const executeBulkAction = useCallback(async () => {
    if (!user || selectedIds.size === 0) return;
    const orderIds = Array.from(selectedIds);
    setOperationLoading(true);
    setOperationError(null);
    setOperationResult(null);

    try {
      if (activeAction === "export") {
        exportCSV();
        setOperationLoading(false);
        setActiveAction(null);
        return;
      }

      if (activeAction === "csv_import" && csvPreview.length > 0) {
        const res = await authFetch<{ success?: boolean; result?: { totalRows: number; validRows: number; invalidRows: number; importedOrders: string[]; errors: Array<{ row: number; message: string }> } }>(
          "/api/fulfillment/bulk/csv-import",
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csvData: csvPreview }) }
        );
        if (res?.result) {
          setOperationResult(`Imported ${res.result.importedOrders.length} orders (${res.result.invalidRows} failed)`);
          setSelectedIds(new Set());
          setCsvPreview([]);
          setCsvFile(null);
          setActiveAction(null);
        }
        setOperationLoading(false);
        return;
      }

      if (activeAction === "status_update") {
        const res = await authFetch<{ success?: boolean; updated?: number; errors?: Array<{ orderId: string; error: string }> }>(
          "/api/fulfillment/bulk/status-update",
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderIds, newStatus }) }
        );
        if (res) {
          setOperationResult(`Updated ${res.updated || 0} orders to "${newStatus}"`);
          setSelectedIds(new Set());
          setActiveAction(null);
        }
      } else if (activeAction === "supplier_assignment") {
        const supplier = suppliers.find((s) => s.supplierId === selectedSupplier);
        if (!supplier) {
          setOperationError("Please select a supplier");
          setOperationLoading(false);
          return;
        }
        const res = await authFetch<{ success?: boolean; updated?: number }>(
          "/api/fulfillment/bulk/supplier-assignment",
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderIds, supplierId: supplier.supplierId, supplierName: supplier.supplierName }) }
        );
        if (res) {
          setOperationResult(`Assigned supplier to ${res.updated || 0} orders`);
          setSelectedIds(new Set());
          setActiveAction(null);
        }
      } else if (activeAction === "cancel") {
        const res = await authFetch<{ success?: boolean; operation?: BulkOperation }>(
          "/api/fulfillment/bulk",
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderIds, action: "cancel" }) }
        );
        if (res?.operation) {
          setOperation(res.operation);
          setOperationResult(`Cancelled ${res.operation.successOrders} orders`);
          setSelectedIds(new Set());
          setActiveAction(null);
        }
      } else if (activeAction === "fulfill") {
        const res = await authFetch<{ success?: boolean; operation?: BulkOperation }>(
          "/api/fulfillment/bulk",
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderIds, action: "fulfill" }) }
        );
        if (res?.operation) {
          setOperation(res.operation);
          setOperationResult(`Auto-fulfilled ${res.operation.successOrders} orders`);
          setSelectedIds(new Set());
          setActiveAction(null);
        }
      }
    } catch (err) {
      setOperationError(err instanceof Error ? err.message : "Operation failed");
    }
    setOperationLoading(false);
  }, [user, selectedIds, activeAction, newStatus, selectedSupplier, csvPreview, authFetch, exportCSV, suppliers, orders]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await authFetch<{ operations?: BulkOperation[] }>("/api/fulfillment/bulk");
      if (res?.operations) setHistory(res.operations);
    } catch { /* ignore */ }
    setHistoryLoading(false);
  }, [authFetch]);

  const statusOptions = ["pending", "in_progress", "shipped", "delivered", "cancelled"] as const;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-bold text-foreground">Bulk Operations</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select orders and perform batch actions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowHistory(!showHistory); if (!showHistory) loadHistory(); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-all"
          >
            <Clock className="h-3 w-3" /> History
          </button>
        </div>
      </div>

      {/* Results/Error Display */}
      {operationResult && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-400">
          <Check className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1">{operationResult}</span>
          <button onClick={() => setOperationResult(null)}><X className="h-3.5 w-3.5" /></button>
        </div>
      )}
      {operationError && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1">{operationError}</span>
          <button onClick={() => setOperationError(null)}><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* Operation Progress */}
      {operation && operation.status === "running" && (
        <div className="glass rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Processing...</span>
            <span className="text-xs text-muted-foreground">
              {operation.processedOrders}/{operation.totalOrders}
            </span>
          </div>
          <div className="w-full bg-surface rounded-full h-2">
            <div
              className="bg-accent h-2 rounded-full transition-all"
              style={{ width: `${(operation.processedOrders / operation.totalOrders) * 100}%` }}
            />
          </div>
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            <span className="text-emerald-400">{operation.successOrders} succeeded</span>
            <span className="text-red-400">{operation.failedOrders} failed</span>
          </div>
        </div>
      )}

      {/* History Section */}
      {showHistory && (
        <div className="glass rounded-xl p-4">
          <h4 className="text-sm font-semibold text-foreground mb-3">Recent Operations</h4>
          {historyLoading ? (
            <div className="flex items-center justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : history.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No operations yet</p>
          ) : (
            <div className="space-y-2">
              {history.map((op) => (
                <div key={op.id} className="flex items-center justify-between p-3 bg-surface/50 rounded-lg border border-white/5">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      op.status === "completed" ? "bg-emerald-500/20 text-emerald-400" :
                      op.status === "running" ? "bg-blue-500/20 text-blue-400" :
                      op.status === "failed" ? "bg-red-500/20 text-red-400" :
                      "bg-surface text-muted-foreground"
                    }`}>
                      {op.status}
                    </span>
                    <div>
                      <p className="text-xs font-medium text-foreground">{op.action.replace("_", " ")}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(op.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-foreground">{op.successOrders}/{op.totalOrders}</p>
                    <p className="text-[10px] text-muted-foreground">succeeded</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CSV Import Section */}
      {activeAction === "csv_import" && (
        <div className="glass rounded-xl p-4">
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Upload className="h-4 w-4 text-accent" /> Import Orders from CSV
          </h4>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) { setCsvFile(file); parseCSV(file); }
            }}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              csvFile ? "border-accent/50 bg-accent/5" : "border-white/10 hover:border-white/20"
            }`}
          >
            {csvFile ? (
              <div>
                <FileText className="h-8 w-8 text-accent mx-auto mb-2" />
                <p className="text-sm text-foreground font-medium">{csvFile.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{csvPreview.length} rows parsed</p>
                <button
                  onClick={() => { setCsvFile(null); setCsvPreview([]); }}
                  className="mt-2 text-xs text-red-400 hover:underline"
                >
                  Remove file
                </button>
              </div>
            ) : (
              <div>
                <Upload className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Drag & drop CSV here or</p>
                <label className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent/20 text-accent rounded-lg text-xs font-medium cursor-pointer hover:bg-accent/30 transition-all">
                  <Upload className="h-3 w-3" /> Browse Files
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) { setCsvFile(file); parseCSV(file); }
                    }}
                  />
                </label>
                <p className="text-[10px] text-muted-foreground mt-2">
                  Required columns: orderNumber, customerName, customerEmail, street, city, state, zipCode, country, productName, quantity, unitPrice, source
                </p>
              </div>
            )}
          </div>
          {csvParseError && (
            <div className="flex items-center gap-2 mt-3 p-2 bg-red-500/10 rounded-lg text-xs text-red-400">
              <AlertTriangle className="h-3 w-3 flex-shrink-0" /> {csvParseError}
            </div>
          )}
          {csvPreview.length > 0 && (
            <div className="mt-3">
              <div className="max-h-48 overflow-y-auto rounded-lg border border-white/10">
                <table className="w-full text-xs">
                  <thead className="bg-surface/50 sticky top-0">
                    <tr>
                      <th className="px-2 py-1.5 text-left text-muted-foreground font-medium">Order #</th>
                      <th className="px-2 py-1.5 text-left text-muted-foreground font-medium">Customer</th>
                      <th className="px-2 py-1.5 text-left text-muted-foreground font-medium">Product</th>
                      <th className="px-2 py-1.5 text-right text-muted-foreground font-medium">Qty</th>
                      <th className="px-2 py-1.5 text-right text-muted-foreground font-medium">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-t border-white/5">
                        <td className="px-2 py-1.5 text-foreground font-mono">{row.orderNumber}</td>
                        <td className="px-2 py-1.5 text-foreground">{row.customerName}</td>
                        <td className="px-2 py-1.5 text-foreground truncate max-w-[150px]">{row.productName}</td>
                        <td className="px-2 py-1.5 text-foreground text-right">{row.quantity}</td>
                        <td className="px-2 py-1.5 text-foreground text-right">${row.unitPrice.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {csvPreview.length > 10 && (
                <p className="text-[10px] text-muted-foreground mt-1">...and {csvPreview.length - 10} more rows</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Filters & Selection */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground focus:outline-none focus:border-accent"
        >
          <option value="all">All Status</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>
      </div>

      {/* Order Selection Table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface/50 border-b border-white/10">
                <th className="px-3 py-2.5 text-left">
                  <button onClick={toggleSelectAll} className="flex items-center gap-1.5">
                    {selectedIds.size === filteredOrders.length && filteredOrders.length > 0 ? (
                      <CheckSquare className="h-3.5 w-3.5 text-accent" />
                    ) : (
                      <Square className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className="text-muted-foreground font-medium">
                      {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select all"}
                    </span>
                  </button>
                </th>
                <th className="px-3 py-2.5 text-left text-muted-foreground font-medium">Order</th>
                <th className="px-3 py-2.5 text-left text-muted-foreground font-medium">Customer</th>
                <th className="px-3 py-2.5 text-left text-muted-foreground font-medium">Status</th>
                <th className="px-3 py-2.5 text-right text-muted-foreground font-medium">Revenue</th>
                <th className="px-3 py-2.5 text-left text-muted-foreground font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.slice(0, 50).map((order) => (
                <tr
                  key={order.id}
                  onClick={() => toggleSelect(order.id)}
                  className={`border-b border-white/5 cursor-pointer transition-colors ${
                    selectedIds.has(order.id) ? "bg-accent/10" : "hover:bg-surface/50"
                  }`}
                >
                  <td className="px-3 py-2.5">
                    {selectedIds.has(order.id) ? (
                      <CheckSquare className="h-3.5 w-3.5 text-accent" />
                    ) : (
                      <Square className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-foreground">{order.orderNumber}</td>
                  <td className="px-3 py-2.5 text-foreground">{order.customerName}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                      order.status === "pending" ? "bg-amber-500/20 text-amber-400" :
                      order.status === "in_progress" ? "bg-blue-500/20 text-blue-400" :
                      order.status === "shipped" ? "bg-purple-500/20 text-purple-400" :
                      order.status === "delivered" ? "bg-emerald-500/20 text-emerald-400" :
                      "bg-surface text-muted-foreground"
                    }`}>
                      {order.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-foreground text-right">${order.totalRevenue.toFixed(2)}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredOrders.length > 50 && (
          <div className="px-3 py-2 text-center text-xs text-muted-foreground bg-surface/30 border-t border-white/5">
            Showing 50 of {filteredOrders.length} orders
          </div>
        )}
        {filteredOrders.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-xs">
            No orders match your filters
          </div>
        )}
      </div>

      {/* Bulk Actions Panel */}
      {selectedIds.size > 0 && (
        <div className="glass rounded-xl p-4">
          <h4 className="text-sm font-semibold text-foreground mb-3">
            Bulk Actions ({selectedIds.size} orders selected)
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {(Object.entries(BULK_ACTION_CONFIG) as [BulkAction, typeof BULK_ACTION_CONFIG[string]][]).map(([key, config]) => (
              <button
                key={key}
                onClick={() => {
                  if (key === "export") { exportCSV(); return; }
                  setActiveAction(activeAction === key ? null : key);
                  setConfirmAction(null);
                }}
                className={`flex items-center gap-2 p-3 rounded-lg border text-xs font-medium transition-all ${
                  activeAction === key
                    ? "bg-accent/20 border-accent/30 text-accent"
                    : "bg-surface/50 border-white/5 text-muted-foreground hover:text-foreground hover:border-white/10"
                }`}
              >
                <span className="text-base">{config.icon}</span>
                <span>{config.label}</span>
              </button>
            ))}
          </div>

          {/* Action-specific inputs */}
          {activeAction === "status_update" && (
            <div className="mt-3 flex items-center gap-2">
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground focus:outline-none focus:border-accent"
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>{s.replace("_", " ")}</option>
                ))}
              </select>
              <button
                onClick={() => executeBulkAction()}
                disabled={operationLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-500/30 transition-all disabled:opacity-50"
              >
                {operationLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                Update Status
              </button>
            </div>
          )}

          {activeAction === "supplier_assignment" && (
            <div className="mt-3 flex items-center gap-2">
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground focus:outline-none focus:border-accent"
              >
                <option value="">Select supplier...</option>
                {suppliers.map((s) => (
                  <option key={s.supplierId} value={s.supplierId}>{s.supplierName}</option>
                ))}
              </select>
              <button
                onClick={() => executeBulkAction()}
                disabled={operationLoading || !selectedSupplier}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg text-xs font-medium hover:bg-purple-500/30 transition-all disabled:opacity-50"
              >
                {operationLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                Assign Supplier
              </button>
            </div>
          )}

          {activeAction === "cancel" && (
            <div className="mt-3 flex items-center gap-2">
              {confirmAction !== "cancel" ? (
                <button
                  onClick={() => setConfirmAction("cancel")}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/30 transition-all"
                >
                  <AlertTriangle className="h-3 w-3" /> Confirm Cancel ({selectedIds.size} orders)
                </button>
              ) : (
                <button
                  onClick={() => executeBulkAction()}
                  disabled={operationLoading}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-500/30 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/40 transition-all disabled:opacity-50"
                >
                  {operationLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  Yes, Cancel Orders
                </button>
              )}
            </div>
          )}

          {activeAction === "fulfill" && (
            <div className="mt-3">
              <button
                onClick={() => executeBulkAction()}
                disabled={operationLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/30 transition-all disabled:opacity-50"
              >
                {operationLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                Auto-Fulfill {selectedIds.size} Orders
              </button>
            </div>
          )}

          {activeAction === "csv_import" && csvPreview.length > 0 && (
            <div className="mt-3">
              <button
                onClick={() => executeBulkAction()}
                disabled={operationLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-medium hover:bg-amber-500/30 transition-all disabled:opacity-50"
              >
                {operationLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                Import {csvPreview.length} Orders
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
