import React from "react";
import { PublicHeader } from "@/components/customer/public-header";
import { PublicFooter } from "@/components/customer/public-footer";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#111111]">
      <PublicHeader />

      {/* Main Page Content */}
      <main className="flex-1 bg-nutri-bg">{children}</main>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}
