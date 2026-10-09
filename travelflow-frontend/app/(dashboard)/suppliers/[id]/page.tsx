"use client";

import { use, useEffect, useState } from "react";
import {
  ArrowLeft,
  Building,
  Phone,
  Mail,
  MapPin,
  Globe,
  Edit,
  CreditCard,
  ArrowRight,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { showSuccess, showError } from "@/lib/toast-utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { API } from "@/lib/data-source";
import { Supplier, Booking } from "@/types";
import { DetailHeader } from "@/components/shared/DetailHeader";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { CurrencyDisplay } from "@/components/shared/CurrencyDisplay";
import { DataTable } from "@/components/tables/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { formatCurrency } from "@/lib/utils";
import { DataTableRowActions } from "@/components/tables/DataTableRowActions";
import { TableEntityLink } from "@/components/shared/TableEntityLink";
import { SettleBalanceDrawer } from "@/components/suppliers/SettleBalanceDrawer";
import { DrawerForm } from "@/components/forms/DrawerForm";
import { FormField, FormPhoneField, FormSelect, FormCombobox } from "@/components/forms/FormField";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import {
  supplierSchema,
  SupplierFormValues,
} from "@/features/suppliers/schemas/supplier.schema";
import {
  mapSupplierToForm,
  supplierDefaultValues,
} from "@/features/suppliers/utils/mapSupplierToForm";
import { useBranchStore } from "@/store/branch.store";

export default function SupplierDetailPage() {
  const router = useRouter();
  const activeCurrency = useBranchStore(state => state.activeCurrency);
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettleDrawerOpen, setIsSettleDrawerOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [statement, setStatement] = useState<any>(null);

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: supplierDefaultValues,
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await API.getSupplier(id);
      setSupplier(data);
      if (data) {
        API.getBookings({ supplierId: id, limit: 50 }).then(setBookings).catch(console.error);
        API.getSupplierStatement(id).then(setStatement).catch(console.error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleSettleBalance = () => {
    setIsSettleDrawerOpen(true);
  };

  const handleEditDetails = () => {
    if (supplier) {
      form.reset(mapSupplierToForm(supplier));
      setIsEditDrawerOpen(true);
    }
  };

  const onEditSubmit = async (values: SupplierFormValues) => {
    try {
      await API.updateSupplier(id, values);
      showSuccess("Supplier updated successfully");
      setIsEditDrawerOpen(false);
      await loadData();
    } catch (error: unknown) {
      const err = error as { message?: string };
      showError(err.message || "Failed to update supplier");
    }
  };

  const columns: ColumnDef<Booking>[] = [
    {
      accessorKey: "bookingRef",
      header: "Reference",
      cell: ({ row }) => (
        <TableEntityLink
          onClick={() => router.push(`/bookings/${row.original.id}`)}
        >
          {row.original.bookingRef}
        </TableEntityLink>
      ),
    },
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <div className="font-medium text-xs text-tf-text-primary">
          {row.original.title || "Untitled"}
        </div>
      ),
    },
    {
      accessorKey: "customer",
      header: "Customer",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-tf-text-primary">
            {row.original.customer?.firstName} {row.original.customer?.lastName}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "services",
      header: "Services",
      cell: ({ row }) => (
        <div className="flex flex-col">
          {row.original.services?.filter((s) => s.supplierId === id).map((s) => (
            <span key={s.id} className="text-xs text-tf-text-primary">
              {s.title} — {formatCurrency(s.costPrice, activeCurrency)}
            </span>
          ))}
          {(!row.original.services || row.original.services.filter((s) => s.supplierId === id).length === 0) && (
            <span className="text-xs text-tf-text-muted">No services</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "totalCost",
      header: "Payable",
      cell: ({ row }) => (
        <div className="font-semibold text-sm text-tf-danger">
          {formatCurrency(row.original.totalCost || 0, activeCurrency)}
        </div>
      ),
    },
    {
      accessorKey: "bookingStatus",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge status={row.original.bookingStatus as any} />
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DataTableRowActions
          row={row}
          onView={() => router.push(`/bookings/${row.original.id}`)}
        />
      ),
    },
  ];

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (!supplier) {
    return <div>Supplier not found.</div>;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
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
              <h1 className="tf-h2 text-tf-text-primary">{supplier.name}</h1>
              <StatusBadge status={supplier.status as any} />
            </div>
            <p className="tf-body text-tf-text-secondary mt-1 flex items-center gap-2">
              <Building className="w-4 h-4" /> Category:{" "}
              <span className="capitalize font-medium text-tf-text-primary">
                {supplier.category}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleSettleBalance}
            className="bg-tf-surface text-tf-text-primary"
          >
            <CreditCard className="w-4 h-4 mr-2" /> Settle Balance
          </Button>
          <Button
            onClick={handleEditDetails}
            className="bg-tf-primary text-white hover:bg-tf-primary-hover"
          >
            <Edit className="w-4 h-4 mr-2" /> Edit Details
          </Button>
        </div>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Info */}
        <div className="bg-tf-surface rounded-xl border border-tf-border p-6 shadow-sm col-span-1 lg:col-span-2">
          <h3 className="text-lg font-semibold text-tf-text-primary mb-4 flex items-center gap-2">
            <Building className="w-5 h-5 text-tf-primary" /> Business
            Information
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-tf-text-muted uppercase tracking-wider mb-1">
                Contact Person
              </p>
              <p className="font-medium text-tf-text-primary">
                {supplier.contactPerson}
              </p>
            </div>
            <div>
              <p className="text-xs text-tf-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                <Phone className="w-3 h-3" /> Phone
              </p>
              <p className="font-medium text-tf-text-primary">
                {supplier.phone}
              </p>
            </div>
            <div>
              <p className="text-xs text-tf-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email
              </p>
              <p className="font-medium text-tf-text-primary truncate">
                {supplier.email}
              </p>
            </div>
            <div>
              <p className="text-xs text-tf-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> City
              </p>
              <p className="font-medium text-tf-text-primary">
                {supplier.city}
              </p>
            </div>
            <div>
              <p className="text-xs text-tf-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                <Globe className="w-3 h-3" /> Country
              </p>
              <p className="font-medium text-tf-text-primary">
                {supplier.country}
              </p>
            </div>
            <div>
              <p className="text-xs text-tf-text-muted uppercase tracking-wider mb-1">
                Registered Since
              </p>
              <p className="font-medium text-tf-text-primary">
                {new Date(supplier.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Ledger Summary */}
        <div className="bg-tf-surface rounded-xl border border-tf-border p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-tf-text-primary mb-4">
            Financial Standing
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-tf-border">
              <span className="text-tf-text-secondary">
                Current Ledger Balance
              </span>
              <CurrencyDisplay
                amount={statement?.finalBalance ?? supplier.balance}
                className="font-bold text-tf-danger text-xl"
              />
            </div>
            <p className="text-sm text-tf-text-muted pt-2">
              Positive balance indicates amount owed by your agency to the
              supplier. Negative indicates advance payment.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="ledger" className="w-full">
        <TabsList className="bg-tf-surface border border-tf-border p-1 rounded-lg">
          <TabsTrigger
            value="ledger"
            className="rounded-md data-[state=active]:bg-tf-primary data-[state=active]:text-white"
          >
            Supplier Ledger
          </TabsTrigger>
          <TabsTrigger
            value="bookings"
            className="rounded-md data-[state=active]:bg-tf-primary data-[state=active]:text-white"
          >
            Related Bookings
          </TabsTrigger>
          <TabsTrigger
            value="documents"
            className="rounded-md data-[state=active]:bg-tf-primary data-[state=active]:text-white"
          >
            Contracts
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="ledger"
          className="mt-4 bg-tf-surface rounded-xl border border-tf-border p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-tf-text-primary">
              Ledger Entries
            </h3>
            <Button variant="outline" size="sm" onClick={handleSettleBalance}>
              Make Payment <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
          {!statement?.entries || statement.entries.length === 0 ? (
            <div className="text-center py-12 border border-tf-border rounded-lg">
              <p className="text-tf-text-secondary">No ledger entries found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {statement.entries.map((entry: any, index: number) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-4 border border-tf-border rounded-lg bg-tf-surface-2"
                >
                  <div>
                    <p className="font-semibold text-sm text-tf-text-primary">
                      {entry.description}
                    </p>
                    <p className="text-xs text-tf-text-muted mt-1">
                      {entry.type && <span className="mr-2">{entry.type}</span>}
                      {entry.reference && <span className="mr-2 text-tf-text-muted">Ref: {entry.reference}</span>}
                      {new Date(entry.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    {entry.credit > 0 && (
                      <p className="text-tf-danger font-mono font-bold text-sm">
                        + {formatCurrency(entry.credit, activeCurrency)}
                      </p>
                    )}
                    {entry.debit > 0 && (
                      <p className="text-tf-success font-mono font-bold text-sm">
                        - {formatCurrency(entry.debit, activeCurrency)}
                      </p>
                    )}
                    {entry.balance !== undefined && (
                      <p className="text-xs text-tf-text-muted mt-1">
                        Balance: {formatCurrency(entry.balance, activeCurrency)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent
          value="bookings"
          className="mt-4 bg-tf-surface rounded-xl border border-tf-border p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-tf-text-primary">
              Recent Bookings via Supplier
            </h3>
          </div>
          {bookings.length === 0 ? (
            <div className="text-center py-12 border border-tf-border rounded-lg">
              <p className="text-tf-text-secondary">
                No bookings found through this supplier.
              </p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={bookings}
              isLoading={isLoading}
            />
          )}
        </TabsContent>

        <TabsContent
          value="documents"
          className="mt-4 bg-tf-surface rounded-xl border border-tf-border p-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-tf-border hover:bg-tf-surface-2 cursor-pointer transition-colors">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded bg-tf-primary/10 flex items-center justify-center text-tf-primary shrink-0">
                  <Building className="w-5 h-5" />
                </div>
                <div className="overflow-hidden">
                  <p className="font-medium text-sm text-tf-text-primary truncate">
                    B2B_Agreement.pdf
                  </p>
                  <p className="text-xs text-tf-text-muted">
                    Signed: 2024-01-15
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {supplier && (
        <SettleBalanceDrawer
          isOpen={isSettleDrawerOpen}
          onClose={() => setIsSettleDrawerOpen(false)}
          supplier={supplier}
          onSuccess={loadData}
        />
      )}

      <DrawerForm
        title="Edit Supplier"
        description="Update supplier contact and category details."
        isOpen={isEditDrawerOpen}
        onClose={() => setIsEditDrawerOpen(false)}
        onSubmit={form.handleSubmit(onEditSubmit)}
        isSubmitting={form.formState.isSubmitting}
        size="md"
        submitLabel="Save Changes"
      >
        <Form {...form}>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                label="Company Name"
                required
              />
              <FormCombobox
                control={form.control}
                name="category"
                label="Category"
                required
                options={[
                  { label: "Airline", value: "airline" },
                  { label: "Hotel", value: "hotel" },
                  { label: "Visa", value: "visa" },
                  { label: "Transport", value: "transport" },
                  { label: "Insurance", value: "insurance" },
                  { label: "Consolidator", value: "consolidator" },
                  { label: "Other", value: "other" },
                ]}
              />
            </div>
            <FormField
              control={form.control}
              name="contactPerson"
              label="Contact Person"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                label="Email"
                type="email"
              />
              <FormPhoneField
                control={form.control}
                name="phone"
                label="Phone"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="city" label="City" />
              <FormField
                control={form.control}
                name="country"
                label="Country"
              />
            </div>
          </div>
        </Form>
      </DrawerForm>
    </div>
  );
}
