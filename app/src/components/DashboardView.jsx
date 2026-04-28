/* eslint-disable react/prop-types */
import React from "react";
import { Search, Plus, Sparkles } from "lucide-react";
import ConfettiCard from "./ConfettiCard";

export default function DashboardView({
  shopDomain,
  onShowInstructions,
  activeDraftTab,
  setActiveDraftTab,
  contentSource,
  setContentSource,
  searchQuery,
  setSearchQuery,
  filteredList,
  handleCreateNew,
  handleEditDraft,
  deleteDraft,
  savedConfetti,
  savedVouchers,
  toggleActive,
  onDeactivate,
}) {
  // ------------------------------------------
  // ACTIVE ITEMS (no duplicates)
  // ------------------------------------------
  const activeItems = [
    ...savedConfetti.filter((i) => i.isActive),
    ...savedVouchers.filter((i) => i.isActive),
  ];

  // ------------------------------------------
  // FILTER DISPLAY LIST
  // ------------------------------------------
  const displayList = filteredList.filter((item) => {
    // Remove predefined if already saved Active
    if (item.isPredefined) {
      return (
        !savedConfetti.some((x) => x.title === item.title && x.isActive) &&
        !savedVouchers.some((x) => x.title === item.title && x.isActive)
      );
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      <div className="px-8 py-10 max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#155E63] to-[#1F9D8B] flex items-center justify-center shadow-md">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                ConfettiFlow
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Create magical moment triggers
              </p>
            </div>
          </div>

          {/* BUTTONS */}
          <div className="flex items-center gap-3">
            <button
              onClick={onShowInstructions}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#155E63] to-[#1F9D8B] text-white text-sm hover:brightness-110 transition-all shadow-lg shadow-black/20 flex items-center gap-2"
            >
              Instructions
            </button>

            <a
              href={
                shopDomain
                  ? `https://admin.shopify.com/store/${shopDomain}/themes/current/editor?context=apps`
                  : "https://admin.shopify.com/themes"
              }
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#155E63] to-[#1F9D8B] text-white text-sm hover:brightness-110 transition-all shadow-lg shadow-black/20 flex items-center gap-2"
            >
              Open Theme Editor
            </a>
          </div>
        </div>

        {/* HERO — Only when NO active items */}
        {activeItems.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-10 flex flex-col items-center justify-center text-center gap-6 shadow-sm mb-10">
            <div>
              <h2 className="text-2xl font-bold mb-2 text-slate-900">
                Start a New Celebration
              </h2>
              <p className="text-slate-600 text-sm max-w-md mx-auto leading-relaxed">
                Design custom confetti explosions or voucher reveals for your
                customers.
              </p>
            </div>
            <button
              onClick={() => handleCreateNew("confetti")}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#155E63] to-[#1F9D8B] text-white text-sm hover:brightness-110 transition-all shadow-lg shadow-black/20 flex items-center gap-2"
            >
              <Plus size={18} />
              Create Confetti
            </button>
          </div>
        )}

        {/* STATISTICS */}
        <div className="grid grid-cols-3 gap-6 mb-10">
          {[
            { value: savedConfetti.length, label: "Confetti Created" },
            { value: activeItems.length, label: "Currently Live" },
            { value: "5", label: "Templates Available" },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-center shadow-sm"
            >
              <div className="text-3xl font-black text-slate-900">
                {stat.value}
              </div>
              <div className="text-xs text-slate-500 font-semibold uppercase mt-1 tracking-wider">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* ACTIVE ON STOREFRONT */}
        {activeItems.length > 0 && (
          <section className="mb-10">
            <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              Active on Storefront
            </h3>

            <div className="grid grid-cols-1 gap-4">
              {activeItems.map((item) => (
                <ConfettiCard
                  key={item.id}
                  item={item}
                  isActive={item.isActive}
                  onToggle={toggleActive}
                  onEdit={handleEditDraft}
                  onDelete={() => {
                    onDeactivate(item);
                    deleteDraft(item);
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {/* DRAFTS SECTION */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-slate-900">
                {contentSource === "saved" ? "Saved Drafts" : "Templates"}
              </h3>

              {/* TABS */}
              <div className="inline-flex rounded-lg bg-white border border-slate-200 p-1 gap-1 shadow-sm">
                {["confetti", "voucher"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveDraftTab(tab);
                      setSearchQuery("");
                    }}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all capitalize ${
                      activeDraftTab === tab
                        ? "bg-green-50 text-[#155E63] ring-1 ring-orange-200"
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* SEARCH */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 rounded-lg bg-white border border-slate-200 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all shadow-sm w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* SAVED/TEMPLATE SWITCH + ADD BUTTON */}
            <div className="flex items-center gap-3">
              <div className="inline-flex rounded-lg bg-white border border-slate-200 p-1 gap-1 shadow-sm">
                {["saved", "predefined"].map((source) => (
                  <button
                    key={source}
                    onClick={() => setContentSource(source)}
                    className={`px-4 py-1.5 rounded-md text-[11px] font-bold transition-all capitalize ${
                      contentSource === source
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-400 hover:text-slate-700"
                    }`}
                  >
                    {source === "saved" ? "Saved" : "Templates"}
                  </button>
                ))}
              </div>

              <button
                onClick={handleCreateNew}
                className="w-9 h-9 rounded-lg bg-[#155E63] hover:bg-[#1F9D8B] text-white flex items-center justify-center transition-colors shadow-sm"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* LIST */}
          <div className="space-y-3">
            {displayList.length > 0 ? (
              displayList.map((item) => (
                <ConfettiCard
                  key={item.id}
                  item={item} // ✔ correct always
                  isActive={item.isActive}
                  onToggle={toggleActive}
                  onEdit={handleEditDraft}
                  onDelete={() => deleteDraft(item)} // ✔ fixed delete
                />
              ))
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">
                  No {contentSource === "saved" ? "saved drafts" : "templates"}{" "}
                  found
                </p>
                <p className="text-slate-400 text-xs mt-1">
                  Items move to "Active on Storefront" when enabled.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
