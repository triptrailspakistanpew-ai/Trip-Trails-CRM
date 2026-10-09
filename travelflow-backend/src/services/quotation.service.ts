import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";
import { generateRef, type RefPrefix } from "../utils/refGenerator";
import {
  calculateServiceFinancials,
  type TaxTreatment,
} from "../lib/financial-calculator";

type AgencyContext = { agencyId: string };

export type QuotationServiceQuotationInput = {
  quotationNumber?: string;
  title: string;
  leadId?: string;
  customerId?: string;
  branchId: string;
  consultantId: string;
  travelType: string;
  destination: string;
  departureDate?: string;
  returnDate?: string;
  adults: number;
  children: number;
  infants: number;
  currency: string;
  agencyFee: number;
  discount: number;
  validUntil?: string;
  customerNotes?: string;
  internalNotes?: string;
  termsTemplateId?: string;
  terms?: string;
  authorizedSignature?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  items?: Array<{
    serviceCategory: string;
    supplierId?: string;
    title: string;
    description?: string;
    quantity: number;
    unit: string;
    costPrice: number;
    sellingPrice: number;
    sortOrder?: number;
  }>;
  taxes?: Array<{
    taxName: string;
    taxType: "percentage" | "fixed";
    taxValue: number;
  }>;
  attachments?: Array<{
    fileName: string;
    fileUrl: string;
    mimeType: string;
  }>;
};

type CreateQuotationArgs = AgencyContext & {
  createdBy: string;
  input: QuotationServiceQuotationInput;
};
type UpdateQuotationArgs = AgencyContext & {
  quotationId: string;
  updatedBy: string;
  input: Partial<QuotationServiceQuotationInput>;
};
type SetStatusArgs = AgencyContext & {
  quotationId: string;
  status: string;
  actorId: string;
  changes?: string;
};
type ConvertArgs = AgencyContext & { quotationId: string; actorId: string };

function computeTotals(
  items: Array<{
    quantity: number;
    sellingPrice: number;
    costPrice: number;
  }> = [],
  taxes: Array<{ taxType: "percentage" | "fixed"; taxValue: number }> = [],
  agencyFee: number,
  discount: number,
) {
  const subtotal = items.reduce(
    (sum, it) => sum + Number(it.quantity ?? 0) * Number(it.sellingPrice ?? 0),
    0,
  );
  const costSubtotal = items.reduce(
    (sum, it) => sum + Number(it.quantity ?? 0) * Number(it.costPrice ?? 0),
    0,
  );
  const estimatedProfit =
    subtotal - costSubtotal + Number(agencyFee ?? 0) - Number(discount ?? 0);

  const taxTotal = taxes.reduce((sum, t) => {
    if (t.taxType === "percentage")
      return sum + (estimatedProfit * Number(t.taxValue ?? 0)) / 100;
    return sum + Number(t.taxValue ?? 0);
  }, 0);
  const total =
    subtotal + Number(agencyFee ?? 0) - Number(discount ?? 0) + taxTotal;
  return { subtotal, taxTotal, total, estimatedProfit };
}

export async function listQuotations({
  agencyId,
  query,
}: AgencyContext & { query: any }) {
  const where: any = { agencyId, isDeleted: false };
  if (query?.status) where.status = query.status;
  if (query?.destination)
    where.destination = {
      contains: String(query.destination),
      mode: "insensitive",
    };
  if (query?.startDate || query?.endDate) {
    where.createdAt = {};
    if (query?.startDate) where.createdAt.gte = new Date(query.startDate);
    if (query?.endDate) where.createdAt.lte = new Date(query.endDate);
  }

  const page = Number(query?.page ?? 1);
  const limit = Math.min(Number(query?.limit ?? 20), 100);
  const skip = (page - 1) * limit;

  const docs = await prisma.quotation.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take: limit,
    include: { customer: true },
  });

  const total = await prisma.quotation.count({ where });

  const items = docs.map((doc) => ({
    ...doc,
    quotationRef: doc.quotationNumber,
    grandTotal: doc.total,
    subtotalAmount: doc.subtotal,
    taxAmount: doc.taxTotal,
    customer: doc.customer
      ? doc.customer
      : doc.customerName
        ? {
          id: null,
          firstName: doc.customerName.split(" ")[0] || "",
          lastName: doc.customerName.split(" ").slice(1).join(" ") || "",
          phone: doc.customerPhone || "",
          email: doc.customerEmail || "",
          _pending: true,
        }
        : undefined,
  }));

  return { items, page, limit, total };
}

