"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CustomerDocument } from "@/types";
import { API } from "@/lib/data-source";
import { showSuccess, showError, showWarning } from "@/lib/toast-utils";
import { Download, FileText, Trash2, Upload } from "lucide-react";
import { DrawerForm } from "@/components/forms/DrawerForm";
import { FilterSelect } from "@/components/shared/FilterSelect";
import { Badge } from "@/components/ui/badge";

interface CustomerDocumentsPanelProps {
  customerId: string;
  documents: CustomerDocument[];
  onUpdate: () => void;
}

export function CustomerDocumentsPanel({
  customerId,
  documents,
  onUpdate,
}: CustomerDocumentsPanelProps) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [docType, setDocType] =
    useState<CustomerDocument["documentType"]>("passport");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showError("File must be under 5MB");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showWarning("Large file — may affect performance");
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1] ?? "";
      await API.createCustomerDocument(customerId, {
        documentType: docType,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        base64Data: base64,
        notes: notes || undefined,
      });
      showSuccess("Document uploaded");
      setUploadOpen(false);
      setNotes("");
      setUploading(false);
      onUpdate();
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async (id: string) => {
    await API.deleteCustomerDocument(id);
    showSuccess("Document deleted");
    onUpdate();
  };

  const download = (doc: CustomerDocument) => {
    const link = document.createElement("a");
    link.href = `data:${doc.mimeType};base64,${doc.base64Data}`;
    link.download = doc.fileName;
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
                  {doc.documentType}
                </Badge>
                <p className="font-medium text-sm text-tf-text-primary truncate">
                  {doc.fileName}
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
              onValueChange={(v) =>
                setDocType(v as CustomerDocument["documentType"])
              }
              options={[
                { label: "Passport", value: "passport" },
                { label: "CNIC", value: "cnic" },
                { label: "Visa", value: "visa" },
                { label: "Ticket", value: "ticket" },
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
          <div>
            <p className="text-sm font-medium text-tf-text-secondary mb-2">
              Notes (optional)
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full min-h-[80px] rounded-md border border-tf-border bg-tf-surface p-2 text-sm"
            />
          </div>
        </div>
      </DrawerForm>
    </>
  );
}
