-- CreateEnum
CREATE TYPE "MediaFormat" AS ENUM ('PNG', 'JPG', 'WEBP', 'GIF', 'AVIF');

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "cosKey" VARCHAR(512) NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "bytes" INTEGER NOT NULL,
    "format" "MediaFormat" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_cosKey_key" ON "MediaAsset"("cosKey");

-- CreateIndex
CREATE INDEX "MediaAsset_createdAt_idx" ON "MediaAsset"("createdAt");

-- CreateIndex
CREATE INDEX "MediaAsset_format_createdAt_idx" ON "MediaAsset"("format", "createdAt");