export async function getQuotation(agencyId: string, quotationId: string) {
  const quotationDoc = await prisma.quotation.findFirst({
    where: { agencyId, id: quotationId, isDeleted: false },
    include: { customer: true },
  });
  if (!quotationDoc) return null;

  const [items, taxes, attachments, versions] = await Promise.all([
    prisma.quotationItem.findMany({
      where: { agencyId, quotationId, isDeleted: false },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { supplier: true },
    }),
    prisma.quotationTax.findMany({
      where: { agencyId, quotationId, isDeleted: false },
      orderBy: { createdAt: "asc" },
    }),
    prisma.quotationAttachment.findMany({
      where: { agencyId, quotationId, isDeleted: false },
      orderBy: { createdAt: "asc" },
    }),
    prisma.quotationVersion.findMany({
      where: { agencyId, quotationId, isDeleted: false },
      orderBy: { version: "asc" },
    }),
  ]);

  const q: any = { ...quotationDoc };
  q.quotationRef = q.quotationNumber;
  q.grandTotal = q.total;
  q.subtotalAmount = q.subtotal;
  q.taxAmount = q.taxTotal;
  q.notes = q.customerNotes;
  q.termsAndConditions = q.terms;

  if (quotationDoc.customer) {
    q.customer = quotationDoc.customer;
    q.customerId = quotationDoc.customer.id;
  } else if (quotationDoc.customerName) {
    q.customer = {
      id: null,
      firstName: quotationDoc.customerName.split(" ")[0] || "",
      lastName: quotationDoc.customerName.split(" ").slice(1).join(" ") || "",
      phone: quotationDoc.customerPhone || "",
      email: quotationDoc.customerEmail || "",
      _pending: true,
    };
  }

  q.items = items.map((it: any) => ({
    ...it,
    supplierId: it.supplierId,
    costPrice: it.costPrice ?? 0,
    sellingPrice: it.sellingPrice ?? it.unitPrice ?? 0,
    lineTotal: it.lineTotal ?? it.total,
  }));
  q.taxes = taxes.map((t: any) => ({
    ...t,
    label: t.label ?? t.taxName,
    value: t.value ?? t.taxValue,
    amount: t.amount ?? t.taxAmount,
  }));
  q.attachments = attachments.map((a: any) => ({
    ...a,
    name: a.name ?? a.fileName,
    url: a.url ?? a.fileUrl,
    type: a.type ?? a.mimeType,
  }));
  q.versions = versions.map((v: any) => ({ ...v, versionNumber: v.version }));

  return q;
}

