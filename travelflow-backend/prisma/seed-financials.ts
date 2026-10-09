import { PrismaClient } from "@prisma/client";
import { calculateServiceFinancials, TaxTreatment } from "../src/lib/financial-calculator";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting financial backfill migration...");
  
  const services = await prisma.bookingService.findMany({
    where: {
      // Only process records that haven't been backfilled yet
      // A quick check is to see if customerTotal is 0 while sellingPrice > 0
      sellingPrice: { gt: 0 },
      customerTotal: 0
    }
  });

  console.log(`Found ${services.length} services to backfill.`);

  let updated = 0;
  for (const svc of services) {
    let vatRate = 0;
    
    // Attempt to extract legacy vatRate from serviceDetails JSON hack
    if (svc.serviceDetails && typeof svc.serviceDetails === 'object') {
      const details = svc.serviceDetails as Record<string, any>;
      if (details.vatRate) {
        vatRate = Number(details.vatRate) || 0;
      }
    }

    const financials = calculateServiceFinancials({
      costPrice: svc.costPrice,
      sellingPrice: svc.sellingPrice,
      supplierInvoiceAmount: svc.supplierInvoiceAmount,
      taxTreatment: "VAT_ON_MARGIN", // Assume default for legacy
      vatRate
    });

    await prisma.bookingService.update({
      where: { id: svc.id },
      data: {
        taxTreatment: "VAT_ON_MARGIN",
        vatRate,
        taxBase: financials.taxBase,
        taxAmount: financials.taxAmount,
        expectedMargin: financials.expectedMargin,
        actualMargin: financials.actualMargin,
        costVariance: financials.costVariance,
        customerTotal: financials.customerTotal,
        financialStatus: svc.supplierInvoiceAmount !== null ? "invoiced" : "draft"
      }
    });

    updated++;
  }

  console.log(`Backfilled ${updated} services.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
