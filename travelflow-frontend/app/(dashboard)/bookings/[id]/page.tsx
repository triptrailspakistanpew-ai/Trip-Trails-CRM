"use client";

import { useBranchStore } from "@/store/branch.store";
import { use, useEffect, useState } from "react";
import {
  ArrowLeft,
  Plane,
  User,
  CreditCard,
  Calendar,
  Clock,
  FileText,
  Receipt,
  Download,
  FileSpreadsheet,
  ChevronDown,
  CheckCircle2,
  FileCheck,
} from "lucide-react";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DetailHeader } from "@/components/shared/DetailHeader";
import { API } from "@/lib/data-source";
import { Booking, BookingDocument } from "@/types";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { RecordPaymentDrawer } from "@/components/bookings/RecordPaymentDrawer";
import { BookingDocumentsPanel } from "@/components/bookings/BookingDocumentsPanel";
import { PaymentScheduleCard } from "@/components/bookings/PaymentScheduleCard";
import { CreateScheduleDialog } from "@/components/bookings/CreateScheduleDialog";
import { ConfirmSupplierBillDialog } from "@/components/finance/ConfirmSupplierBillDialog";
import { usePaymentSchedules } from "@/features/bookings/hooks/queries";
import { showError, showSuccess } from "@/lib/toast-utils";
import { exportJobBookingSheet } from "@/lib/export-utils";
import { CalendarClock, Plus } from "lucide-react";