export async function createQuotation({
  agencyId,
  createdBy,
  input,
}: CreateQuotationArgs) {
  const quotationNumber =
    input.quotationNumber?.trim() ||
    (await generateRef("QT" as RefPrefix, agencyId));
  const items = input.items ?? [];
  const taxes = input.taxes ?? [];
  const agencyFee = Number(input.agencyFee ?? 0);
  const discount = Number(input.discount ?? 0);

  const totals = computeTotals(
    items.map((it) => ({
      quantity: it.quantity,
      sellingPrice: it.sellingPrice,
      costPrice: it.costPrice,
    })),
    taxes.map((t) => ({ taxType: t.taxType, taxValue: t.taxValue })),
    agencyFee,
    discount,
  );

  const quotation = await prisma.$transaction(async (tx) => {
    const q = await tx.quotation.create({
      data: {
        agencyId,
        quotationNumber,
        title: input.title,
        leadId: input.leadId || null,
        customerId: input.customerId || null,
        branchId: input.branchId,
        consultantId: input.consultantId,
        travelType: input.travelType,
        destination: input.destination,
        departureDate: input.departureDate
          ? new Date(input.departureDate)
          : null,
        returnDate: input.returnDate ? new Date(input.returnDate) : null,
        adults: Number(input.adults ?? 0),
        children: Number(input.children ?? 0),
        infants: Number(input.infants ?? 0),
        currency: input.currency,
        subtotal: totals.subtotal,
        agencyFee,
        discount,
        taxTotal: totals.taxTotal,
        total: totals.total,
        estimatedProfit: totals.estimatedProfit,
        status: "draft",
        validUntil: input.validUntil ? new Date(input.validUntil) : null,
        customerNotes: input.customerNotes || null,
        internalNotes: input.internalNotes || null,
        termsTemplateId: input.termsTemplateId || null,
        terms: input.terms || null,
        authorizedSignature: input.authorizedSignature || null,
        customerName: input.customerName || null,
        customerPhone: input.customerPhone || null,
        customerEmail: input.customerEmail || null,
      },
    });

    if (items.length) {
      await tx.quotationItem.createMany({
        data: items.map((it, idx) => ({
          agencyId,
          quotationId: q.id,
          serviceCategory: it.serviceCategory || "other",
          supplierId: it.supplierId || null,
          title: it.title,
          description: it.description || null,
          quantity: Number(it.quantity ?? 0),
          unit: it.unit || "Person",
          costPrice: Number(it.costPrice ?? 0),
          sellingPrice: Number(it.sellingPrice ?? 0),
          total: Number(it.quantity ?? 0) * Number(it.sellingPrice ?? 0),
          sortOrder: it.sortOrder ?? idx,
        })),
      });
    }

    if (taxes.length) {
      await tx.quotationTax.createMany({
        data: taxes.map((t) => ({
          agencyId,
          quotationId: q.id,
          taxName: t.taxName,
          taxType: t.taxType,
          taxValue: Number(t.taxValue ?? 0),
          taxAmount:
            t.taxType === "percentage"
              ? (totals.estimatedProfit * Number(t.taxValue ?? 0)) / 100
              : Number(t.taxValue ?? 0),
        })),
      });
    }

    if (input.attachments?.length) {
      await tx.quotationAttachment.createMany({
        data: input.attachments.map((a) => ({
          agencyId,
          quotationId: q.id,
          fileName: a.fileName,
          fileUrl: a.fileUrl,
          mimeType: a.mimeType,
        })),
      });
    }

    await tx.quotationVersion.create({
      data: {
        agencyId,
        quotationId: q.id,
        version: 1,
        changes: "Created quotation",
        createdBy,
      },
    });

    return q;
  }, { maxWait: 10000, timeout: 20000 });

  return getQuotation(agencyId, quotation.id);
}

