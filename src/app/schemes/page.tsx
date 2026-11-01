"use client";

import { useState } from "react";
import Link from "next/link";
import PlatformHeader from "@/components/PlatformHeader";
import ConnectedFarmerJourney from "@/components/ConnectedFarmerJourney";
import { useLanguage } from "@/i18n/LanguageContext";

interface Scheme {
  id: string;
  name: string;
  hindiName: string;
  category: "income" | "insurance" | "solar" | "credit" | "machinery" | "soil";
  ministry: string;
  benefit: string;
  subsidyPercentage?: string;
  eligibility: string[];
  documents: string[];
  portalUrl: string;
  deadlines: string;
  status: "open" | "ongoing" | "seasonal";
}

const SCHEMES: Scheme[] = [
  {
    id: "pm-kisan",
    name: "PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)",
    hindiName: "प्रधानमंत्री किसान सम्मान निधि",
    category: "income",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    benefit: "₹6,000 per year directly to bank account in 3 equal four-monthly installments of ₹2,000.",
    eligibility: [
      "All landholding farmer families with cultivable landholding in their names",
      "Valid Aadhaar linked with operational bank account",
      "e-KYC completed on PM-KISAN portal or CSC center",
      "Institutional landholders and high income tax payers excluded",
    ],
    documents: [
      "Aadhaar Card",
      "Land Record Documents (Pahani / RTC / Khasra / Khatauni)",
      "Bank Account Passbook / IFSC code",
      "Active mobile number linked to Aadhaar",
    ],
    portalUrl: "https://pmkisan.gov.in",
    deadlines: "Continuous enrollment across year; installments released April-July, Aug-Nov, Dec-March.",
    status: "ongoing",
  },
  {
    id: "pmfby",
    name: "PMFBY (Pradhan Mantri Fasal Bima Yojana)",
    hindiName: "प्रधानमंत्री फसल बीमा योजना",
    category: "insurance",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    benefit: "Comprehensive crop loss cover against non-preventable natural risks from pre-sowing to post-harvest at ultra-low premium: 2% for Kharif, 1.5% for Rabi, 5% for Annual Commercial/Horticulture.",
    subsidyPercentage: "Up to 90% premium paid by Central & State Govts",
    eligibility: [
      "All farmers growing notified crops in notified areas during notified season",
      "Both loanee farmers (via KCC) and non-loanee farmers eligible",
      "Tenant and sharecropper farmers with lawful tenancy documents",
    ],
    documents: [
      "Sowing Certificate / Patwari Adangal record",
      "Land Possession Certificate / Revenue record",
      "Identity Proof (Aadhaar/Voter ID)",
      "Bank Account details with Aadhaar seeding",
    ],
    portalUrl: "https://pmfby.gov.in",
    deadlines: "Kharif: Typically July 31; Rabi: Typically December 31 (state variations apply).",
    status: "seasonal",
  },
  {
    id: "pm-kusum",
    name: "PM-KUSUM (Pradhan Mantri Kisan Urja Suraksha evam Utthaan Mahabhiyan)",
    hindiName: "पीएम कुसुम योजना - सौर ऊर्जा",
    category: "solar",
    ministry: "Ministry of New and Renewable Energy (MNRE)",
    benefit: "Subsidized installation of standalone solar water pumps (Component B) and solarisation of existing grid-connected agricultural pumps (Component C). Surplus power can be sold back to DISCOM.",
    subsidyPercentage: "60% Subsidy (30% Central + 30% State), 30% Bank Loan, 10% Farmer Share",
    eligibility: [
      "Individual farmers, Water User Associations, and FPOs with agricultural land",
      "Access to borewell/dugwell or canal source for pump operation",
      "No existing electric agricultural connection on the designated plot (for standalone pumps)",
    ],
    documents: [
      "Land Ownership Documents (RTC/7-12 extract)",
      "Aadhaar Card of Applicant",
      "Bank Passbook photocopy",
      "Borewell/Water Source declaration certificate",
    ],
    portalUrl: "https://pmkusum.mnre.gov.in",
    deadlines: "State Renewable Energy Agencies open sanction windows cyclically.",
    status: "open",
  },
  {
    id: "aif",
    name: "Agriculture Infrastructure Fund (AIF)",
    hindiName: "कृषि अवसंरचना कोष",
    category: "credit",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    benefit: "Medium to long-term debt financing facility for investment in viable post-harvest management infrastructure and community farming assets. 3% per annum interest subvention up to ₹2 Crore for up to 7 years + CGTMSE credit guarantee.",
    subsidyPercentage: "3% Interest Subvention + Credit Guarantee",
    eligibility: [
      "Primary Agricultural Credit Societies (PACS), Marketing Cooperative Societies",
      "Farmer Producer Organizations (FPOs), Self Help Groups (SHGs)",
      "Individual Farmers, Agri-entrepreneurs, and Startups",
    ],
    documents: [
      "Detailed Project Report (DPR) for Cold Storage, Packhouse, Silo, or Processing unit",
      "KYC & Registration documents of entity/farmer",
      "Land possession/lease deed minimum 10 years",
      "Bank sanction letter / In-principle clearance",
    ],
    portalUrl: "https://agriinfra.dac.gov.in",
    deadlines: "Operational across India till 2032-33.",
    status: "open",
  },
  {
    id: "smam",
    name: "SMAM (Sub-Mission on Agricultural Mechanization)",
    hindiName: "कृषि यंत्रीकरण उप-अभियान",
    category: "machinery",
    ministry: "Department of Agriculture and Farmers Welfare",
    benefit: "Financial assistance of 40% to 50% for procurement of agricultural equipment (tractors, power tillers, rotavators, multi-crop threshers, drone sprayers) and up to 80% grant for setting up Custom Hiring Centers (CHCs) by FPOs.",
    subsidyPercentage: "40% - 80% Capital Subsidy depending on category & beneficiary",
    eligibility: [
      "Small and marginal farmers, SC/ST, women farmers prioritized",
      "Registered FPOs and Cooperative Societies for Custom Hiring Centers",
      "Beneficiary must not have availed subsidy on the same machine in last 5 years",
    ],
    documents: [
      "Aadhaar Card & Caste Certificate (if applicable)",
      "Land Records (Record of Rights/Pahani)",
      "Proforma Invoice from authorized machinery dealer",
      "Bank account details (cancelled cheque)",
    ],
    portalUrl: "https://agrimachinery.nic.in",
    deadlines: "Online applications processed on first-come-first-serve basis per state quota.",
    status: "open",
  },
  {
    id: "soil-health",
    name: "Soil Health Card Scheme",
    hindiName: "मृदा स्वास्थ्य कार्ड योजना",
    category: "soil",
    ministry: "Department of Agriculture, Cooperation & Farmers Welfare",
    benefit: "Free diagnostic testing of 12 critical soil parameters (pH, EC, Organic Carbon, Available Nitrogen, Phosphorus, Potassium, Sulphur, Zinc, Boron, Iron, Manganese, Copper) with customized dosage recommendations for optimal crop nutrition.",
    subsidyPercentage: "100% Free diagnostic service",
    eligibility: [
      "All agricultural landholders in all Indian States and Union Territories",
      "Samples collected once every 3 years by State Agriculture Department officials",
    ],
    documents: [
      "Aadhaar Card",
      "Survey Number / Plot boundary identifier",
      "Previous crop and fertilizer history",
    ],
    portalUrl: "https://soilhealth.dac.gov.in",
    deadlines: "Ongoing cycle across all blocks in India.",
    status: "ongoing",
  },
];

