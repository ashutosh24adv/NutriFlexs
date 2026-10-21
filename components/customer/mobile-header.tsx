"use client";

import React from "react";
import { PublicHeader } from "@/components/customer/public-header";

export interface MobileHeaderProps {
  cartCount?: number;
  onOpenCart?: () => void;
  showStaffPortal?: boolean;
}

/**
 * Legacy MobileHeader wrapper - PublicHeader now handles both desktop and mobile in one unified component.
 */
export function MobileHeader(_props: MobileHeaderProps) {
  return null;
}
