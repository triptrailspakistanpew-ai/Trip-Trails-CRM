"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { History, X } from "lucide-react";
import { API } from "@/lib/data-source";
import { QuotationVersion } from "@/types/quotation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface QuotationVersionHistoryProps {
  quotationId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function QuotationVersionHistory({
  quotationId,
  isOpen,
  onClose,
}: QuotationVersionHistoryProps) {
  const [versions, setVersions] = useState<QuotationVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && quotationId) {
      loadVersions();
    }
  }, [isOpen, quotationId]);

  const loadVersions = async () => {
    setIsLoading(true);
    try {
      const data = await API.getQuotationVersions(quotationId);
      setVersions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <History className="h-5 w-5 text-tf-text-secondary" />
            Version History
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {isLoading ? (
            <p className="text-sm text-tf-text-muted">Loading history...</p>
          ) : versions.length === 0 ? (
            <p className="text-sm text-tf-text-muted">No version history available.</p>
          ) : (
            <div className="relative border-l-2 border-tf-border ml-3 space-y-8">
              {versions.map((v, index) => {
                const isLatest = index === 0;
                const authorName = v.createdByUser
                  ? `${v.createdByUser.firstName} ${v.createdByUser.lastName}`
                  : "Unknown User";

                return (
                  <div key={v.id} className="relative pl-6">
                    {/* Timeline dot */}
                    <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-tf-surface border-2 border-tf-primary flex items-center justify-center">
                      {isLatest && <span className="h-2 w-2 rounded-full bg-tf-primary" />}
                    </span>

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-tf-text-primary">
                          Version {v.version} {isLatest && <span className="ml-2 text-xs text-tf-primary font-normal bg-tf-primary/10 px-2 py-0.5 rounded-full">Latest</span>}
                        </h4>
                        <span className="text-xs text-tf-text-muted">
                          {format(new Date(v.createdAt), "MMM d, yyyy h:mm a")}
                        </span>
                      </div>
                      <p className="text-sm text-tf-text-secondary">
                        {v.changes} by <span className="font-medium text-tf-text-primary">{authorName}</span>
                      </p>

                      {v.snapshot && (
                        <div className="mt-3 bg-tf-surface-2 p-3 rounded-md text-xs">
                          <div className="flex justify-between mb-2 pb-2 border-b border-tf-border">
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
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
