"use client";

/**
 * BulkImportModal — In-app CSV/Excel bulk data importer
 *
 * Features:
 * - Tabs to switch between Sales/Income and Expenses import
 * - File drag-and-drop + file picker (.xlsx, .csv)
 * - Browser-side parsing with SheetJS (xlsx) — already installed
 * - Auto-header matching with preview table
 * - "Download Sample Template" button
 * - Import with progress and batch results summary
 */

import { useState, useCallback, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth.store";
import { useBranchStore } from "@/store/branch.store";
import { useBranches } from "@/features/shared/hooks/queries";
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Building2,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type ImportType = "sales" | "expenses";

interface ParsedData {
  headers: string[];
  rows: Record<string, string | number>[];
  fileName: string;
}

interface ImportResultData {
  success: boolean;
  totalRows: number;
  importedRows: number;
  failedRows: number;
  errors: { row: number; message: string }[];
  createdRefs: string[];
}

// ─── Column mappings ────────────────────────────────────────────────────────

const SALES_COLUMNS = [
  { key: "date", label: "Date", required: true },
  { key: "description", label: "Description", required: true },
  { key: "invoiceNo", label: "Invoice No.", required: false },
  { key: "serviceType", label: "Service Type", required: true },
  { key: "supplier", label: "Supplier", required: false },
  { key: "supplierRef", label: "Supplier Ref.", required: false },
  { key: "costPrice", label: "Cost Price", required: true },
  { key: "sellingPrice", label: "Selling Price", required: true },
  { key: "customerName", label: "Customer Name", required: false },
  { key: "status", label: "Status", required: false },
];

const EXPENSE_COLUMNS = [
  { key: "date", label: "Date", required: true },
  { key: "description", label: "Description", required: true },
  { key: "invoiceNo", label: "Invoice No.", required: false },
  { key: "category", label: "Category", required: true },
  { key: "supplier", label: "Supplier", required: false },
  { key: "supplierRef", label: "Supplier Ref.", required: false },
  { key: "amountPaid", label: "Amount Paid", required: true },
  { key: "vatTreatment", label: "VAT Treatment", required: false },
  { key: "paymentMethod", label: "Payment Method", required: false },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Smart header matching — matches Excel headers to expected column keys.
 */
function matchHeaders(
  excelHeaders: string[],
  expectedColumns: { key: string; label: string }[]
): Record<string, number> {
  const mapping: Record<string, number> = {};

  for (const col of expectedColumns) {
    const headerIdx = excelHeaders.findIndex((h) => {
      const normalized = (h || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const keyNorm = col.key.toLowerCase().replace(/[^a-z0-9]/g, "");
      const labelNorm = col.label.toLowerCase().replace(/[^a-z0-9]/g, "");
      return normalized === keyNorm || normalized === labelNorm || normalized.includes(keyNorm);
    });
    if (headerIdx >= 0) {
      mapping[col.key] = headerIdx;
    }
  }

  return mapping;
}

function generateSampleWorkbook(type: ImportType): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const columns = type === "sales" ? SALES_COLUMNS : EXPENSE_COLUMNS;
  const headers = columns.map((c) => c.label);

  const sampleRows =
    type === "sales"
      ? [
        ["01-Aug-2024", "Dubai Visit Visa - Client", "INV-0001", "Dubai Visit Visa", "ABC Suppliers", "SUP-TVA-0001", 2075, 2500, "John Smith", "Matched (Stage A)"],
        ["15-Sep-2024", "Hotel Booking - Dubai Marina", "", "Hotel Booking", "Atlantis Hotel", "SUP-HTL-0002", 1500, 1800, "Jane Doe", ""],
      ]
      : [
        ["01-Aug-2024", "Office phone bill", "EXP-0001", "Telephone/Mobile", "Etisalat", "SUP-TEL-0001", 55, "Recoverable (assumed)", "bank_transfer"],
        ["15-Aug-2024", "Staff salary August", "", "Salary Azmat", "", "", 3500, "", "bank_transfer"],
        ["20-Aug-2024", "Office rent August", "", "Office Rent", "Landlord LLC", "", 8000, "Non-Recoverable", "bank_transfer"],
      ];

  const data = [headers, ...sampleRows];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 4, 16) }));
  XLSX.utils.book_append_sheet(wb, ws, type === "sales" ? "Sales Template" : "Expenses Template");
  return wb;
}

