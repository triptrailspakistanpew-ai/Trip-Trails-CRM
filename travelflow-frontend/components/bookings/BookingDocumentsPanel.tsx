"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BookingDocument } from "@/types";
import { API } from "@/lib/data-source";
import { showSuccess, showError } from "@/lib/toast-utils";
import { Download, FileText, Trash2, Upload } from "lucide-react";
import { DrawerForm } from "@/components/forms/DrawerForm";
import { FilterSelect } from "@/components/shared/FilterSelect";
import { Badge } from "@/components/ui/badge";

interface BookingDocumentsPanelProps {
  bookingId: string;
  documents: BookingDocument[];
  onUpdate: () => void;
}

export function BookingDocumentsPanel({
  bookingId,
  documents,
  onUpdate,
}: BookingDocumentsPanelProps) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [docType, setDocType] = useState("ticket");
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showError("File must be under 5MB");
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        await API.createBookingDocument(bookingId, {
          name: file.name,
          url: dataUrl,
          type: docType,
        });
        showSuccess("Document uploaded");
        setUploadOpen(false);
        onUpdate();
      } catch (err: unknown) {
        showError((err as Error).message || "Failed to upload document");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async (id: string) => {
    try {
      await API.deleteBookingDocument(id);
      showSuccess("Document deleted");
      onUpdate();
    } catch (err: unknown) {
      showError((err as Error).message || "Failed to delete document");
    }
  };

  const download = (doc: BookingDocument) => {
    const link = document.createElement("a");
    link.href = doc.url;
    link.download = doc.name;
    link.click();
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-start justify-between p-4 rounded-lg border border-tf-border hover:bg-tf-surface-2 transition-colors"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded bg-tf-primary/10 flex items-center justify-center text-tf-primary shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <Badge
                  variant="outline"
                  className="mb-1 capitalize normal-case tracking-normal"
                >
                  {doc.type}
                </Badge>
                <p className="font-medium text-sm text-tf-text-primary truncate">
                  {doc.name}
                </p>
                <p className="text-xs text-tf-text-muted">
                  {new Date(doc.createdAt).toLocaleDateString("en-GB")} ·{" "}
                  {doc.uploadedBy}
                </p>
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => download(doc)}
                aria-label="Download"
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => handleDelete(doc.id)}
                aria-label="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-tf-border hover:border-[var(--tf-primary)] text-tf-text-muted hover:text-tf-primary transition-colors min-h-[100px]"
        >
          <Upload className="h-5 w-5" />
          <span className="text-sm font-medium">Upload Document</span>
        </button>
      </div>

      <DrawerForm
        title="Upload Document"
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        submitLabel="Upload"
        isSubmitting={uploading}
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-tf-text-secondary mb-2">
              Document Type
            </p>
            <FilterSelect
              value={docType}
              onValueChange={setDocType}
              options={[
                { label: "E-Ticket", value: "ticket" },
                { label: "Visa Copy", value: "visa" },
                { label: "Passport", value: "passport" },
                { label: "Other", value: "other" },
              ]}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-tf-text-secondary mb-2">
              File
            </p>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFile}
              className="text-sm w-full"
            />
          </div>
        </div>
      </DrawerForm>
    </>
  );
}
