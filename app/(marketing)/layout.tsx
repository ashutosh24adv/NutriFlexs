"use client";

import React from "react";
import Link from "next/link";
import { NutriFlexsLogo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-nutri-bg">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-nutri-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <NutriFlexsLogo size="md" showTagline={true} />

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-nutri-muted">
            <a href="#why" className="hover:text-nutri-green transition-colors">Why NutriFlexs</a>
            <a href="#how" className="hover:text-nutri-green transition-colors">How It Works</a>
            <a href="#menu" className="hover:text-nutri-green transition-colors">Menu</a>
            <a href="#pass" className="hover:text-nutri-green transition-colors">NutriFlexs Pass</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/home">
              <Button size="sm" variant="primary" className="font-bold text-xs">
                OPEN APP →
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-nutri-charcoal text-white pt-12 pb-8 border-t border-nutri-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8 border-b border-white/10 pb-8">
            <div className="max-w-sm space-y-3">
              <NutriFlexsLogo size="md" className="text-white [&_span]:text-white" />
              <p className="text-xs text-nutri-muted leading-relaxed">
                Gym-adjacent fitness nutrition platform delivering cold-pressed organic juices and freshly prepared high-protein meals in 3–5 minutes.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-xs">
              <div>
                <h4 className="font-bold font-heading text-white mb-3 uppercase tracking-wider">Product</h4>
                <ul className="space-y-2 text-nutri-muted">
                  <li><Link href="/menu">Juices & Shakes</Link></li>
                  <li><Link href="/menu">Protein Bowls</Link></li>
                  <li><Link href="/pass">NutriFlexs Pass</Link></li>
                  <li><Link href="/trainer">Trainer Program</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold font-heading text-white mb-3 uppercase tracking-wider">Express Kiosks</h4>
                <ul className="space-y-2 text-nutri-muted">
                  <li>Cult.fit Indiranagar</li>
                  <li>Gold&apos;s Gym Koramangala</li>
                  <li>Nitrro Wellness Bandra</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold font-heading text-white mb-3 uppercase tracking-wider">Portals</h4>
                <ul className="space-y-2 text-nutri-muted">
                  <li><Link href="/home">Customer Order</Link></li>
                  <li><Link href="/kitchen">Kitchen Display</Link></li>
                  <li><Link href="/trainer">Trainer Portal</Link></li>
                  <li><Link href="/admin">Admin Suite</Link></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-nutri-muted gap-4">
            <p>© 2026 NutriFlexs Inc. All rights reserved. REAL FOOD. REAL FUEL.</p>
            <p className="text-[11px]">Located 50–100m from premium gym footfalls.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
