"use client";

import {
  CheckCircle2,
  Ticket,
  Users,
  FileText,
  UserPlus,
  CreditCard,
  ArrowRight,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { formatTimeAgo } from "@/lib/utils";
import { FilterSelect } from "@/components/shared/FilterSelect";
import { Button } from "@/components/ui/button";

type ActivityType = "booking" | "invoice" | "lead" | "expense" | "customer";
type FilterPeriod = "today" | "yesterday" | "week" | "all";

interface Activity {
  id: string | number;
  type: string;
  icon: React.ElementType;
  color: string;
  title: string;
  detail: string;
  time: Date;
  href?: string;
}

const PERIOD_CUTOFFS: Record<FilterPeriod, number> = {
  today: Date.now() - 1000 * 60 * 60 * 24,
  yesterday: Date.now() - 1000 * 60 * 60 * 48,
  week: Date.now() - 1000 * 60 * 60 * 24 * 7,
  all: 0,
};

export function ActivityFeed({
  isLoading,
  activities = [],
}: {
  isLoading: boolean;
  activities?: any[];
}) {
  const [period, setPeriod] = useState<FilterPeriod>("week");
  const [showAll, setShowAll] = useState(false);
  const router = useRouter();

  const parsedActivities = useMemo(() => {
    return activities.map((a: any) => ({
      id: a.id,
      type: a.type,
      icon: Users, // default icon
      color: "var(--tf-primary)",
      title: a.title,
      detail: a.detail,
      time: new Date(a.time),
      href: `/leads`,
    }));
  }, [activities]);

  const filtered = useMemo(() => {
    const cutoff = PERIOD_CUTOFFS[period];
    return parsedActivities.filter((a) => a.time.getTime() >= cutoff);
  }, [period, parsedActivities]);

  const displayed = showAll ? filtered : filtered.slice(0, 7);

  return (
    <div className="bg-tf-surface border border-tf-border rounded-xl p-6 h-full min-h-[480px] max-h-[740px]  shadow-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="tf-h3 text-tf-text-primary">Recent Activity</h3>
          <p className="text-sm text-tf-text-secondary">
            Latest actions across branches
          </p>
        </div>
        <FilterSelect
          value={period}
          onValueChange={(v) => {
            setPeriod(v as FilterPeriod);
            setShowAll(false);
          }}
          options={[
            { value: "today", label: "Today" },
            { value: "yesterday", label: "Last 48h" },
            { value: "week", label: "This Week" },
            { value: "all", label: "All Time" },
          ]}
          triggerClassName="bg-tf-surface-2 rounded-lg"
        />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-tf-surface-2 animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3.5 w-3/4 bg-tf-surface-2 animate-pulse rounded" />
                <div className="h-3 w-1/2 bg-tf-surface-2 animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CheckCircle2 className="h-10 w-10 text-tf-text-muted mb-3 opacity-40" />
          <p className="text-tf-text-secondary text-sm">
            No activity in this period
          </p>
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 flex-col">
          {/* Scrollable activity list */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1">
            {displayed.map((activity, index) => {
              const Icon = activity.icon;
              const isLast = index === displayed.length - 1;
              return (
                <div
                  key={activity.id}
                  onClick={() => activity.href && router.push(activity.href)}
                  className={`flex items-start gap-3 p-2.5 rounded-lg transition-colors ${activity.href
                    ? "cursor-pointer hover:bg-tf-surface-2"
                    : ""
                    }`}
                >
                  {/* Timeline dot + line */}
                  <div className="flex flex-col items-center shrink-0">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--tf-surface)] shadow-sm"
                      style={{
                        backgroundColor: `${activity.color}22`,
                        color: activity.color,
                      }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    {!isLast && (
                      <div className="w-px h-full min-h-[12px] mt-1 bg-tf-border" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-sm font-medium text-tf-text-primary truncate leading-tight">
                      {activity.title}
                    </p>
                    <p className="text-xs text-tf-text-secondary truncate mt-0.5">
                      {activity.detail}
                    </p>
                    <p className="text-[10px] text-tf-text-muted mt-1">
                      {formatTimeAgo(activity.time)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Show more / View all */}
          {filtered.length > 5 && (
            <div className="mt-3 shrink-0 border-t border-tf-border pt-3">
              {!showAll ? (
                <Button
                  variant="link"
                  onClick={() => setShowAll(true)}
                  className="flex w-full items-center justify-center gap-1.5 py-1 normal-case tracking-normal group"
                >
                  Show all {filtered.length} activities
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => setShowAll(false)}
                  className="flex w-full items-center justify-center gap-1.5 py-1 normal-case tracking-normal"
                >
                  Show less
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
