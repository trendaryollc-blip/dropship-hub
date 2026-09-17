"use client";

import { FileText, Download, Printer } from "lucide-react";
import type { CustomsCalculationResult } from "@/types/shipping";

interface CustomsDocumentGeneratorProps {
  result: CustomsCalculationResult;
  originCountry: string;
  destinationCountry: string;
}

export default function CustomsDocumentGenerator({ result, originCountry, destinationCountry }: CustomsDocumentGeneratorProps) {
  const generateDeclaration = () => {
    const lines: string[] = [
      "CUSTOMS DECLARATION",
      "=".repeat(50),
      "",
      `Date: ${new Date().toLocaleDateString()}`,
      `Origin: ${originCountry}`,
      `Destination: ${destinationCountry}`,
      `Total Declared Value: ${result.currency} ${result.summary.subtotal.toFixed(2)}`,
      "",
      "ITEMS:",
      "-".repeat(50),
    ];

    result.items.forEach((item, i) => {
      lines.push(`${i + 1}. ${item.name}`);
      lines.push(`   HS Code: ${item.hsCode}`);
      lines.push(`   Quantity: ${item.quantity}`);
      lines.push(`   Unit Value: ${result.currency} ${item.unitValue.toFixed(2)}`);
      lines.push(`   Total Value: ${result.currency} ${item.totalValue.toFixed(2)}`);
      lines.push(`   Duty Rate: ${(item.dutyRate * 100).toFixed(1)}%`);
      lines.push(`   Duty Amount: ${result.currency} ${item.dutyAmount.toFixed(2)}`);
      lines.push("");
    });

    lines.push("SUMMARY:");
    lines.push("-".repeat(50));
    lines.push(`Subtotal: ${result.currency} ${result.summary.subtotal.toFixed(2)}`);
    lines.push(`Shipping: ${result.currency} ${result.summary.shippingCost.toFixed(2)}`);
    lines.push(`Total Duties: ${result.currency} ${result.summary.totalDuties.toFixed(2)}`);
    lines.push(`Total VAT/GST: ${result.currency} ${result.summary.totalVAT.toFixed(2)}`);
    lines.push(`Total Landed Cost: ${result.currency} ${result.summary.totalLandedCost.toFixed(2)}`);
    lines.push(`Effective Tax Rate: ${result.summary.effectiveTaxRate.toFixed(1)}%`);
    lines.push("");

    if (result.warnings.length > 0) {
      lines.push("WARNINGS:");
      lines.push("-".repeat(50));
      result.warnings.forEach((w) => lines.push(`[${w.severity.toUpperCase()}] ${w.message}`));
      lines.push("");
    }

    lines.push("DECLARATION");
    lines.push("-".repeat(50));
    lines.push("I hereby declare that the information provided above is true and correct.");
    lines.push("I understand that false declarations may result in penalties.");
    lines.push("");
    lines.push("Signature: _________________________");
    lines.push("Date: _________________________");

    return lines.join("\n");
  };

  const generateCommercialInvoice = () => {
    const lines: string[] = [
      "COMMERCIAL INVOICE",
      "=".repeat(50),
      "",
      `Invoice Number: INV-${Date.now().toString(36).toUpperCase()}`,
      `Invoice Date: ${new Date().toLocaleDateString()}`,
      "",
      `Shipper: ${originCountry}`,
      `Consignee: ${destinationCountry}`,
      "",
      "ITEMS:",
      "-".repeat(50),
    ];

    result.items.forEach((item, i) => {
      lines.push(`${i + 1}. ${item.name}`);
      lines.push(`   HS Code: ${item.hsCode}`);
      lines.push(`   Qty: ${item.quantity} x ${result.currency} ${item.unitValue.toFixed(2)}`);
      lines.push(`   Amount: ${result.currency} ${item.totalValue.toFixed(2)}`);
      lines.push("");
    });

    lines.push("TOTALS:");
    lines.push("-".repeat(50));
    lines.push(`FOB Value: ${result.currency} ${result.summary.subtotal.toFixed(2)}`);
    lines.push(`Freight: ${result.currency} ${result.summary.shippingCost.toFixed(2)}`);
    lines.push(`CIF Value: ${result.currency} ${(result.summary.subtotal + result.summary.shippingCost).toFixed(2)}`);
    lines.push(`Total: ${result.currency} ${result.summary.totalLandedCost.toFixed(2)}`);

    return lines.join("\n");
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printDocument = (content: string) => {
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(`<pre style="font-family: monospace; font-size: 12px; white-space: pre-wrap;">${content}</pre>`);
      w.document.close();
      w.print();
    }
  };

  const declaration = generateDeclaration();
  const invoice = generateCommercialInvoice();

  return (
    <div className="glass rounded-xl p-4">
      <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
        <FileText className="h-3.5 w-3.5 text-accent" /> Customs Documents
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Customs Declaration */}
        <div className="p-3 rounded-lg bg-surface/50 border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] font-medium text-foreground">Customs Declaration</span>
          </div>
          <p className="text-[9px] text-muted-foreground mb-3">Official customs declaration form with all item details and duty calculations.</p>
          <div className="flex gap-1.5">
            <button
              onClick={() => downloadFile(declaration, `customs-declaration-${originCountry}-${destinationCountry}.txt`)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-accent text-white hover:bg-accent/90 transition-all"
            >
              <Download className="h-3 w-3" /> Download
            </button>
            <button
              onClick={() => printDocument(declaration)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium border border-white/10 text-muted-foreground hover:text-foreground hover:bg-surface transition-all"
            >
              <Printer className="h-3 w-3" /> Print
            </button>
          </div>
        </div>

        {/* Commercial Invoice */}
        <div className="p-3 rounded-lg bg-surface/50 border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] font-medium text-foreground">Commercial Invoice</span>
          </div>
          <p className="text-[9px] text-muted-foreground mb-3">Standard commercial invoice for international shipping with CIF values.</p>
          <div className="flex gap-1.5">
            <button
              onClick={() => downloadFile(invoice, `commercial-invoice-${originCountry}-${destinationCountry}.txt`)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-accent text-white hover:bg-accent/90 transition-all"
            >
              <Download className="h-3 w-3" /> Download
            </button>
            <button
              onClick={() => printDocument(invoice)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium border border-white/10 text-muted-foreground hover:text-foreground hover:bg-surface transition-all"
            >
              <Printer className="h-3 w-3" /> Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
