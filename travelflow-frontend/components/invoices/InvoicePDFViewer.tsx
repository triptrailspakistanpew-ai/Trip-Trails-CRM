"use client";

import { Document, Page, Text, View, StyleSheet, Image, PDFViewer } from "@react-pdf/renderer";
import { useEffect, useState } from "react";
import { useBranchStore } from "@/store/branch.store";

const THEME_COLOR = "#1a1b36";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    position: "relative",
  },
  content: {
    paddingTop: 150,
    paddingBottom: 100,
    paddingHorizontal: 40,
    flex: 1,
  },
  background: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: -1,
  },

  // Header / Invoice Number
  invoiceNumberLabel: {
    fontSize: 9,
    fontStyle: "italic",
    color: "#666",
    marginBottom: 4,
  },
  invoiceNumberBox: {
    backgroundColor: THEME_COLOR,
    paddingVertical: 4,
    paddingHorizontal: 12,
    width: 140,
    marginBottom: 30,
  },
  invoiceNumberText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
    textAlign: "center",
  },

  // 2-Column Grid for Details
  detailsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  detailsCol: {
    width: "48%",
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: THEME_COLOR,
    textTransform: "uppercase",
    fontStyle: "italic",
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 5,
  },
  detailLabel: {
    fontSize: 9,
    color: "#666",
  },
  detailValue: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#333",
    textAlign: "right",
    flex: 1,
    paddingLeft: 10,
  },

  // Services Table
  table: {
    width: "100%",
    marginTop: 10,
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: THEME_COLOR,
    paddingVertical: 7,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  tableColHeaderLeft: {
    fontSize: 7.5,
    fontWeight: "bold",
    color: "#fff",
    textTransform: "uppercase",
    flex: 2.2,
    letterSpacing: 0.5,
  },
  tableColHeaderCenter: {
    fontSize: 7.5,
    fontWeight: "bold",
    color: "#fff",
    textTransform: "uppercase",
    width: 30,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  tableColHeaderPrice: {
    fontSize: 7.5,
    fontWeight: "bold",
    color: "#fff",
    textTransform: "uppercase",
    width: 60,
    textAlign: "right",
    paddingRight: 6,
    letterSpacing: 0.5,
  },
  tableColHeaderTax: {
    fontSize: 7.5,
    fontWeight: "bold",
    color: "#fff",
    textTransform: "uppercase",
    width: 48,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  tableColHeaderVat: {
    fontSize: 7.5,
    fontWeight: "bold",
    color: "#fff",
    textTransform: "uppercase",
    width: 50,
    textAlign: "right",
    paddingRight: 4,
    letterSpacing: 0.5,
  },
  tableColHeaderTotal: {
    fontSize: 7.5,
    fontWeight: "bold",
    color: "#fff",
    textTransform: "uppercase",
    width: 60,
    textAlign: "right",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  tableCellLeft: {
    fontSize: 8,
    color: "#333",
    fontWeight: "bold",
    flex: 2.2,
  },
  tableCellSubtext: {
    fontSize: 7,
    color: "#777",
    marginTop: 2,
  },
  tableCellCenter: {
    fontSize: 8,
    color: "#333",
    width: 30,
    textAlign: "center",
  },
  tableCellPrice: {
    fontSize: 8,
    color: "#333",
    width: 60,
    textAlign: "right",
    paddingRight: 6,
  },
  tableCellTax: {
    fontSize: 8,
    color: "#444",
    width: 48,
    textAlign: "center",
  },
  tableCellVat: {
    fontSize: 8,
    color: "#333",
    width: 50,
    textAlign: "right",
    paddingRight: 4,
  },
  tableCellTotal: {
    fontSize: 8,
    color: "#333",
    width: 60,
    textAlign: "right",
    fontWeight: "bold",
  },

  // Totals Section
  totalsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  termsSection: {
    width: "55%",
  },
  termsTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  termsText: {
    fontSize: 8,
    color: "#666",
    lineHeight: 1.4,
    marginBottom: 10,
  },
  summarySection: {
    width: "40%",
    alignItems: "flex-end",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 10,
    fontStyle: "italic",
    color: "#666",
  },
  summaryValue: {
    fontSize: 10,
    fontWeight: "bold",
  },

  // Big Total Box
  totalBoxContainer: {
    backgroundColor: THEME_COLOR,
    width: "100%",
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  totalBoxAmount: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 4,
  },
  totalBoxLabel: {
    color: "#fff",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
  },

  // Bottom Signature & Manager Info
  signatureContainer: {
    marginTop: 40,
    width: 200,
  },
  signatureLine: {
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    marginBottom: 8,
  },
  signatureText: {
    width: "100%",
    textAlign: "center",
    fontSize: 10,
    color: "#333",
  },
  managerInfo: {
    position: "absolute",
    bottom: 28,
    left: 65,
    fontSize: 9,
    color: "white",
  },
});

export default function InvoicePDFViewer({ data }: { data: any }) {
  const [origin, setOrigin] = useState("");
  const activeCurrency = useBranchStore((state) => state.activeCurrency);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  if (!origin) return null;

  const bgUrl = `${origin}/assets/invoice/triptrails-letter-head.png`;
  const isUae = data?.currency === "AED" || activeCurrency === "AED";
  const uaeLogoUrl = `${origin}/assets/TTP-UAE-Logo.png`;

  const Doc = () => (
    <Document title={`Tax-Invoice-${data.invoiceRef}`}>
      <Page size="A4" style={styles.page}>
        <Image src={bgUrl} style={styles.background} fixed />

        {/* UAE Logo Header overlay when in UAE branch / AED */}
        {isUae && (
          <View
            style={{
              position: "absolute",
              top: 15,
              left: "50%",
              marginLeft: -80,
              width: 160,
              height: 90,
              backgroundColor: "#ffffff",
              alignItems: "center",
              justifyContent: "center",
            }}
            fixed
          >
            <Image
              src={uaeLogoUrl}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </View>
        )}

        <View style={styles.content}>
          {/* Invoice Number */}
          <View>
            <Text style={styles.invoiceNumberLabel}>TAX INVOICE NUMBER:</Text>
            <View style={styles.invoiceNumberBox}>
              <Text style={styles.invoiceNumberText}>{data.invoiceRef || "N/A"}</Text>
            </View>
          </View>

          {/* Details Grid */}
          <View style={styles.detailsContainer}>
            {/* Left: Bill To Details */}
            <View style={styles.detailsCol}>
              <Text style={styles.sectionTitle}>Bill To</Text>
              {(data.customer?.name || data.customer?.firstName) ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Client Name:</Text>
                  <Text style={styles.detailValue}>
                    {data.customer?.name || `${data.customer?.firstName || ""} ${data.customer?.lastName || ""}`.trim()}
                  </Text>
                </View>
              ) : null}

              {data.customer?.companyName ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Company:</Text>
                  <Text style={styles.detailValue}>{data.customer?.companyName}</Text>
                </View>
              ) : null}

              {(data.customer?.taxNumber || data.customer?.taxId) ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>TRN / Tax No:</Text>
                  <Text style={styles.detailValue}>{data.customer?.taxNumber || data.customer?.taxId}</Text>
                </View>
              ) : null}

              {data.customer?.phone ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phone:</Text>
                  <Text style={styles.detailValue}>{data.customer?.phone}</Text>
                </View>
              ) : null}

              {data.customer?.email ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Email:</Text>
                  <Text style={styles.detailValue}>{data.customer?.email}</Text>
                </View>
              ) : null}

              {data.customer?.address ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Address:</Text>
                  <Text style={styles.detailValue}>{data.customer?.address}</Text>
                </View>
              ) : null}
            </View>

            {/* Right: Invoice Info */}
            <View style={styles.detailsCol}>
              <Text style={styles.sectionTitle}>Tax Invoice Details</Text>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date:</Text>
                <Text style={styles.detailValue}>
                  {new Date(data.createdAt).toLocaleDateString()}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Due Date:</Text>
                <Text style={styles.detailValue}>
                  {new Date(data.dueDate).toLocaleDateString()}
                </Text>
              </View>



              {data.booking?.bookingRef ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Booking Ref:</Text>
                  <Text style={styles.detailValue}>
                    {data.booking?.bookingRef}
                  </Text>
                </View>
              ) : null}

              {data.booking?.pnr ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>PNR:</Text>
                  <Text style={styles.detailValue}>
                    {data.booking?.pnr}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Services Table */}
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableColHeaderLeft}>Description & Details</Text>
              <Text style={styles.tableColHeaderCenter}>Qty</Text>
              <Text style={styles.tableColHeaderPrice}>Net Price</Text>
              <Text style={styles.tableColHeaderTax}>VAT Rate</Text>
              <Text style={styles.tableColHeaderVat}>VAT</Text>
              <Text style={styles.tableColHeaderTotal}>Total</Text>
            </View>

            {(data.items || []).map((item: any, idx: number) => {
              const vatLabel =
                item.vatCategory === "STANDARD"
                  ? `${item.vatRate || 5}%`
                  : item.vatCategory === "ZERO_RATED"
                  ? "0%"
                  : item.vatCategory === "EXEMPT"
                  ? "Exempt"
                  : "Out of Scope";

              // Filter out hotelName if already present in description
              const showHotel = item.hotelName && !item.description?.toLowerCase().includes(item.hotelName.toLowerCase());
              const subDetails = [
                item.pnr ? `PNR: ${item.pnr}` : null,
                item.ticketNumber ? `Tkt: ${item.ticketNumber}` : null,
                item.route ? `Route: ${item.route}` : null,
                showHotel ? `Hotel: ${item.hotelName}` : null,
              ].filter(Boolean);

              return (
                <View key={idx} style={styles.tableRow}>
                  <View style={{ flex: 2.2, paddingRight: 4, flexDirection: "column" }}>
                    <Text style={styles.tableCellLeft}>
                      {item.description}
                    </Text>
                    {subDetails.length > 0 ? (
                      <Text style={styles.tableCellSubtext}>
                        {subDetails.join(" | ")}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.tableCellCenter}>
                    {item.quantity}
                  </Text>
                  <Text style={styles.tableCellPrice}>
                    {(item.netAmount || item.amount)?.toLocaleString()}
                  </Text>
                  <Text style={styles.tableCellTax}>
                    {vatLabel}
                  </Text>
                  <Text style={styles.tableCellVat}>
                    {(item.vatAmount || 0)?.toLocaleString()}
                  </Text>
                  <Text style={styles.tableCellTotal}>
                    {(item.totalAmount || item.amount)?.toLocaleString()}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Totals & Notes Section */}
          <View style={styles.totalsContainer}>
            {/* Notes & VAT Breakdown (Left) */}
            <View style={styles.termsSection}>
              {/* Statutory VAT Breakdown (Clean & Only Shown when Relevant) */}
              {data.vatBreakdown && (data.vatBreakdown.standardRated?.base > 0 || data.vatBreakdown.zeroRated?.base > 0 || data.vatBreakdown.exempt?.base > 0) && (
                <View style={{ marginBottom: 12, padding: 8, backgroundColor: "#fafafb", borderWidth: 1, borderColor: "#e2e2ea", borderRadius: 3 }}>
                  <Text style={{ fontSize: 7.5, fontWeight: "bold", color: THEME_COLOR, marginBottom: 3, letterSpacing: 0.5 }}>
                    VAT CATEGORY BREAKDOWN
                  </Text>
                  {data.vatBreakdown.standardRated?.base > 0 && (
                    <Text style={{ fontSize: 7, color: "#444", marginBottom: 1.5 }}>
                      • Standard (5%): Base {data.currency || "PKR"} {data.vatBreakdown.standardRated.base.toLocaleString()} | Tax {data.currency || "PKR"} {(data.vatBreakdown.standardRated.vat || 0).toLocaleString()}
                    </Text>
                  )}
                  {data.vatBreakdown.zeroRated?.base > 0 && (
                    <Text style={{ fontSize: 7, color: "#444", marginBottom: 1.5 }}>
                      • Zero-Rated (0% Int. Travel): Base {data.currency || "PKR"} {data.vatBreakdown.zeroRated.base.toLocaleString()} | Tax 0.00
                    </Text>
                  )}
                  {data.vatBreakdown.exempt?.base > 0 && (
                    <Text style={{ fontSize: 7, color: "#444", marginBottom: 1.5 }}>
                      • Exempt Supplies: Base {data.currency || "PKR"} {data.vatBreakdown.exempt.base.toLocaleString()} | Tax 0.00
                    </Text>
                  )}
                  {data.vatBreakdown.outOfScope?.base > 0 && (
                    <Text style={{ fontSize: 7, color: "#444", marginBottom: 1.5 }}>
                      • Out of Scope Disbursements: Base {data.currency || "PKR"} {data.vatBreakdown.outOfScope.base.toLocaleString()} | Tax 0.00
                    </Text>
                  )}
                </View>
              )}

              {data.notes && (
                <View>
                  <Text style={styles.termsTitle}>Notes</Text>
                  <Text style={styles.termsText}>{data.notes}</Text>
                </View>
              )}

              {/* Signature Block */}
              <View style={styles.signatureContainer}>
                <View style={styles.signatureLine} />
                <Text style={styles.signatureText}>Authorized Signature</Text>
              </View>
            </View>

            {/* Summary & Big Total (Right) */}
            <View style={styles.summarySection}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal :</Text>
                <Text style={styles.summaryValue}>
                  {data.currency || "PKR"} {data.subtotal?.toLocaleString()}
                </Text>
              </View>

              {data.discount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Discount :</Text>
                  <Text style={styles.summaryValue}>
                    -{data.currency || "PKR"} {data.discount?.toLocaleString()}
                  </Text>
                </View>
              )}

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Output Tax :</Text>
                <Text style={styles.summaryValue}>
                  {data.currency || "PKR"} {data.tax?.toLocaleString()}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Invoice Amount :</Text>
                <Text style={styles.summaryValue}>
                  {data.currency || "PKR"} {data.total?.toLocaleString()}
                </Text>
              </View>

              {(data.booking?.amountReceived || 0) > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Amount Paid :</Text>
                  <Text style={styles.summaryValue}>
                    {data.currency || "PKR"} {data.booking.amountReceived.toLocaleString()}
                  </Text>
                </View>
              )}

              <View style={styles.totalBoxContainer}>
                <Text style={styles.totalBoxAmount}>
                  {data.currency || "PKR"} {data.booking?.balance !== undefined ? data.booking.balance.toLocaleString() : data.total?.toLocaleString()}
                </Text>
                <Text style={styles.totalBoxLabel}>BALANCE DUE</Text>
              </View>
            </View>
          </View>

          {/* Background overlay manager info (specific to letterhead) */}
          {data.managerContact && (
            <View style={styles.managerInfo} fixed>
              <Text style={{ marginBottom: 10 }}>
                {data.managerContact.phone || "N/A"}
              </Text>
              <Text style={{ marginTop: 5 }}>
                {data.managerContact.email || "N/A"}
              </Text>
            </View>
          )}
        </View>
      </Page>
    </Document>
  );

  return (
    <PDFViewer style={{ width: "100%", height: "100vh", border: "none" }}>
      <Doc />
    </PDFViewer>
  );
}
