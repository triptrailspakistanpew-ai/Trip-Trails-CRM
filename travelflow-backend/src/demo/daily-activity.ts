/**
 * TravelFlow Pakistan - Daily Continuous Business Activity Generator
 * Simulates active daily business operations:
 * - Ingests 10-14 new customer leads from online/walk-in channels
 * - Conducts follow-up activities on the CRM pipeline
 * - Generates 4-7 formal quotations for qualified inquiries
 * - Converts 2-4 accepted quotations into confirmed bookings with services
 * - Generates customer invoices and records double-entry journal entries
 * - Collects customer advance deposits & final settlement payments
 * - Confirms supplier obligations & handles supplier payment settlements
 * - Records daily operating expenses
 * - Emits real-time notifications and recent activity records
 */

import { PrismaClient } from "@prisma/client";
import { DEMO_CONFIG } from "./config";
import {
  PAKISTANI_FIRST_NAMES,
  PAKISTANI_LAST_NAMES,
  PAKISTANI_CITIES_AND_AREAS,
  TRAVEL_PACKAGES,
  generateSyntheticPakistaniPhone,
  generateSyntheticCNIC,
  generateSyntheticPassport,
} from "./pakistani-data";
import { calculateServiceFinancials } from "../lib/financial-calculator";
import { generateRef } from "../utils/refGenerator";
import {
  postInvoiceJournal,
  confirmSupplierInvoice,
  postCustomerPaymentJournal,
  postExpenseJournal,
} from "../services/accounting.service";

const prisma = new PrismaClient();

export interface DailyActivityMetrics {
  date: string;
  leadsCreated: number;
  activitiesRecorded: number;
  quotationsCreated: number;
  bookingsCreated: number;
  invoicesCreated: number;
  paymentsReceived: number;
  totalRevenuePKR: number;
  expensesRecorded: number;
  notificationsCreated: number;
}

