"use client";

import { useState } from "react";
import PlatformHeader from "@/components/PlatformHeader";
import ConnectedFarmerJourney from "@/components/ConnectedFarmerJourney";

export default function CropTriagePage() {
  const [cropName, setCropName] = useState("Tomato");
  const [growthStage, setGrowthStage] = useState("Flowering to Early Fruiting");
  const [symptoms, setSymptoms] = useState("Yellowing along leaf margins and brown necrotic spots on lower foliage.");
  const [weatherContext, setWeatherContext] = useState("High humidity and intermittent light rain over past 3 days.");
  const [recentSpray, setRecentSpray] = useState("Applied 19:19:19 fertigation 4 days ago.");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [triageResult, setTriageResult] = useState<{
    observedPattern: string;
    suspectedCondition: string;
    urgencyLevel: string;
    immediateCulturalAction: string[];
    kvkReferralStatus: string;
  } | null>(null);

  const handleImageChange = (file: File | null) => {
    setImage(file);
    if (file) {
      setPreview(URL.createObjectURL(file));
    } else {
      setPreview(null);
    }
  };

  const handleTriageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setTriageResult({
        observedPattern: "Concentric circular dark spots with chlorotic yellow halo on older foliage.",
        suspectedCondition: "Early Blight (Alternaria solani) / Potassium Deficiency Complex",
        urgencyLevel: "Moderate (Foliage active, fruits unaffected)",
        immediateCulturalAction: [
          "Prune and safely burn heavily infected lower leaves to lower canopy humidity.",
          "Ensure drip irrigation does not splash soil onto low-hanging foliage.",
          "Maintain proper plant spacing and trellis staking for adequate air movement.",
          "Avoid excessive overhead sprinkling during late afternoon.",
        ],
        kvkReferralStatus: "Case summary packaged and dispatched to ICAR-KVK Hirehalli for scientist review.",
      });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#f7faf7] text-[#142319]">
      <PlatformHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <ConnectedFarmerJourney activeStepId="grow" />
        </div>

        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                Module 18 — Cautious Pest & Disease Intake
              </span>
              <span className="text-xs text-gray-500">• Scientific Intake & Expert Handoff</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
              Crop Concern Triage & KVK Escalation
            </h1>
            <p className="text-xs text-gray-600 mt-1 max-w-2xl">
              Upload photos of affected leaves or stems with local agronomic context. We provide safe cultural hygiene
              guidelines and route complex cases to qualified KVK pathologists.
            </p>
          </div>
        </div>

        {/* Ethical Disclaimer Alert */}
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 flex items-start gap-3">
          <span className="text-lg">⚠️</span>
          <div>
            <strong className="font-bold">Responsible Agronomic Standard:</strong> Photos alone can never definitively
            diagnose microscopic bacterial or viral vectors. X-MILE never provides unsafe chemical pesticide recipes
            without formal expert confirmation.
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Intake Form */}
          <div className="lg:col-span-7 rounded-3xl border border-gray-200 bg-white p-6 shadow-xs">
            <h2 className="text-base font-black text-gray-900 mb-4 pb-2 border-b border-gray-100">
              Submit Crop Concern Details
            </h2>

            <form onSubmit={handleTriageSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Crop Name</label>
                  <input
                    type="text"
                    required
                    value={cropName}
                    onChange={(e) => setCropName(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Growth Stage</label>
                  <select
                    value={growthStage}
                    onChange={(e) => setGrowthStage(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Transplanting / Seedling">Transplanting / Seedling</option>
                    <option value="Vegetative Stage">Vegetative Stage</option>
                    <option value="Flowering to Early Fruiting">Flowering to Early Fruiting</option>
                    <option value="Fruit Maturity & Ripening">Fruit Maturity & Ripening</option>
                  </select>
                </div>
              </div>

              {/* Photo Upload Box */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Upload Close-up Image of Symptom</label>
                <div className="rounded-2xl border border-dashed border-gray-300 p-4 text-center bg-gray-50/60">
                  {preview ? (
                    <div className="flex flex-col items-center">
                      <img src={preview} alt="Crop symptom preview" className="h-40 w-auto rounded-xl object-cover shadow-sm mb-2" />
                      <button
                        type="button"
                        onClick={() => handleImageChange(null)}
                        className="text-xs font-bold text-red-600 hover:underline"
                      >
                        Remove Photo ✕
                      </button>
                    </div>
                  ) : (
                    <div>
                      <span className="text-2xl">📸</span>
                      <p className="text-xs font-bold text-gray-700 mt-1">Select clear close-up leaf or stem photo</p>
                      <p className="text-[10px] text-gray-400">JPEG, PNG up to 10MB</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageChange(e.target.files?.[0] || null)}
                        className="mt-2 text-xs cursor-pointer text-gray-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Farmer-Described Symptoms</label>
                <textarea
                  rows={2}
                  required
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Recent Weather / Irrigation Context</label>
                  <input
                    type="text"
                    value={weatherContext}
                    onChange={(e) => setWeatherContext(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Recent Field Spray / Fertilization</label>
                  <input
                    type="text"
                    value={recentSpray}
                    onChange={(e) => setRecentSpray(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isAnalyzing}
                className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition disabled:opacity-60"
              >
                {isAnalyzing ? "Processing Visual Observations..." : "Submit Concern for Structured Triage 🔍"}
              </button>
            </form>
          </div>

          {/* Structured Triage Output */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                Triage & Expert Escalation Summary
              </span>

              {triageResult ? (
                <div className="mt-4 space-y-4 text-xs">
                  <div className="rounded-2xl bg-emerald-50/60 p-4 border border-emerald-100">
                    <span className="text-[10px] uppercase font-bold text-gray-500">Suspected Agronomic Pattern</span>
                    <h3 className="text-base font-black text-gray-900 mt-0.5">{triageResult.suspectedCondition}</h3>
                    <p className="text-xs text-gray-600 mt-1">{triageResult.observedPattern}</p>
                    <div className="mt-2 inline-block rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      Urgency: {triageResult.urgencyLevel}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">Safe Cultural & Field Hygiene Actions:</h4>
                    <ul className="list-disc list-inside space-y-1.5 text-gray-700">
                      {triageResult.immediateCulturalAction.map((act, i) => (
                        <li key={i}>{act}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4">
                    <span className="text-[10px] uppercase font-bold text-purple-800">Official KVK Referral Status</span>
                    <p className="text-xs text-purple-950 font-semibold mt-0.5">{triageResult.kvkReferralStatus}</p>
                    <a
                      href="/experts"
                      className="mt-2 inline-block text-[11px] font-bold text-purple-700 hover:underline"
                    >
                      View KVK Centers & Call Agronomist →
                    </a>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-gray-400">
                  <span className="text-3xl block mb-2">📋</span>
                  Complete the form and submit your crop symptom photos to generate a structured agronomic case.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
