import { Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import * as quotationService from "../services/quotation.service";

type AuthenticatedRequest = Request & {
  user?: { id: string; agencyId: string; branchId?: string; role: string };
  agencyId?: string;
};

export async function listQuotations(req: AuthenticatedRequest, res: Response) {
  const quotations = await quotationService.listQuotations({
    agencyId: req.agencyId!,
    query: req.query,
  });
  ApiResponse.success(res, quotations);
}

export async function getQuotation(req: AuthenticatedRequest, res: Response) {
  const quotation = await quotationService.getQuotation(
    req.agencyId!,
    req.params.id,
  );
  if (!quotation) throw ApiError.notFound("Quotation");
  ApiResponse.success(res, quotation);
}

export async function getQuotationForPrint(req: AuthenticatedRequest, res: Response) {
  const printDetails = await quotationService.getQuotationForPrint(
    req.agencyId!,
    req.params.id,
  );
  if (!printDetails) throw ApiError.notFound("Quotation");
  ApiResponse.success(res, printDetails);
}

export async function createQuotation(
  req: AuthenticatedRequest,
  res: Response,
) {
  if (!req.user) throw ApiError.unauthorized();

  const input = {
    ...req.body,
    branchId: req.body.branchId || String(req.user.branchId),
    consultantId: req.body.consultantId || String(req.user.id),
    travelType: req.body.travelType || "custom",
    destination: req.body.destination || req.body.title || "TBD",
    currency: req.body.currency || "PKR",
    customerNotes: req.body.notes || req.body.customerNotes,
    terms: req.body.terms,
    customerName: req.body.customerName,
    customerPhone: req.body.customerPhone,
    customerEmail: req.body.customerEmail,
    items: req.body.items?.map((it: any) => ({
      ...it,
      serviceCategory: it.serviceCategory || "general",
      title: it.title || it.description || "Item",
      unit: it.unit || "Unit",
      costPrice: it.costPrice || 0,
      sellingPrice: it.sellingPrice ?? it.unitPrice ?? 0,
    })) || [],
    taxes: req.body.taxes?.map((t: any) => ({
      ...t,
      taxName: t.taxName || t.label || "Tax",
      taxValue: t.taxValue ?? t.value ?? 0,
    })) || [],
  };

  const quotation = await quotationService.createQuotation({
    agencyId: req.agencyId!,
    createdBy: String(req.user.id),
    input,
  });

  ApiResponse.created(res, quotation);
}

export async function updateQuotation(
  req: AuthenticatedRequest,
  res: Response,
) {
  if (!req.user) throw ApiError.unauthorized();

  const input = {
    ...req.body,
    travelType: req.body.travelType || "custom",
    destination: req.body.destination || req.body.title || "TBD",
    currency: req.body.currency || "PKR",
    customerNotes: req.body.notes || req.body.customerNotes,
    terms: req.body.terms,
    customerName: req.body.customerName,
    customerPhone: req.body.customerPhone,
    customerEmail: req.body.customerEmail,
    items: req.body.items?.map((it: any) => ({
      ...it,
      serviceCategory: it.serviceCategory || "general",
      title: it.title || it.description || "Item",
      unit: it.unit || "Unit",
      costPrice: it.costPrice || 0,
      sellingPrice: it.sellingPrice ?? it.unitPrice ?? 0,
    })),
    taxes: req.body.taxes?.map((t: any) => ({
      ...t,
      taxName: t.taxName || t.label || "Tax",
      taxValue: t.taxValue ?? t.value ?? 0,
    })),
  };

  const quotation = await quotationService.updateQuotation({
    agencyId: req.agencyId!,
    quotationId: req.params.id,
    updatedBy: String(req.user.id),
    input,
  });

  if (!quotation) throw ApiError.notFound("Quotation");
  ApiResponse.success(res, quotation);
}

export async function sendQuotation(req: AuthenticatedRequest, res: Response) {
  if (!req.user) throw ApiError.unauthorized();

  const quotation = await quotationService.setQuotationStatus({
    agencyId: req.agencyId!,
    quotationId: req.params.id,
    status: "sent",
    actorId: String(req.user.id),
    changes: "Quotation sent",
  });

  if (!quotation) throw ApiError.notFound("Quotation");
  ApiResponse.success(res, quotation);
}

export async function convertQuotationToBooking(
  req: AuthenticatedRequest,
  res: Response,
) {
  if (!req.user) throw ApiError.unauthorized();

  const result = await quotationService.convertQuotationToBooking({
    agencyId: req.agencyId!,
    quotationId: req.params.id,
    actorId: String(req.user.id),
  });

  if (!result) throw ApiError.notFound("Quotation");
  ApiResponse.created(res, result, "Quotation converted to booking");
}

export async function getQuotationVersions(
  req: AuthenticatedRequest,
  res: Response,
) {
  const versions = await quotationService.getQuotationVersions(
    req.agencyId!,
    req.params.id,
  );
  ApiResponse.success(res, versions);
}
