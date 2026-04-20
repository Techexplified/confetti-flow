/* eslint-disable react/prop-types */
import React from "react";
import { Edit2, Trash2 } from "lucide-react";
import { ToggleSwitch } from "./ToggleSwitch";

function formatTrigger(trigger) {
  const map = {
    page_load: "Page Load",
    click: "Click",
    hover: "Hover",
    scroll: "Scroll",
    form_submit: "Form Submit",
    custom_date: "Custom Date",
    new_year: "New Year",
    purchase_complete: "Purchase Complete",
  };

  return map[trigger] || trigger;
}

export default function ConfettiCard({
  item,
  isActive,
  onToggle,
  onEdit,
  onDelete,
}) {
  return (
    <div
      className={`group flex items-center justify-between p-4 bg-white rounded-xl border transition-all shadow-sm ${
        isActive
          ? "border-green-500 ring-1 ring-green-100 shadow-md"
          : "border-slate-200 hover:border-green-300"
      }`}
    >
      {/* LEFT SECTION */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* ICON */}
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${
            item.type === "confetti"
              ? "bg-green-50 text-green-600"
              : "bg-pink-50 text-pink-600"
          }`}
        >
          {/* {item.type === "confetti" ? "⚡" : "🎫"} */}
          {item?.title?.charAt(0)?.toUpperCase() || "?"}
        </div>

        {/* TEXT */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-sm text-slate-900 truncate">
              {item.title}
            </h4>

            {isActive && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                Live
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-1">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-tight">
              {item.isPredefined ? "Template" : item.createdAt || "Just now"}
            </p>

            {item.isActive && item.trigger && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                {formatTrigger(item.trigger)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT SECTION */}
      <div className="flex items-center gap-4">
        {/* TOGGLE */}
        <div
          className="flex items-center gap-2 pr-4 border-r border-slate-100"
          onClick={(e) => e.stopPropagation()}
        >
          <span
            className={`text-xs font-bold ${
              isActive ? "text-green-600" : "text-slate-400"
            }`}
          >
            {isActive ? "Active" : "Inactive"}
          </span>

          <ToggleSwitch active={isActive} onToggle={() => onToggle(item)} />
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex items-center gap-2">
          {!item.isPredefined ? (
            <>
              {/* EDIT */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(item);
                }}
                className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-green-500 transition-colors"
                title="Edit"
              >
                <Edit2 className="w-4 h-4" />
              </button>

              {/* DELETE (fixed: sends full item object) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item); // ✔ FULL ITEM
                }}
                className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(item);
              }}
              className="text-xs font-bold text-[#155E63] px-3 py-1.5 bg-green-50 hover:bg-green-100 rounded-lg transition-colors flex-shrink-0"
            >
              Use Template
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
