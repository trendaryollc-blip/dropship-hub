"use client";

import {
  Download,
  Upload,
  Loader2,
} from "lucide-react";

interface DataTabProps {
  exporting: boolean;
  importing: boolean;
  onExport: () => void;
  onImport: () => void;
}

export default function DataTab({ exporting, importing, onExport, onImport }: DataTabProps) {
  return (
    <div className="space-y-4 animate-slide-up">
      <div className="glass rounded-2xl p-5 border border-accent/10">
        <div className="flex items-start gap-3">
          <Download className="h-5 w-5 text-accent shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Data Export & Import</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Export your data for backup or import it into another account. Exported data includes settings, saved products, missions, and more.
            </p>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-5 border border-border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Export Data</p>
            <p className="text-xs text-muted-foreground mt-0.5">Download all your data as a JSON file</p>
          </div>
          <button
            onClick={onExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/10 border border-accent/20 text-accent text-sm font-semibold hover:bg-accent/20 transition-all disabled:opacity-50"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export
          </button>
        </div>
      </div>

      <div className="glass rounded-2xl p-5 border border-border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Import Data</p>
            <p className="text-xs text-muted-foreground mt-0.5">Restore from a previously exported JSON file</p>
          </div>
          <button
            onClick={onImport}
            disabled={importing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all disabled:opacity-50"
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
