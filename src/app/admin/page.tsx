"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PlatformHeader from "@/components/PlatformHeader";
import { PlatformDb } from "@/lib/platform-db";

interface VerificationItem {
  id: string;
  entityName: string;
  entityType: "Farmer" | "FPO" | "Transporter" | "Warehouse" | "Dealer";
  district: string;
  documentType: string;
  submittedAt: string;
  status: "pending" | "approved" | "rejected";
  riskScore: "Low" | "Medium" | "High";
}

interface DiscrepancyItem {
  id: string;
  orderId: string;
  farmer: string;
  buyer: string;
  expectedKg: number;
  bridgeGrossKg: number;
  bridgeTareKg: number;
  bridgeNetKg: number;
  varianceKg: number;
  variancePercent: number;
  status: "investigating" | "settled" | "flagged";
}

const INITIAL_VERIFICATIONS: VerificationItem[] = [
  {
    id: "VER-101",
    entityName: "Siddaramaiah Gowda",
    entityType: "Farmer",
    district: "Tumakuru, Karnataka",
    documentType: "Pahani / RTC Record of Rights + Aadhaar OTP",
    submittedAt: "2026-10-30",
    status: "approved",
    riskScore: "Low",
  },
  {
    id: "VER-102",
    entityName: "Sri Siddaganga Farmer Producer Co. Ltd.",
    entityType: "FPO",
    district: "Tumakuru, Karnataka",
    documentType: "Ministry of Corporate Affairs (CIN: U01111KA2021PTC) + Board Resolution",
    submittedAt: "2026-10-31",
    status: "approved",
    riskScore: "Low",
  },
  {
    id: "VER-103",
    entityName: "Karnataka Green Transit Logistics",
    entityType: "Transporter",
    district: "Nelamangala, Bengaluru Rural",
    documentType: "National Motor Permit + Commercial Vehicle Fitness",
    submittedAt: "2026-11-01",
    status: "pending",
    riskScore: "Medium",
  },
  {
    id: "VER-104",
    entityName: "Deccan Cold Chain & Agrilogistics",
    entityType: "Warehouse",
    district: "Kolar, Karnataka",
    documentType: "WDRA Registration Cert No. WDRA/2023/KA/1049",
    submittedAt: "2026-11-01",
    status: "pending",
    riskScore: "Low",
  },
  {
    id: "VER-105",
    entityName: "Kaveri Bio-Agri Inputs & Seeds",
    entityType: "Dealer",
    district: "Mandya, Karnataka",
    documentType: "State Agriculture Dept Seed & Fertilizer Retailing License",
    submittedAt: "2026-11-01",
    status: "pending",
    riskScore: "Low",
  },
];

const INITIAL_DISCREPANCIES: DiscrepancyItem[] = [
  {
    id: "DISC-901",
    orderId: "ORD-8821",
    farmer: "Ramesh Patil",
    buyer: "FreshVeg Mart Bengaluru",
    expectedKg: 4000,
    bridgeGrossKg: 6200,
    bridgeTareKg: 2280,
    bridgeNetKg: 3920,
    varianceKg: -80,
    variancePercent: -2.0,
    status: "settled",
  },
  {
    id: "DISC-902",
    orderId: "ORD-8904",
    farmer: "Tumakuru FPO Pool Lot #4",
    buyer: "Metro Agritrade Hub",
    expectedKg: 10000,
    bridgeGrossKg: 14850,
    bridgeTareKg: 4900,
    bridgeNetKg: 9950,
    varianceKg: -50,
    variancePercent: -0.5,
    status: "settled",
  },
  {
    id: "DISC-903",
    orderId: "ORD-9112",
    farmer: "Basavaraj Hiremath",
    buyer: "Apex Food Processors",
    expectedKg: 2500,
    bridgeGrossKg: 4100,
    bridgeTareKg: 1800,
    bridgeNetKg: 2300,
    varianceKg: -200,
    variancePercent: -8.0,
    status: "investigating",
  },
];

