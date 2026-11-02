"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import LanguageSelector from "./LanguageSelector";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";

export default function PlatformHeader() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);

  // If on public home page, header is not shown (home page has its own minimal layout)
  if (pathname === "/") {
    return null;
  }

  // Define strictly role-isolated navigation items
  const farmerNav = [
    { label: "Overview", href: "/farmer", icon: "🌾" },
    { label: "My Farm", href: "/farm-profile", icon: "🏡" },
    { label: "Sell Produce", href: "/marketplace", icon: "🏪" },
    { label: "My Orders", href: "/farmer/orders", icon: "📦" },
    { label: "Crop Quality", href: "/quality", icon: "📸" },
    { label: "Profit Calc", href: "/profit-calculator", icon: "🧮" },
  ];

  const farmerServices = [
    { label: "Crop Planner", href: "/crop-planner", icon: "🌱", cat: "Planning" },
    { label: "Soil Health", href: "/soil-health", icon: "🧪", cat: "Planning" },
    { label: "Water Planning", href: "/water-planner", icon: "💧", cat: "Planning" },
    { label: "Crop Calendar", href: "/calendar", icon: "📅", cat: "Planning" },
    { label: "Crop Triage", href: "/crop-triage", icon: "🩺", cat: "Planning" },
    { label: "Machinery Rentals", href: "/machinery", icon: "🚜", cat: "Equipment" },
    { label: "Cold/Dry Storage", href: "/storage", icon: "🏬", cat: "Equipment" },
    { label: "Farm Records", href: "/farm-records", icon: "📊", cat: "Equipment" },
    { label: "AgriCycle Waste", href: "/agricycle", icon: "♻️", cat: "Equipment" },
    { label: "KVK Experts", href: "/experts", icon: "🎓", cat: "Advisory" },
    { label: "Govt Schemes", href: "/schemes", icon: "🏛️", cat: "Advisory" },
    { label: "Learning Hub", href: "/learning", icon: "📚", cat: "Advisory" },
    { label: "FPO Selling", href: "/fpo", icon: "👥", cat: "Advisory" },
  ];

  const buyerNav = [
    { label: "Procure Hub", href: "/buyer", icon: "🛒" },
    { label: "Marketplace", href: "/marketplace", icon: "🏪" },
    { label: "My Offers", href: "/buyer?view=offers", icon: "📑" },
    { label: "My Orders", href: "/buyer?view=orders", icon: "📦" },
    { label: "Deliveries", href: "/buyer?view=deliveries", icon: "🚚" },
    { label: "Escrow & Payments", href: "/transaction", icon: "💳" },
    { label: "Storage Facilities", href: "/storage", icon: "🏬" },
  ];

  const transporterNav = [
    { label: "Logistics Hub", href: "/logistics", icon: "🚚" },
    { label: "Available Jobs", href: "/logistics?tab=available", icon: "📋" },
    { label: "Assigned Jobs", href: "/logistics?tab=assigned", icon: "🚛" },
    { label: "Active Deliveries", href: "/logistics?tab=deliveries", icon: "📍" },
    { label: "Earnings & Mileage", href: "/logistics?tab=earnings", icon: "💰" },
  ];

  const adminNav = [
    { label: "Admin Console", href: "/admin", icon: "🛡️" },
    { label: "Verifications", href: "/admin?tab=verifications", icon: "👥" },
    { label: "Discrepancies", href: "/admin?tab=discrepancies", icon: "⚖️" },
    { label: "Audit Logs", href: "/admin?tab=audit", icon: "📜" },
    { label: "Guardrails", href: "/admin?tab=guardrails", icon: "🔒" },
  ];

  // Authoritative role derivation
  const role = user?.role || "GUEST";

  // Select navigation based strictly on authenticated role
  let roleNav: { label: string; href: string; icon: string }[] = [];
  let roleBadgeColor = "bg-stone-100 text-stone-800";
  let roleBadgeText = role;
  let homeHref = "/";

  if (isAuthenticated && user) {
    if (role === "FARMER") {
      roleNav = farmerNav;
      roleBadgeColor = "bg-emerald-100 text-emerald-800 border-emerald-300";
      roleBadgeText = "FARMER / किसान";
      homeHref = "/farmer";
    } else if (role === "BUYER") {
      roleNav = buyerNav;
      roleBadgeColor = "bg-stone-800 text-stone-100 border-stone-700";
      roleBadgeText = "BUYER / खरीदार";
      homeHref = "/buyer";
    } else if (role === "TRANSPORT_PROVIDER") {
      roleNav = transporterNav;
      roleBadgeColor = "bg-amber-100 text-amber-900 border-amber-300";
      roleBadgeText = "TRANSPORTER / वाहक";
      homeHref = "/logistics";
    } else if (role === "ADMIN") {
      roleNav = adminNav;
      roleBadgeColor = "bg-purple-100 text-purple-900 border-purple-300";
      roleBadgeText = "ADMINISTRATOR";
      homeHref = "/admin";
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-[#f7f8f5]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
        
        {/* Brand Logo & Authoritative Role Indicator */}
        <div className="flex items-center gap-3">
          <Link href={homeHref} className="group flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#172019] text-white shadow-md transition-transform duration-200 group-hover:scale-105">
              <span className="text-xl">🌱</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black tracking-tight text-[#172019]">X-MILE</span>
                {isAuthenticated && user && (
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-black border uppercase tracking-wider ${roleBadgeColor}`}>
                    {roleBadgeText}
                  </span>
                )}
                {user?.isVerified && (
                  <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[8px] font-bold text-blue-800">
                    ✓ Verified
                  </span>
                )}
              </div>
              <div className="hidden text-[10px] font-semibold tracking-wider text-[#6a7c70] sm:block">
                Every MILE Matters, Every FARMER Matters.
              </div>
            </div>
          </Link>
        </div>

        {/* Desktop Role-Specific Navigation */}
        {isAuthenticated && user && (
          <nav className="hidden items-center gap-1 md:flex">
            {roleNav.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    isActive
                      ? "bg-emerald-700 text-white shadow-xs"
                      : "text-stone-700 hover:bg-stone-200/60 hover:text-stone-900"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* Farmer Services Dropdown (Farmer only) */}
            {role === "FARMER" && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsServicesOpen(!isServicesOpen)}
                  onBlur={() => setTimeout(() => setIsServicesOpen(false), 200)}
                  className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-200/60"
                >
                  <span>🌾 Services</span>
                  <span className="text-[10px]">▼</span>
                </button>
                {isServicesOpen && (
                  <div className="absolute right-0 top-full mt-1 w-64 rounded-2xl border border-stone-200 bg-white p-2 shadow-2xl z-50 animate-in fade-in duration-100">
                    <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 border-b border-stone-100 pb-1 mb-1">
                      Farmer Tools & Support
                    </div>
                    <div className="max-h-72 overflow-y-auto space-y-0.5">
                      {farmerServices.map((svc) => (
                        <Link
                          key={svc.href}
                          href={svc.href}
                          className="flex items-center justify-between rounded-xl px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-emerald-50 hover:text-emerald-900 transition"
                        >
                          <span className="flex items-center gap-2">
                            <span>{svc.icon}</span>
                            <span>{svc.label}</span>
                          </span>
                          <span className="text-[9px] text-stone-400 font-semibold">{svc.cat}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </nav>
        )}

        {/* Right Controls: User Profile, Language Selector, Auth */}
        <div className="flex items-center gap-2.5">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-block max-w-[120px] truncate text-xs font-bold text-stone-800">
                {user.fullName || user.email}
              </span>
              <button
                type="button"
                onClick={logout}
                title="Sign out"
                className="rounded-xl border border-stone-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-stone-600 hover:bg-stone-50 hover:text-red-600 transition shadow-2xs"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link
                href="/login"
                className="rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-800 transition"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="hidden sm:inline-flex rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-50 transition"
              >
                Sign Up
              </Link>
            </div>
          )}

          {/* Language Selector */}
          <LanguageSelector variant="compact" />

          {/* Mobile Menu Toggle Button */}
          {isAuthenticated && user && (
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-stone-300 bg-white text-stone-700"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? "✕" : "☰"}
            </button>
          )}
        </div>

      </div>

      {/* Mobile Role Navigation Drawer */}
      {isMobileMenuOpen && isAuthenticated && user && (
        <div className="md:hidden border-t border-stone-200 bg-white px-4 py-3 shadow-lg space-y-2 animate-in fade-in duration-150">
          <div className="text-xs font-extrabold uppercase tracking-wider text-stone-500 pb-1 border-b border-stone-100">
            {roleBadgeText} Menu
          </div>
          <div className="grid grid-cols-2 gap-2">
            {roleNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold ${
                  pathname === item.href
                    ? "bg-emerald-700 text-white"
                    : "bg-stone-50 text-stone-800 hover:bg-stone-100"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Farmer Services in Mobile Drawer */}
          {role === "FARMER" && (
            <div className="pt-2 border-t border-stone-100">
              <div className="text-[11px] font-bold text-stone-500 mb-1.5">Farmer Services & Advisory:</div>
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                {farmerServices.map((svc) => (
                  <Link
                    key={svc.href}
                    href={svc.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-1.5 p-2 rounded-lg bg-emerald-50/50 text-[11px] font-semibold text-stone-700 hover:bg-emerald-100"
                  >
                    <span>{svc.icon}</span>
                    <span className="truncate">{svc.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
