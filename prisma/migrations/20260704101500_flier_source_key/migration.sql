-- AlterTable
ALTER TABLE "Flier" ADD COLUMN "sourceKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Flier_sourceKey_key" ON "Flier"("sourceKey");