export default function BookingDetailPage() {
  const activeCurrency = useBranchStore((state) => state.activeCurrency);
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [documents, setDocuments] = useState<BookingDocument[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaymentDrawerOpen, setIsPaymentDrawerOpen] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [isCreateScheduleOpen, setIsCreateScheduleOpen] = useState(false);
  const [selectedServiceToConfirm, setSelectedServiceToConfirm] = useState<any | null>(null);
  const { data: schedules = [] } = usePaymentSchedules(id);

  const handleViewInvoice = async () => {
    if (!booking) return;
    setIsGeneratingInvoice(true);
    try {
      const invoice = await API.generateInvoiceFromBooking(booking.id);
      window.open(`/print/invoice/${invoice.id}`, "_blank");
    } catch (error: any) {
      showError(error.message || "Failed to view invoice");
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const handleViewReceipt = async () => {
    if (!booking) return;
    try {
      const payments = await API.getPayments();
      const payment = payments.find((p: any) => 
        (typeof p.bookingId === 'object' ? p.bookingId?.id : p.bookingId) === booking.id
      );
      if (payment) {
        window.open(`/print/receipt/${payment.id}`, "_blank");
      } else {
        showError("No payment found for this booking. Please record a payment first.");
      }
    } catch (error: any) {
      showError(error.message || "Failed to view payment");
    }
  };

  const loadAll = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await API.getBooking(id);
      setBooking(data);
    } finally {
      setIsLoading(false);
    }
    
    // Background loads
    API.getBookingDocuments(id).then(setDocuments).catch(console.error);
    API.getBookingActivities(id).then(setActivities).catch(console.error);
  };

  useEffect(() => {
    loadAll();
  }, [id]);

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (!booking) {
    return <div>Booking not found.</div>;
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!booking) return;
    try {
      await API.updateBooking(booking.id, { bookingStatus: newStatus as any });
      showSuccess(`Booking status updated to ${newStatus.replace("_", " ")}`);
      loadAll();
    } catch (error: any) {
      showError(error.message || "Failed to update booking status");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <DetailHeader
        title={
          <div className="flex items-center gap-3">
            <span>Booking {booking.bookingRef}</span>
            <DropdownMenu>
              <DropdownMenuTrigger className="focus:outline-none flex items-center gap-1 group cursor-pointer">
                <StatusBadge status={booking.bookingStatus as any} />
                <ChevronDown className="h-4 w-4 text-tf-text-muted group-hover:text-tf-text-primary transition-colors" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-[180px] bg-tf-surface border-tf-border"
              >
                {[
                  "draft",
                  "confirmed",
                  "in_progress",
                  "completed",
                  "cancelled",
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
        }
        subtitle={
          <>
            <Plane className="w-4 h-4" /> {booking.title || "Booking"}
          </>
        }
        actions={
          <>
            {booking.paymentStatus !== "paid" && (
              <Button
                variant="outline"
                onClick={() => setIsPaymentDrawerOpen(true)}
                className="bg-[var(--tf-success-soft)] text-tf-success hover:bg-tf-success hover:text-white border-tf-success/30 transition-colors"
              >
                <CreditCard className="w-4 h-4 mr-2" /> Record Payment
              </Button>
            )}
            <Button
              variant="outline"
              className="bg-tf-surface text-tf-text-primary"
              onClick={handleViewInvoice}
              disabled={isGeneratingInvoice}
            >
              <FileText className="w-4 h-4 mr-2" /> 
              {isGeneratingInvoice ? "Generating..." : "Generate Invoice"}
            </Button>
            <Button
              variant="outline"
              className="bg-tf-surface text-tf-text-primary"
              onClick={handleViewReceipt}
            >
              <FileText className="w-4 h-4 mr-2" /> 
              View Payment
            </Button>
            <Button
              variant="outline"
              className="bg-tf-surface text-tf-text-primary"
              onClick={() => {
                if (booking) {
                  exportJobBookingSheet(booking, activeCurrency);
                  showSuccess("Job sheet exported");
                }
              }}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Job Sheet
            </Button>
            <Button className="bg-tf-primary text-white hover:bg-tf-primary-hover">
              <Download className="w-4 h-4 mr-2" /> E-Ticket
            </Button>
          </>
        }
      />

      <RecordPaymentDrawer
        isOpen={isPaymentDrawerOpen}
        onClose={() => setIsPaymentDrawerOpen(false)}
        booking={booking}
        onSuccess={async () => {
          const data = await API.getBooking(id);
          setBooking(data);
        }}
      />

      <CreateScheduleDialog
        isOpen={isCreateScheduleOpen}
        onClose={() => setIsCreateScheduleOpen(false)}
        bookingId={booking.id}
      />

      {/* Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer & Trip */}
        <Card className="col-span-1 lg:col-span-2 shadow-sm border-tf-border bg-tf-surface">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2 text-tf-text-primary">
              <User className="w-5 h-5 text-tf-primary" /> Passenger Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-tf-text-muted uppercase tracking-wider mb-1">
                  Name
                </p>
                <p className="font-medium text-tf-text-primary">
                  {booking.customer?.firstName} {booking.customer?.lastName}
                </p>
              </div>
              <div>
                <p className="text-xs text-tf-text-muted uppercase tracking-wider mb-1">
                  Phone
                </p>
                <p className="font-medium text-tf-text-primary">
                  {booking.customer?.phone}
                </p>
              </div>
              <div>
                <p className="text-xs text-tf-text-muted uppercase tracking-wider mb-1">
                  Email
                </p>
                <p className="font-medium text-tf-text-primary">
                  {booking.customer?.email}
                </p>
              </div>
              <div>
                <p className="text-xs text-tf-text-muted uppercase tracking-wider mb-1">
                  Title
                </p>
                <p className="font-medium text-tf-text-primary flex items-center gap-2">
                  {booking.title || "Untitled"}
                </p>
              </div>
              <div>
                <p className="text-xs text-tf-text-muted uppercase tracking-wider mb-1">
                  Departure
                </p>
                <p className="font-medium text-tf-text-primary">
                  {new Date(booking.departureDate).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              {booking.returnDate && (
                <div>
                  <p className="text-xs text-tf-text-muted uppercase tracking-wider mb-1">
                    Return
                  </p>
                  <p className="font-medium text-tf-text-primary">
                    {new Date(booking.returnDate).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-tf-text-muted uppercase tracking-wider mb-1">
                  Travelers
                </p>
                <p className="font-medium text-tf-text-primary">
                  {booking.expectedAdults} adults, {booking.expectedChildren} children
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financials */}
        <Card className="shadow-sm border-tf-border bg-tf-surface">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2 text-tf-text-primary">
              <CreditCard className="w-5 h-5 text-tf-success" /> Financials
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-tf-border">
              <span className="text-tf-text-secondary">Total Cost</span>
              <CurrencyDisplay
                amount={booking.totalCost}
                className="text-tf-text-primary"
              />
            </div>
            <div className="flex justify-between items-center py-2 border-b border-tf-border">
              <span className="text-tf-text-secondary">Total Sell</span>
              <CurrencyDisplay
                amount={booking.totalSell}
                className="font-semibold text-tf-text-primary"
              />
            </div>
            <div className="flex justify-between items-center py-2 border-b border-tf-border">
              <span className="text-tf-text-secondary">
                {booking.services?.some((s: any) => s.supplierInvoiceAmount != null || s.financialStatus === "confirmed")
                  ? "Profit Margin"
                  : "Expected Profit"}
              </span>
              <span className="font-medium text-tf-success">
                <CurrencyDisplay amount={booking.totalProfit} /> (
                {Math.round(booking.profitMargin)}%)
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-tf-border">
              <span className="text-tf-text-secondary">Total Tax (VAT)</span>
              <CurrencyDisplay
                amount={booking.totalTax ?? 0}
                className="text-tf-text-primary"
              />
            </div>
            <div className="flex justify-between items-center py-2 border-b border-tf-border">
              <span className="text-tf-text-secondary font-semibold">Total Payable</span>
              <CurrencyDisplay
                amount={booking.totalCustomerPayable ?? booking.totalSell}
                className="font-bold text-tf-success text-lg"
              />
            </div>
            <div className="pt-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-tf-text-secondary">Payment Status</span>
                <span className="font-medium text-tf-text-primary capitalize">
                  {booking.paymentStatus}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="bg-tf-surface border border-tf-border p-1 rounded-lg">
          <TabsTrigger
            value="details"
            className="rounded-md data-[state=active]:bg-tf-primary data-[state=active]:text-white"
          >
            Full Details
          </TabsTrigger>
          <TabsTrigger
            value="timeline"
            className="rounded-md data-[state=active]:bg-tf-primary data-[state=active]:text-white"
          >
            Activity Log
          </TabsTrigger>
          <TabsTrigger
            value="documents"
            className="rounded-md data-[state=active]:bg-tf-primary data-[state=active]:text-white"
          >
            Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
          <Card className="border-tf-border bg-tf-surface shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Additional Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <p className="text-sm font-medium text-tf-text-secondary mb-2">
                    Services ({booking.services?.length || 0})
                  </p>
                  <div className="bg-tf-surface-2 p-4 rounded-lg space-y-4">
                    {booking.services?.map((svc) => (
                      <div key={svc.id} className="text-sm border-b border-tf-border pb-3 last:border-0 last:pb-0 space-y-1.5">
                        <div className="flex justify-between font-medium text-tf-text-primary">
                          <span>{svc.title} ({svc.serviceCategory})</span>
                          <span>{activeCurrency} {(svc.customerTotal ?? svc.sellingPrice).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs text-tf-text-muted">
                          <span>Sell: {activeCurrency} {svc.sellingPrice.toLocaleString()}</span>
                          {svc.taxAmount > 0 && (
                            <span className="text-tf-accent">Tax: {activeCurrency} {svc.taxAmount.toLocaleString()}</span>
                          )}
                        </div>
                        <div className="text-xs text-tf-text-muted">
                          Supplier: <span className="text-tf-text-secondary font-medium">{(svc as any).supplier?.name || "None"}</span> &bull; Treatment: {svc.taxTreatment?.replace(/_/g, ' ') || 'VAT_ON_MARGIN'}
                        </div>
                        <div className="flex items-center justify-between pt-1.5">
                          <div className="flex items-center gap-1.5">
                            {svc.supplierInvoiceAmount != null || svc.financialStatus === "confirmed" ? (
                              <Badge className="bg-[var(--tf-success-soft)] text-tf-success border-tf-success/30 text-[11px] font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Confirmed AP: {activeCurrency} {Number(svc.supplierInvoiceAmount ?? svc.costPrice).toLocaleString()}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-[11px]">
                                Estimated: {activeCurrency} {Number(svc.costPrice).toLocaleString()}
                              </Badge>
                            )}
                            {svc.costVariance && Math.abs(svc.costVariance) > 0.001 ? (
                              <span className={`text-[11px] font-mono font-medium ${svc.costVariance > 0 ? "text-tf-danger" : "text-tf-success"}`}>
                                {svc.costVariance > 0 ? `+${svc.costVariance}` : `${svc.costVariance}`}
                              </span>
                            ) : null}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2.5 bg-tf-surface text-tf-text-primary hover:bg-tf-surface-2"
                            onClick={() => setSelectedServiceToConfirm(svc)}
                          >
                            <FileCheck className="w-3 h-3 mr-1 text-tf-primary" />
                            {svc.supplierInvoiceAmount != null || svc.financialStatus === "confirmed" ? "Edit Bill" : "Confirm Bill"}
                          </Button>
                        </div>
                      </div>
                    ))}
                    {(!booking.services || booking.services.length === 0) && (
                      <p className="text-sm text-tf-text-muted">No services added</p>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-tf-text-secondary mb-2">
                    System Metadata
                  </p>
                  <div className="bg-tf-surface-2 p-4 rounded-lg space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-tf-text-muted">
                        Created By (Agent)
                      </span>
                      <span className="text-tf-text-primary">
                        {booking.agent?.name || booking.agentId}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-tf-text-muted">Branch</span>
                      <span className="text-tf-text-primary">
                        {booking.branch?.name || booking.branchId}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-tf-text-muted">Created At</span>
                      <span className="text-tf-text-primary">
                        {new Date(booking.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <Card className="border-tf-border bg-tf-surface shadow-sm">
            <CardContent className="pt-6">
              <div className="space-y-6">
                {
                  (activities.length > 0 ? activities.map(a => ({
                    title: a.title,
                    desc: a.description,
                    date: a.createdAt,
                  })) : [
                    {
                      title: "Booking Created",
                      desc: "Initial reservation made in system",
                      date: booking.createdAt,
                    }
                  ]).map((event, i, arr) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-tf-primary"></div>
                      {i !== arr.length - 1 && (
                        <div className="w-0.5 h-full bg-tf-border my-1"></div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-tf-text-primary">
                        {event.title}
                      </p>
                      <p className="text-sm text-tf-text-muted mt-1">
                        {event.desc}
                      </p>
                      <p className="text-xs text-tf-text-muted mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" />{" "}
                        {new Date(event.date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card className="border-tf-border bg-tf-surface shadow-sm">
            <CardContent className="pt-6">
              <BookingDocumentsPanel
                bookingId={id}
                documents={documents}
                onUpdate={loadAll}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Schedules */}
      <Card className="border-tf-border bg-tf-surface shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2 text-tf-text-primary">
              <CalendarClock className="w-5 h-5 text-tf-primary" /> Payment Schedules
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsCreateScheduleOpen(true)}
              className="bg-tf-primary text-white hover:bg-tf-primary-hover"
            >
              <Plus className="w-4 h-4 mr-1" /> Create Schedule
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {schedules.length === 0 ? (
            <p className="text-sm text-tf-text-muted text-center py-6">
              No payment schedules yet. Create one to split payments into installments.
            </p>
          ) : (
            schedules.map((schedule: any) => (
              <PaymentScheduleCard key={schedule.id} schedule={schedule} />
            ))
          )}
        </CardContent>
      </Card>
      <ConfirmSupplierBillDialog
        isOpen={!!selectedServiceToConfirm}
        onClose={() => setSelectedServiceToConfirm(null)}
        service={selectedServiceToConfirm}
        currency={activeCurrency}
        onSuccess={loadAll}
      />
    </div>
  );
}