export async function updateQuotation({
  agencyId,
  quotationId,
  updatedBy,
  input,
}: UpdateQuotationArgs) {
  const quotation = await prisma.quotation.findFirst({
    where: { agencyId, id: quotationId, isDeleted: false },
  });
  if (!quotation) return null;

  const existingItems = await prisma.quotationItem.findMany({
    where: { agencyId, quotationId, isDeleted: false },
  });
  const existingTaxes = await prisma.quotationTax.findMany({
    where: { agencyId, quotationId, isDeleted: false },
  });

  const nextItems = (input.items ?? existingItems).map((it: any) => ({
    serviceCategory: it.serviceCategory,
    supplierId: it.supplierId,
    title: it.title,
    description: it.description,
    quantity: Number(it.quantity ?? 0),
    unit: it.unit,
    costPrice: Number(it.costPrice ?? 0),
    sellingPrice: Number(it.sellingPrice ?? 0),
    sortOrder: it.sortOrder ?? 0,
  }));

  const nextTaxes = (input.taxes ?? existingTaxes).map((t: any) => ({
    taxName: t.taxName,
    taxType: t.taxType,
    taxValue: Number(t.taxValue ?? 0),
  }));

  const agencyFee = Number(input.agencyFee ?? quotation.agencyFee ?? 0);
  const discount = Number(input.discount ?? quotation.discount ?? 0);

  const totals = computeTotals(
    nextItems.map((it) => ({
      quantity: it.quantity,
      sellingPrice: it.sellingPrice,
      costPrice: it.costPrice,
    })),
    nextTaxes.map((t) => ({ taxType: t.taxType, taxValue: t.taxValue })),
    agencyFee,
    discount,
  );

  let customerId = input.customerId || quotation.customerId;

  const incomingStatus = (input as any).status;
  if (incomingStatus === "accepted" && !customerId && quotation.customerName) {
    const customer = await createCustomerFromQuotation(agencyId, quotation);
    customerId = customer.id;
  }

  await prisma.$transaction(async (tx) => {
    await tx.quotation.update({
      where: { id: quotationId },
      data: {
        status: incomingStatus ?? quotation.status,
        quotationNumber: input.quotationNumber?.trim()
          ? input.quotationNumber.trim()
          : quotation.quotationNumber,
        leadId: input.leadId ?? quotation.leadId,
        customerId,
        customerName: input.customerName ?? quotation.customerName,
        customerPhone: input.customerPhone ?? quotation.customerPhone,
        customerEmail: input.customerEmail ?? quotation.customerEmail,
        branchId: input.branchId ?? quotation.branchId,
        consultantId: input.consultantId ?? quotation.consultantId,
        travelType: input.travelType ?? quotation.travelType,
        destination: input.destination ?? quotation.destination,
        departureDate: input.departureDate
          ? new Date(input.departureDate)
          : quotation.departureDate,
        returnDate: input.returnDate
          ? new Date(input.returnDate)
          : quotation.returnDate,
        adults: input.adults ?? quotation.adults,
        children: input.children ?? quotation.children,
        infants: input.infants ?? quotation.infants,
        currency: input.currency ?? quotation.currency,
        subtotal: totals.subtotal,
        agencyFee,
        discount,
        taxTotal: totals.taxTotal,
        total: totals.total,
        estimatedProfit: totals.estimatedProfit,
        validUntil: input.validUntil
          ? new Date(input.validUntil)
          : quotation.validUntil,
        customerNotes: input.customerNotes ?? quotation.customerNotes,
        internalNotes: input.internalNotes ?? quotation.internalNotes,
        termsTemplateId: input.termsTemplateId ?? quotation.termsTemplateId,
        terms: input.terms ?? quotation.terms,
        authorizedSignature:
          input.authorizedSignature ?? quotation.authorizedSignature,
      },
    });

    if (input.items) {
      await tx.quotationItem.updateMany({
        where: { agencyId, quotationId },
        data: { isDeleted: true, deletedAt: new Date() },
      });
      await tx.quotationItem.createMany({
        data: nextItems.map((it, idx) => ({
          agencyId,
          quotationId,
          serviceCategory: it.serviceCategory || "other",
          supplierId: it.supplierId || null,
          title: it.title,
          description: it.description,
          quantity: it.quantity,
          unit: it.unit || "Person",
          costPrice: it.costPrice,
          sellingPrice: it.sellingPrice,
          total: it.quantity * it.sellingPrice,
          sortOrder: it.sortOrder ?? idx,
        })),
      });
    }

    if (input.taxes) {
      await tx.quotationTax.updateMany({
        where: { agencyId, quotationId },
        data: { isDeleted: true, deletedAt: new Date() },
      });
      await tx.quotationTax.createMany({
        data: nextTaxes.map((t) => ({
          agencyId,
          quotationId,
          taxName: t.taxName,
          taxType: t.taxType,
          taxValue: t.taxValue,
          taxAmount:
            t.taxType === "percentage"
              ? (totals.estimatedProfit * t.taxValue) / 100
              : t.taxValue,
        })),
      });
    }

    if (input.attachments) {
      await tx.quotationAttachment.updateMany({
        where: { agencyId, quotationId },
        data: { isDeleted: true, deletedAt: new Date() },
      });
      await tx.quotationAttachment.createMany({
        data: input.attachments.map((a) => ({
          agencyId,
          quotationId,
          fileName: a.fileName,
          fileUrl: a.fileUrl,
          mimeType: a.mimeType,
        })),
      });
    }

    const latest = await tx.quotationVersion.findFirst({
      where: { agencyId, quotationId, isDeleted: false },
      orderBy: { version: "desc" },
    });

    const snapshot = await tx.quotation.findFirst({
      where: { id: quotationId },
      include: {
        items: { where: { isDeleted: false } },
        taxes: { where: { isDeleted: false } }
      },
    });

    await tx.quotationVersion.create({
      data: {
        agencyId,
        quotationId,
        version: (latest?.version ?? 0) + 1,
        changes: "Updated quotation",
        snapshot: snapshot as any,
        createdBy: updatedBy,
      },
    });
  }, { maxWait: 10000, timeout: 20000 });

  return getQuotation(agencyId, quotationId);
}

