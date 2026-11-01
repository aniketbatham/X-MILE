"use client";

import { useState } from "react";
import Link from "next/link";
import PlatformHeader from "@/components/PlatformHeader";
import ConnectedFarmerJourney from "@/components/ConnectedFarmerJourney";
import {
  PlatformDb,
  FpoGroup,
  AggregatedLot,
  InstitutionalDemand,
  SEED_INSTITUTIONAL_DEMANDS,
} from "@/lib/platform-db";

export default function FpoPage() {
  const [fpos] = useState<FpoGroup[]>(PlatformDb.getFpos());
  const [lots, setLots] = useState<AggregatedLot[]>(PlatformDb.getAggregatedLots());
  const [institutionalDemands] = useState<InstitutionalDemand[]>(SEED_INSTITUTIONAL_DEMANDS);
  const [contributeModalLot, setContributeModalLot] = useState<AggregatedLot | null>(null);
  const [contributionKg, setContributionKg] = useState(2000);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedFpo = fpos[0];

  const handleContribute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributeModalLot) return;

    PlatformDb.contributeToLot(contributeModalLot.id, "Rameshwar Patel", contributionKg, "A");
    setLots(PlatformDb.getAggregatedLots());
    setContributeModalLot(null);
    setNotice(`✓ Successfully pooled ${contributionKg.toLocaleString()} kg of Grade A produce into ${contributeModalLot.lotCode}!`);
    setTimeout(() => setNotice(null), 4000);
  };

  return (
    <div className="min-h-screen bg-[#f7faf7] text-[#142319]">
      <PlatformHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <ConnectedFarmerJourney activeStepId="sell" />
        </div>

        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                Module 08 & 21 — Farmer Producer Groups & Institutional Tenders
              </span>
              <span className="text-xs text-gray-500">• Collective Aggregation & Traceable Payouts</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
              FPO Connect & Institutional Supply
            </h1>
            <p className="text-xs text-gray-600 mt-1 max-w-2xl">
              Pool smallholder harvests into commercial high-volume lots to command 15-25% higher prices.
              Every aggregated lot maintains 100% individual farmer contribution traceability.
            </p>
          </div>
        </div>

        {notice && (
          <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-100/90 p-3 text-xs font-bold text-emerald-950">
            {notice}
          </div>
        )}

        {/* FPO Organization Hero Card */}
        {selectedFpo && (
          <div className="mt-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-800 text-3xl font-black text-white shadow-sm shrink-0">
                👥
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-gray-900">{selectedFpo.name}</h2>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    MCA Verified
                  </span>
                </div>
                <p className="text-xs text-gray-500">Reg: {selectedFpo.registrationNumber} • {selectedFpo.district}, {selectedFpo.state}</p>
                <p className="text-xs font-bold text-emerald-800 mt-1">
                  Contact: {selectedFpo.contactPerson} ({selectedFpo.phone})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 text-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400">Member Farmers</span>
                <p className="text-xl font-black text-gray-900">{selectedFpo.membersCount}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400">Active Pool Lots</span>
                <p className="text-xl font-black text-emerald-800">{lots.length}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400">Focus Crops</span>
                <p className="text-xs font-bold text-gray-700 mt-1">{selectedFpo.supportedCrops.join(", ")}</p>
              </div>
            </div>
          </div>
        )}

        {/* Aggregated Lots Grid */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-gray-900">Active Collective Produce Pools (FPO Lots)</h2>
            <span className="text-xs text-gray-400 font-medium">Traceable Farmer Allocation</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {lots.map((lot) => {
              const progressPercent = Math.min(Math.round((lot.collectedQuantityKg / lot.targetQuantityKg) * 100), 100);

              return (
                <div
                  key={lot.id}
                  className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                          {lot.lotCode}
                        </span>
                        <h3 className="text-xl font-black text-gray-900 mt-1.5">{lot.cropName} Collective Lot</h3>
                        <p className="text-xs text-gray-500">FPO: {lot.fpoName}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-gray-400">Target Buyer Rate</span>
                        <p className="text-lg font-black text-emerald-700">₹{lot.targetPricePerKg}/kg</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-xs font-bold text-gray-700 mb-1">
                        <span>Aggregated: {lot.collectedQuantityKg.toLocaleString()} kg</span>
                        <span>Target: {lot.targetQuantityKg.toLocaleString()} kg ({progressPercent}%)</span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full bg-emerald-600 transition-all duration-500 rounded-full"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Contributing Farmers Traceability Log */}
                    <div className="mt-5 border-t border-gray-100 pt-3">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block mb-2">
                        Traceable Contributor Breakdown ({lot.contributions.length} Farmers)
                      </span>
                      <div className="max-h-36 overflow-y-auto space-y-1.5 text-xs pr-1">
                        {lot.contributions.map((c, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-1.5 border border-gray-100"
                          >
                            <span className="font-semibold text-gray-800">{c.farmerName}</span>
                            <div className="flex items-center gap-2">
                              <span className="rounded-md bg-emerald-100 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800">
                                Grade {c.grade}
                              </span>
                              <span className="font-bold text-gray-900">{c.quantityKg.toLocaleString()} kg</span>
                              <span className="text-[10px] text-gray-400">{c.timestamp}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setContributeModalLot(lot)}
                      className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                    >
                      + Contribute Produce to Pool
                    </button>
                    <Link
                      href="/buyer"
                      className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
                    >
                      View Buyer Orders →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Module 21: Farm-to-Institution Supply Tenders */}
        <div id="institutional" className="mt-12 rounded-3xl border border-gray-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
                Module 21 — Institutional Procurement Tenders
              </span>
              <h2 className="text-lg font-black text-gray-900">Direct Institutional Demands (Govt & Food Giants)</h2>
            </div>
            <span className="rounded-full bg-purple-100 px-3 py-1 text-[10px] font-bold text-purple-800">
              FPO Exclusive Tenders
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {institutionalDemands.map((tender) => (
              <div
                key={tender.id}
                className="rounded-2xl border border-purple-100 bg-purple-50/30 p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-purple-800">{tender.institutionType}</span>
                      <h3 className="text-base font-black text-gray-900 mt-0.5">{tender.institutionName}</h3>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800">
                      {tender.fpoProposalStatus.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Commodity:</span>
                      <span className="font-bold text-gray-900">{tender.commodity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Requirement Volume:</span>
                      <span className="font-bold text-gray-900">{tender.quantityMetricTons} Metric Tons</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Delivery Period:</span>
                      <span className="font-semibold text-gray-700">{tender.deliveryPeriod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Target Procurement Rate:</span>
                      <span className="font-bold text-emerald-800">₹{tender.targetRatePerQuintal} / Quintal</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Destination Hub:</span>
                      <span className="font-semibold text-gray-700">{tender.destinationHub}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    alert(`FPO collective bid proposal submitted to ${tender.institutionName} for ${tender.quantityMetricTons} MT. Verification documents attached.`);
                  }}
                  className="mt-4 w-full rounded-xl bg-purple-700 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-purple-800 transition"
                >
                  Submit FPO Collective Bid 📝
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Modal: Contribute to Lot */}
        {contributeModalLot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-gray-100">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    Contribute to {contributeModalLot.cropName} Pool
                  </h3>
                  <p className="text-[11px] text-gray-500">Lot Code: {contributeModalLot.lotCode}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setContributeModalLot(null)}
                  className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleContribute} className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Contributing Farmer</label>
                  <input
                    type="text"
                    disabled
                    value="Rameshwar Patel (Verified Farmer)"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Contribution Quantity (kg)</label>
                  <input
                    type="number"
                    required
                    value={contributionKg}
                    onChange={(e) => setContributionKg(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none font-bold"
                  />
                </div>

                <div className="rounded-xl bg-emerald-50 p-3 text-[11px] text-emerald-900 border border-emerald-100">
                  Target Price: <strong>₹{contributeModalLot.targetPricePerKg}/kg</strong>. Payout will be distributed proportionally once the collective lot is purchased by the bulk buyer.
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setContributeModalLot(null)}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
                  >
                    Confirm Contribution to Pool
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
