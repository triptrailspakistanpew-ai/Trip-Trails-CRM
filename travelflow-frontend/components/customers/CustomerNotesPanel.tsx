"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CustomerNote } from "@/types";
import { API } from "@/lib/data-source";
import { showSuccess, showError } from "@/lib/toast-utils";
import { formatTimeAgo } from "@/lib/utils";
import { Trash2 } from "lucide-react";

interface CustomerNotesPanelProps {
  customerId: string;
  notes: CustomerNote[];
  onUpdate: () => void;
}

export function CustomerNotesPanel({
  customerId,
  notes,
  onUpdate,
}: CustomerNotesPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (text.trim().length < 10) {
      showError("Note must be at least 10 characters");
      return;
    }
    setSaving(true);
    await API.createCustomerNote(customerId, text.trim());
    showSuccess("Note added");
    setText("");
    setShowForm(false);
    setSaving(false);
    onUpdate();
  };

  const handleDelete = async (id: string) => {
    await API.deleteCustomerNote(id);
    showSuccess("Note deleted");
    onUpdate();
  };

  return (
    <div className="space-y-4">
      {notes.length === 0 && !showForm && (
        <p className="text-sm text-tf-text-muted text-center py-6">
          No notes yet — Add the first note
        </p>
      )}
      {notes.map((note) => (
        <div
          key={note.id}
          className="flex gap-3 bg-tf-surface-2 p-4 rounded-lg border border-tf-border"
        >
          <div className="h-9 w-9 shrink-0 rounded-full bg-tf-primary-soft text-tf-primary flex items-center justify-center text-sm font-semibold">
            {note.addedBy
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-tf-text-primary">
                {note.addedBy}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-tf-text-muted">
                  {formatTimeAgo(new Date(note.createdAt))}
                </span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleDelete(note.id)}
                  aria-label="Delete note"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-tf-text-secondary mt-1 whitespace-pre-wrap">
              {note.note}
            </p>
          </div>
        </div>
      ))}

      {showForm ? (
        <div className="space-y-3 border border-tf-border rounded-lg p-4">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a note (10–500 characters)..."
            className="min-h-[100px]"
            maxLength={500}
          />
          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-tf-primary text-white normal-case tracking-normal"
            >
              Add Note
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setText("");
              }}
              className="normal-case tracking-normal"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full normal-case tracking-normal"
          onClick={() => setShowForm(true)}
        >
          + Add Note
        </Button>
      )}
    </div>
  );
}
