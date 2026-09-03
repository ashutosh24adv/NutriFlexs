"use client";

import React, { useState, useEffect } from "react";
import { MapPin, ChevronDown, Check, Zap } from "lucide-react";

interface GymSelectorProps {
  currentOutletName?: string;
  onSelectOutlet?: (outletId: string, outletName: string) => void;
}

export function GymSelector({ currentOutletName, onSelectOutlet }: GymSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<any | null>(null);

  useEffect(() => {
    async function loadGyms() {
      try {
        const res = await fetch("/api/gyms");
        const data = await res.json();
        if (data.success && data.gyms) {
          const allOutlets: any[] = [];
          data.gyms.forEach((gym: any) => {
            if (gym.outlets) {
              gym.outlets.forEach((out: any) => {
                allOutlets.push({
                  id: out.id,
                  name: `${out.name}`,
                  city: gym.city,
                  gymName: gym.name,
                });
              });
            }
          });
          setOutlets(allOutlets);
          if (allOutlets.length > 0) {
            setSelectedOutlet(allOutlets[0]);
            if (onSelectOutlet) {
              onSelectOutlet(allOutlets[0].id, allOutlets[0].name);
            }
          }
        }
      } catch (e) {
        console.error("Failed to load gyms from PostgreSQL", e);
      }
    }
    loadGyms();
  }, []);

  const handleSelect = (outlet: any) => {
    setSelectedOutlet(outlet);
    if (onSelectOutlet) onSelectOutlet(outlet.id, outlet.name);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 bg-nutri-green-light hover:bg-nutri-green-soft px-3 py-1.5 rounded-full border border-nutri-border text-xs text-nutri-green font-bold transition-colors cursor-pointer"
      >
        <Zap className="w-3.5 h-3.5 fill-nutri-green text-nutri-green shrink-0" />
        <span className="truncate max-w-[160px] sm:max-w-[240px]">
          {selectedOutlet ? selectedOutlet.name : currentOutletName || "Select Express Kiosk"}
        </span>
        <ChevronDown className="w-3.5 h-3.5 opacity-70 shrink-0" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl p-3 shadow-float border border-nutri-border z-50 animate-slide-up">
            <div className="text-[11px] font-bold text-nutri-secondary uppercase tracking-wider px-2 py-1 flex items-center gap-1 border-b border-nutri-border-light pb-2 mb-1">
              <MapPin className="w-3.5 h-3.5 text-nutri-green" /> Select Express Kiosk (PostgreSQL)
            </div>
            <div className="space-y-1 mt-1 max-h-60 overflow-y-auto">
              {outlets.map((o) => (
                <button
                  key={o.id}
                  onClick={() => handleSelect(o)}
                  className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    selectedOutlet?.id === o.id
                      ? "bg-nutri-green-light text-nutri-green font-bold"
                      : "hover:bg-nutri-green-soft text-nutri-charcoal"
                  }`}
                >
                  <div>
                    <p className="font-bold">{o.name}</p>
                    <p className="text-[10px] text-nutri-secondary">{o.gymName} · {o.city}</p>
                  </div>
                  {selectedOutlet?.id === o.id && <Check className="w-4 h-4 text-nutri-green shrink-0 stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