export async function generateDailyDemoActivity(targetDate: Date = new Date()): Promise<DailyActivityMetrics> {
  const agencyId = DEMO_CONFIG.agency.id;
  const year = targetDate.getFullYear();
  const dateStr = targetDate.toISOString().split("T")[0];

  console.log(`\n💼 [DAILY GENERATOR] Generating continuous business activity for: ${dateStr}`);

  // Fetch branches, agents, and admin
  const branches = await prisma.branch.findMany({ where: { agencyId, isDeleted: false } });
  if (branches.length === 0) {
    throw new Error("No branches found. Please run initial seed first.");
  }

  const agents = await prisma.user.findMany({
    where: { agencyId, role: "agent", status: "active", isDeleted: false },
  });
  const adminUser = await prisma.user.findFirst({
    where: { agencyId, role: { in: ["admin", "owner"] }, status: "active" },
  });
  const defaultUser = adminUser || agents[0];

  const ctx = {
    agencyId,
    callerId: defaultUser.id,
    callerRole: defaultUser.role,
  };

  const suppliers = await prisma.supplier.findMany({ where: { agencyId, isDeleted: false } });
  const supplierMap = new Map(suppliers.map((s) => [s.name, s]));

  let leadsCreated = 0;
  let activitiesRecorded = 0;
  let quotationsCreated = 0;
  let bookingsCreated = 0;
  let invoicesCreated = 0;
  let paymentsReceived = 0;
  let totalRevenuePKR = 0;
  let expensesRecorded = 0;
  let notificationsCreated = 0;

  // 1. INGEST 10-14 NEW LEADS
  const leadCount = Math.floor(Math.random() * (DEMO_CONFIG.daily.maxLeads - DEMO_CONFIG.daily.minLeads + 1)) + DEMO_CONFIG.daily.minLeads;
  const createdLeadsForToday: any[] = [];

  for (let i = 0; i < leadCount; i++) {
    const branch = branches[i % branches.length];
    const branchAgents = agents.filter((a) => a.branchId === branch.id);
    const assignedAgent = branchAgents.length > 0 ? branchAgents[i % branchAgents.length] : defaultUser;

    const pkg = TRAVEL_PACKAGES[(i + targetDate.getDate()) % TRAVEL_PACKAGES.length];
    const adults = Math.floor(Math.random() * 3) + 1;
    const children = Math.random() < 0.35 ? 1 : 0;
    const totalTravelers = adults + children;

    const firstName = PAKISTANI_FIRST_NAMES[(i * 5 + targetDate.getDate()) % PAKISTANI_FIRST_NAMES.length];
    const lastName = PAKISTANI_LAST_NAMES[(i * 3 + targetDate.getMonth()) % PAKISTANI_LAST_NAMES.length];
    const fullName = `${firstName} ${lastName}`;
    const phone = generateSyntheticPakistaniPhone(targetDate.getDate() * 100 + i);
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@travelinquiry.test`;

    const sources = ["WhatsApp Business", "Website Form", "Walk-in Customer", "Meta Lead Gen", "Customer Referral"];
    const source = sources[i % sources.length];
    const budget = pkg.services.reduce((sum, s) => sum + s.unitSelling, 0) * totalTravelers;

    const leadRef = await generateRef("LD", agencyId, year);
    const leadTime = new Date(targetDate.getTime() + (9 * 3600 + i * 20 * 60) * 1000); // spread across business day

    const lead = await prisma.lead.create({
      data: {
        agencyId,
        branchId: branch.id,
        leadRef,
        name: fullName,
        phone,
        whatsapp: phone,
        email,
        destination: pkg.destination,
        travelDate: new Date(targetDate.getTime() + 28 * 24 * 60 * 60 * 1000),
        budget,
        adults,
        children,
        source,
        status: "new",
        assignedAgentId: assignedAgent.id,
        notes: `New inquiry for ${pkg.title}. Client requested call back on WhatsApp.`,
        createdAt: leadTime,
        updatedAt: leadTime,
      },
    });
    leadsCreated++;
    createdLeadsForToday.push({ lead, pkg, assignedAgent, branch, totalTravelers, adults, children, firstName, lastName });

    // Initial agent activity
    await prisma.leadActivity.create({
      data: {
        agencyId,
        leadId: lead.id,
        type: "system",
        description: `Lead received via ${source} and routed to ${assignedAgent.firstName}`,
        createdBy: "System",
        createdAt: leadTime,
      },
    });
    activitiesRecorded++;

    // Notification to agent
    await prisma.notification.create({
      data: {
        agencyId,
        branchId: branch.id,
        recipientId: assignedAgent.id,
        type: "info",
        title: "New Travel Lead Assigned",
        body: `Lead ${leadRef} (${fullName}) for ${pkg.destination} assigned to you.`,
        entityType: "lead",
        entityId: lead.id,
        isRead: false,
        createdAt: leadTime,
      },
    });
    notificationsCreated++;
  }

  // 2. CONDUCT CRM FOLLOW-UPS & QUALIFY
  for (let i = 0; i < Math.min(6, createdLeadsForToday.length); i++) {
    const item = createdLeadsForToday[i];
    const callTime = new Date(item.lead.createdAt.getTime() + 45 * 60 * 1000);

    await prisma.lead.update({
      where: { id: item.lead.id },
      data: { status: "qualified", lastContactedAt: callTime },
    });

    await prisma.leadActivity.create({
      data: {
        agencyId,
        leadId: item.lead.id,
        type: "call",
        description: `Spoke with ${item.lead.name}. Validated budget of PKR ${item.lead.budget?.toLocaleString()} and travel dates.`,
        outcome: "Qualified – Generating customized proposal",
        createdBy: item.assignedAgent.firstName,
        createdAt: callTime,
      },
    });
    activitiesRecorded++;
  }

  // 3. GENERATE 4-6 QUOTATIONS
  const quoteTarget = Math.floor(Math.random() * 3) + 4;
  const generatedQuotes: any[] = [];

  for (let i = 0; i < Math.min(quoteTarget, createdLeadsForToday.length); i++) {
    const item = createdLeadsForToday[i];
    const quoteTime = new Date(item.lead.createdAt.getTime() + 90 * 60 * 1000);
    const quotationNumber = await generateRef("QT", agencyId, year);

    // Create Customer profile if not exists
    const customerRef = await generateRef("CUS", agencyId, year);
    const loc = PAKISTANI_CITIES_AND_AREAS[i % PAKISTANI_CITIES_AND_AREAS.length];
    const customer = await prisma.customer.create({
      data: {
        agencyId,
        branchId: item.branch.id,
        customerRef,
        type: "individual",
        firstName: item.firstName,
        lastName: item.lastName,
        phone: item.lead.phone,
        whatsapp: item.lead.whatsapp,
        email: item.lead.email,
        city: loc.city,
        address: `${loc.area}, ${loc.city}`,
        country: "Pakistan",
        cnic: generateSyntheticCNIC(i + targetDate.getDate(), loc.province),
        passportNumber: generateSyntheticPassport(i + targetDate.getDate()),
        status: "active",
        createdAt: quoteTime,
      },
    });

    await prisma.lead.update({
      where: { id: item.lead.id },
      data: { customerId: customer.id, status: "proposal_sent" },
    });

    let subtotal = 0;
    let costSubtotal = 0;
    const itemsData: any[] = [];

    for (let sIdx = 0; sIdx < item.pkg.services.length; sIdx++) {
      const s = item.pkg.services[sIdx];
      const supplier = supplierMap.get(s.supplierName);
      const itemCost = s.unitCost * item.totalTravelers;
      const itemSelling = s.unitSelling * item.totalTravelers;
      subtotal += itemSelling;
      costSubtotal += itemCost;

      itemsData.push({
        agencyId,
        serviceCategory: s.category,
        title: s.title,
        description: s.description,
        supplierId: supplier?.id || null,
        quantity: item.totalTravelers,
        unit: "Person",
        costPrice: itemCost,
        sellingPrice: itemSelling,
        total: itemSelling,
        sortOrder: sIdx,
        createdAt: quoteTime,
      });
    }

    const quotation = await prisma.quotation.create({
      data: {
        agencyId,
        quotationNumber,
        title: item.pkg.title,
        leadId: item.lead.id,
        customerId: customer.id,
        branchId: item.branch.id,
        consultantId: item.assignedAgent.id,
        travelType: item.pkg.travelType,
        destination: item.pkg.destination,
        departureDate: item.lead.travelDate,
        returnDate: new Date(item.lead.travelDate.getTime() + item.pkg.defaultDurationDays * 24 * 3600 * 1000),
        adults: item.adults,
        children: item.children,
        currency: "PKR",
        subtotal,
        agencyFee: 0,
        discount: 0,
        taxTotal: 0,
        total: subtotal,
        estimatedProfit: subtotal - costSubtotal,
        status: "sent",
        validUntil: new Date(quoteTime.getTime() + 10 * 24 * 3600 * 1000),
        customerNotes: `Customized travel quotation for ${item.lead.name}.`,
        createdAt: quoteTime,
        updatedAt: quoteTime,
        items: { create: itemsData },
      },
    });
    quotationsCreated++;
    generatedQuotes.push({ quotation, customer, item, itemsData, subtotal });
  }

  // 4. CONVERT 2-3 QUOTATIONS TO CONFIRMED BOOKINGS
  const bookingsToConvert = Math.min(Math.floor(Math.random() * 2) + 2, generatedQuotes.length);

  for (let i = 0; i < bookingsToConvert; i++) {
    const qData = generatedQuotes[i];
    const bookingTime = new Date(qData.quotation.createdAt.getTime() + 2 * 3600 * 1000);
    const bookingRef = await generateRef("BK", agencyId, year);

    // Accept quotation and convert lead
    await prisma.quotation.update({
      where: { id: qData.quotation.id },
      data: { status: "accepted" },
    });

    await prisma.lead.update({
      where: { id: qData.item.lead.id },
      data: { status: "converted" },
    });

    const booking = await prisma.booking.create({
      data: {
        agencyId,
        bookingRef,
        customerId: qData.customer.id,
        branchId: qData.item.branch.id,
        agentId: qData.item.assignedAgent.id,
        leadId: qData.item.lead.id,
        sourceQuotationId: qData.quotation.id,
        sourceType: "quotation",
        title: `${qData.item.pkg.travelType} – ${qData.item.pkg.destination}`,
        departureDate: qData.quotation.departureDate,
        returnDate: qData.quotation.returnDate,
        expectedAdults: qData.item.adults,
        expectedChildren: qData.item.children,
        currency: "PKR",
        bookingStatus: "confirmed",
        paymentStatus: "unpaid",
        notes: `Booking confirmed by ${qData.customer.firstName} ${qData.customer.lastName}.`,
        createdAt: bookingTime,
        updatedAt: bookingTime,
      },
    });
    bookingsCreated++;

    // Create Booking Services with exact financial calculator
    const bookingServices: any[] = [];
    for (let sIdx = 0; sIdx < qData.itemsData.length; sIdx++) {
      const it = qData.itemsData[sIdx];
      const financials = calculateServiceFinancials({
        unitCost: it.costPrice / it.quantity,
        unitSellingPrice: it.sellingPrice / it.quantity,
        quantity: it.quantity,
        supplierInvoiceAmount: null,
        taxTreatment: "VAT_ON_MARGIN",
        vatRate: 0,
      });

      const svc = await prisma.bookingService.create({
        data: {
          agencyId,
          bookingId: booking.id,
          serviceCategory: it.serviceCategory,
          title: it.title,
          description: it.description,
          supplierId: it.supplierId,
          costPrice: financials.lineCost,
          sellingPrice: financials.lineSelling,
          taxTreatment: "VAT_ON_MARGIN",
          vatRate: 0,
          taxBase: financials.taxBase,
          taxAmount: financials.taxAmount,
          expectedMargin: financials.expectedMargin,
          actualMargin: financials.actualMargin,
          costVariance: financials.costVariance,
          customerTotal: financials.customerTotal,
          financialStatus: "draft",
          quantity: financials.quantity,
          unit: "Person",
          status: "confirmed",
          sortOrder: sIdx,
          createdAt: bookingTime,
        },
      });
      bookingServices.push(svc);
    }

    // Add Passenger Travelers
    for (let t = 0; t < qData.item.totalTravelers; t++) {
      await prisma.bookingTraveler.create({
        data: {
          agencyId,
          bookingId: booking.id,
          firstName: t === 0 ? qData.item.firstName : PAKISTANI_FIRST_NAMES[(t * 7 + i) % PAKISTANI_FIRST_NAMES.length],
          lastName: qData.item.lastName,
          type: t < qData.item.adults ? "adult" : "child",
          passportNumber: generateSyntheticPassport(i * 100 + t),
          nationality: "Pakistani",
          createdAt: bookingTime,
        },
      });
    }

    // Generate Customer Invoice
    const invoiceRef = await generateRef("INV", agencyId, year);
    const invoiceTime = new Date(bookingTime.getTime() + 30 * 60 * 1000);
    const invoice = await prisma.invoice.create({
      data: {
        agencyId,
        branchId: qData.item.branch.id,
        invoiceRef,
        bookingId: booking.id,
        customerId: qData.customer.id,
        currency: "PKR",
        subtotal: qData.subtotal,
        tax: 0,
        total: qData.subtotal,
        status: "sent",
        dueDate: new Date(invoiceTime.getTime() + 7 * 24 * 3600 * 1000),
        createdAt: invoiceTime,
        items: {
          create: bookingServices.map((s) => ({
            agencyId,
            description: `${s.title} (${s.serviceCategory})`,
            quantity: s.quantity,
            unitPrice: s.sellingPrice / s.quantity,
            amount: s.sellingPrice,
            createdAt: invoiceTime,
          })),
        },
      },
    });
    invoicesCreated++;
    totalRevenuePKR += qData.subtotal;

    // Post double-entry Invoice Journal
    try {
      await postInvoiceJournal(ctx, invoice.id);
    } catch (err: any) {
      console.warn(`[Daily Invoice Journal Warning]: ${err?.message || err}`);
    }

    // 5. RECEIVE ADVANCE CUSTOMER PAYMENT TODAY (50% or 100%)
    const payFull = Math.random() < 0.5;
    const payAmount = payFull ? qData.subtotal : Math.round((qData.subtotal * 0.5) / 1000) * 1000;
    const paymentRef = await generateRef("REC", agencyId, year);
    const payTime = new Date(invoiceTime.getTime() + 45 * 60 * 1000);
    const paymentMethod = Math.random() < 0.7 ? "Bank Transfer" : "Online";

    const payment = await prisma.customerPayment.create({
      data: {
        agencyId,
        branchId: qData.item.branch.id,
        paymentRef,
        customerId: qData.customer.id,
        bookingId: booking.id,
        amount: payAmount,
        currency: "PKR",
        paymentMethod,
        status: "completed",
        notes: `Advance payment for Booking ${bookingRef} received via ${paymentMethod}`,
        date: payTime,
        recordedById: qData.item.assignedAgent.id,
        createdAt: payTime,
        allocations: {
          create: {
            agencyId,
            bookingId: booking.id,
            amount: payAmount,
          },
        },
      },
    });
    paymentsReceived++;

    // Update booking payment status
    await prisma.booking.update({
      where: { id: booking.id },
      data: { paymentStatus: payFull ? "paid" : "partial" },
    });

    if (payFull) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: "paid", paidAt: payTime },
      });
    }

    // Post double-entry Payment Journal
    try {
      await postCustomerPaymentJournal(ctx, payment.id);
    } catch (err: any) {
      console.warn(`[Daily Payment Journal Warning]: ${err?.message || err}`);
    }

    // Confirm initial supplier obligations
    for (const s of bookingServices) {
      if (s.supplierId) {
        try {
          await confirmSupplierInvoice(ctx, {
            bookingServiceId: s.id,
            supplierInvoiceAmount: s.costPrice,
            reference: `BILL-${bookingRef.slice(-6)}`,
            date: payTime,
          });
          await prisma.supplier.update({
            where: { id: s.supplierId },
            data: { balance: { increment: s.costPrice } },
          });
        } catch {}
      }
    }

    // Emit Recent Activity & Notification
    await prisma.recentActivity.create({
      data: {
        agencyId,
        branchId: qData.item.branch.id,
        type: "booking",
        title: "New Booking & Payment",
        detail: `Booking ${bookingRef} confirmed for ${qData.customer.firstName} ${qData.customer.lastName}. Payment of PKR ${payAmount.toLocaleString()} received.`,
        createdBy: qData.item.assignedAgent.firstName,
        createdByUserId: qData.item.assignedAgent.id,
        createdAt: payTime,
      },
    });

    await prisma.notification.create({
      data: {
        agencyId,
        branchId: qData.item.branch.id,
        recipientId: adminUser?.id || qData.item.assignedAgent.id,
        type: "success",
        title: "Booking Confirmed & Deposit Paid",
        body: `Booking ${bookingRef} created by ${qData.item.assignedAgent.firstName}. Deposit: PKR ${payAmount.toLocaleString()}.`,
        entityType: "booking",
        entityId: booking.id,
        isRead: false,
        createdAt: payTime,
      },
    });
    notificationsCreated++;
  }

  // 6. RECORD DAILY OPERATING EXPENSES
  const expenseCount = Math.floor(Math.random() * 2) + 1;
  for (let e = 0; e < expenseCount; e++) {
    const branch = branches[e % branches.length];
    const expRef = await generateRef("EXP", agencyId, year);
    const expAmount = Math.round((3000 + Math.random() * 12000) / 500) * 500;
    const expTitles = [
      { title: "Daily Branch Refreshments & Staff Tea Club", cat: "Office Supplies", code: "6200" },
      { title: "Client Transport / City Courier for Visa Documents", cat: "General & Admin Expense – Other", code: "6900" },
      { title: "Printer Toner & Official Quotation Stationery", cat: "Printing & Stationery", code: "6230" },
    ];
    const expItem = expTitles[e % expTitles.length];
    const expTime = new Date(targetDate.getTime() + (14 * 3600 + e * 45 * 60) * 1000);

    const expense = await prisma.expense.create({
      data: {
        agencyId,
        branchId: branch.id,
        expenseRef: expRef,
        title: expItem.title,
        category: expItem.cat,
        amount: expAmount,
        currency: "PKR",
        date: expTime,
        paidTo: "Local Pechs Vendor / Courier",
        paymentMethod: "Cash",
        recordedById: defaultUser.id,
        status: "approved",
        createdAt: expTime,
      },
    });
    expensesRecorded++;

    try {
      await postExpenseJournal(ctx, expense.id);
    } catch (err: any) {
      console.warn(`[Daily Expense Journal Warning]: ${err?.message || err}`);
    }
  }

  const metrics: DailyActivityMetrics = {
    date: dateStr,
    leadsCreated,
    activitiesRecorded,
    quotationsCreated,
    bookingsCreated,
    invoicesCreated,
    paymentsReceived,
    totalRevenuePKR,
    expensesRecorded,
    notificationsCreated,
  };

  console.log(`✅ [DAILY GENERATOR] Activity generation for ${dateStr} finished:`);
  console.log(`   - Leads: ${leadsCreated}, Follow-ups: ${activitiesRecorded}`);
  console.log(`   - Quotes: ${quotationsCreated}, Bookings: ${bookingsCreated}`);
  console.log(`   - Invoices: ${invoicesCreated}, Payments: ${paymentsReceived} (PKR ${totalRevenuePKR.toLocaleString()})`);
  console.log(`   - Expenses: ${expensesRecorded}, Notifications: ${notificationsCreated}\n`);

  return metrics;
}
