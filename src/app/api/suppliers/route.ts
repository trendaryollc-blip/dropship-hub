import { NextRequest, NextResponse } from "next/server";
import { getSuppliers, getSupplierById, searchSuppliers } from "@/lib/supplier-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const q = searchParams.get("q");

    if (id) {
      const supplier = await getSupplierById(id);
      if (!supplier) {
        return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
      }
      return NextResponse.json({ supplier });
    }

    if (q) {
      const suppliers = await searchSuppliers(q);
      return NextResponse.json({ suppliers, total: suppliers.length });
    }

    const suppliers = await getSuppliers();
    return NextResponse.json({ suppliers, total: suppliers.length });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch suppliers", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