// ─── Component ──────────────────────────────────────────────────────────────

interface BulkImportModalProps {
  open: boolean;
  onClose: () => void;
  defaultTab?: ImportType;
  onImportComplete?: () => void;
}

export default function BulkImportModal({
  open,
  onClose,
  defaultTab = "sales",
  onImportComplete,
}: BulkImportModalProps) {
  const { user } = useAuthStore();
  const { activeBranchId } = useBranchStore();
  const { data: branches = [], isLoading: isBranchesLoading } = useBranches();
  const userRole = user?.role?.toLowerCase();
  const isAdmin = userRole === "admin" || userRole === "owner";

  const [activeTab, setActiveTab] = useState<ImportType>(defaultTab);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [headerMapping, setHeaderMapping] = useState<Record<string, number>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResultData | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Selected branch state for administrator / branch scoping
  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => {
    if (activeBranchId && activeBranchId !== "all") return activeBranchId;
    if (user?.branchId) return user.branchId;
    return "";
  });

  // Whenever modal opens or sidebar active branch changes, synchronize the selection
  useEffect(() => {
    if (!open) return;

    if (activeBranchId && activeBranchId !== "all") {
      setSelectedBranchId(activeBranchId);
    } else if (user?.branchId && !isAdmin) {
      setSelectedBranchId(user.branchId);
    } else if (branches.length > 0) {
      setSelectedBranchId((prev) => {
        if (prev && branches.some((b) => b.id === prev)) return prev;
        return branches[0]?.id || "";
      });
    }
  }, [open, activeBranchId, branches, isAdmin, user?.branchId]);

  const reset = useCallback(() => {
    setParsedData(null);
    setHeaderMapping({});
    setResult(null);
    setImporting(false);
  }, []);

  const handleClose = useCallback(() => {
    if (result) {
      onImportComplete?.();
    }
    reset();
    onClose();
  }, [reset, onClose, result, onImportComplete]);

  const handleTabChange = useCallback(
    (tab: string) => {
      setActiveTab(tab as ImportType);
      reset();
    },
    [reset]
  );

  // ─── File Parsing ─────────────────────────────────────────────────────────

  const parseFile = useCallback(
    (file: File) => {
      reset();
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          // Pass cellDates: true to parse Excel date serials as JS Dates
          const workbook = XLSX.read(data, { type: "array", cellDates: true });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: false });

          if (jsonData.length < 2) {
            return;
          }

          const headers = (jsonData[0] as string[]).map((h) => String(h || "").trim());
          const rows: Record<string, string | number>[] = [];

          const columns = activeTab === "sales" ? SALES_COLUMNS : EXPENSE_COLUMNS;
          const mapping = matchHeaders(headers, columns);
          setHeaderMapping(mapping);

          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i] as any[];
            if (!row || row.length === 0) continue;
            // Skip empty rows
            const hasData = row.some((cell: any) => cell !== null && cell !== undefined && cell !== "");
            if (!hasData) continue;

            const mapped: Record<string, string | number> = {};
            for (const col of columns) {
              const idx = mapping[col.key];
              if (idx !== undefined && idx < row.length) {
                let val = row[idx];
                if (val instanceof Date) {
                  // Ensure local timezone doesn't shift the parsed date
                  const d = new Date(val.getTime() - val.getTimezoneOffset() * 60000);
                  // Format as YYYY-MM-DD
                  val = d.toISOString().split("T")[0];
                }
                mapped[col.key] = val ?? "";
              }
            }
            rows.push(mapped);
          }

          setParsedData({ headers, rows, fileName: file.name });
        } catch {
          // Parse error
        }
      };
      reader.readAsArrayBuffer(file);
    },
    [activeTab, reset]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) parseFile(file);
    },
    [parseFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) parseFile(file);
      // Reset input so the same file can be re-selected
      e.target.value = "";
    },
    [parseFile]
  );

  // ─── Download Template ────────────────────────────────────────────────────

  const downloadTemplate = useCallback(() => {
    const wb = generateSampleWorkbook(activeTab);
    XLSX.writeFile(wb, `${activeTab}_import_template.xlsx`);
  }, [activeTab]);

  // ─── Execute Import ───────────────────────────────────────────────────────

  const executeImport = useCallback(async () => {
    if (!parsedData || parsedData.rows.length === 0) return;

    const targetBranchId =
      selectedBranchId ||
      (activeBranchId && activeBranchId !== "all" ? activeBranchId : branches[0]?.id);

    if (!targetBranchId) {
      setResult({
        success: false,
        totalRows: parsedData.rows.length,
        importedRows: 0,
        failedRows: parsedData.rows.length,
        errors: [{ row: 0, message: "Please select a target branch before importing." }],
        createdRefs: [],
      });
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      const response =
        activeTab === "sales"
          ? await ApiClient.importSales(parsedData.rows, targetBranchId)
          : await ApiClient.importExpenses(parsedData.rows, targetBranchId);

      setResult(response.data);
    } catch (err: any) {
      setResult({
        success: false,
        totalRows: parsedData.rows.length,
        importedRows: 0,
        failedRows: parsedData.rows.length,
        errors: [{ row: 0, message: err?.message || "Import failed" }],
        createdRefs: [],
      });
    } finally {
      setImporting(false);
    }
  }, [parsedData, activeTab, selectedBranchId, activeBranchId, branches]);

  // ─── Validation ───────────────────────────────────────────────────────────

  const columns = activeTab === "sales" ? SALES_COLUMNS : EXPENSE_COLUMNS;
  const requiredColumns = columns.filter((c) => c.required);
  const missingRequired = requiredColumns.filter((c) => headerMapping[c.key] === undefined);
  const targetBranchResolved =
    selectedBranchId ||
    (activeBranchId && activeBranchId !== "all" ? activeBranchId : branches[0]?.id);
  const isValid =
    parsedData &&
    parsedData.rows.length > 0 &&
    missingRequired.length === 0 &&
    Boolean(targetBranchResolved);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-tf-accent" />
            Bulk Data Import
          </DialogTitle>
          <DialogDescription>
            Upload your CSV or Excel file to import historical data with full accounting traceability.
          </DialogDescription>
        </DialogHeader>

        {/* Branch Selection Bar */}
        <div className="flex flex-col sm:items-center justify-between gap-3 p-3 bg-tf-surface-2/60 border border-tf-border rounded-lg">
          <div className="flex items-center gap-2.5">
            <Building2 className="h-4 w-4 text-tf-accent shrink-0" />
            <div>
              <Label className="text-xs font-semibold text-tf-text-primary">
                Target Branch
              </Label>
              <p className="text-[11px] text-tf-text-muted">
                {isAdmin
                  ? activeBranchId !== "all"
                    ? "Pre-selected from your active sidebar branch filter"
                    : "Select which branch this uploaded data belongs to"
                  : "Data will be imported into your assigned branch"}
              </p>
            </div>
          </div>
          {isAdmin ? (
            <div className="flex items-center gap-2">
              <Select
                value={selectedBranchId}
                onValueChange={(val) => setSelectedBranchId(val)}
                disabled={importing}
              >
                <SelectTrigger className="w-full sm:w-[240px] h-9 text-xs">
                  <SelectValue
                    placeholder={
                      isBranchesLoading ? "Loading branches..." : "Select branch"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id} className="text-xs">
                      <div className="flex items-center justify-between w-full gap-2">
                        <span className="font-medium">{b.name}</span>
                        {b.city && (
                          <span className="text-[10px] text-muted-foreground">
                            ({b.city})
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <Badge variant="outline" className="text-xs px-2.5 py-1">
              {branches.find((b) => b.id === selectedBranchId)?.name ||
                user?.branchId ||
                "Assigned Branch"}
            </Badge>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 min-h-0 flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sales">Sales / Income</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="flex-1 min-h-0 flex flex-col gap-4 mt-4">
            {/* Result summary */}
            {result && (
              <Alert variant={result.success ? "default" : "destructive"}>
                {result.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>
                  {result.success ? "Import Complete!" : "Import Completed with Errors"}
                </AlertTitle>
                <AlertDescription>
                  <p>
                    {result.importedRows} of {result.totalRows} rows imported successfully into{" "}
                    <span className="font-semibold text-tf-text-primary">
                      {branches.find((b) => b.id === selectedBranchId)?.name || "target branch"}
                    </span>.
                    {result.failedRows > 0 && ` ${result.failedRows} rows failed.`}
                  </p>
                  {result.errors.length > 0 && (
                    <ul className="mt-2 text-xs space-y-1 max-h-24 overflow-auto">
                      {result.errors.slice(0, 10).map((err, i) => (
                        <li key={i} className="text-destructive">
                          Row {err.row}: {err.message}
                        </li>
                      ))}
                      {result.errors.length > 10 && (
                        <li className="text-muted-foreground">
                          ...and {result.errors.length - 10} more errors
                        </li>
                      )}
                    </ul>
                  )}
                  {result.createdRefs.length > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Created references: {result.createdRefs.slice(0, 5).join(", ")}
                      {result.createdRefs.length > 5 && ` ...+${result.createdRefs.length - 5} more`}
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* File upload zone */}
            {!parsedData && !result && (
              <div className="space-y-3">
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${dragOver
                    ? "border-tf-accent bg-tf-accent/5"
                    : "border-tf-border hover:border-tf-accent/50"
                    }`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                >
                  <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    Drag & drop your Excel or CSV file here
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supported: .xlsx, .csv
                  </p>
                  <label className="mt-4 inline-block">
                    <Button variant="outline" size="sm" asChild>
                      <span>Browse Files</span>
                    </Button>
                    <input
                      type="file"
                      accept=".xlsx,.csv,.xls"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Need the right format? Download our sample template.
                  </p>
                  <Button variant="ghost" size="sm" onClick={downloadTemplate}>
                    <Download className="h-4 w-4 mr-1" />
                    Sample Template
                  </Button>
                </div>
              </div>
            )}

            {/* Preview table */}
            {parsedData && !result && (
              <div className="flex-1 min-h-0 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-tf-accent" />
                    <span className="text-sm font-medium">{parsedData.fileName}</span>
                    <Badge variant="secondary">{parsedData.rows.length} rows</Badge>
                  </div>
                  <Button variant="ghost" size="sm" onClick={reset}>
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                </div>

                {/* Header matching status */}
                <div className="flex flex-wrap gap-1.5">
                  {columns.map((col) => (
                    <Badge
                      key={col.key}
                      variant={
                        headerMapping[col.key] !== undefined
                          ? "default"
                          : col.required
                            ? "destructive"
                            : "secondary"
                      }
                      className="text-xs"
                    >
                      {col.label}
                      {headerMapping[col.key] !== undefined ? " ✓" : col.required ? " ✗" : " ?"}
                    </Badge>
                  ))}
                </div>

                {missingRequired.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Missing Required Columns</AlertTitle>
                    <AlertDescription>
                      Cannot import: {missingRequired.map((c) => c.label).join(", ")} not found in
                      your file headers.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Preview first 10 rows */}
                <div className="flex-1 overflow-auto border rounded-lg min-h-[200px]">
                  <Table className="w-max min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        {columns
                          .filter((c) => headerMapping[c.key] !== undefined)
                          .map((col) => (
                            <TableHead key={col.key} className="text-xs whitespace-nowrap">
                              {col.label}
                            </TableHead>
                          ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.rows.slice(0, 10).map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                          {columns
                            .filter((c) => headerMapping[c.key] !== undefined)
                            .map((col) => (
                              <TableCell key={col.key} className="text-xs max-w-[160px] truncate">
                                {String(row[col.key] ?? "")}
                              </TableCell>
                            ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {parsedData.rows.length > 10 && (
                    <p className="text-xs text-center text-muted-foreground py-2">
                      Showing 10 of {parsedData.rows.length} rows
                    </p>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={importing}>
            {result ? "Close" : "Cancel"}
          </Button>
          {parsedData && !result && (
            <Button onClick={executeImport} disabled={!isValid || importing}>
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing into {branches.find((b) => b.id === selectedBranchId)?.name || "Branch"}...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import {parsedData.rows.length} Rows
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
