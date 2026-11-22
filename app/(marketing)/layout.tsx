import React from "react";
import { PublicHeader } from "@/components/customer/public-header";
import { PublicFooter } from "@/components/customer/public-footer";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-nutri-bg">
      <PublicHeader />

      {/* Main Page Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}
