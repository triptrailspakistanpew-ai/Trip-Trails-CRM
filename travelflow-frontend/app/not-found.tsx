import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Search, Users, Target, FileText, Calendar, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[var(--tf-bg)] p-6">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="mx-auto w-24 h-24 bg-tf-primary/10 rounded-full flex items-center justify-center mb-6">
          <Search className="w-12 h-12 text-tf-primary" />
        </div>
        
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-tf-text-primary tracking-tight">Page not found</h1>
          <p className="text-tf-text-secondary text-lg">We couldn't find the page you're looking for. It might have been moved or doesn't exist.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Button asChild size="lg" variant="outline" className="h-12 border-tf-border text-tf-text-primary hover:bg-tf-surface-hover hover:text-tf-primary font-medium">
            <Link href="javascript:history.back()">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Link>
          </Button>
          <Button asChild size="lg" className="h-12 bg-tf-primary text-white hover:bg-tf-primary-hover font-medium">
            <Link href="/dashboard">
              Return to Dashboard
            </Link>
          </Button>
        </div>

        <div className="pt-8 mt-8 border-t border-tf-border text-left">
          <h3 className="text-sm font-semibold text-tf-text-secondary uppercase tracking-wider mb-4">Quick Links</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/leads" prefetch={false} className="flex items-center p-3 rounded-xl border border-tf-border bg-tf-surface hover:bg-tf-surface-hover transition-colors group">
              <Target className="w-5 h-5 text-tf-primary mr-3" />
              <span className="text-sm font-medium text-tf-text-primary group-hover:text-tf-primary transition-colors">Leads</span>
            </Link>
            <Link href="/customers" prefetch={false} className="flex items-center p-3 rounded-xl border border-tf-border bg-tf-surface hover:bg-tf-surface-hover transition-colors group">
              <Users className="w-5 h-5 text-tf-primary mr-3" />
              <span className="text-sm font-medium text-tf-text-primary group-hover:text-tf-primary transition-colors">Customers</span>
            </Link>
            <Link href="/quotations" prefetch={false} className="flex items-center p-3 rounded-xl border border-tf-border bg-tf-surface hover:bg-tf-surface-hover transition-colors group">
              <FileText className="w-5 h-5 text-tf-primary mr-3" />
              <span className="text-sm font-medium text-tf-text-primary group-hover:text-tf-primary transition-colors">Quotations</span>
            </Link>
            <Link href="/bookings" prefetch={false} className="flex items-center p-3 rounded-xl border border-tf-border bg-tf-surface hover:bg-tf-surface-hover transition-colors group">
              <Calendar className="w-5 h-5 text-tf-primary mr-3" />
              <span className="text-sm font-medium text-tf-text-primary group-hover:text-tf-primary transition-colors">Bookings</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
