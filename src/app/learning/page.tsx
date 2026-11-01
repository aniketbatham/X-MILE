"use client";

import { useState } from "react";
import PlatformHeader from "@/components/PlatformHeader";
import ConnectedFarmerJourney from "@/components/ConnectedFarmerJourney";
import { LearningArticle, SEED_LEARNING_ARTICLES } from "@/lib/platform-db";

export default function LearningPage() {
  const [articles] = useState<LearningArticle[]>(SEED_LEARNING_ARTICLES);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [activeArticle, setActiveArticle] = useState<LearningArticle | null>(articles[0]);

  const categories = ["ALL", "Vegetables", "Soil & Water", "Cereals & Pulses", "Horticulture & Fruits"];

  const filtered = articles.filter((a) => {
    if (selectedCategory === "ALL") return true;
    return a.cropCategory === selectedCategory;
  });

  return (
    <div className="min-h-screen bg-[#f7faf7] text-[#142319]">
      <PlatformHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <ConnectedFarmerJourney activeStepId="review" />
        </div>

        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                Module 22 — Agronomic Knowledge
              </span>
              <span className="text-xs text-gray-500">• Peer-Reviewed Cultural Protocols</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
              Community Knowledge & Farmer Learning Hub
            </h1>
            <p className="text-xs text-gray-600 mt-1 max-w-2xl">
              Practical, field-tested guides reviewed by ICAR scientists and state agronomic universities.
              Learn best-in-class fertigation, IPM, curing, and organic soil enrichment.
            </p>
          </div>
        </div>

        {/* Categories */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedCategory(c)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                selectedCategory === c ? "bg-emerald-600 text-white" : "bg-white border border-gray-200 text-gray-700"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Main Content Layout */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Article List */}
          <div className="lg:col-span-5 space-y-4">
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">Field Guide Library</h2>
            {filtered.map((art) => {
              const isSelected = activeArticle?.id === art.id;
              return (
                <div
                  key={art.id}
                  onClick={() => setActiveArticle(art)}
                  className={`rounded-3xl border p-5 cursor-pointer transition ${
                    isSelected
                      ? "border-emerald-500 bg-white ring-2 ring-emerald-500/20 shadow-md"
                      : "border-gray-200 bg-white hover:border-gray-300 shadow-xs"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-bold text-emerald-800">
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 uppercase tracking-wider">
                      {art.cropCategory}
                    </span>
                    <span className="text-gray-400">{art.readTime}</span>
                  </div>
                  <h3 className="text-base font-black text-gray-900 mt-2">{art.title}</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{art.summary}</p>
                  <div className="mt-3 text-[10px] font-semibold text-gray-400">
                    Reviewed: {art.reviewedBy}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reader View */}
          <div className="lg:col-span-7">
            {activeArticle ? (
              <div className="rounded-3xl border border-gray-200 bg-white p-7 shadow-xs space-y-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                    <span>{activeArticle.cropCategory}</span>
                    <span>•</span>
                    <span>Season: {activeArticle.season}</span>
                    <span>•</span>
                    <span>{activeArticle.readTime}</span>
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 mt-2">{activeArticle.title}</h2>
                  <p className="text-sm font-medium text-gray-600 mt-2 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    {activeArticle.summary}
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                    Core Operational Protocol Steps:
                  </h3>
                  <div className="space-y-3">
                    {activeArticle.content.map((point, idx) => (
                      <div key={idx} className="flex items-start gap-3 rounded-2xl bg-emerald-50/40 p-4 border border-emerald-100 text-xs">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-xs font-black text-white">
                          {idx + 1}
                        </div>
                        <p className="text-gray-800 leading-relaxed font-medium">{point}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4 text-xs text-gray-500 flex flex-col sm:flex-row justify-between gap-2">
                  <div>
                    <span className="font-bold text-gray-700">Expert Reviewer: </span>
                    {activeArticle.reviewedBy}
                  </div>
                  <div>
                    <span className="font-bold text-gray-700">Source: </span>
                    {activeArticle.verifiedSource}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-gray-200 bg-white p-12 text-center text-xs text-gray-400">
                Select an article from the left to read verified field guidelines.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
