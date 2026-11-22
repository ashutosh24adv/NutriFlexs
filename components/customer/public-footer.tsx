import React from "react";
import Link from "next/link";
import { NutriFlexsLogo } from "@/components/ui/logo";

export function PublicFooter() {
  return (
    <footer className="bg-nutri-charcoal text-white pt-12 pb-8 border-t border-nutri-border">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row items-start justify-between gap-8 border-b border-white/10 pb-8">
          <div className="max-w-sm space-y-3">
            <NutriFlexsLogo size="md" showTagline={true} className="text-white [&_span]:text-white" />
            <p className="text-xs text-nutri-secondary leading-relaxed">
              One unified nutrition platform for ordering clean, gym-adjacent high-protein meals and tracking every calorie with an intelligent food diary.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-xs">
            <div>
              <h4 className="font-bold font-heading text-white mb-3 uppercase tracking-wider">Product &amp; Story</h4>
              <ul className="space-y-2 text-nutri-secondary">
                <li><Link href="/menu" className="hover:text-white transition-colors">Order Food</Link></li>
                <li><Link href="/nutrition" className="hover:text-white transition-colors">Track Nutrition</Link></li>
                <li><Link href="/pass" className="hover:text-white transition-colors">NutriFlexs Pass</Link></li>
                <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/faq" className="hover:text-white transition-colors">FAQs</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog / Journal</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold font-heading text-white mb-3 uppercase tracking-wider">Express Kiosks</h4>
              <ul className="space-y-2 text-nutri-secondary">
                <li>Cult.fit Indiranagar</li>
                <li>Gold&apos;s Gym Koramangala</li>
                <li>Nitrro Wellness Bandra</li>
                <li><Link href="/gyms" className="hover:text-white transition-colors font-semibold text-nutri-green-light">View All Partner Gyms →</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold font-heading text-white mb-3 uppercase tracking-wider">Portals</h4>
              <ul className="space-y-2 text-nutri-secondary">
                <li><Link href="/home" className="hover:text-white transition-colors">Customer Portal</Link></li>
                <li><Link href="/kitchen" className="hover:text-white transition-colors">Kitchen Display</Link></li>
                <li><Link href="/trainer" className="hover:text-white transition-colors">Trainer Portal</Link></li>
                <li><Link href="/admin" className="hover:text-white transition-colors">Admin Suite</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-nutri-secondary gap-4">
          <p>© 2026 NutriFlexs Inc. All rights reserved. Eat Smart. Track Better.</p>
          <p className="text-[11px]">Located 50–100m from premium gym footfalls.</p>
        </div>
      </div>
    </footer>
  );
}
