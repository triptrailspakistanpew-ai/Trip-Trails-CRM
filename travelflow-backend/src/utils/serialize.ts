type PlainDoc = Record<string, unknown>;

export function toJSON(doc: unknown): PlainDoc | null {
  if (!doc) return null;
  if (typeof doc === "object" && doc !== null && !Array.isArray(doc)) {
    return doc as PlainDoc;
  }
  return null;
}

export function toJSONList(docs: unknown[]): PlainDoc[] {
  return docs.map((d) => toJSON(d)!).filter(Boolean);
}

/**
 * Build a Prisma WHERE filter that supports both UUID lookup and human-ref lookup.
 */
export function buildIdOrRefFilter(idOrRef: string, refField: string) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(idOrRef)) {
    return { OR: [{ id: idOrRef }, { [refField]: idOrRef }] };
  }
  return { [refField]: idOrRef };
}
