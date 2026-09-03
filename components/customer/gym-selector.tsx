"use client";

import React, { useState } from "react";
import { MapPin, ChevronDown, Check, Zap } from "lucide-react";

interface GymSelectorProps {
  currentOutletName?: string;
  onSelectOutlet?: (outletId: string, outletName: string) => void;
}

export function GymSelector({ currentOutletName = "Indiranagar Cult Kiosk (50m from Gym)", onSelectOutlet }: GymSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(currentOutletName);

  const outlets = [
    { id: "outlet-1", name: "Indiranagar Cult Kiosk (50m from Cult.fit)", city: "Bengaluru", distance: "50m away" },
    { id: "outlet-2", name: "Koramangala Gold Kiosk (75m from Gold's Gym)", city: "Bengaluru", distance: "75m away" },
    { id: "outlet-3", name: "Bandra Nitrro Kiosk (60m from Nitrro Gym)", city: "Mumbai", distance: "60m away" },
  ];

  const handleSelect = (id: string, name: string) => {
    setSelected(name);
    if (onSelectOutlet) onSelectOutlet(id, name);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 bg-nutri-green-light/80 hover:bg-nutri-green-light px-3 py-1.5 rounded-full border border-nutri-green-soft text-xs text-nutri-green font-medium transition-colors"
      >
        <Zap className="w-3.5 h-3.5 fill-nutri-green text-nutri-green shrink-0" />
        <span className="truncate max-w-[160px] sm:max-w-[240px] font-semibold">{selected}</span>
        <ChevronDown className="w-3.5 h-3.5 opacity-70 shrink-0" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl p-3 shadow-float border border-nutri-border z-50 animate-slide-up">
            <div className="text-[11px] font-bold text-nutri-muted uppercase tracking-wider px-2 py-1 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-nutri-green" /> Select Gym Outlet
            </div>
            <div className="space-y-1 mt-1">
              {outlets.map((o) => (
                <button
                  key={o.id}
                  onClick={() => handleSelect(o.id, o.name)}
                  className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
                    selected === o.name
                      ? "bg-nutri-green-light text-nutri-green font-semibold"
                      : "hover:bg-nutri-bg text-nutri-charcoal"
                  }`}
                >
                  <div>
                    <p className="font-semibold">{o.name}</p>
                    <p className="text-[10px] text-nutri-muted">{o.city} · {o.distance}</p>
                  </div>
                  {selected === o.name && <Check className="w-4 h-4 text-nutri-green shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
