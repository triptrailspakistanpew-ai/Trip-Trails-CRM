"use client";

import { Document, Page, Text, View, StyleSheet, PDFViewer } from "@react-pdf/renderer";
import { useEffect, useState } from "react";

const THEME_COLOR = "#0f172a"; 

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    padding: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 40,
    borderBottomWidth: 2,
    borderBottomColor: THEME_COLOR,
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: THEME_COLOR,
    textTransform: "uppercase",
  },
  infoText: {
    fontSize: 10,
    color: "#666",
    marginTop: 4,
  },
  detailsContainer: {
    marginBottom: 20,
  },
  section: {
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: THEME_COLOR,
    marginBottom: 5,
  },
  supplierName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  table: {
    width: "100%",
    marginTop: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: THEME_COLOR,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  colDate: { width: "15%" },
  colRef: { width: "15%" },
  colDesc: { flex: 1 },
  colAmount: { width: "15%", textAlign: "right" },
  headerText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#fff",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  cellText: {
    fontSize: 9,
    color: "#333",
  },
  summaryContainer: {
    marginTop: 30,
    alignItems: "flex-end",
  },
  summaryBox: {
    width: 200,
    backgroundColor: "#f8fafc",
    padding: 15,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 10,
    color: "#666",
    fontWeight: "bold",
  },
  summaryValue: {
    fontSize: 12,
    color: THEME_COLOR,
    fontWeight: "bold",
  },
});

export default function SupplierStatementPDFViewer({ data, currency = "PKR" }: { data: any, currency?: string }) {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || !data) return null;

  return (
    <PDFViewer style={{ width: "100%", height: "100vh", border: "none" }}>
      <Document title={`Supplier_${data.supplier.supplierRef}`}>
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Supplier Statement</Text>
              <Text style={styles.infoText}>Ref: {data.supplier.supplierRef}</Text>
              <Text style={styles.infoText}>
                Generated: {new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[styles.title, { fontSize: 16 }]}>Your Agency</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Supplier Information</Text>
            <Text style={styles.infoText}>Name: {data.supplier.name}</Text>
            <Text style={styles.infoText}>Phone: {data.supplier.phone}</Text>
            {data.supplier.email && <Text style={styles.infoText}>Email: {data.supplier.email}</Text>}
          </View>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <View style={styles.colDate}><Text style={styles.headerText}>Date</Text></View>
              <View style={styles.colDesc}><Text style={styles.headerText}>Description</Text></View>
              <View style={styles.colAmount}><Text style={[styles.headerText, { textAlign: "right" }]}>Debit ({currency})</Text></View>
              <View style={styles.colAmount}><Text style={[styles.headerText, { textAlign: "right" }]}>Credit ({currency})</Text></View>
              <View style={styles.colAmount}><Text style={[styles.headerText, { textAlign: "right" }]}>Balance ({currency})</Text></View>
            </View>

            {data.entries?.map((entry: any, i: number) => (
              <View key={i} style={styles.tableRow}>
                <View style={styles.colDate}>
                  <Text style={styles.cellText}>{new Intl.DateTimeFormat('en-GB', { dateStyle: 'short' }).format(new Date(entry.date))}</Text>
                </View>
                <View style={styles.colDesc}>
                  <Text style={styles.cellText}>{entry.description}</Text>
                </View>
                <View style={styles.colAmount}>
                  <Text style={[styles.cellText, { textAlign: "right" }]}>
                    {entry.debit > 0 ? entry.debit.toLocaleString() : "-"}
                  </Text>
                </View>
                <View style={styles.colAmount}>
                  <Text style={[styles.cellText, { textAlign: "right" }]}>
                    {entry.credit > 0 ? entry.credit.toLocaleString() : "-"}
                  </Text>
                </View>
                <View style={styles.colAmount}>
                  <Text style={[styles.cellText, { textAlign: "right", fontWeight: "bold" }]}>
                    {entry.balance.toLocaleString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.summaryContainer}>
            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Outstanding Payable:</Text>
                <Text style={styles.summaryValue}>{data.finalBalance.toLocaleString()} {currency}</Text>
              </View>
            </View>
          </View>
        </Page>
      </Document>
    </PDFViewer>
  );
}
