import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";

export type TemplateType = "quotation_notes" | "quotation_terms" | "invoice_notes" | "invoice_terms" | "booking_notes" | "booking_terms";

type AgencyContext = {
  agencyId: string;
};

export async function getTemplates({ agencyId }: AgencyContext, type?: TemplateType) {
  const where: any = { agencyId, isDeleted: false };
  if (type) where.type = type;
  return prisma.template.findMany({ where, orderBy: { name: "asc" } });
}

export async function createTemplate({
  agencyId,
  name,
  type,
  content,
}: AgencyContext & { name: string; type: TemplateType; content: string }) {
  if (!name || !type || !content) {
    throw ApiError.badRequest("Name, type, and content are required");
  }
  return prisma.template.create({
    data: { agencyId, name, type, content },
  });
}

export async function updateTemplate({
  agencyId,
  templateId,
  name,
  type,
  content,
}: AgencyContext & {
  templateId: string;
  name?: string;
  type?: TemplateType;
  content?: string;
}) {
  const template = await prisma.template.findFirst({
    where: { id: templateId, agencyId, isDeleted: false },
  });
  if (!template) throw ApiError.notFound("Template not found");

  return prisma.template.update({
    where: { id: templateId },
    data: {
      ...(name !== undefined && { name }),
      ...(type !== undefined && { type }),
      ...(content !== undefined && { content }),
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
