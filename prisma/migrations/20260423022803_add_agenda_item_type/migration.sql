-- CreateEnum
CREATE TYPE "AgendaItemType" AS ENUM ('EVENT', 'TASK', 'REMINDER');

-- AlterTable
ALTER TABLE "AgendaBlock" ADD COLUMN     "completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "itemType" "AgendaItemType" NOT NULL DEFAULT 'EVENT',
ADD COLUMN     "reminderAt" TIMESTAMP(3);
