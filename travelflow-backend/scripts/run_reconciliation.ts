import { PrismaClient } from '@prisma/client';
import {
  postInvoiceJournal,
  postCustomerPaymentJournal,
  postSupplierPaymentJournal,
  postExpenseJournal,
  processAmortizations
} from '../src/services/accounting.service';

const prisma = new PrismaClient();

async function runTests() {
  console.log("Starting Financial Reconciliation Tests...");

  const results: any[] = [];
  const agency = await prisma.agency.findFirst();
  if (!agency) {
    console.error("No agency found. Run seed first.");
    return;
  }
  const agencyId = agency.id;
  const customer = await prisma.customer.findFirst({ where: { agencyId } });
  const branch = await prisma.branch.findFirst({ where: { agencyId } });
  const supplier = await prisma.supplier.findFirst({ where: { agencyId } });
  const agent = await prisma.user.findFirst({ where: { agencyId } });

  const ctx = { agencyId, callerId: agent!.id };

  const getBal = async (code: string) => {
    const acc = await prisma.chartOfAccount.findFirst({ where: { agencyId, code } });
    if (!acc) return 0;
    const lines = await prisma.journalLine.aggregate({
      where: { accountId: acc.id },
      _sum: { debit: true, credit: true }
    });
    return (lines._sum.debit || 0) - (lines._sum.credit || 0);
  };

  const getJe = async (sourceModule: string, sourceId: string) => {
    return prisma.journalEntry.findFirst({
      where: { agencyId, sourceModule, sourceId },
      include: { lines: { include: { account: true } } }
    });
  };

  try {
    const rnd = Math.floor(Math.random() * 1000000).toString();
    // ---------------------------------------------------------
    // Scenario 1: Agent booking
    // Supplier Cost = 1,000, Selling Price = 1,200, Margin = 200, VAT = 10, Customer Total = 1,210
    // ---------------------------------------------------------
    const b1 = await prisma.booking.create({
      data: {
        agencyId, branchId: branch!.id, customerId: customer!.id, agentId: agent!.id, bookingRef: `TEST-BK-${rnd}`,
        title: "Test Booking 1", departureDate: new Date(), bookingStatus: "confirmed",
        services: {
          create: {
            agencyId,
            serviceCategory: "flight", title: "Test Flight",
            supplierId: supplier!.id,
            costPrice: 1000, supplierInvoiceAmount: 1000,
            sellingPrice: 1200,
            taxAmount: 10, customerTotal: 1210,
            expectedMargin: 200, actualMargin: 200
          }
        }
      }
    });
    const inv1 = await prisma.invoice.create({
      data: {
        agencyId, branchId: branch!.id, customerId: customer!.id, bookingId: b1.id,
        invoiceRef: `TEST-INV-${rnd}`, subtotal: 1200, tax: 10, total: 1210
      }
    });

    await postInvoiceJournal(ctx as any, inv1.id);
    const je1Full = await getJe("INVOICE", inv1.id);

    const arLine = je1Full?.lines.find((l: any) => l.account.code === "1100");
    const apLine = je1Full?.lines.find((l: any) => l.account.code === "2000");
    const revLine = je1Full?.lines.find((l: any) => l.account.code === "4000");
    const vatLine = je1Full?.lines.find((l: any) => l.account.code === "2100");

    results.push({
      scenario: "1. Agent Booking Invoice",
      pass: arLine?.debit === 1210 && apLine?.credit === 1000 && revLine?.credit === 200 && vatLine?.credit === 10,
      details: { arDebit: arLine?.debit, apCredit: apLine?.credit, revCredit: revLine?.credit, vatCredit: vatLine?.credit }
    });

    // ---------------------------------------------------------
    // Scenario 2: Customer payment
    // ---------------------------------------------------------
    const cp = await prisma.customerPayment.create({
      data: {
        agencyId, branchId: branch!.id, customerId: customer!.id, paymentRef: `TEST-CP-${rnd}`,
        amount: 1210, paymentMethod: "bank_transfer", date: new Date()
      }
    });
    await postCustomerPaymentJournal(ctx as any, cp.id);
    const je2Full = await getJe("CUSTOMER_PAYMENT", cp.id);

    const bankLineCP = je2Full?.lines.find((l: any) => l.account.code === "1010");
    const arLineCP = je2Full?.lines.find((l: any) => l.account.code === "1100");

    results.push({
      scenario: "2. Customer Payment",
      pass: bankLineCP?.debit === 1210 && arLineCP?.credit === 1210,
      details: { bankDebit: bankLineCP?.debit, arCredit: arLineCP?.credit }
    });

    // ---------------------------------------------------------
    // Scenario 3: Supplier payment
    // ---------------------------------------------------------
    const sp = await prisma.supplierPayment.create({
      data: {
        agencyId, branchId: branch!.id, supplierId: supplier!.id, paymentRef: `TEST-SP-${rnd}`,
        amount: 1000, paymentMethod: "bank_transfer", date: new Date()
      }
    });
    await postSupplierPaymentJournal(ctx as any, sp.id);
    const je3Full = await getJe("SUPPLIER_PAYMENT", sp.id);

    const apLineSP = je3Full?.lines.find((l: any) => l.account.code === "2000");
    const bankLineSP = je3Full?.lines.find((l: any) => l.account.code === "1010");

    results.push({
      scenario: "3. Supplier Payment",
      pass: apLineSP?.debit === 1000 && bankLineSP?.credit === 1000,
      details: { apDebit: apLineSP?.debit, bankCredit: bankLineSP?.credit }
    });

    // ---------------------------------------------------------
    // Scenario 10: Prepaid annual rent (120,000 AED)
    // ---------------------------------------------------------
    const rentAcc = await prisma.chartOfAccount.findFirst({ where: { agencyId, code: "5200" } });
    const exp = await prisma.expense.create({
      data: {
        agencyId, branchId: branch!.id, expenseRef: `TEST-EXP-${rnd}`,
        title: "Annual Rent", category: "Rent", amount: 120000, date: new Date(),
        paymentMethod: "bank", recordedById: agent!.id, accountId: rentAcc!.id
      }
    });

    await postExpenseJournal(ctx as any, exp.id, { isPrepaid: true, amortizeOverMonths: 12, startDate: new Date() });
    const je10Full = await getJe("EXPENSE", exp.id);
    const prepaidLine = je10Full?.lines.find((l: any) => l.account.code === "1200");
    const bankLineExp = je10Full?.lines.find((l: any) => l.account.code === "1010");

    const amortRes = await processAmortizations(agencyId, new Date());

    const sched = await prisma.amortizationSchedule.findUnique({ where: { expenseId: exp.id } });
    const postedItem = await prisma.amortizationScheduleItem.findFirst({ where: { scheduleId: sched!.id, status: "POSTED" } });
    const pendingCount = await prisma.amortizationScheduleItem.count({ where: { scheduleId: sched!.id, status: "PENDING" } });

    results.push({
      scenario: "10. Prepaid Annual Rent",
      pass: prepaidLine?.debit === 120000 && bankLineExp?.credit === 120000 &&
        amortRes.processed >= 1 && Number(sched?.recognizedAmount) === 10000 && pendingCount === 11 &&
        postedItem !== null,
      details: {
        prepaidDebit: prepaidLine?.debit,
        recognized: Number(sched?.recognizedAmount),
        processedCount: amortRes.processed
      }
    });

    // General Balance Checks
    const totalAr = await getBal("1100");
    const totalAp = await getBal("2000");

    console.log(JSON.stringify({ results, totalAr, totalAp }, null, 2));

  } catch (e) {
    console.error("Test execution failed:", e);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
