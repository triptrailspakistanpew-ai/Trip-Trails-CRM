-- CreateTable
CREATE TABLE "IdMapping" (
    "collection" TEXT NOT NULL,
    "oldId" TEXT NOT NULL,
    "newId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdMapping_pkey" PRIMARY KEY ("collection","oldId")
);

-- CreateIndex
CREATE INDEX "IdMapping_collection_idx" ON "IdMapping"("collection");

-- CreateIndex
CREATE INDEX "IdMapping_newId_idx" ON "IdMapping"("newId");
