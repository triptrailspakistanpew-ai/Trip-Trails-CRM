"use client";

import { Document, Page, Text, View, StyleSheet, Image, PDFViewer } from "@react-pdf/renderer";
import { useEffect, useState } from "react";

// TripTrails Theme Color (Dark Blue from letterhead)
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
  
  // Header / Quote Number
  quoteNumberLabel: {
    fontSize: 9,
    fontStyle: "italic",
    color: "#666",
    marginBottom: 4,
  },
  quoteNumberBox: {
    backgroundColor: THEME_COLOR,
    paddingVertical: 4,
    paddingHorizontal: 12,
    width: 140,
    marginBottom: 30,
  },
  quoteNumberText: {
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
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableColHeaderLeft: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#fff",
    textTransform: "uppercase",
    flex: 1,
    letterSpacing: 2,
  },
  tableColHeaderCenter: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#fff",
    textTransform: "uppercase",
    width: 60,
    textAlign: "center",
    letterSpacing: 2,
  },
  tableColHeaderRight: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#fff",
    textTransform: "uppercase",
    width: 100,
    textAlign: "right",
    letterSpacing: 2,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  tableCellLeft: {
    fontSize: 9,
    color: "#333",
    fontWeight: "bold",
    flex: 1,
  },
  tableCellCenter: {
    fontSize: 9,
    color: "#333",
    width: 60,
    textAlign: "center",
  },
  tableCellRight: {
    fontSize: 9,
    color: "#333",
    width: 100,
    textAlign: "right",
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

export default function QuotationPDFViewer({ data }: { data: any }) {
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  if (!origin) return null;

  const bgUrl = `${origin}/assets/invoice/triptrails-letter-head.png`;

  const Doc = () => (
    <Document>
      <Page size="A4" style={styles.page}>
        <Image src={bgUrl} style={styles.background} fixed />
        
        <View style={styles.content}>
          {/* Quote Number */}
          <View>
            <Text style={styles.quoteNumberLabel}>Quote Number:</Text>
            <View style={styles.quoteNumberBox}>
              <Text style={styles.quoteNumberText}>{data.quotationRef || "N/A"}</Text>
            </View>
          </View>

          {/* Details Grid */}
          <View style={styles.detailsContainer}>
            {/* Left: Client Details */}
            <View style={styles.detailsCol}>
              <Text style={styles.sectionTitle}>Client Details</Text>
              {data.customer?.firstName || data.customer?.lastName ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Client Name:</Text>
                  <Text style={styles.detailValue}>
                    {data.customer?.firstName} {data.customer?.lastName}
                  </Text>
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
            </View>

            {/* Right: Trip Details */}
            <View style={styles.detailsCol}>
              <Text style={styles.sectionTitle}>Trip Details</Text>
              {data.destination ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Destination:</Text>
                  <Text style={styles.detailValue}>{data.destination}</Text>
                </View>
              ) : null}
              
              {data.travelType ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Travel Type:</Text>
                  <Text style={[styles.detailValue, { textTransform: "capitalize" }]}>
                    {data.travelType.replace("_", " ")}
                  </Text>
                </View>
              ) : null}
              
              {data.adults || data.children || data.infants ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Pax:</Text>
                  <Text style={styles.detailValue}>
                    {data.adults || 0} Adults, {data.children || 0} Children, {data.infants || 0} Infants
                  </Text>
                </View>
              ) : null}

              {data.validUntil ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Valid Until:</Text>
                  <Text style={styles.detailValue}>
                    {new Date(data.validUntil).toLocaleDateString()}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Services Table */}
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableColHeaderLeft}>Services</Text>
              <Text style={styles.tableColHeaderCenter}>Qty</Text>
              <Text style={styles.tableColHeaderRight}>Cost</Text>
            </View>

            {(data.items || []).map((item: any, idx: number) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={styles.tableCellLeft}>
                  {item.title ? `${item.title}${item.description ? ` - ${item.description}` : ""}` : item.description}
                </Text>
                <Text style={styles.tableCellCenter}>
                  {item.quantity}
                </Text>
                <Text style={styles.tableCellRight}>
                  {(item.lineTotal ?? (item.quantity * (item.sellingPrice || 0)))?.toLocaleString()}
                </Text>
              </View>
            ))}
          </View>

          {/* Totals & Notes Section */}
          <View style={styles.totalsContainer}>
            {/* Terms and Notes (Left) */}
            <View style={styles.termsSection}>
              {(data.terms || data.termsAndConditions) && (
                <View style={{ marginBottom: 15 }}>
                  <Text style={styles.termsTitle}>Terms and Conditions</Text>
                  <Text style={styles.termsText}>{data.terms || data.termsAndConditions}</Text>
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
                  {data.currency || "PKR"} {data.subtotal?.toLocaleString() ?? data.subtotalAmount?.toLocaleString()}
                </Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tax :</Text>
                <Text style={styles.summaryValue}>
                  {data.currency || "PKR"} {data.taxTotal?.toLocaleString() ?? data.taxAmount?.toLocaleString()}
                </Text>
              </View>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Quoted :</Text>
                <Text style={styles.summaryValue}>
                  {data.currency || "PKR"} {data.grandTotal?.toLocaleString()}
                </Text>
              </View>

              <View style={styles.totalBoxContainer}>
                <Text style={styles.totalBoxAmount}>
                  {data.currency || "PKR"} {data.grandTotal?.toLocaleString()}
                </Text>
                <Text style={styles.totalBoxLabel}>TOTAL</Text>
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
