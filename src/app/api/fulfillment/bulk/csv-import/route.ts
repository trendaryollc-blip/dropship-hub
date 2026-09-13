import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import type { CSVImportRow, CSVImportResult } from "@/types/fulfillment";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function validateRow(row: CSVImportRow, index: number): string | null {
  if (!row.orderNumber?.trim()) return `Row ${index + 1}: Missing orderNumber`;
  if (!row.customerName?.trim()) return `Row ${index + 1}: Missing customerName`;
  if (!row.customerEmail?.trim()) return `Row ${index + 1}: Missing customerEmail`;
  if (!row.street?.trim()) return `Row ${index + 1}: Missing street`;
  if (!row.city?.trim()) return `Row ${index + 1}: Missing city`;
  if (!row.state?.trim()) return `Row ${index + 1}: Missing state`;
  if (!row.zipCode?.trim()) return `Row ${index + 1}: Missing zipCode`;
  if (!row.country?.trim()) return `Row ${index + 1}: Missing country`;
  if (!row.productName?.trim()) return `Row ${index + 1}: Missing productName`;
  if (!row.quantity || row.quantity <= 0) return `Row ${index + 1}: Invalid quantity`;
  if (row.unitPrice < 0) return `Row ${index + 1}: Invalid unitPrice`;
  if (!row.source?.trim()) return `Row ${index + 1}: Missing source`;
  return null;
}

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { csvData } = body as { csvData?: CSVImportRow[] };

    if (!csvData || !Array.isArray(csvData) || csvData.length === 0) {
      return NextResponse.json({ error: "csvData array required" }, { status: 400 });
    }

    if (csvData.length > 500) {
      return NextResponse.json({ error: "Maximum 500 rows per import" }, { status: 400 });
    }

    const db = await getAdminDB();
    const now = new Date().toISOString();
    const errors: CSVImportResult["errors"] = [];
    const importedOrders: string[] = [];
    let validRows = 0;

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const validationError = validateRow(row, i);

      if (validationError) {
        errors.push({ row: i + 1, message: validationError });
        continue;
      }

      try {
        validRows++;
        const orderId = generateId();
        const orderData = {
          id: orderId,
          trendaryoOrderId: `TDO-${generateId().toUpperCase()}`,
          orderNumber: row.orderNumber.trim(),
          items: [
            {
              productId: row.productSku || generateId(),
              name: row.productName.trim(),
              price: row.unitPrice,
              quantity: row.quantity,
              source: row.source.trim(),
              supplierId: row.supplierId || "",
              supplierName: "",
              imageUrl: "",
              platformProductId: row.productSku || "",
              unitCost: row.unitPrice,
            },
          ],
          customerName: row.customerName.trim(),
          customerEmail: row.customerEmail.trim(),
          shippingAddress: {
            fullName: row.customerName.trim(),
            email: row.customerEmail.trim(),
            phone: row.phone || "",
            street: row.street.trim(),
            city: row.city.trim(),
            state: row.state.trim(),
            zipCode: row.zipCode.trim(),
            country: row.country.trim(),
          },
          status: "pending",
          platformOrders: [],
          totalRevenue: row.unitPrice * row.quantity,
          totalCost: row.unitPrice * row.quantity,
          profit: 0,
          createdAt: now,
          updatedAt: now,
        };

        await db.collection("users").doc(uid).collection("fulfillmentOrders").doc(orderId).set(orderData);
        importedOrders.push(orderId);
      } catch (error) {
        errors.push({ row: i + 1, message: error instanceof Error ? error.message : "Unknown error" });
      }
    }

    const result: CSVImportResult = {
      totalRows: csvData.length,
      validRows,
      invalidRows: csvData.length - validRows,
      errors,
      importedOrders,
    };

    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to import CSV", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.BULK_OPS);
