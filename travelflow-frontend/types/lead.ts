import type { leadStatusValues } from "@/features/leads/constants";

export type LeadStatus = (typeof leadStatusValues)[number];
export type LeadSource = 'walk_in' | 'whatsapp' | 'facebook' | 'instagram' | 'website' | 'referral' | 'google_ads';

export interface LeadActivity {
  id: string;
  leadId: string;
  type: 'note' | 'call' | 'whatsapp' | 'email' | 'status_change' | 'meeting' | 'site_visit' | 'booking_created';
  description: string;
  outcome?: 'reached' | 'no_answer' | 'callback_requested' | 'meeting_scheduled';
  createdBy: string;
  createdAt: Date;
}

export interface Lead {
  id: string;
  leadRef: string;
  name: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  cnic?: string;
  destination: string;
  travelDate?: Date;
  budget?: number;
  adults: number;
  children: number;
  specialRequirements?: string;
  source: LeadSource;
  status: LeadStatus;
  assignedAgentId?: string;
  branchId: string;
  notes?: string;
  activities: LeadActivity[];
  lastContactedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
