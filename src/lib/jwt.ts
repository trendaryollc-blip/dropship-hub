import jwt from "jsonwebtoken";

export function signTrendaryoToken(payload: Record<string, unknown>, expiresIn = "1h"): string {
  const secret = process.env.TRENDARYO_JWT_SECRET || "";
  if (!secret) throw new Error("TRENDARYO_JWT_SECRET not configured");
  return jwt.sign(payload, secret, { expiresIn: expiresIn as unknown as number });
}
