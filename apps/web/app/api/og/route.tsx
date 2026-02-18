import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "The Right Wire";
  const source = searchParams.get("source") || "";
  const category = searchParams.get("category") || "Politics";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0a0a0a",
          padding: "60px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" }}>
          <div
            style={{
              backgroundColor: "#dc2626",
              color: "white",
              padding: "8px 16px",
              borderRadius: "8px",
              fontWeight: "bold",
              fontSize: "20px",
            }}
          >
            THE RIGHT WIRE
          </div>
          {category && (
            <div
              style={{
                backgroundColor: "#1f2937",
                color: "#9ca3af",
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "18px",
              }}
            >
              {category}
            </div>
          )}
        </div>

        {/* Title */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: title.length > 100 ? "36px" : title.length > 60 ? "44px" : "52px",
              fontWeight: "bold",
              color: "#f3f4f6",
              lineHeight: 1.3,
              maxWidth: "100%",
              overflow: "hidden",
            }}
          >
            {title}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid #374151",
            paddingTop: "20px",
          }}
        >
          {source && (
            <div style={{ color: "#6b7280", fontSize: "20px" }}>
              via @{source}
            </div>
          )}
          <div style={{ color: "#6b7280", fontSize: "18px" }}>
            the-right-wire.com
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
