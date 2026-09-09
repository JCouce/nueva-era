-- CreateEnum
CREATE TYPE "CharacterStatus" AS ENUM ('DRAFT', 'APPROVED');

-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "status" "CharacterStatus" NOT NULL DEFAULT 'DRAFT';
