import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Fredoka, Nunito, Caveat } from "next/font/google";
import { Toaster } from "sonner";
import { ClientProviders } from "./ClientProviders";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { Analytics } from "@vercel/analytics/next"
import "./globals.css";

const fredoka = Fredoka({ subsets: ["latin"], variable: "--font-syne-loaded", display: "swap" });
const nunito  = Nunito({  subsets: ["latin"], variable: "--font-dm-sans-loaded", display: "swap" });
const caveat  = Caveat({  subsets: ["latin"], variable: "--font-caveat-loaded",  display: "swap" });

export const metadata: Metadata = {
  title: "DrawParty – Multiplayer Drawing Games",
  description: "Multiplayer drawing games for you and your friends",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DrawParty",
    startupImage: "/icons/icon-512x512.png",
  },
  icons: {
    apple: "/icons/icon-180x180.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d0d14",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorBackground: "#161228",
          colorInputBackground: "#0e0b1a",
          colorInputText: "#ffffff",
          colorText: "#ffffff",
          colorTextSecondary: "#7a6f99",
          colorPrimary: "#7B4FBF",
          colorDanger: "#FF6B6B",
          borderRadius: "12px",
          fontFamily: "var(--font-dm-sans)",
        },
      }}
    >
      <html lang="en" className={`${fredoka.variable} ${nunito.variable} ${caveat.variable}`}>
        <body className="bg-[#0d0d14] text-white antialiased">
          <ServiceWorkerRegistrar />
          <ClientProviders>{children}</ClientProviders>
          <PWAInstallPrompt />
          <Analytics />
          <Toaster
            theme="dark"
            position="top-right"
            richColors
            toastOptions={{
              style: {
                background: "#13131e",
                border: "1px solid #1e1e30",
                color: "#ffffff",
              },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
