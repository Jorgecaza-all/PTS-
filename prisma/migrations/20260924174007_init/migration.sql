-- CreateEnum
CREATE TYPE "LotAccessType" AS ENUM ('OPEN_LOT', 'GATE_ACCESS');

-- CreateEnum
CREATE TYPE "PermitType" AS ENUM ('purchased', 'staff_issued', 'dv_exempt');

-- CreateEnum
CREATE TYPE "PermitStatus" AS ENUM ('active', 'expired');

-- CreateTable
CREATE TABLE "Lot" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accessType" "LotAccessType" NOT NULL,

    CONSTRAINT "Lot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "price" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventLot" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,

    CONSTRAINT "EventLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permit" (
    "id" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "permitType" "PermitType" NOT NULL,
    "eventId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "nameOnPermit" TEXT NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "plateChanged" BOOLEAN NOT NULL DEFAULT false,
    "paymentRef" TEXT,
    "dvPlacardNumber" TEXT,
    "status" "PermitStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventLot_eventId_lotId_key" ON "EventLot"("eventId", "lotId");

-- CreateIndex
CREATE INDEX "Permit_licensePlate_idx" ON "Permit"("licensePlate");

-- CreateIndex
CREATE INDEX "Permit_eventId_idx" ON "Permit"("eventId");

-- AddForeignKey
ALTER TABLE "EventLot" ADD CONSTRAINT "EventLot_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLot" ADD CONSTRAINT "EventLot_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permit" ADD CONSTRAINT "Permit_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permit" ADD CONSTRAINT "Permit_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
