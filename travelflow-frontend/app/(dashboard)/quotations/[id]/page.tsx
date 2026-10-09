"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { showError } from "@/lib/toast-utils";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { QuotationDrawer } from "@/components/quotations/QuotationDrawer";
import { PageSkeleton } from "@/components/shared/PageSkeleton";

import { API } from "@/lib/data-source";
import type { Quotation } from "@/types";
import type { QuotationVersion } from "@/types/quotation";
import { FileText, CalendarCheck, Edit } from "lucide-react";
import { showSuccess } from "@/lib/toast-utils";

export default function QuotationDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [versions, setVersions] = useState<QuotationVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConverting, setIsConverting] = useState(false);

  const load = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const q = await API.getQuotation(id);
      setQuotation(q);
    } catch (e: any) {
      showError(e.message || "Failed to load quotation");
    } finally {
      setIsLoading(false);
    }
    
    API.getQuotationVersions(id).then(v => {
      console.log("Loaded versions:", v);
      setVersions(v);
    }).catch(err => {
      console.error("Failed to load versions:", err);
      setVersions([]);
    });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleConvertToBooking = async () => {
    if (!id) return;
    setIsConverting(true);
    try {
      // API function convertQuotationToBooking needs to exist, if not we will add it to data-source.
      const response = await API.convertQuotationToBooking(id);
      showSuccess("Converted to Booking successfully", {
        description: `Booking Reference: ${response.bookingRef}`,
      });
      router.push(`/bookings/${response.id}`);
    } catch (error: any) {
      showError(error.message || "Failed to convert to booking");
    } finally {
      setIsConverting(false);
    }
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (!quotation) return <div>Quotation not found.</div>;

  const timelineEvents = [
    ...(quotation.activities ?? []).map(a => ({
      id: a.id,
      date: a.createdAt,
      type: "activity" as const,
      title: a.type,
      description: <div className="text-sm text-tf-text-muted mt-1">{a.description}</div>,
    })),
    ...versions.map(v => {
      // Determine if this version is just a system activity
      const isSystemActivity = v.changes === "Created quotation" ||
        v.changes?.startsWith("Status changed") ||
        v.changes?.startsWith("Converted to Booking");

      if (isSystemActivity) {
        return {
          id: v.id,
          date: v.createdAt,
          type: "activity" as const,
          title: v.changes === "Created quotation" ? "Quotation Created" : v.changes,
          description: (
            <div className="text-sm text-tf-text-muted mt-1">
              by <span className="font-medium text-tf-text-primary">{v.createdByUser ? `${v.createdByUser.firstName} ${v.createdByUser.lastName}` : "System"}</span>
            </div>
          )
        };
      }

      return {
        id: v.id,
        date: v.createdAt,
        type: "version" as const,
        title: `Version ${v.version}`,
        description: (
          <div className="mt-1">
            <p className="text-sm text-tf-text-secondary">
              {v.changes} by <span className="font-medium text-tf-text-primary">{v.createdByUser ? `${v.createdByUser.firstName} ${v.createdByUser.lastName}` : "Unknown User"}</span>
            </p>
            {v.snapshot && (
              <div className="mt-2 bg-tf-surface-2 p-2 rounded-md text-xs border border-tf-border max-w-sm">
                <div className="flex justify-between mb-1 pb-1 border-b border-tf-border">
                  <span className="text-tf-text-secondary">Grand Total</span>
                  <span className="font-semibold text-tf-text-primary">
                    {v.snapshot.currency || "PKR"} {v.snapshot.grandTotal?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-tf-text-secondary">Est. Profit</span>
                  <span className="font-semibold text-emerald-600">
                    {v.snapshot.currency || "PKR"} {v.snapshot.estimatedProfit?.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        )
      };
    })
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="rounded-full bg-tf-surface border border-tf-border"
          >
            ←
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="tf-h2 text-tf-text-primary">
                {quotation.quotationRef}
              </h1>
              <StatusBadge status={quotation.status as any} />
            </div>
            <div className="flex items-center gap-4 mt-2">
              <p className="tf-body text-tf-text-secondary">
                Grand Total: {(quotation as any).currency || "PKR"} {quotation.grandTotal?.toLocaleString?.() ?? "0"}
              </p>
              <div className="h-4 w-px bg-tf-border"></div>
              <p className="tf-body text-emerald-600 font-medium">
                Est. Margin: {(quotation as any).currency || "PKR"} {quotation.estimatedProfit?.toLocaleString?.() ?? "0"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/quotations/${id}/edit`)}
            className="border-tf-border text-tf-text-secondary hover:bg-tf-surface-2 shadow-sm"
          >
            <Edit className="mr-2 h-4 w-4" /> Edit
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open(`/print/quotation/${id}`, "_blank")}
            className="border-tf-border text-tf-text-secondary hover:bg-tf-surface-2 shadow-sm"
          >
            <FileText className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button
            onClick={handleConvertToBooking}
            disabled={isConverting || quotation.status?.toLowerCase() !== "accepted"}
            className="bg-tf-primary text-white hover:bg-tf-primary-hover shadow-sm disabled:opacity-50"
            title={quotation.status?.toLowerCase() !== "accepted" ? "Quotation must be accepted before converting" : "Convert to Booking"}
          >
            <CalendarCheck className="mr-2 h-4 w-4" />
            {isConverting ? "Converting..." : "Convert to Booking"}
          </Button>
        </div>
      </div>

      <div className="bg-tf-surface rounded-xl border border-tf-border shadow-sm p-6">
        <h3 className="text-lg font-semibold text-tf-text-primary mb-4">
          Items
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-tf-border text-left text-xs uppercase tracking-wider text-tf-text-muted">
                <th className="py-2">Category</th>
                <th className="py-2">Title</th>
                <th className="py-2">Supplier</th>
                <th className="py-2">Description</th>
                <th className="py-2">Qty</th>
                <th className="py-2">Cost</th>
                <th className="py-2">Selling</th>
                <th className="py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {(quotation.items ?? []).map((it) => (
                <tr key={it.id} className="border-b border-tf-border">
                  <td className="py-2 text-tf-text-secondary capitalize">{it.serviceCategory?.replace("_", " ") || "Other"}</td>
                  <td className="py-2 font-medium text-tf-text-primary">{it.title || "-"}</td>
                  <td className="py-2 text-tf-text-secondary">{it.supplier?.name || "-"}</td>
                  <td className="py-2 text-tf-text-secondary">{it.description || "-"}</td>
                  <td className="py-2">{it.quantity}</td>
                  <td className="py-2">{(it as any).costPrice?.toLocaleString() ?? 0}</td>
                  <td className="py-2">{it.sellingPrice?.toLocaleString() ?? 0}</td>
                  <td className="py-2 font-semibold text-tf-success">
                    {(quotation as any).currency || "PKR"}{" "}
                    {(
                      it.lineTotal ?? it.quantity * (it.sellingPrice || 0)
                    ).toLocaleString?.() ?? "0"}
                  </td>
                </tr>
              ))}
              {(quotation.items ?? []).length === 0 && (
                <tr>
                  <td className="py-6 text-tf-text-muted text-center" colSpan={8}>
                    No items.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-tf-surface rounded-xl border border-tf-border shadow-sm p-6">
        <h3 className="text-lg font-semibold text-tf-text-primary mb-2">
          Notes & Terms
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-xs text-tf-text-muted uppercase tracking-wider">
              Notes
            </p>
            <p className="text-sm text-tf-text-primary">
              {quotation.notes || "-"}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-tf-text-muted uppercase tracking-wider">
              Terms
            </p>
            <p className="text-sm text-tf-text-primary">
              {quotation.terms || "-"}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-tf-surface rounded-xl border border-tf-border shadow-sm p-6">
        <h3 className="text-lg font-semibold text-tf-text-primary mb-4">
          Activity & Version Log
        </h3>
        {timelineEvents.length === 0 ? (
          <div className="text-sm text-tf-text-muted">No activity or versions yet.</div>
        ) : (
          <div className="space-y-3">
            {timelineEvents.map((event) => (
              <div
                key={event.id}
                className="border-b border-tf-border pb-3 last:border-b-0"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-tf-text-primary flex items-center gap-2">
                    {event.type === "version" && <span className="bg-tf-primary/10 text-tf-primary text-[10px] uppercase font-bold px-1.5 py-0.5 rounded">Version</span>}
                    {event.title}
                  </div>
                  <div className="text-xs text-tf-text-muted">
                    {new Date(event.date).toLocaleString("en-GB")}
                  </div>
                </div>
                {event.description}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
