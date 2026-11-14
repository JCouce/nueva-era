-- AlterTable
ALTER TABLE "NpcTemplate" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "etiquetas" TEXT[] DEFAULT ARRAY[]::TEXT[];
