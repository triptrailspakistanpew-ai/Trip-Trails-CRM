"use client";

import { ArrowLeft, Save, Upload, Palette } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { showSuccess } from "@/lib/toast-utils";

export default function BrandingSettingsPage() {
  const router = useRouter();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showSuccess("Branding preferences saved successfully");
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
            <h1 className="tf-h2 text-tf-text-primary">Branding</h1>
            <p className="tf-body text-tf-text-secondary mt-1">
              Customize your platform&apos;s appearance.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-tf-surface rounded-xl border border-tf-border shadow-sm overflow-hidden">
        <form onSubmit={handleSave} className="p-8 space-y-8 max-w-3xl">
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-tf-text-primary border-b border-tf-border pb-2">
              Logo & Icons
            </h3>
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-lg bg-tf-primary/10 flex items-center justify-center border-2 border-dashed border-[var(--tf-primary)]/30">
                <span className="text-tf-primary font-bold text-2xl">TF</span>
              </div>
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="bg-tf-surface-2 text-tf-text-primary border-tf-border"
                >
                  <Upload className="w-4 h-4 mr-2" /> Upload New Logo
                </Button>
                <p className="text-xs text-tf-text-muted">
                  Recommended size: 256x256px. Formats: PNG, JPG, SVG.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-tf-text-primary border-b border-tf-border pb-2">
              Color Theme
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: "Ocean Blue", color: "bg-blue-600", active: true },
                { name: "Emerald", color: "bg-emerald-600", active: false },
                { name: "Violet", color: "bg-violet-600", active: false },
                { name: "Crimson", color: "bg-rose-600", active: false },
              ].map((theme) => (
                <div
                  key={theme.name}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${theme.active
                      ? "border-[var(--tf-primary)] ring-1 ring-[var(--tf-primary)] bg-tf-primary/5"
                      : "border-tf-border hover:border-[var(--tf-text-muted)]"
                    }`}
                >
                  <div
                    className={`w-full h-8 rounded-md mb-2 ${theme.color}`}
                  ></div>
                  <p className="text-sm font-medium text-center text-tf-text-primary">
                    {theme.name}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button
              type="submit"
              className="bg-tf-primary text-white hover:bg-tf-primary-hover"
            >
              <Save className="w-4 h-4 mr-2" /> Save Branding
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
