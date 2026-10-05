import React from "react";
import Link from "next/link";
import { NutriFlexsLogo } from "@/components/ui/logo";
import { PublicHeader } from "@/components/customer/public-header";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-nutri-bg">
      <PublicHeader />

      {/* Main Page Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-nutri-charcoal text-white pt-12 pb-8 border-t border-nutri-border">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8 border-b border-white/10 pb-8">
            <div className="max-w-sm space-y-3">
              <NutriFlexsLogo size="md" className="text-white [&_span]:text-white" />
              <p className="text-xs text-nutri-secondary leading-relaxed">
                Gym-adjacent fitness nutrition platform delivering cold-pressed organic juices and freshly prepared high-protein meals in 5 minutes.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-xs">
              <div>
                <h4 className="font-bold font-heading text-white mb-3 uppercase tracking-wider">Product</h4>
                <ul className="space-y-2 text-nutri-secondary">
                  <li><Link href="/menu" className="hover:text-white transition-colors">Juices & Shakes</Link></li>
                  <li><Link href="/menu" className="hover:text-white transition-colors">Protein Bowls</Link></li>
                  <li><Link href="/pass" className="hover:text-white transition-colors">NutriFlexs Pass</Link></li>
                  <li><Link href="/trainer" className="hover:text-white transition-colors">Trainer Program</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold font-heading text-white mb-3 uppercase tracking-wider">Express Kiosks</h4>
                <ul className="space-y-2 text-nutri-secondary">
                  <li>Cult.fit Indiranagar</li>
                  <li>Gold&apos;s Gym Koramangala</li>
                  <li>Nitrro Wellness Bandra</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold font-heading text-white mb-3 uppercase tracking-wider">Portals</h4>
                <ul className="space-y-2 text-nutri-secondary">
                  <li><Link href="/home" className="hover:text-white transition-colors">Customer Order</Link></li>
                  <li><Link href="/kitchen" className="hover:text-white transition-colors">Kitchen Display</Link></li>
                  <li><Link href="/trainer" className="hover:text-white transition-colors">Trainer Portal</Link></li>
                  <li><Link href="/admin" className="hover:text-white transition-colors">Admin Suite</Link></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-nutri-secondary gap-4">
            <p>© 2026 NutriFlexs Inc. All rights reserved. REAL FOOD. REAL FUEL.</p>
            <p className="text-[11px]">Located 50–100m from premium gym footfalls.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