async function createCustomerFromQuotation(agencyId: string, quotation: any) {
  const nameParts = (quotation.customerName || "").trim().split(" ");
  const firstName = nameParts[0] || "Unknown";
  const lastName = nameParts.slice(1).join(" ") || " ";
  const customerRef = await generateRef("CU" as RefPrefix, agencyId);
  return prisma.customer.create({
    data: {
      agencyId,
      branchId: quotation.branchId,
      customerRef,
      type: "individual",
      firstName,
      lastName,
      phone: quotation.customerPhone || "N/A",
      email: quotation.customerEmail || null,
      city: "N/A",
    },
  });
}

export async function setQuotationStatus({
  agencyId,
  quotationId,
  status,
  actorId,
  changes,
}: SetStatusArgs) {
  const quotation = await prisma.quotation.findFirst({
    where: { agencyId, id: quotationId, isDeleted: false },
  });
  if (!quotation) return null;

  let customerId = quotation.customerId;
  if (status === "accepted" && !customerId && quotation.customerName) {
    const customer = await createCustomerFromQuotation(agencyId, quotation);
    customerId = customer.id;
  }

  await prisma.quotation.update({
    where: { id: quotationId },
    data: { status, customerId },
  });

  const latest = await prisma.quotationVersion.findFirst({
    where: { agencyId, quotationId, isDeleted: false },
    orderBy: { version: "desc" },
  });

  await prisma.quotationVersion.create({
    data: {
      agencyId,
      quotationId,
      version: (latest?.version ?? 0) + 1,
      changes: changes ?? `Status changed to ${status}`,
      createdBy: actorId,
    },
  });

  return getQuotation(agencyId, quotationId);
}

