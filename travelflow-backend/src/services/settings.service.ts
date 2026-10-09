import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";

const ALLOWED_SETTINGS_FIELDS = [
  "name", "contactEmail", "contactPhone", "address", "city", "country",
  "currency", "logoUrl", "primaryColor", "registrationNo",
  "emailAlerts", "smsAlerts", "dailyReports",
];

export async function getSettings(agencyId: string) {
  const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
  if (!agency) throw ApiError.notFound("Agency");
  return agency;
}

export async function updateSettings(agencyId: string, data: Record<string, unknown>) {
  const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
  if (!agency) throw ApiError.notFound("Agency");
  const safeData = Object.fromEntries(
    Object.entries(data).filter(([k]) => ALLOWED_SETTINGS_FIELDS.includes(k))
  );
  return prisma.agency.update({ where: { id: agencyId }, data: safeData });
}
