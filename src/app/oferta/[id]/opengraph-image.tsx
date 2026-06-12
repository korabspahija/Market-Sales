import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db";
import { discountPercent, formatPrice, formatSize } from "@/lib/format";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Oferta në Aksione";

export default async function OpenGraphImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sale = await prisma.sale.findUnique({ where: { id }, include: { chain: true } });

  if (!sale) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#dc2626",
            color: "#fff",
            fontSize: 96,
            fontWeight: 800,
          }}
        >
          Aksione.
        </div>
      ),
      size,
    );
  }

  const percent = discountPercent(sale.oldPriceCents, sale.newPriceCents);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#ffffff",
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 800, color: "#0f172a" }}>
            Aksione<span style={{ color: "#dc2626" }}>.</span>
          </div>
          <div
            style={{
              display: "flex",
              background: "#dc2626",
              color: "#fff",
              fontSize: 64,
              fontWeight: 800,
              borderRadius: 24,
              padding: "12px 36px",
            }}
          >
            -{percent}%
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            justifyContent: "center",
            gap: 18,
          }}
        >
          <div style={{ display: "flex", fontSize: 34, color: "#5b6678", fontWeight: 700 }}>
            {sale.chain.name} · {formatSize(sale.sizeValue, sale.sizeUnit)}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 72,
              fontWeight: 800,
              color: "#0f172a",
              lineHeight: 1.1,
            }}
          >
            {sale.productName}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 28, marginTop: 10 }}>
            <div style={{ display: "flex", fontSize: 110, fontWeight: 800, color: "#dc2626" }}>
              {formatPrice(sale.newPriceCents)}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 56,
                fontWeight: 600,
                color: "#5b6678",
                textDecoration: "line-through",
              }}
            >
              {formatPrice(sale.oldPriceCents)}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 30, color: "#5b6678", fontWeight: 600 }}>
          Krahaso aksionet e marketeve të Kosovës — aksione.com
        </div>
      </div>
    ),
    size,
  );
}
