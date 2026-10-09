import type { Metadata } from "next";
import { IBM_Plex_Sans, Inter, JetBrains_Mono, Roboto } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { SidebarProvider } from "@/providers/SidebarProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { Toaster } from "sonner";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-ibm-plex-sans",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-inter",
});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-roboto",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "TravelFlow - The Operating System for Modern Travel Agencies",
  description: "A complete multi-tenant Travel Agency ERP & CRM platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${ibmPlexSans.variable} ${inter.variable} ${roboto.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-[var(--tf-bg)] text-tf-text-primary antialiased overflow-hidden">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <SidebarProvider>
              <QueryProvider>
                {children}
                <Toaster position="top-right" richColors />
              </QueryProvider>
            </SidebarProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
