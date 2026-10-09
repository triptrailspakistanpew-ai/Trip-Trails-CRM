"use client";

import {
  Camera,
  DoorOpen,
  Globe,
  MessageCircle,
  Search,
  Share2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LeadSource } from "@/types";

const SOURCES: {
  value: LeadSource;
  label: string;
  icon: React.ElementType;
}[] = [
    { value: "walk_in", label: "Walk In", icon: DoorOpen },
    { value: "whatsapp", label: "WhatsApp", icon: MessageCircle },
    { value: "facebook", label: "Facebook", icon: Share2 },
    { value: "instagram", label: "Instagram", icon: Camera },
    { value: "website", label: "Website", icon: Globe },
    { value: "referral", label: "Referral", icon: Users },
    { value: "google_ads", label: "Google Ads", icon: Search },
  ];

interface LeadSourceSelectorProps {
  value: LeadSource;
  onChange: (value: LeadSource) => void;
  required?: boolean;
}

export function LeadSourceSelector({
  value,
  onChange,
  required,
}: LeadSourceSelectorProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-tf-text-secondary">
        Lead Source
        {required && <span className="text-tf-danger ml-0.5">*</span>}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {SOURCES.map(({ value: sourceValue, label, icon: Icon }) => {
          const selected = value === sourceValue;
          return (
            <button
              key={sourceValue}
              type="button"
              onClick={() => onChange(sourceValue)}
              className={cn(
                "flex min-h-10 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition-colors normal-case tracking-normal",
                selected
                  ? "border-[var(--tf-primary)] bg-tf-primary-soft text-tf-primary"
                  : "border-tf-border bg-transparent text-tf-text-muted hover:bg-tf-surface-2",
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
