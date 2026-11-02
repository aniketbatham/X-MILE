"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import LanguageSelector from "./LanguageSelector";
import { PlatformDb, PlatformNotification, UserRole } from "@/lib/platform-db";
import { useAuth } from "@/context/AuthContext";

export default function PlatformHeader() {
  const pathname = usePathname();
  const { user: authUser, isAuthenticated, logout } = useAuth();
  const [localRole, setLocalRole] = useState<UserRole>("FARMER");
  const [notifications, setNotifications] = useState<PlatformNotification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Active role: strictly authoritative server-side role if authenticated, else local mock role
  const activeRole: UserRole = authUser ? authUser.role : localRole;

  useEffect(() => {
    // Asynchronous notification load to avoid synchronous setState inside render effect
    const timer = setTimeout(() => {
      setNotifications(PlatformDb.getNotifications());
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleRoleChange = (role: UserRole) => {
    // Only non-admin public roles can be previewed locally
    if (role === "ADMIN") return;
    setLocalRole(role);
    PlatformDb.updateUser({ role });
    setIsRoleMenuOpen(false);
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllRead = () => {
    notifications.forEach((n) => PlatformDb.markNotificationRead(n.id));
    setNotifications(PlatformDb.getNotifications());
  };

  // Farmer Navigation
  const farmerNav = [
    { label: "Overview", href: "/farmer", icon: "🌾" },
    { label: "My Farm", href: "/farm-profile", icon: "🏡" },
    { label: "Crop Planner", href: "/crop-planner", icon: "🌱" },
    { label: "Profit Calc", href: "/profit-calculator", icon: "🧮" },
    { label: "Marketplace", href: "/marketplace", icon: "🏪" },
    { label: "FPO Selling", href: "/fpo", icon: "👥" },
    { label: "AgriCycle", href: "/agricycle", icon: "♻️" },
    { label: "Machinery", href: "/machinery", icon: "🚜" },
    { label: "Soil Health", href: "/soil-health", icon: "🧪" },
    { label: "Calendar", href: "/calendar", icon: "📅" },
    { label: "KVK Experts", href: "/experts", icon: "🎓" },
    { label: "Farm Records", href: "/farm-records", icon: "📊" },
    { label: "Water Plan", href: "/water-planner", icon: "💧" },
    { label: "Learning Hub", href: "/learning", icon: "📚" },
    { label: "Schemes", href: "/schemes", icon: "🏛️" },
  ];

  // Buyer Navigation
  const buyerNav = [
    { label: "Procure Hub", href: "/buyer", icon: "🛒" },
    { label: "Produce Market", href: "/marketplace", icon: "🌾" },
    { label: "Transport", href: "/logistics", icon: "🚚" },
    { label: "Storage", href: "/storage", icon: "🏬" },
    { label: "FPO Supply", href: "/fpo", icon: "🤝" },
    { label: "Escrow Status", href: "/transaction", icon: "💳" },
  ];

  const currentNav = activeRole === "BUYER" ? buyerNav : farmerNav;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-black/5 bg-[#f7f8f5]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Logo & Platform Tagline */}
          <div className="flex items-center gap-3">
            <Link href="/" className="group flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#172019] text-white shadow-md transition-transform duration-200 group-hover:scale-105">
                <span className="text-xl">🌱</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-black tracking-tight text-[#172019]">X-MILE</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black text-emerald-800 uppercase tracking-wider">
                    {activeRole}
                  </span>
                  {authUser?.isVerified && (
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

          {/* Desktop Core Navigation Quick Links */}
          <nav className="hidden items-center gap-1 lg:flex">
            {currentNav.slice(0, 6).map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-gray-700 hover:bg-emerald-50 hover:text-emerald-900"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* More Modules Dropdown */}
            <div className="relative group">
              <button
                type="button"
                className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-700 hover:bg-emerald-50"
              >
                <span>More</span>
                <span className="text-[10px]">▼</span>
              </button>
              <div className="absolute right-0 top-full hidden w-56 flex-col rounded-2xl border border-gray-100 bg-white p-2 shadow-xl group-hover:flex animate-in fade-in zoom-in-95 duration-100">
                {currentNav.slice(6).map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-emerald-50 hover:text-emerald-950 transition"
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
                {activeRole === "ADMIN" && (
                  <>
                    <div className="my-1 border-t border-gray-100" />
                    <Link
                      href="/admin"
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-purple-700 hover:bg-purple-50 transition"
                    >
                      <span>🛡️</span>
                      <span>Admin Console</span>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </nav>

          {/* Right Controls: Auth, Notifications, Language */}
          <div className="flex items-center gap-2.5">
            {/* Authenticated user badge or Role preview */}
            {isAuthenticated && authUser ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/farm-profile"
                  className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/80 px-2.5 py-1.5 text-[11px] font-bold text-emerald-900 shadow-2xs hover:bg-emerald-100 transition"
                >
                  <span className="max-w-[100px] truncate">{authUser.fullName}</span>
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  title="Sign out"
                  className="rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-gray-600 hover:bg-gray-50 hover:text-red-600 transition"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                {/* Public Role Preview Dropdown (strictly excludes ADMIN) */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                    className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-2 py-1.5 text-[11px] font-bold text-gray-700 shadow-2xs hover:bg-gray-50 transition"
                  >
                    <span>Role:</span>
                    <span className="font-extrabold">{localRole}</span>
                    <span className="text-[9px]">▼</span>
                  </button>

                  {isRoleMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100 p-1.5">
                      <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Switch Public View
                      </div>
                      {(
                        [
                          { role: "FARMER" as UserRole, label: "Farmer", icon: "🌾" },
                          { role: "BUYER" as UserRole, label: "Bulk Buyer", icon: "🛒" },
                          { role: "FPO_ADMIN" as UserRole, label: "FPO / Group", icon: "👥" },
                          { role: "MACHINERY_PROVIDER" as UserRole, label: "Machinery", icon: "🚜" },
                          { role: "TRANSPORT_PROVIDER" as UserRole, label: "Transporter", icon: "🚚" },
                          { role: "STORAGE_PROVIDER" as UserRole, label: "Warehouse", icon: "🏬" },
                          { role: "EXPERT" as UserRole, label: "KVK Expert", icon: "🎓" },
                        ]
                      ).map((r) => (
                        <button
                          key={r.role}
                          type="button"
                          onClick={() => handleRoleChange(r.role)}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${
                            localRole === r.role
                              ? "bg-emerald-50 font-bold text-emerald-950"
                              : "text-gray-700 hover:bg-gray-50 font-medium"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span>{r.icon}</span>
                            <span>{r.label}</span>
                          </span>
                          {localRole === r.role && <span className="text-emerald-600 font-bold">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <Link
                  href="/login"
                  className="rounded-xl border border-emerald-600 bg-emerald-600 px-3 py-1.5 text-[11px] font-black text-white hover:bg-emerald-700 transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="hidden sm:inline-flex rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-gray-700 hover:bg-gray-50 transition"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                aria-label="Notifications"
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-2xs hover:bg-gray-50 hover:text-gray-900 transition"
              >
                <span className="text-sm">🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white shadow-xs">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Drawer Popover */}
              {isNotifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 max-w-[92vw] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100 sm:w-96">
                  <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-4 py-2.5">
                    <span className="text-xs font-black uppercase tracking-wider text-gray-800">
                      Notifications ({unreadCount} new)
                    </span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllRead}
                        className="text-[10px] font-bold text-emerald-700 hover:underline"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-gray-50 p-1">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-gray-400">No notifications</div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-3 text-xs rounded-xl transition ${
                            n.isRead ? "text-gray-600 hover:bg-gray-50" : "bg-emerald-50/50 font-medium text-emerald-950"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 pb-1">
                            <span className="font-bold text-gray-900">{n.title}</span>
                            <span className="text-[10px] text-gray-400">{n.timestamp}</span>
                          </div>
                          <p className="text-[11px] leading-relaxed text-gray-600">{n.message}</p>
                          {n.linkUrl && (
                            <Link
                              href={n.linkUrl}
                              onClick={() => setIsNotifOpen(false)}
                              className="mt-1 inline-block text-[10px] font-bold text-emerald-700 hover:underline"
                            >
                              Open details →
                            </Link>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 23-Language Selector */}
            <LanguageSelector />

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 lg:hidden"
            >
              <span className="text-sm">{isMobileMenuOpen ? "✕" : "☰"}</span>
            </button>
          </div>
        </div>

        {/* Mobile Slide-down Navigation */}
        {isMobileMenuOpen && (
          <div className="border-t border-gray-100 bg-white px-4 py-3 lg:hidden">
            <div className="grid grid-cols-2 gap-2">
              {currentNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-xl p-2 text-xs font-semibold text-gray-800 hover:bg-emerald-50 transition"
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
              {activeRole === "ADMIN" && (
                <Link
                  href="/admin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-xl p-2 text-xs font-bold text-purple-700 hover:bg-purple-50 transition col-span-2"
                >
                  <span>🛡️</span>
                  <span>Admin Console</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
