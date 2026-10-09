// Helper to revive ISO date strings in API responses into Date objects

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|([+-]\d{2}:\d{2}))$/;

export function reviveDates(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    if (ISO_DATE_REGEX.test(obj)) {
      return new Date(obj);
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(reviveDates);
  }

  if (typeof obj === "object") {
    const newObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[key] = reviveDates(obj[key]);
      }
    }
    return newObj;
  }

  return obj;
}
