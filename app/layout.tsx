import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = localFont({
  src: [
    {
      path: "../node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/inter/files/inter-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/inter/files/inter-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/inter/files/inter-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-sans",
  display: "swap",
});

const poppins = localFont({
  src: [
    {
      path: "../node_modules/@fontsource/poppins/files/poppins-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/poppins/files/poppins-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/poppins/files/poppins-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/poppins/files/poppins-latin-800-normal.woff2",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-heading",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#2F7D16",
};

export const metadata: Metadata = {
  title: "NutriFlexs | Real Food. Real Fuel.",
  description: "Fresh cold-pressed juices & freshly prepared high-protein meals right outside your gym in 5 minutes.",
  keywords: ["gym food", "protein meals", "cold pressed juice", "post workout meal", "nutriflexs"],
  manifest: "/manifest.json",
  openGraph: {
    title: "NutriFlexs | Real Food. Real Fuel.",
    description: "Fresh cold-pressed juices & freshly prepared high-protein meals right outside your gym.",
    url: "https://nutriflexs.com",
    siteName: "NutriFlexs",
    locale: "en_IN",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body className="bg-nutri-bg text-nutri-charcoal min-h-screen flex flex-col font-sans antialiased selection:bg-nutri-green-light selection:text-nutri-green">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
