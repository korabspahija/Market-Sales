import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { activeSaleWhere, currentFlierWhere } from "@/lib/sales";
import { SITE_URL } from "@/lib/site";

// re-generate hourly — offers come and go weekly
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [sales, fliers, chains] = await Promise.all([
    prisma.sale.findMany({
      where: activeSaleWhere(),
      select: { id: true, updatedAt: true },
    }),
    prisma.flier.findMany({
      where: currentFlierWhere(),
      select: { id: true, createdAt: true },
    }),
    prisma.chain.findMany({ select: { slug: true } }),
  ]);

  return [
    { url: `${SITE_URL}/`, changeFrequency: "hourly", priority: 1 },
    ...chains.map((chain) => ({
      url: `${SITE_URL}/marketi/${chain.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
    { url: `${SITE_URL}/fletushkat`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/dyqanet`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/rreth-nesh`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/privatesia`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${SITE_URL}/kushtet`, changeFrequency: "yearly", priority: 0.1 },
    ...sales.map((sale) => ({
      url: `${SITE_URL}/oferta/${sale.id}`,
      lastModified: sale.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...fliers.map((flier) => ({
      url: `${SITE_URL}/fletushka/${flier.id}`,
      lastModified: flier.createdAt,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
  ];
}