export async function convertQuotationToBooking({
  agencyId,
  quotationId,
  actorId,
}: ConvertArgs) {
  const quotation = await prisma.quotation.findFirst({
    where: { agencyId, id: quotationId, isDeleted: false },
    include: {
      items: { where: { isDeleted: false }, orderBy: { sortOrder: "asc" } },
      taxes: { where: { isDeleted: false } },
    },
  });
  if (!quotation) return null;

  if (!quotation.branchId || !quotation.consultantId) {
    throw ApiError.badRequest(
      "Quotation missing required fields for conversion",
    );
  }

  let customerId = quotation.customerId;
  if (!customerId) {
    if (!quotation.customerName) {
      throw ApiError.badRequest(
        "Quotation has no customer information for conversion",
      );
    }
    const customer = await createCustomerFromQuotation(agencyId, quotation);
    customerId = customer.id;
  }

  const bookingRef = await generateRef("BK" as RefPrefix, agencyId);
  const totalAdults = quotation.adults || 1;
  const totalChildren = quotation.children || 0;
  const totalInfants = quotation.infants || 0;

  const booking = await prisma.$transaction(async (tx) => {
    const created = await tx.booking.create({
      data: {
        agencyId,
        bookingRef,
        customerId,
        branchId: quotation.branchId,
        agentId: quotation.consultantId,
        leadId: quotation.leadId || null,
        sourceQuotationId: quotation.id,
        sourceType: "quotation",
        title: `${quotation.travelType} - ${quotation.destination}`,
        departureDate: quotation.departureDate ?? new Date(),
        returnDate: quotation.returnDate,
        expectedAdults: totalAdults,
        expectedChildren: totalChildren,
        expectedInfants: totalInfants,
        bookingStatus: "confirmed",
        paymentStatus: "unpaid",
        notes: quotation.customerNotes,
      } as any,
    });

    for (let i = 0; i < quotation.items.length; i++) {
      const item = quotation.items[i];
      const qty = item.quantity || 1;
      const unitCost = Number(item.costPrice) || 0;
      const unitSellingPrice = Number(item.sellingPrice) || 0;

      // Default to VAT_ON_MARGIN for quotation conversions
      const taxTreatment: TaxTreatment = "VAT_ON_MARGIN";
      // Calculate vatRate from quotation percentage taxes
      const vatRate = (quotation.taxes || []).reduce((acc, t) => {
        return acc + (t.taxType === "percentage" ? Number(t.taxValue) : 0);
      }, 0);

      const financials = calculateServiceFinancials({
        unitCost,
        unitSellingPrice,
        quantity: qty,
        supplierInvoiceAmount: null, // Unknown at conversion time
        taxTreatment,
        vatRate,
      });

      await tx.bookingService.create({
        data: {
          agencyId,
          bookingId: created.id,
          serviceCategory: item.serviceCategory,
          title: item.title,
          description: item.description,
          costPrice: financials.lineCost,
          sellingPrice: financials.lineSelling,
          supplierId: item.supplierId,
          supplierInvoiceAmount: null,
          taxTreatment,
          vatRate,
          taxBase: financials.taxBase,
          taxAmount: financials.taxAmount,
          expectedMargin: financials.expectedMargin,
          actualMargin: financials.actualMargin,
          costVariance: financials.costVariance,
          customerTotal: financials.customerTotal,
          financialStatus: "draft",
          quantity: financials.quantity,
          unit: item.unit,
          status: "pending",
          sortOrder: i,
        },
      });
    }

    await tx.quotation.update({
      where: { id: quotation.id },
      data: { status: "accepted", customerId } as any,
    });

    if (quotation.leadId) {
      await tx.lead.update({
        where: { id: quotation.leadId },
        data: { status: "converted", customerId } as any,
      });

      await tx.leadActivity.create({
        data: {
          agencyId,
          leadId: quotation.leadId,
          type: "booking_created",
          description: `Converted to Booking ${bookingRef}`,
          createdBy: actorId ?? "system",
        },
      });
    }

    return created;
  }, { maxWait: 10000, timeout: 20000 });

  return booking;
}

export async function getQuotationVersions(
  agencyId: string,
  quotationId: string,
) {
  return prisma.quotationVersion.findMany({
    where: { agencyId, quotationId, isDeleted: false },
    orderBy: { version: "desc" },
    include: {
      createdByUser: {
        select: { firstName: true, lastName: true },
      },
    },
  });
}

export async function getQuotationForPrint(agencyId: string, id: string) {
  const quotation = await getQuotation(agencyId, id);
  if (!quotation) return null;

  let branchManager: any = null;
  const creator = await prisma.user.findFirst({
    where: { id: quotation.consultantId, agencyId },
  });

  if (creator) {
    if (creator.role === "admin" || creator.role === "owner") {
      const headBranch = await prisma.branch.findFirst({
        where: { agencyId, isHeadOffice: true },
      });
      if (headBranch) {
        branchManager = await prisma.user.findFirst({
          where: {
            agencyId,
            branchId: headBranch.id,
            role: { in: ["manager", "branch_manager", "admin"] },
          },
        });
      }
    } else {
      branchManager = await prisma.user.findFirst({
        where: {
          agencyId,
          branchId: creator.branchId,
          role: { in: ["manager", "branch_manager"] },
        },
      });
    }
  }

  if (!branchManager && creator) {
    branchManager = creator;
  }

  return {
    ...quotation,
    managerContact: branchManager
      ? {
        name: `${branchManager.firstName} ${branchManager.lastName}`,
        phone: branchManager.phone,
        email: branchManager.email,
      }
      : null,
  };
}