export default function AdminConsolePage() {
  const [activeTab, setActiveTab] = useState<"verifications" | "discrepancies" | "audit" | "settings">("verifications");
  const [verifications, setVerifications] = useState<VerificationItem[]>(INITIAL_VERIFICATIONS);
  const [discrepancies, setDiscrepancies] = useState<DiscrepancyItem[]>(INITIAL_DISCREPANCIES);
  const [auditStats, setAuditStats] = useState({
    activeFarmers: 1420,
    aggregatedVolumeMt: 3840,
    totalEscrowLakhs: 482.5,
    openDisputes: 1,
    verifiedWarehouses: 28,
  });

  const handleUpdateVerification = (id: string, newStatus: "approved" | "rejected") => {
    setVerifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
  };

  const handleUpdateDiscrepancy = (id: string, newStatus: "settled" | "flagged") => {
    setDiscrepancies((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <PlatformHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                Supervisory & Moderation
              </span>
              <span className="text-xs text-stone-500">Platform Governance Level 1</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 mt-1 tracking-tight">
              Admin & Integrity Console
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              Verify platform participant credentials, audit weighbridge tare tolerances, enforce quality standards, and oversee escrow integrity.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/marketplace"
              className="px-3.5 py-2 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 bg-white hover:bg-stone-50 transition"
            >
              Live Marketplace →
            </Link>
            <Link
              href="/fpo"
              className="px-3.5 py-2 bg-emerald-700 text-white rounded-lg text-xs font-semibold hover:bg-emerald-800 transition"
            >
              FPO Management →
            </Link>
          </div>
        </div>

        {/* Platform Overview KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
            <div className="text-xs text-stone-500 font-medium">Registered Farmers</div>
            <div className="text-2xl font-bold text-stone-900 mt-1">{auditStats.activeFarmers.toLocaleString()}</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-1">↑ +8.4% this month</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
            <div className="text-xs text-stone-500 font-medium">Aggregated Volume</div>
            <div className="text-2xl font-bold text-stone-900 mt-1">{auditStats.aggregatedVolumeMt} MT</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-1">Across 14 FPO hubs</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
            <div className="text-xs text-stone-500 font-medium">Escrow Throughput</div>
            <div className="text-2xl font-bold text-stone-900 mt-1">₹{auditStats.totalEscrowLakhs} L</div>
            <div className="text-[11px] text-stone-500 font-medium mt-1">Milestone settlement</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
            <div className="text-xs text-stone-500 font-medium">Open Discrepancies</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">{auditStats.openDisputes}</div>
            <div className="text-[11px] text-amber-700 font-medium mt-1">Under investigation</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm col-span-2 md:col-span-1">
            <div className="text-xs text-stone-500 font-medium">WDRA Warehouses</div>
            <div className="text-2xl font-bold text-stone-900 mt-1">{auditStats.verifiedWarehouses}</div>
            <div className="text-[11px] text-emerald-600 font-medium mt-1">100% Certified</div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-stone-200 gap-6">
          <button
            onClick={() => setActiveTab("verifications")}
            className={`pb-3 text-sm font-bold border-b-2 transition ${
              activeTab === "verifications"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            Participant KYC & Licenses ({verifications.filter((v) => v.status === "pending").length} Pending)
          </button>
          <button
            onClick={() => setActiveTab("discrepancies")}
            className={`pb-3 text-sm font-bold border-b-2 transition ${
              activeTab === "discrepancies"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            Weighbridge Tolerances & Audit
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`pb-3 text-sm font-bold border-b-2 transition ${
              activeTab === "audit"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            Platform Ledger & Guardrails
          </button>
        </div>

        {/* Tab 1: Participant Verifications */}
        {activeTab === "verifications" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Entity Onboarding & Verification Queue</h3>
                  <p className="text-xs text-stone-500">Cross-checked against state land registries, MCA 21, and WDRA</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-md">
                  Auto-Verification Engine: Active
                </span>
              </div>

              <div className="divide-y divide-stone-100">
                {verifications.map((item) => (
                  <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-900">{item.entityName}</span>
                        <span className="px-2 py-0.5 text-[11px] font-semibold bg-stone-100 text-stone-700 rounded">
                          {item.entityType}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            item.riskScore === "Low"
                              ? "bg-emerald-100 text-emerald-800"
                              : item.riskScore === "Medium"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          Risk: {item.riskScore}
                        </span>
                      </div>
                      <div className="text-xs text-stone-600">
                        📍 {item.district} • Submitted {item.submittedAt}
                      </div>
                      <div className="text-xs text-stone-500 font-mono bg-stone-50 p-1.5 rounded inline-block">
                        📄 {item.documentType}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.status === "approved" ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800">
                          ✓ Verified
                        </span>
                      ) : item.status === "rejected" ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-bold bg-red-100 text-red-800">
                          ✕ Rejected
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUpdateVerification(item.id, "approved")}
                            className="px-3 py-1.5 bg-emerald-700 text-white text-xs font-bold rounded-lg hover:bg-emerald-800 transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleUpdateVerification(item.id, "rejected")}
                            className="px-3 py-1.5 border border-red-300 text-red-700 hover:bg-red-50 text-xs font-bold rounded-lg transition"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Weighbridge Discrepancies */}
        {activeTab === "discrepancies" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-stone-50 border-b border-stone-200">
                <h3 className="text-sm font-bold text-stone-900">
                  Electronic Weighbridge Tare & Gross Reconciliations
                </h3>
                <p className="text-xs text-stone-500">
                  Flagged when variance between dispatch note and digital weighbridge exceeds ±3% threshold
                </p>
              </div>

              <div className="divide-y divide-stone-100">
                {discrepancies.map((item) => (
                  <div key={item.id} className="p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-stone-900 font-mono">{item.id}</span>
                        <span className="text-xs text-stone-500">({item.orderId})</span>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            item.status === "settled"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {item.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-stone-600">
                        Farmer: <span className="font-semibold">{item.farmer}</span> → Buyer:{" "}
                        <span className="font-semibold">{item.buyer}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-stone-50 p-3 rounded-lg border border-stone-100">
                      <div>
                        <div className="text-stone-400">Dispatch Estimate</div>
                        <div className="font-bold text-stone-800">{item.expectedKg} kg</div>
                      </div>
                      <div>
                        <div className="text-stone-400">Bridge Gross / Tare</div>
                        <div className="font-mono text-stone-800">
                          {item.bridgeGrossKg} / {item.bridgeTareKg} kg
                        </div>
                      </div>
                      <div>
                        <div className="text-stone-400">Actual Net Weight</div>
                        <div className="font-bold text-stone-900">{item.bridgeNetKg} kg</div>
                      </div>
                      <div>
                        <div className="text-stone-400">Variance</div>
                        <div
                          className={`font-bold ${
                            Math.abs(item.variancePercent) > 3 ? "text-red-600" : "text-emerald-700"
                          }`}
                        >
                          {item.varianceKg} kg ({item.variancePercent}%)
                        </div>
                      </div>
                    </div>

                    {item.status === "investigating" && (
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => handleUpdateDiscrepancy(item.id, "settled")}
                          className="px-3 py-1 bg-emerald-700 text-white text-xs font-semibold rounded-md hover:bg-emerald-800 transition"
                        >
                          Settle by Net Weighment Slip
                        </button>
                        <button
                          onClick={() => handleUpdateDiscrepancy(item.id, "flagged")}
                          className="px-3 py-1 border border-amber-300 text-amber-800 bg-amber-50 text-xs font-semibold rounded-md hover:bg-amber-100 transition"
                        >
                          Hold Escrow & Request Retest
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Platform Ledger & Guardrails */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-stone-900">Platform Guardrails & Policy Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-stone-50 rounded-lg border border-stone-100 space-y-1.5">
                  <div className="font-bold text-stone-800">Weighbridge Tolerance Threshold</div>
                  <div className="text-stone-500">
                    Max permissible weight variance before escrow release is paused automatically. Current:{" "}
                    <span className="font-semibold text-stone-800">±3.0%</span>
                  </div>
                </div>
                <div className="p-3 bg-stone-50 rounded-lg border border-stone-100 space-y-1.5">
                  <div className="font-bold text-stone-800">Quality Inspection Confidence Minimum</div>
                  <div className="text-stone-500">
                    Required AI Vision grading confidence before auto-attaching Grade A tag. Current:{" "}
                    <span className="font-semibold text-stone-800">85%</span>
                  </div>
                </div>
                <div className="p-3 bg-stone-50 rounded-lg border border-stone-100 space-y-1.5">
                  <div className="font-bold text-stone-800">Cold Chain Rejection Protocol</div>
                  <div className="text-stone-500">
                    Automatic notification triggered if refrigerated reefer temperature rises above +6°C for &gt; 45 minutes.
                  </div>
                </div>
                <div className="p-3 bg-stone-50 rounded-lg border border-stone-100 space-y-1.5">
                  <div className="font-bold text-stone-800">Residue Stubble Burning Guardrail</div>
                  <div className="text-stone-500">
                    AgriCycle residue purchases require geotagged collection confirmation to verify no in-situ burning.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
