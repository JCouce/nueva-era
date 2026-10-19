-- AlterTable
ALTER TABLE "Pregunta" ADD COLUMN     "corregidaAt" TIMESTAMP(3),
ADD COLUMN     "errata" BOOLEAN NOT NULL DEFAULT false;
