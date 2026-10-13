-- AlterEnum
ALTER TYPE "CharacterStatus" ADD VALUE 'IN_REVIEW';

-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "submittedAt" TIMESTAMP(3);
