"use client";

import { use, useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  UserPlus,
  Phone,
  MapPin,
  CalendarDays,
  Wallet,
  Clock,
  Tag,
  ChevronDown,
  Users,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { API } from "@/lib/data-source";
import { Lead } from "@/types";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { showSuccess } from "@/lib/toast-utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FollowUpDrawer } from "@/components/leads/FollowUpDrawer";
import { ConvertToBookingDrawer } from "@/components/leads/ConvertToBookingDrawer";
import { formatTimeAgo } from "@/lib/utils";

export default function LeadDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [lead, setLead] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);

  const loadLead = useCallback(async () => {
    setIsLoading(true);
    const data = await API.getLead(id);
    setLead(data ?? null);
    setIsLoading(false);
  }, [id]);

  useEffect(() => {
    loadLead();
  }, [loadLead]);

  const handleStatusChange = async (newStatus: string) => {
    if (!lead) return;
    await API.updateLead(lead.id, { status: newStatus as Lead["status"] });
    await API.addLeadActivity(lead.id, {
      type: "status_change",
      description: `Status changed to ${newStatus.replace("_", " ")}`,
      createdBy: "Ahmad Khan",
    });
    showSuccess(`Status updated to ${newStatus.replace("_", " ")}`);
    loadLead();
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (!lead) {
    return <div>Lead not found.</div>;
  }

  const followUps = lead.activities.filter((a) =>
    ["call", "whatsapp", "email", "meeting", "site_visit"].includes(a.type),
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="rounded-full bg-tf-surface border border-tf-border"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="tf-h2 text-tf-text-primary">{lead.name}</h1>
              <DropdownMenu>
                <DropdownMenuTrigger className="focus:outline-none flex items-center gap-1 group">
                  <StatusBadge status={lead.status as any} />
                  <ChevronDown className="h-4 w-4 text-tf-text-muted group-hover:text-tf-text-primary transition-colors" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-[180px] bg-tf-surface border-tf-border"
                >
                  {[
                    "new",
                    "contacted",
                    "follow_up",
                    "interested",
                    "negotiation",
                    "converted",
                    "lost",
                  ].map((s) => (
                    <DropdownMenuItem
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      className="capitalize text-sm cursor-pointer"
                    >
                      {s.replace("_", " ")}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <p className="tf-body text-tf-text-secondary mt-1 flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> Ref:{" "}
              <span className="font-mono font-medium text-tf-text-primary">
                {lead.leadRef}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="bg-tf-surface text-tf-text-primary"
            onClick={() => router.push(`/quotations/create?leadId=${lead.id}`)}
          >
            Create Quotation
          </Button>
          <Button
            variant="outline"
            className="bg-tf-surface text-tf-text-primary"
            onClick={() => setFollowUpOpen(true)}
          >
            Add Follow-up
          </Button>
          <Button
            className="bg-tf-primary text-white hover:bg-tf-primary-hover"
            onClick={() => setConvertOpen(true)}
          >
            Convert to Booking
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-tf-surface rounded-xl border border-tf-border p-6 shadow-sm col-span-1 lg:col-span-2">
          <h3 className="text-lg font-semibold text-tf-text-primary mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-tf-primary" /> Lead Information
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-tf-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                <Phone className="w-3 h-3" /> Phone
              </p>
              <p className="font-medium text-tf-text-primary">{lead.phone}</p>
            </div>
            <div>
              <p className="text-xs text-tf-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Destination
              </p>
              <p className="font-medium text-tf-text-primary">
                {lead.destination}
              </p>
            </div>
            <div>
              <p className="text-xs text-tf-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                <Wallet className="w-3 h-3" /> Budget
              </p>
              {lead.budget ? (
                <CurrencyDisplay
                  amount={lead.budget}
                  className="font-medium text-tf-text-primary"
                />
              ) : (
                <p className="font-medium">Unspecified</p>
              )}
            </div>
            <div>
              <p className="text-xs text-tf-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> Travel Date
              </p>
              <p className="font-medium text-tf-text-primary">
                {lead.travelDate
                  ? new Date(lead.travelDate).toLocaleDateString("en-GB")
                  : "Flexible"}
              </p>
            </div>
            <div>
              <p className="text-xs text-tf-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                <Users className="w-3 h-3" /> Adults / Children
              </p>
              <p className="font-medium text-tf-text-primary">
                {lead.adults} / {lead.children}
              </p>
            </div>
            <div>
              <p className="text-xs text-tf-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                <Tag className="w-3 h-3" /> Source
              </p>
              <p className="font-medium text-tf-text-primary capitalize">
                {lead.source.replace("_", " ")}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-tf-surface rounded-xl border border-tf-border p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-tf-text-primary mb-4">
            Pipeline Status
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-tf-border">
              <span className="text-tf-text-secondary">Created On</span>
              <span className="font-medium text-tf-text-primary">
                {new Date(lead.createdAt).toLocaleDateString("en-GB")}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-tf-border">
              <span className="text-tf-text-secondary">Last Contacted</span>
              <span className="font-medium text-tf-text-primary">
                {lead.lastContactedAt
                  ? new Date(lead.lastContactedAt).toLocaleDateString("en-GB")
                  : new Date(lead.updatedAt).toLocaleDateString("en-GB")}
              </span>
            </div>
            <div className="pt-2">
              <span className="text-tf-text-secondary block mb-2">
                Lead Notes
              </span>
              <p className="text-sm text-tf-text-primary bg-tf-surface-2 p-3 rounded-lg border border-tf-border">
                {lead.notes || "No initial notes provided."}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="bg-tf-surface border border-tf-border p-1 rounded-lg">
          <TabsTrigger
            value="activity"
            className="rounded-md data-[state=active]:bg-tf-primary data-[state=active]:text-white"
          >
            Activity Log
          </TabsTrigger>
          <TabsTrigger
            value="requirements"
            className="rounded-md data-[state=active]:bg-tf-primary data-[state=active]:text-white"
          >
            Detailed Requirements
          </TabsTrigger>
          <TabsTrigger
            value="followups"
            className="rounded-md data-[state=active]:bg-tf-primary data-[state=active]:text-white"
          >
            Follow-ups
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="activity"
          className="mt-4 bg-tf-surface rounded-xl border border-tf-border p-6"
        >
          <div className="space-y-6">
            {lead.activities.length === 0 ? (
              <p className="text-sm text-tf-text-muted">No activity yet.</p>
            ) : (
              lead.activities.map((activity, index) => (
                <div key={activity.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full ${index === 0 ? "bg-tf-primary" : "bg-tf-border"}`}
                    />
                    {index < lead.activities.length - 1 && (
                      <div className="w-0.5 h-full bg-tf-border my-1" />
                    )}
                  </div>
                  <div className="pb-4 flex-1">
                    <div className="flex justify-between items-start gap-4">
                      <p className="font-medium text-tf-text-primary capitalize">
                        {activity.type.replace("_", " ")}
                      </p>
                      <p className="text-xs text-tf-text-muted flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" />{" "}
                        {formatTimeAgo(new Date(activity.createdAt))}
                      </p>
                    </div>
                    <p className="text-sm text-tf-text-muted mt-1">
                      {activity.description}
                    </p>
                    <p className="text-xs text-tf-text-muted mt-1">
                      by {activity.createdBy}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent
          value="requirements"
          className="mt-4 bg-tf-surface rounded-xl border border-tf-border p-6"
        >
          <div className="max-w-2xl space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-tf-surface-2 rounded-lg">
                <p className="text-xs text-tf-text-muted uppercase mb-1">
                  Adults
                </p>
                <p className="font-semibold text-lg text-tf-text-primary">
                  {lead.adults}
                </p>
              </div>
              <div className="p-4 bg-tf-surface-2 rounded-lg">
                <p className="text-xs text-tf-text-muted uppercase mb-1">
                  Children
                </p>
                <p className="font-semibold text-lg text-tf-text-primary">
                  {lead.children}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-tf-text-secondary mb-2">
                Special Requirements
              </p>
              <p className="text-sm text-tf-text-primary">
                {lead.specialRequirements || "None specified"}
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent
          value="followups"
          className="mt-4 bg-tf-surface rounded-xl border border-tf-border p-6"
        >
          {followUps.length === 0 ? (
            <p className="text-sm text-tf-text-muted">No follow-ups yet.</p>
          ) : (
            <div className="space-y-4">
              {followUps.map((f) => (
                <div
                  key={f.id}
                  className="border-b border-tf-border pb-3 last:border-0"
                >
                  <p className="font-medium capitalize text-tf-text-primary">
                    {f.type.replace("_", " ")}
                  </p>
                  <p className="text-sm text-tf-text-secondary mt-1">
                    {f.description}
                  </p>
                  <p className="text-xs text-tf-text-muted mt-1">
                    {formatTimeAgo(new Date(f.createdAt))} · {f.createdBy}
                  </p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <FollowUpDrawer
        lead={lead}
        isOpen={followUpOpen}
        onClose={() => setFollowUpOpen(false)}
        onSaved={loadLead}
      />
      <ConvertToBookingDrawer
        lead={lead}
        isOpen={convertOpen}
        onClose={() => setConvertOpen(false)}
      />
    </div>
  );
}
