"use client";

import { ArrowLeft, Save, Bell, Mail, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { showSuccess } from "@/lib/toast-utils";

export default function NotificationsSettingsPage() {
  const router = useRouter();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showSuccess("Notification preferences updated");
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between gap-4">
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
            <h1 className="tf-h2 text-tf-text-primary">Notifications</h1>
            <p className="tf-body text-tf-text-secondary mt-1">
              Configure your alerts and emails.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-tf-surface rounded-xl border border-tf-border shadow-sm overflow-hidden">
        <form onSubmit={handleSave} className="p-8 space-y-8 max-w-3xl">
          <div className="space-y-6">
            <div className="flex items-start justify-between border-b border-tf-border pb-6">
              <div className="flex gap-3">
                <div className="mt-1">
                  <Mail className="w-5 h-5 text-tf-text-muted" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-tf-text-primary">
                    Email Notifications
                  </h4>
                  <p className="text-sm text-tf-text-secondary mt-1">
                    Receive daily summaries and critical alerts via email.
                  </p>
                </div>
              </div>
              <Switch id="email-notifications" defaultChecked />
            </div>

            <div className="flex items-start justify-between border-b border-tf-border pb-6">
              <div className="flex gap-3">
                <div className="mt-1">
                  <Bell className="w-5 h-5 text-tf-text-muted" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-tf-text-primary">
                    In-App Alerts
                  </h4>
                  <p className="text-sm text-tf-text-secondary mt-1">
                    Show toast notifications when you are active in the
                    dashboard.
                  </p>
                </div>
              </div>
              <Switch id="in-app-alerts" defaultChecked />
            </div>

            <div className="flex items-start justify-between pb-2">
              <div className="flex gap-3">
                <div className="mt-1">
                  <Smartphone className="w-5 h-5 text-tf-text-muted" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-tf-text-primary">
                    SMS Notifications
                  </h4>
                  <p className="text-sm text-tf-text-secondary mt-1">
                    Get text messages for urgent payment reminders.
                  </p>
                </div>
              </div>
              <Switch id="sms-notifications" />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button
              type="submit"
              className="bg-tf-primary text-white hover:bg-tf-primary-hover"
            >
              <Save className="w-4 h-4 mr-2" /> Save Preferences
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
