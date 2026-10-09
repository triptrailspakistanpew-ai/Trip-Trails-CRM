export function userDisplayName(user?: { firstName?: string; lastName?: string } | null): string {
  if (!user) return "System";
  return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "System";
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function countryForCity(city: string): string {
  if (["Dubai", "Abu Dhabi"].includes(city)) return "UAE";
  return "Pakistan";
}
