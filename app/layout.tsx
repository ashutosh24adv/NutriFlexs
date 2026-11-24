import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
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
