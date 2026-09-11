/*
  Warnings:

  - You are about to drop the column `pgBase` on the `NpcTemplate` table. All the data in the column will be lost.
  - Added the required column `stats` to the `NpcTemplate` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Combatiente" ADD COLUMN     "sheet" JSONB;

-- AlterTable
ALTER TABLE "NpcTemplate" DROP COLUMN "pgBase",
ADD COLUMN     "stats" JSONB NOT NULL;
