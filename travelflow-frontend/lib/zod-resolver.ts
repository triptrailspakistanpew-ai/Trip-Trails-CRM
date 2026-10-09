/**
 * Compatibility wrapper for @hookform/resolvers v5 + react-hook-form v7
 * These two packages have duplicate type instances that cause TS2719 errors.
 * This wrapper casts the resolver to suppress the issue safely.
 */
import { zodResolver as _zodResolver } from "@hookform/resolvers/zod";
import type { Resolver, FieldValues } from "react-hook-form";

export function zodResolver<T extends FieldValues>(schema: any): Resolver<T> {
  return _zodResolver(schema) as unknown as Resolver<T>;
}
