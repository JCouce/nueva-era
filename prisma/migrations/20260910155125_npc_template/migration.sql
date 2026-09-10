-- AlterTable
ALTER TABLE "Combatiente" ADD COLUMN     "npcTemplateId" TEXT;

-- CreateTable
CREATE TABLE "NpcTemplate" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "pgBase" INTEGER NOT NULL,
    "nota" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NpcTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Combatiente_npcTemplateId_idx" ON "Combatiente"("npcTemplateId");

-- AddForeignKey
ALTER TABLE "Combatiente" ADD CONSTRAINT "Combatiente_npcTemplateId_fkey" FOREIGN KEY ("npcTemplateId") REFERENCES "NpcTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