export default function GovernmentSchemesPage() {
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null);

  // Self-assessment interactive checklist
  const [hasAadhaarLinked, setHasAadhaarLinked] = useState(true);
  const [hasLandRecords, setHasLandRecords] = useState(true);
  const [isEkycDone, setIsEkycDone] = useState(true);
  const [hasKccOrBank, setHasKccOrBank] = useState(true);

  const filteredSchemes = SCHEMES.filter((scheme) => {
    const matchesCat = selectedCategory === "all" || scheme.category === selectedCategory;
    const matchesQuery =
      searchQuery === "" ||
      scheme.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scheme.hindiName.includes(searchQuery) ||
      scheme.benefit.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <PlatformHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                Direct Government Benefits Hub
              </span>
              <span className="text-xs text-stone-500">DBT Verified</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 mt-1 tracking-tight">
              Government Schemes & Subsidies
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              Verified access to central & state agricultural benefits, direct income support, crop insurance, solar pumps, and machinery subsidies.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/farm-records"
              className="inline-flex items-center justify-center px-4 py-2 border border-stone-300 rounded-lg text-sm font-medium text-stone-700 bg-white hover:bg-stone-50 transition"
            >
              Farm Financial Ledger →
            </Link>
          </div>
        </div>

        {/* Farmer Journey 9-Step Roadmap Banner */}
        <ConnectedFarmerJourney currentStep="prepare" />

        {/* Readiness Checklist Banner */}
        <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 rounded-2xl p-6 text-white shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <span className="text-xs uppercase tracking-wider font-bold text-emerald-300">
                1-Minute Eligibility Readiness Check
              </span>
              <h2 className="text-xl font-bold mt-1">
                Are your farm credentials ready for direct DBT disbursals?
              </h2>
              <p className="text-sm text-emerald-100 mt-1">
                Indian agricultural subsidies disburse over ₹1,20,000 Crore annually via DBT. Ensure these four foundational prerequisites are active:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-xs">
                <label className="flex items-center gap-2 bg-emerald-800/60 p-2.5 rounded-lg cursor-pointer hover:bg-emerald-800 transition">
                  <input
                    type="checkbox"
                    checked={hasAadhaarLinked}
                    onChange={(e) => setHasAadhaarLinked(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <span>Aadhaar seeded to active Bank Account (NPCI active)</span>
                </label>
                <label className="flex items-center gap-2 bg-emerald-800/60 p-2.5 rounded-lg cursor-pointer hover:bg-emerald-800 transition">
                  <input
                    type="checkbox"
                    checked={hasLandRecords}
                    onChange={(e) => setHasLandRecords(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <span>Digitized Land Title / RTC / Khasra-Khatauni</span>
                </label>
                <label className="flex items-center gap-2 bg-emerald-800/60 p-2.5 rounded-lg cursor-pointer hover:bg-emerald-800 transition">
                  <input
                    type="checkbox"
                    checked={isEkycDone}
                    onChange={(e) => setIsEkycDone(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <span>Biometric / OTP e-KYC verified</span>
                </label>
                <label className="flex items-center gap-2 bg-emerald-800/60 p-2.5 rounded-lg cursor-pointer hover:bg-emerald-800 transition">
                  <input
                    type="checkbox"
                    checked={hasKccOrBank}
                    onChange={(e) => setHasKccOrBank(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <span>Kisan Credit Card (KCC) or Scheduled Commercial Bank A/C</span>
                </label>
              </div>
            </div>

            <div className="bg-emerald-700/50 p-4 rounded-xl border border-emerald-500/30 text-center min-w-[200px]">
              <div className="text-3xl font-extrabold text-white">
                {[hasAadhaarLinked, hasLandRecords, isEkycDone, hasKccOrBank].filter(Boolean).length} / 4
              </div>
              <div className="text-xs text-emerald-200 mt-1 font-medium">Prerequisites Ready</div>
              <div className="mt-3 text-xs font-semibold px-2 py-1 bg-white/20 rounded text-emerald-50 inline-block">
                {[hasAadhaarLinked, hasLandRecords, isEkycDone, hasKccOrBank].filter(Boolean).length === 4
                  ? "✓ 100% Eligible for Fast Track DBT"
                  : "Complete pending items at nearest CSC"}
              </div>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "all", label: "All Schemes (6)" },
              { id: "income", label: "Direct Income (PM-KISAN)" },
              { id: "insurance", label: "Crop Insurance (PMFBY)" },
              { id: "solar", label: "Solar Energy (PM-KUSUM)" },
              { id: "credit", label: "Agri Infra (AIF)" },
              { id: "machinery", label: "Farm Machinery (SMAM)" },
              { id: "soil", label: "Soil Health Card" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  selectedCategory === cat.id
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="w-full md:w-72">
            <input
              type="text"
              placeholder="Search schemes, benefits, keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Scheme Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSchemes.map((scheme) => (
            <div
              key={scheme.id}
              className="bg-white rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden"
            >
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      {scheme.category.toUpperCase()}
                    </span>
                    <h3 className="text-base font-bold text-stone-900 mt-2 leading-snug">
                      {scheme.name}
                    </h3>
                    <div className="text-xs text-stone-500 font-medium mt-0.5">
                      {scheme.hindiName}
                    </div>
                  </div>
                  <span
                    className={`inline-flex px-2 py-0.5 text-[11px] font-bold rounded-full ${
                      scheme.status === "open"
                        ? "bg-emerald-100 text-emerald-800"
                        : scheme.status === "ongoing"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {scheme.status.toUpperCase()}
                  </span>
                </div>

                <div className="text-xs text-stone-700 bg-stone-50 p-3 rounded-lg border border-stone-100 leading-relaxed">
                  <span className="font-semibold text-stone-900">Key Benefit: </span>
                  {scheme.benefit}
                </div>

                {scheme.subsidyPercentage && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50/70 px-2.5 py-1.5 rounded-md border border-emerald-100">
                    <span>⚡ Subsidy Support:</span>
                    <span>{scheme.subsidyPercentage}</span>
                  </div>
                )}

                <div className="space-y-1.5 text-xs text-stone-600">
                  <div className="font-semibold text-stone-800">Eligibility Highlights:</div>
                  <ul className="list-disc pl-4 space-y-1">
                    {scheme.eligibility.slice(0, 2).map((el, i) => (
                      <li key={i}>{el}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="p-4 bg-stone-50 border-t border-stone-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedScheme(scheme)}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
                >
                  View Required Documents →
                </button>
                <a
                  href={scheme.portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-emerald-700 text-white text-xs font-semibold rounded-lg hover:bg-emerald-800 transition"
                >
                  Apply on Portal ↗
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Modal for Detailed Scheme Documents & Deadlines */}
        {selectedScheme && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in duration-200">
              <div className="flex items-start justify-between border-b border-stone-200 pb-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                    {selectedScheme.category.toUpperCase()} • {selectedScheme.ministry}
                  </span>
                  <h3 className="text-lg font-bold text-stone-900 mt-1">
                    {selectedScheme.name}
                  </h3>
                  <p className="text-xs text-stone-500">{selectedScheme.hindiName}</p>
                </div>
                <button
                  onClick={() => setSelectedScheme(null)}
                  className="text-stone-400 hover:text-stone-700 text-xl font-bold p-1"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                <div>
                  <h4 className="text-xs font-bold uppercase text-stone-500 tracking-wide">
                    Mandatory Documentation Checklist
                  </h4>
                  <ul className="mt-2 space-y-2 text-xs text-stone-700">
                    {selectedScheme.documents.map((doc, idx) => (
                      <li key={idx} className="flex items-start gap-2 bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>{doc}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase text-stone-500 tracking-wide">
                    Full Eligibility Criteria
                  </h4>
                  <ul className="mt-2 space-y-1 text-xs text-stone-700 list-disc pl-5">
                    {selectedScheme.eligibility.map((crit, idx) => (
                      <li key={idx}>{crit}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase text-stone-500 tracking-wide">
                    Operational Windows & Deadlines
                  </h4>
                  <p className="mt-1 text-xs text-stone-700 bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-amber-900">
                    ⏳ {selectedScheme.deadlines}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-stone-200">
                <button
                  onClick={() => setSelectedScheme(null)}
                  className="px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 rounded-lg transition"
                >
                  Close
                </button>
                <a
                  href={selectedScheme.portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-700 text-white text-xs font-semibold rounded-lg hover:bg-emerald-800 transition"
                >
                  Proceed to Official Portal ↗
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Support & KVK Help Footnote */}
        <div className="bg-white rounded-xl p-6 border border-stone-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏛️</span>
            <div>
              <div className="text-sm font-bold text-stone-900">
                Need Help with CSC Application or Soil Card Collection?
              </div>
              <div className="text-xs text-stone-500">
                Contact your nearest Krishi Vigyan Kendra (KVK) or Common Service Center (CSC) coordinator.
              </div>
            </div>
          </div>
          <Link
            href="/experts"
            className="px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-lg hover:bg-emerald-800 transition whitespace-nowrap"
          >
            Find Local KVK Expert →
          </Link>
        </div>
      </main>
    </div>
  );
}
