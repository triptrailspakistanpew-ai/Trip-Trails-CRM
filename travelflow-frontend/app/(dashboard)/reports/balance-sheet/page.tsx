"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useBalanceSheet } from "@/features/finance/hooks/queries";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { DateRange } from "react-day-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { useBranchStore } from "@/store/branch.store";
import { Skeleton } from "@/components/ui/skeleton";

export default function BalanceSheetPage() {
  const router = useRouter();
  const activeCurrency = useBranchStore(state => state.activeCurrency);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const { data: report, isLoading } = useBalanceSheet(dateRange?.to || new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="tf-h2 text-tf-text-primary">Balance Sheet</h1>
            <p className="tf-body text-tf-text-secondary mt-1">
              Financial position as of a specific date.
            </p>
          </div>
        </div>
        <DateRangePicker date={dateRange} onDateChange={setDateRange} />
      </div>

      {isLoading ? (
        <Skeleton className="h-[400px] w-full rounded-xl" />
      ) : report ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Assets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {report.assets?.map((acc: any) => (
                  <div key={acc.id} className="flex justify-between items-center text-sm">
                    <span className="text-tf-text-secondary">{acc.code} - {acc.name}</span>
                    <span className="font-medium text-tf-text-primary">
                      {formatCurrency(acc.balance, activeCurrency)}
                    </span>
                  </div>
                ))}
                {report.assets?.length === 0 && (
                  <div className="text-sm text-tf-text-muted italic">No assets recorded.</div>
                )}
                <div className="pt-4 border-t border-tf-border flex justify-between items-center font-bold">
                  <span>Total Assets</span>
                  <span className="text-tf-text-primary">{formatCurrency(report.totalAssets, activeCurrency)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Liabilities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {report.liabilities?.map((acc: any) => (
                    <div key={acc.id} className="flex justify-between items-center text-sm">
                      <span className="text-tf-text-secondary">{acc.code} - {acc.name}</span>
                      <span className="font-medium text-tf-danger">
                        {formatCurrency(acc.balance, activeCurrency)}
                      </span>
                    </div>
                  ))}
                  {report.liabilities?.length === 0 && (
                    <div className="text-sm text-tf-text-muted italic">No liabilities recorded.</div>
                  )}
                  <div className="pt-4 border-t border-tf-border flex justify-between items-center font-bold">
                    <span>Total Liabilities</span>
                    <span className="text-tf-danger">{formatCurrency(report.totalLiabilities, activeCurrency)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Equity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {report.equity?.map((acc: any) => (
                    <div key={acc.id} className="flex justify-between items-center text-sm">
                      <span className="text-tf-text-secondary">{acc.code} - {acc.name}</span>
                      <span className="font-medium text-tf-success">
                        {formatCurrency(acc.balance, activeCurrency)}
                      </span>
                    </div>
                  ))}
                  {report.equity?.length === 0 && (
                    <div className="text-sm text-tf-text-muted italic">No equity recorded.</div>
                  )}
                  <div className="pt-4 border-t border-tf-border flex justify-between items-center font-bold">
                    <span>Total Equity</span>
                    <span className="text-tf-success">{formatCurrency(report.totalEquity, activeCurrency)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-tf-surface-hover">
              <CardContent className="p-6">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total Liabilities & Equity</span>
                  <span className="text-tf-text-primary">
                    {formatCurrency(report.totalLiabilities + report.totalEquity, activeCurrency)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="text-center py-10 text-tf-text-muted">Failed to load report data.</div>
      )}
    </div>
  );
}
