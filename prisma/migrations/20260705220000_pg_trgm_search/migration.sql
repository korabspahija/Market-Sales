CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "Sale_searchName_trgm_idx" ON "Sale" USING GIN ("searchName" gin_trgm_ops);
