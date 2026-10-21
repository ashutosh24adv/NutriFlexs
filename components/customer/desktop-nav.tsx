"use client";

import React from "react";
import { PublicHeader } from "@/components/customer/public-header";

export interface DesktopNavProps {
  cartCount?: number;
  onOpenCart?: () => void;
  userName?: string;
  userRole?: string;
  showStaffPortal?: boolean;
}

/**
 * Legacy DesktopNav wrapper redirecting to the single authoritative PublicHeader component.
 */
export function DesktopNav(_props: DesktopNavProps) {
  return <PublicHeader />;
}
