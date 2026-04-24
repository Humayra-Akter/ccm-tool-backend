-- AlterTable
ALTER TABLE "ControlReportMap" ADD COLUMN     "prototypeMode" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PowerBIReport" ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastRefreshAt" TIMESTAMP(3),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "sourceSystem" TEXT;
