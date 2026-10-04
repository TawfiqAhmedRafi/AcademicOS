import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";
import { AuthProvider } from "./components/AuthProvider";
import { ToastProvider } from "./components/ToastProvider";
import PwaRegister from "./components/PwaRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Academic OS",
  description: "Academic Operating System",
  applicationName: "Academic OS",
  icons: {
    icon: "/favicon.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Academic OS",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#002B49",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
        <ThemeProvider>
          <ToastProvider >
          {children}
          </ToastProvider>
        </ThemeProvider>
        </AuthProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
