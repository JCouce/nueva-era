-- AlterEnum
ALTER TYPE "EstadoCombate" ADD VALUE 'PREPARANDO';

-- AlterTable
ALTER TABLE "Combate" ADD COLUMN     "iniciadoAt" TIMESTAMP(3),
ALTER COLUMN "estado" SET DEFAULT 'PREPARANDO';
