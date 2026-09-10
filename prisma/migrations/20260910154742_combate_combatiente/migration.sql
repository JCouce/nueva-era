-- CreateEnum
CREATE TYPE "EstadoCombate" AS ENUM ('EN_CURSO', 'TERMINADO');

-- CreateTable
CREATE TABLE "Combate" (
    "id" TEXT NOT NULL,
    "estado" "EstadoCombate" NOT NULL DEFAULT 'EN_CURSO',
    "ronda" INTEGER NOT NULL DEFAULT 1,
    "turnoIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "terminadoAt" TIMESTAMP(3),

    CONSTRAINT "Combate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Combatiente" (
    "id" TEXT NOT NULL,
    "combateId" TEXT NOT NULL,
    "characterId" TEXT,
    "nombre" TEXT NOT NULL,
    "pgActual" INTEGER NOT NULL,
    "pgMax" INTEGER NOT NULL,
    "fatigaActual" INTEGER NOT NULL,
    "fatigaMax" INTEGER NOT NULL,
    "iniciativa" INTEGER,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "estados" JSONB NOT NULL DEFAULT '[]',
    "oculto" BOOLEAN NOT NULL DEFAULT false,
    "derrotado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Combatiente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Combatiente_combateId_idx" ON "Combatiente"("combateId");

-- CreateIndex
CREATE INDEX "Combatiente_characterId_idx" ON "Combatiente"("characterId");

-- AddForeignKey
ALTER TABLE "Combatiente" ADD CONSTRAINT "Combatiente_combateId_fkey" FOREIGN KEY ("combateId") REFERENCES "Combate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Combatiente" ADD CONSTRAINT "Combatiente_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
