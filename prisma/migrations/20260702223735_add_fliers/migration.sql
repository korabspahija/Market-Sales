-- CreateEnum
CREATE TYPE "FlierStatus" AS ENUM ('PROCESSING', 'REVIEW', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "FlierPageStatus" AS ENUM ('PENDING', 'DONE', 'FAILED');

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "flierId" TEXT;

-- CreateTable
CREATE TABLE "Flier" (
    "id" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "status" "FlierStatus" NOT NULL DEFAULT 'PROCESSING',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Flier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlierPage" (
    "id" TEXT NOT NULL,
    "flierId" TEXT NOT NULL,
    "pageNo" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "status" "FlierPageStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "FlierPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftSale" (
    "id" TEXT NOT NULL,
    "flierId" TEXT NOT NULL,
    "pageNo" INTEGER NOT NULL,
    "productName" TEXT NOT NULL,
    "category" "Category",
    "sizeValue" DOUBLE PRECISION,
    "sizeUnit" "SizeUnit",
    "oldPriceCents" INTEGER,
    "newPriceCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DraftSale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Flier_chainId_createdAt_idx" ON "Flier"("chainId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FlierPage_flierId_pageNo_key" ON "FlierPage"("flierId", "pageNo");

-- CreateIndex
CREATE INDEX "Sale_flierId_idx" ON "Sale"("flierId");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_flierId_fkey" FOREIGN KEY ("flierId") REFERENCES "Flier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flier" ADD CONSTRAINT "Flier_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "Chain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlierPage" ADD CONSTRAINT "FlierPage_flierId_fkey" FOREIGN KEY ("flierId") REFERENCES "Flier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftSale" ADD CONSTRAINT "DraftSale_flierId_fkey" FOREIGN KEY ("flierId") REFERENCES "Flier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
