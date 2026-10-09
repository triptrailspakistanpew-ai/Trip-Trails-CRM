"use client";

import { useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API } from "@/lib/data-source";
import { showSuccess, showError } from "@/lib/toast-utils";
import { useAccounts } from "@/features/finance/hooks/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

function AccountSelectCombobox({
  accounts,
  value,
  onChange,
}: {
  accounts: any[];
  value: string;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedAccount = accounts.find((a) => a.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            "w-full justify-between font-normal text-tf-text-primary bg-tf-surface hover:bg-tf-surface-hover border-tf-border shadow-sm text-left truncate",
            !value && "text-tf-text-secondary"
          )}
        >
          <span className="truncate">
            {selectedAccount ? `${selectedAccount.code} - ${selectedAccount.name}` : "Select account"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[280px] max-w-[450px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search account by code or name..." />
          <CommandList className="max-h-[250px] overflow-y-auto">
            <CommandEmpty>No account found.</CommandEmpty>
            <CommandGroup>
              {accounts.map((acc: any) => (
                <CommandItem
                  key={acc.id}
                  value={`${acc.code} ${acc.name}`}
                  onSelect={() => {
                    onChange(acc.id);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      acc.id === value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">
                    {acc.code} - {acc.name}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function CreateJournalEntryPage() {
  const router = useRouter();
  const { data: accounts = [] } = useAccounts();

  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [lines, setLines] = useState([
    { id: 1, accountId: "", debit: "", credit: "", description: "" },
    { id: 2, accountId: "", debit: "", credit: "", description: "" },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addLine = () => {
    setLines([...lines, { id: Date.now(), accountId: "", debit: "", credit: "", description: "" }]);
  };

  const removeLine = (id: number) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((l) => l.id !== id));
  };

  const updateLine = (id: number, field: string, value: string) => {
    setLines(lines.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const handleSubmit = async () => {
    if (!description || !date) return showError("Description and Date are required.");
    if (!isBalanced) return showError("Debits must equal Credits and be greater than 0.");
    if (lines.some((l) => !l.accountId)) return showError("All lines must have an account selected.");

    setIsSubmitting(true);
    try {
      await API.createJournalEntry({
        description,
        date: new Date(date).toISOString(),
        reference,
        lines: lines.map((l) => ({
          accountId: l.accountId,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
          description: l.description || undefined,
        })),
      });
      showSuccess("Journal entry posted successfully.");
      router.push("/accounting/journal-entries");
    } catch (e: any) {
      showError(e, { context: "Posting journal entry" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-tf-surface p-6 rounded-xl border border-tf-border shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="tf-h2 text-tf-text-primary">New Journal Entry</h1>
            <p className="tf-body text-tf-text-secondary mt-1">
              Create a manual double-entry journal record.
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !isBalanced}>
            {isSubmitting ? "Posting..." : "Post Entry"}
          </Button>
        </div>
      </div>

      <Card className="bg-tf-surface">
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2 col-span-2">
              <Label>Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Monthly rent amortization"
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2 col-span-3">
              <Label>Reference (Optional)</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. INV-1002"
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-tf-border">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-tf-text-primary">Journal Lines</h3>
              <Button variant="outline" size="sm" onClick={addLine}>
                <Plus className="w-4 h-4 mr-2" /> Add Line
              </Button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-4 px-2 text-sm font-medium text-tf-text-secondary">
                <div className="col-span-4">Account</div>
                <div className="col-span-3">Description</div>
                <div className="col-span-2">Debit</div>
                <div className="col-span-2">Credit</div>
                <div className="col-span-1"></div>
              </div>

              {lines.map((line) => (
                <div key={line.id} className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-4">
                    <AccountSelectCombobox
                      accounts={accounts}
                      value={line.accountId}
                      onChange={(val) => updateLine(line.id, "accountId", val)}
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      placeholder="Line desc..."
                      value={line.description}
                      onChange={(e) => updateLine(line.id, "description", e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min="0"
                      placeholder="0.00"
                      value={line.debit}
                      onChange={(e) => {
                        updateLine(line.id, "debit", e.target.value);
                        updateLine(line.id, "credit", ""); // clear credit
                      }}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min="0"
                      placeholder="0.00"
                      value={line.credit}
                      onChange={(e) => {
                        updateLine(line.id, "credit", e.target.value);
                        updateLine(line.id, "debit", ""); // clear debit
                      }}
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLine(line.id)}
                      disabled={lines.length <= 2}
                      className="text-tf-danger hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t border-tf-border px-12">
              <div className="flex gap-8 text-sm font-medium">
                <div className="flex items-center gap-4">
                  <span className="text-tf-text-secondary">Total Debit</span>
                  <span className={totalDebit === totalCredit ? "text-tf-success" : "text-tf-text-primary"}>
                    {totalDebit.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-tf-text-secondary">Total Credit</span>
                  <span className={totalDebit === totalCredit ? "text-tf-success" : "text-tf-text-primary"}>
                    {totalCredit.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            {!isBalanced && totalDebit > 0 && totalCredit > 0 && (
              <p className="text-right text-xs text-tf-danger">Totals do not match.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
