"use client";

import { ArrowLeft, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showSuccess } from "@/lib/toast-utils";

export default function CompanySettingsPage() {
  const router = useRouter();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showSuccess("Company settings saved successfully");
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
            <h1 className="tf-h2 text-tf-text-primary">Company Settings</h1>
            <p className="tf-body text-tf-text-secondary mt-1">
              Manage agency profile and details.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-tf-surface rounded-xl border border-tf-border shadow-sm overflow-hidden">
        <form onSubmit={handleSave} className="p-8 space-y-8 max-w-3xl">
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-tf-text-primary border-b border-tf-border pb-2">
              General Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-tf-text-secondary">
                  Agency Name
                </label>
                <Input
                  defaultValue="TravelFlow PK"
                  className="bg-tf-surface-2 border-tf-border text-tf-text-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-tf-text-secondary">
                  Registration / Tax ID
                </label>
                <Input
                  defaultValue="TX-987654321"
                  className="bg-tf-surface-2 border-tf-border text-tf-text-primary"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-tf-text-primary border-b border-tf-border pb-2">
              Contact Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-tf-text-secondary">
                  Primary Email
                </label>
                <Input
                  type="email"
                  defaultValue="contact@travelflow.pk"
                  className="bg-tf-surface-2 border-tf-border text-tf-text-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-tf-text-secondary">
                  Phone Number
                </label>
                <Input
                  defaultValue="+92 21 111 222 333"
                  className="bg-tf-surface-2 border-tf-border text-tf-text-primary"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-tf-text-secondary">
                  Headquarters Address
                </label>
                <Input
                  defaultValue="Suite 400, Business Avenue, Shahrah-e-Faisal, Karachi"
                  className="bg-tf-surface-2 border-tf-border text-tf-text-primary"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button
              type="submit"
              className="bg-tf-primary text-white hover:bg-tf-primary-hover"
            >
              <Save className="w-4 h-4 mr-2" /> Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
