-- CreateTable
CREATE TABLE "RegistroMaster" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "tipo" TEXT NOT NULL,
    "characterIds" TEXT[],
    "datos" JSONB NOT NULL,
    "motivo" TEXT,
    "deshechoAt" TIMESTAMP(3),

    CONSTRAINT "RegistroMaster_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RegistroMaster_createdAt_idx" ON "RegistroMaster"("createdAt");

-- AddForeignKey
ALTER TABLE "RegistroMaster" ADD CONSTRAINT "RegistroMaster_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
