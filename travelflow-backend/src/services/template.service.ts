import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";

export type TemplateType = "quotation_notes" | "quotation_terms" | "invoice_notes" | "invoice_terms" | "booking_notes" | "booking_terms";

type AgencyContext = {
  agencyId: string;
};

export async function getTemplates({ agencyId }: AgencyContext, type?: TemplateType) {
  const where: any = { agencyId, isDeleted: false };
  if (type) where.type = type;
  return (prisma.template as any).findMany({ 
    where, 
    orderBy: [
      { isDefault: "desc" },
      { name: "asc" }
    ] 
  });
}

export async function createTemplate({
  agencyId,
  name,
  type,
  content,
  isDefault = false,
}: AgencyContext & { name: string; type: TemplateType; content: string; isDefault?: boolean }) {
  if (!name || !type || !content) {
    throw ApiError.badRequest("Name, type, and content are required");
  }

  // If this template is marked as default, unmark other defaults of the same type for this agency
  if (isDefault) {
    await (prisma.template as any).updateMany({
      where: { agencyId, type, isDefault: true },
      data: { isDefault: false },
    });
  }

  return (prisma.template as any).create({
    data: { agencyId, name, type, content, isDefault },
  });
}

export async function updateTemplate({
  agencyId,
  templateId,
  name,
  type,
  content,
  isDefault,
}: AgencyContext & {
  templateId: string;
  name?: string;
  type?: TemplateType;
  content?: string;
  isDefault?: boolean;
}) {
  const template = await (prisma.template as any).findFirst({
    where: { id: templateId, agencyId, isDeleted: false },
  });
  if (!template) throw ApiError.notFound("Template not found");

  const targetType = type || template.type;
  if (isDefault) {
    await (prisma.template as any).updateMany({
      where: { agencyId, type: targetType, isDefault: true, id: { not: templateId } },
      data: { isDefault: false },
    });
  }

  return (prisma.template as any).update({
    where: { id: templateId },
    data: {
      ...(name !== undefined && { name }),
      ...(type !== undefined && { type }),
      ...(content !== undefined && { content }),
      ...(isDefault !== undefined && { isDefault }),
    },
  });
}

export async function deleteTemplate({
  agencyId,
  templateId,
}: AgencyContext & { templateId: string }) {
  const template = await prisma.template.findFirst({
    where: { id: templateId, agencyId, isDeleted: false },
  });
  if (!template) throw ApiError.notFound("Template not found");

  await prisma.template.update({
    where: { id: templateId },
    data: { isDeleted: true, deletedAt: new Date() },
  });

  return { deleted: true };
}
