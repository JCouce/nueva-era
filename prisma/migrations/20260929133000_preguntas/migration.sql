-- CreateTable
CREATE TABLE "Pregunta" (
    "id" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "grupo" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "contexto" TEXT,
    "respuesta" TEXT NOT NULL DEFAULT '',
    "respondidaAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pregunta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Pregunta_area_orden_idx" ON "Pregunta"("area", "orden");
