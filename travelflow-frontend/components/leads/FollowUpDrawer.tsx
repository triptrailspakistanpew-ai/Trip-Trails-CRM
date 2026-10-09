"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { z } from "zod";
import { showSuccess, showError } from "@/lib/toast-utils";
import { DrawerForm } from "@/components/forms/DrawerForm";
import { FormField, FormTextArea } from "@/components/forms/FormField";
import { FormSelect, FormCombobox } from "@/components/forms/FormField";
import { Form } from "@/components/ui/form";
import { Lead } from "@/types";
import { API } from "@/lib/data-source";

const followUpSchema = z.object({
  type: z.enum(["call", "whatsapp", "email", "meeting", "site_visit"]),
  datetime: z.string().min(1, "Date and time required"),
  notes: z.string().min(10, "Minimum 10 characters").max(500),
  outcome: z.enum(["reached", "no_answer", "callback_requested", "meeting_scheduled"]),
});

type FollowUpValues = z.infer<typeof followUpSchema>;

interface FollowUpDrawerProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function FollowUpDrawer({ lead, isOpen, onClose, onSaved }: FollowUpDrawerProps) {
  const form = useForm<FollowUpValues>({
    resolver: zodResolver(followUpSchema),
    defaultValues: {
      type: "call",
      datetime: new Date().toISOString().slice(0, 16),
      notes: "",
      outcome: "reached",
    },
  });

  const onSubmit = async (values: FollowUpValues) => {
    try {
      await API.addLeadActivity(lead.id, {
        type: values.type,
        description: values.notes,
        outcome: values.outcome,
        createdBy: "Ahmad Khan",
        createdAt: new Date(values.datetime),
      });
      showSuccess("Follow-up added");
      form.reset({
        type: "call",
        datetime: new Date().toISOString().slice(0, 16),
        notes: "",
        outcome: "reached",
      });
      onSaved();
      onClose();
    } catch (error: unknown) {
      showError(error, { context: "Adding follow-up" });
    }
  };

  return (
    <DrawerForm
      title="Add Follow-up"
      description="Log a follow-up activity for this lead."
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={form.handleSubmit(onSubmit)}
      isSubmitting={form.formState.isSubmitting}
      submitLabel="Save Follow-up"
    >
      <Form {...form}>
        <div className="space-y-4">
          <FormCombobox
            control={form.control}
            name="type"
            label="Follow-up Type"
            options={[
              { label: "Call", value: "call" },
              { label: "WhatsApp", value: "whatsapp" },
              { label: "Email", value: "email" },
              { label: "Meeting", value: "meeting" },
              { label: "Site Visit", value: "site_visit" },
            ]}
          />
          <FormField control={form.control} name="datetime" label="Date & Time" type="datetime-local" />
          <FormTextArea control={form.control} name="notes" label="Notes" placeholder="What was discussed..." />
          <FormSelect
            control={form.control}
            name="outcome"
            label="Outcome"
            options={[
              { label: "Reached", value: "reached" },
              { label: "No Answer", value: "no_answer" },
              { label: "Callback Requested", value: "callback_requested" },
              { label: "Meeting Scheduled", value: "meeting_scheduled" },
            ]}
          />
        </div>
      </Form>
    </DrawerForm>
  );
}
