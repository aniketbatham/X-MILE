"use client";

import { useState } from "react";
import PlatformHeader from "@/components/PlatformHeader";
import ConnectedFarmerJourney from "@/components/ConnectedFarmerJourney";
import { PlatformDb, KvkCenter, SEED_KVKS } from "@/lib/platform-db";

export default function ExpertsPage() {
  const [kvkList] = useState<KvkCenter[]>(SEED_KVKS);
  const [referrals, setReferrals] = useState(PlatformDb.getExpertReferrals());
  const [selectedKvk, setSelectedKvk] = useState<KvkCenter | null>(null);
  const [cropName, setCropName] = useState("Tomato (US-440)");
  const [issueDescription, setIssueDescription] = useState("");
  const [urgency, setUrgency] = useState<"Normal" | "High">("Normal");
  const [notice, setNotice] = useState<string | null>(null);

  const handleSubmitReferral = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKvk || !issueDescription.trim()) return;

    const created = PlatformDb.addExpertReferral({
      farmerName: "Rameshwar Patel",
      kvkName: selectedKvk.name,
      cropName,
      issueDescription,
      urgency,
    });

    setReferrals(PlatformDb.getExpertReferrals());
    setSelectedKvk(null);
    setIssueDescription("");
    setNotice(`✓ Agronomic query dispatched to ${created.kvkName}! Official advisory response expected within 24 working hours.`);
    setTimeout(() => setNotice(null), 4500);
  };

  return (
    <div className="min-h-screen bg-[#f7faf7] text-[#142319]">
      <PlatformHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <ConnectedFarmerJourney activeStepId="prepare" />
        </div>

        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                Module 12 — Institutional Agronomy
              </span>
              <span className="text-xs text-gray-500">• Verified ICAR Krishi Vigyan Kendras</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
              Agricultural Expert & KVK Directory
            </h1>
            <p className="text-xs text-gray-600 mt-1 max-w-2xl">
              Connect directly with verified ICAR Krishi Vigyan Kendras (KVK), State Agricultural Universities,
              and horticulture scientists for unbiased crop diagnosis, pest alerts, and soil nutrition guidance.
            </p>
          </div>
        </div>

        {notice && (
          <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-100/90 p-3 text-xs font-bold text-emerald-950">
            {notice}
          </div>
        )}

        {/* KVK Directory Grid */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-gray-900">Accredited Centers in Your Agricultural Region</h2>
            <span className="text-xs font-semibold text-gray-500">Government of India Verified</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {kvkList.map((kvk) => (
              <div
                key={kvk.id}
                className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs hover:border-emerald-500 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800">
                        {kvk.type}
                      </span>
                      <h3 className="text-base font-black text-gray-900 mt-1.5">{kvk.name}</h3>
                      <p className="text-xs text-emerald-800 font-semibold mt-0.5">
                        📍 {kvk.district}, {kvk.state}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-gray-600">{kvk.address}</p>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {kvk.specialties.map((spec, i) => (
                      <span
                        key={i}
                        className="rounded-lg bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 border-t border-gray-100 pt-3 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Official Helpline:</span>
                      <a href={`tel:${kvk.phone}`} className="font-bold text-emerald-700 hover:underline">
                        {kvk.phone}
                      </a>
                    </div>
                    {kvk.email && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Email:</span>
                        <span className="font-semibold text-gray-700">{kvk.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-gray-100 flex gap-2">
                  <a
                    href={`tel:${kvk.phone}`}
                    className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-center text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
                  >
                    Call Center 📞
                  </a>
                  <button
                    type="button"
                    onClick={() => setSelectedKvk(kvk)}
                    className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-center text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                  >
                    Send Referral 📝
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Existing Expert Consultations / Referrals */}
        {referrals.length > 0 && (
          <div className="mt-12 rounded-3xl border border-gray-200 bg-white p-6 shadow-xs">
            <h2 className="text-lg font-black text-gray-900 mb-3">Your Submitted Agronomic Referrals ({referrals.length})</h2>
            <div className="space-y-3">
              {referrals.map((ref) => (
                <div
                  key={ref.id}
                  className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 text-xs space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-100 pb-2">
                    <div>
                      <h3 className="text-sm font-black text-gray-900">{ref.cropName} Consultation</h3>
                      <p className="text-[11px] text-gray-500">Center: {ref.kvkName} • Urgency: {ref.urgency}</p>
                    </div>
                    <span className="rounded-full bg-emerald-200 px-2.5 py-1 text-[10px] font-bold text-emerald-900 self-start sm:self-auto">
                      {ref.status}
                    </span>
                  </div>
                  <p className="text-gray-700"><strong>Query:</strong> {ref.issueDescription}</p>
                  {ref.expertAdvice && (
                    <div className="rounded-xl bg-white p-3 border border-emerald-200 text-emerald-950 font-medium">
                      <strong>Official Advisory:</strong> {ref.expertAdvice}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal: Submit Referral */}
        {selectedKvk && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-gray-100">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    Agronomic Referral Form
                  </h3>
                  <p className="text-[11px] text-gray-500">Recipient: {selectedKvk.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedKvk(null)}
                  className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmitReferral} className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Crop & Variety</label>
                  <input
                    type="text"
                    required
                    value={cropName}
                    onChange={(e) => setCropName(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Case Urgency</label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as any)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Normal">Normal Advisory (24-48 hrs)</option>
                    <option value="High">Urgent Pest / Disease Outbreak (&lt; 24 hrs)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Detailed Field Symptoms & Query</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe leaf yellowing, wilting symptoms, irrigation schedule, or soil report numbers..."
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setSelectedKvk(null)}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
                  >
                    Submit Case to KVK
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
