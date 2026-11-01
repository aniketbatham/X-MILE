"use client";

import { useState } from "react";
import PlatformHeader from "@/components/PlatformHeader";
import ConnectedFarmerJourney from "@/components/ConnectedFarmerJourney";
import { PlatformDb, FarmRecordItem } from "@/lib/platform-db";

export default function FarmRecordsPage() {
  const [records, setRecords] = useState<FarmRecordItem[]>(PlatformDb.getFarmRecords());
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [filterType, setFilterType] = useState<"ALL" | "EXPENSE" | "REVENUE">("ALL");
  const [notice, setNotice] = useState<string | null>(null);

  const [form, setForm] = useState({
    type: "EXPENSE" as FarmRecordItem["type"],
    category: "Fertilizers" as FarmRecordItem["category"],
    amount: 5500,
    date: new Date().toISOString().split("T")[0],
    plotCode: "PLOT-NORTH",
    description: "",
  });

  const totalRevenue = records
    .filter((r) => r.type === "REVENUE")
    .reduce((sum, r) => sum + r.amount, 0);

  const totalExpense = records
    .filter((r) => r.type === "EXPENSE")
    .reduce((sum, r) => sum + r.amount, 0);

  const netBalance = totalRevenue - totalExpense;

  const filtered = records.filter((r) => {
    if (filterType === "ALL") return true;
    return r.type === filterType;
  });

  const handleAddRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const created = PlatformDb.addFarmRecord({
      type: form.type,
      category: form.category,
      amount: form.amount,
      date: form.date,
      plotCode: form.plotCode,
      description: form.description || `${form.category} transaction`,
    });

    setRecords(PlatformDb.getFarmRecords());
    setIsAddOpen(false);
    setNotice(`✓ Transaction record of ₹${created.amount.toLocaleString()} logged successfully!`);
    setTimeout(() => setNotice(null), 4000);
  };

  const handleExportCSV = () => {
    const headers = "ID,Date,Type,Category,Plot,Amount(INR),Description\n";
    const rows = records
      .map((r) => `"${r.id}","${r.date}","${r.type}","${r.category}","${r.plotCode}",${r.amount},"${r.description.replace(/"/g, '""')}"`)
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `X-MILE-Farm-Records-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
                Module 13 — Farm Ledger & Financial Locker
              </span>
              <span className="text-xs text-gray-500">• Auditable Expense & Sales Ledger</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
              Farm Records & Digital Ledger
            </h1>
            <p className="text-xs text-gray-600 mt-1 max-w-2xl">
              Maintain an accurate chronological record of seed purchases, fertilizer applications, labor payouts, and
              confirmed marketplace produce sales.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportCSV}
              className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 shadow-2xs hover:bg-gray-50 transition"
            >
              Export CSV 📥
            </button>
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
            >
              + Log Transaction
            </button>
          </div>
        </div>

        {notice && (
          <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-100/90 p-3 text-xs font-bold text-emerald-950">
            {notice}
          </div>
        )}

        {/* Financial KPI Cards */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Recorded Revenue</span>
            <p className="text-2xl font-black text-emerald-800 mt-1">₹{totalRevenue.toLocaleString()}</p>
            <span className="text-[11px] text-gray-500">From produce & AgriCycle residue sales</span>
          </div>

          <div className="rounded-3xl border border-red-200 bg-white p-5 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Recorded Expenses</span>
            <p className="text-2xl font-black text-red-700 mt-1">₹{totalExpense.toLocaleString()}</p>
            <span className="text-[11px] text-gray-500">Inputs, machinery, labor & logistics</span>
          </div>

          <div className="rounded-3xl border border-emerald-300 bg-gradient-to-br from-[#173b2a] to-[#24583a] p-5 text-white shadow-md">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">Net Farm Balance</span>
            <p className={`text-2xl font-black mt-1 ${netProfitColor(netBalance)}`}>
              ₹{netBalance.toLocaleString()}
            </p>
            <span className="text-[11px] text-emerald-200">Cumulative seasonal liquidity</span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mt-8 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFilterType("ALL")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                filterType === "ALL" ? "bg-emerald-600 text-white" : "bg-white border border-gray-200 text-gray-700"
              }`}
            >
              All Records ({records.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("REVENUE")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                filterType === "REVENUE" ? "bg-emerald-600 text-white" : "bg-white border border-gray-200 text-gray-700"
              }`}
            >
              Inflows / Sales
            </button>
            <button
              type="button"
              onClick={() => setFilterType("EXPENSE")}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                filterType === "EXPENSE" ? "bg-emerald-600 text-white" : "bg-white border border-gray-200 text-gray-700"
              }`}
            >
              Outflows / Expenses
            </button>
          </div>

          <span className="text-[11px] text-gray-400">
            *Records maintained for personal farmer bookkeeping. Not government certified.
          </span>
        </div>

        {/* Transactions Table */}
        <div className="mt-4 rounded-3xl border border-gray-200 bg-white overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-200 bg-gray-50 text-gray-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3 font-bold">Date</th>
                <th className="px-5 py-3 font-bold">Type</th>
                <th className="px-5 py-3 font-bold">Category</th>
                <th className="px-5 py-3 font-bold">Plot Code</th>
                <th className="px-5 py-3 font-bold">Description</th>
                <th className="px-5 py-3 font-bold text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/80 transition">
                  <td className="px-5 py-3.5 font-semibold text-gray-600">{r.date}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                        r.type === "REVENUE" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {r.type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-bold text-gray-900">{r.category}</td>
                  <td className="px-5 py-3.5 text-gray-500 font-mono text-[11px]">{r.plotCode}</td>
                  <td className="px-5 py-3.5 text-gray-600 max-w-sm truncate">{r.description}</td>
                  <td
                    className={`px-5 py-3.5 text-right font-black ${
                      r.type === "REVENUE" ? "text-emerald-700" : "text-red-700"
                    }`}
                  >
                    {r.type === "REVENUE" ? "+" : "-"}₹{r.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal: Log Record */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-gray-100">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="text-base font-black text-gray-900">Log Farm Financial Entry</h3>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddRecord} className="mt-4 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Transaction Type</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="EXPENSE">Expense (Outflow)</option>
                      <option value="REVENUE">Revenue (Inflow)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Category</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value as any })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="Seeds">Seeds</option>
                      <option value="Fertilizers">Fertilizers</option>
                      <option value="Pesticides">Pesticides</option>
                      <option value="Labor">Labor</option>
                      <option value="Machinery">Machinery Rental</option>
                      <option value="Produce Sale">Produce Sale</option>
                      <option value="Residue Sale">Residue Sale</option>
                      <option value="Transport">Transport</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Amount (₹)</label>
                    <input
                      type="number"
                      required
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      required
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Plot Reference</label>
                  <input
                    type="text"
                    value={form.plotCode}
                    onChange={(e) => setForm({ ...form, plotCode: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Description / Receipt Note</label>
                  <input
                    type="text"
                    placeholder="e.g. Bought 2 bags DAP from cooperative store"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
                  >
                    Save Entry
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

function netProfitColor(val: number) {
  if (val > 0) return "text-emerald-300";
  if (val < 0) return "text-red-400";
  return "text-white";
}
