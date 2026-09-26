import { ImageResponse } from "next/og";

export const alt = "DropShip Hub — The All-in-One Ecommerce Toolkit";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0b0b12 0%, #14101f 55%, #1c1229 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: 800,
              color: "#0b0b12",
            }}
          >
            D
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: 6,
              color: "#f59e0b",
              textTransform: "uppercase",
            }}
          >
            DropShip Hub
          </div>
        </div>

        <div
          style={{
            fontSize: 88,
            fontWeight: 800,
            textAlign: "center",
            lineHeight: 1.1,
            maxWidth: 1000,
            marginBottom: 32,
          }}
        >
          The All-in-One Ecommerce Toolkit
        </div>

        <div
          style={{
            display: "flex",
            gap: 24,
            fontSize: 30,
            color: "#9ca3af",
          }}
        >
          <span>Find products</span>
          <span style={{ color: "#f59e0b" }}>·</span>
          <span>Compare suppliers</span>
          <span style={{ color: "#f59e0b" }}>·</span>
          <span>Print labels</span>
          <span style={{ color: "#f59e0b" }}>·</span>
          <span>Track profit</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
