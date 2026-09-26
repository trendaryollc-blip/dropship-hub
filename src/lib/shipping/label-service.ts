import { PublicError } from "@/lib/api-errors";
import { withKeyPool } from "@/lib/api-keys/pool";
import type { LabelAddress } from "@/types/returns";

/**
 * Return-label purchase via EasyPost (https://www.easypost.com/docs).
 *
 * Flow: create a return shipment (is_return: true) → pick the cheapest
 * returned rate → buy it → hand back the postage label URL + tracking.
 *
 * Requires EASYPOST_API_KEYS (free test keys work; postage is only charged
 * on live keys). Without a key, withKeyPool throws ConfigMissingError so the
 * route can answer with an honest setup message — never a fake label.
 */

const EASYPOST_API_URL = "https://api.easypost.com/v2";

export interface LabelParcelInput {
  /** Package weight in ounces (EasyPost unit). */
  weightOz?: number;
  /** Dimensions in inches. Defaults to 10×8×4 when omitted. */
  length?: number;
  width?: number;
  height?: number;
}

export interface PurchasedReturnLabel {
  trackingNumber: string;
  carrier: string;
  service: string;
  labelUrl: string;
  postagePrice: { amount: number; currency: string };
  shipmentId: string;
  /** Formatted ship-to (return center) address stored on the return request. */
  returnAddress: string;
  /** Print-ready instructions that reference the real carrier + tracking. */
  instructions: string;
}

interface EasyPostRate {
  id: string;
  carrier: string;
  service: string;
  rate: string;
  currency: string;
}

interface EasyPostShipment {
  id: string;
  rates?: EasyPostRate[];
  tracking_code?: string;
  postage_label?: { label_url?: string };
  selected_rate?: EasyPostRate;
}

function basicAuth(key: string): string {
  return `Basic ${Buffer.from(`${key}:`, "utf8").toString("base64")}`;
}

function toEasyPostAddress(address: LabelAddress): Record<string, string> {
  return {
    name: address.name,
    street1: address.street1,
    city: address.city,
    state: address.state,
    zip: address.zip,
    country: address.country || "US",
    ...(address.email ? { email: address.email } : {}),
  };
}

async function easypostRequest<T>(
  key: string,
  path: string,
  body: unknown
): Promise<T> {
  const res = await fetch(`${EASYPOST_API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: basicAuth(key),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const payload = (await res.json().catch(() => null)) as
    | { error?: { message?: string } }
    | null;
  if (!res.ok) {
    const message =
      payload?.error?.message || `EasyPost API request failed (HTTP ${res.status})`;
    const error = new Error(message) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  return payload as T;
}

/** Multi-line formatted address for display/print. */
export function formatAddress(address: LabelAddress): string {
  const lines = [
    address.name,
    address.street1,
    `${address.city}, ${address.state} ${address.zip}`,
    address.country === "US" || !address.country ? "" : address.country,
  ];
  return lines.filter(Boolean).join("\n");
}

export function buildReturnInstructions(carrier: string, trackingNumber: string): string {
  return [
    "1. Print this return label and attach it to the outside of the package.",
    "2. Pack the item(s) securely in the original packaging if possible.",
    `3. Drop off the package at any ${carrier} location or pickup point.`,
    `4. Keep the tracking number: ${trackingNumber}`,
    "5. Your refund will be processed within 3-5 business days of the return being received.",
  ].join("\n");
}

export async function purchaseReturnLabel(params: {
  fromAddress: LabelAddress;
  toAddress: LabelAddress;
  reference?: string;
  parcel?: LabelParcelInput;
}): Promise<PurchasedReturnLabel> {
  return withKeyPool("easypost", async (key) => {
    const created = await easypostRequest<{ shipment?: EasyPostShipment }>(
      key,
      "/shipments",
      {
        shipment: {
          is_return: true,
          ...(params.reference ? { reference: params.reference } : {}),
          from_address: toEasyPostAddress(params.fromAddress),
          to_address: toEasyPostAddress(params.toAddress),
          parcel: {
            length: params.parcel?.length ?? 10,
            width: params.parcel?.width ?? 8,
            height: params.parcel?.height ?? 4,
            weight: params.parcel?.weightOz ?? 16,
            unit: "oz",
          },
        },
      }
    );

    const shipment = created.shipment;
    const rates = shipment?.rates ?? [];
    if (!shipment || rates.length === 0) {
      throw new PublicError(
        "EasyPost returned no shipping rates for this route. Check the addresses and package weight, or connect a carrier account to your EasyPost dashboard."
      );
    }

    const cheapest = rates.reduce((best, rate) =>
      parseFloat(rate.rate) < parseFloat(best.rate) ? rate : best
    );

    const bought = await easypostRequest<{ shipment?: EasyPostShipment }>(
      key,
      `/shipments/${shipment.id}/buy`,
      { rate: { id: cheapest.id } }
    );

    const labelUrl = bought.shipment?.postage_label?.label_url;
    const trackingNumber = bought.shipment?.tracking_code;
    if (!labelUrl || !trackingNumber) {
      throw new Error("EasyPost purchased the shipment but returned no label URL or tracking number");
    }

    const selected = bought.shipment?.selected_rate ?? cheapest;
    return {
      trackingNumber,
      carrier: selected.carrier,
      service: selected.service,
      labelUrl,
      postagePrice: {
        amount: parseFloat(selected.rate),
        currency: selected.currency || cheapest.currency || "USD",
      },
      shipmentId: bought.shipment?.id ?? shipment.id,
      returnAddress: formatAddress(params.toAddress),
      instructions: buildReturnInstructions(selected.carrier, trackingNumber),
    };
  });
}
