-- AlterTable
ALTER TABLE "RegistroMaster" ADD COLUMN     "combatienteIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
