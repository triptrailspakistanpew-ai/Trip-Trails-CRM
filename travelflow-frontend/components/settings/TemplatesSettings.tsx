"use client";

import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { showSuccess, showError } from "@/lib/toast-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Template, TemplateType } from "@/types/template";
import { API } from "@/lib/data-source";

export function TemplatesSettings() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "quotation_notes" as TemplateType,
    content: "",
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchTemplates = async () => {
    try {
      const data = await API.getTemplates();
      setTemplates(data);
    } catch (error) {
      showError("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setFormData({ name: "", type: "quotation_notes", content: "" });
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (t: Template) => {
    setEditingTemplate(t);
    setFormData({ name: t.name, type: t.type, content: t.content });
    setIsDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.type || !formData.content) {
      showError("Please fill all required fields");
      return;
    }
    try {
      if (editingTemplate) {
        await API.updateTemplate(editingTemplate.id, formData);
        showSuccess("Template updated");
      } else {
        await API.createTemplate(formData);
        showSuccess("Template created");
      }
      setIsDrawerOpen(false);
      fetchTemplates();
    } catch (error) {
      showError("Failed to save template");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await API.deleteTemplate(deleteId);
      showSuccess("Template deleted");
      fetchTemplates();
    } catch (error) {
      showError("Failed to delete template");
    } finally {
      setDeleteId(null);
    }
  };

  const getTypeLabel = (type: TemplateType) => {
    switch (type) {
      case "quotation_notes":
        return "Quotation Notes";
      case "quotation_terms":
        return "Quotation Terms";
      case "invoice_notes":
        return "Invoice Notes";
      case "invoice_terms":
        return "Invoice Terms";
      default:
        return type;
    }
  };

  return (
    <div className="bg-tf-surface rounded-xl border border-tf-border shadow-sm overflow-hidden">
      <div className="p-6 border-b border-tf-border bg-tf-surface-2/30 flex justify-between items-center">
        <div>
          <h2 className="tf-h3 text-tf-text-primary">Global Templates</h2>
          <p className="tf-body-sm text-tf-text-secondary mt-1">
            Manage reusable templates for notes and terms in quotations and invoices.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="bg-tf-primary text-white hover:bg-tf-primary-hover">
          <Plus className="w-4 h-4 mr-2" />
          Add Template
        </Button>
      </div>
      <div className="p-0">
        {loading ? (
          <div className="p-6 text-center text-tf-text-secondary">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="p-6 text-center text-tf-text-secondary">No templates found.</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-tf-surface-2/50 text-tf-text-secondary font-medium">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tf-border">
              {templates.map((t) => (
                <tr key={t.id} className="hover:bg-tf-surface-hover/50">
                  <td className="px-6 py-4 font-medium text-tf-text-primary">{t.name}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {getTypeLabel(t.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(t)}
                    >
                      <Edit2 className="w-4 h-4 text-tf-text-secondary" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(t.id)}
                    >
                      <Trash2 className="w-4 h-4 text-tf-danger" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Standard Terms"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={formData.type}
                onValueChange={(val: TemplateType) => setFormData({ ...formData, type: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quotation_notes">Quotation Notes</SelectItem>
                  <SelectItem value="quotation_terms">Quotation Terms</SelectItem>
                  <SelectItem value="invoice_notes">Invoice Notes</SelectItem>
                  <SelectItem value="invoice_terms">Invoice Terms</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter template text here..."
                rows={6}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDrawerOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-tf-primary text-white">Save Template</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-[var(--tf-danger)] text-white hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
