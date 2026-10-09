export type RefPrefix = "BK" | "LD" | "CUS" | "INV" | "EXP" | "SUP";

const MAX_REF_ATTEMPTS = 5;

export function generateRef(
  prefix: RefPrefix,
  exists?: (ref: string) => boolean
): string {
  if (typeof window === "undefined") {
    throw new Error("generateRef can only be called in the browser");
  }

  const year = new Date().getFullYear();
  const seqKey = `tf_seq_${prefix}`;

  for (let attempt = 0; attempt < MAX_REF_ATTEMPTS; attempt++) {
    const snapshot = localStorage.getItem(seqKey);
    const current = parseInt(snapshot ?? "0", 10);
    const next = Number.isFinite(current) ? current + 1 : 1;
    const ref = `${prefix}-${year}-${String(next).padStart(3, "0")}`;

    if (exists?.(ref)) {
      localStorage.setItem(seqKey, String(next));
      continue;
    }

    if (localStorage.getItem(seqKey) === snapshot) {
      localStorage.setItem(seqKey, String(next));
    }

    if (!exists?.(ref)) {
      return ref;
    }
  }

  return `${prefix}-${year}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}
