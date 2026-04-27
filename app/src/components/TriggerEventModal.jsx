// src/components/TriggerEventModal.jsx
import React, { useState } from "react";

const TRIGGER_EVENTS = [
  {
    id: "page_load",
    label: "On page load",
    description: "Fire confetti when page loads.",
  },
  // {
  //   id: "purchase",
  //   label: "On purchase",
  //   description: "Fire confetti on the 'Thank You' page after a checkout.",
  // },
  {
    id: "custom_date",
    label: "On custom date",
    description: "Fire confetti on selected date.",
  },
  {
    id: "click",
    label: "On click",
    description: "Fire confetti when user clicks anywhere.",
  },
  {
    id: "form_submit",
    label: "On form submit",
    description: "Fire confetti when form is submitted.",
  },
  {
    id: "new_year",
    label: "On New Year",
    description: "Fire confetti on Jan 1.",
  },
];

export function TriggerEventModal({ onSelect, onClose }) {
  const [selectedEvent, setSelectedEvent] = useState("page_load");
  const [date, setDate] = useState("");

  const handleConfirm = () => {
    onSelect({
      event: selectedEvent,
      date: selectedEvent === "custom_date" ? date : null,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6 text-slate-900">
          When should confetti appear?
        </h2>

        <div className="space-y-3 mb-6">
          {TRIGGER_EVENTS.map((ev) => (
            <label
              key={ev.id}
              className="flex items-start gap-3 p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <input
                type="radio"
                name="trigger-event"
                value={ev.id}
                checked={selectedEvent === ev.id}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="mt-1 cursor-pointer"
              />
              <div>
                <div className="font-bold text-sm text-slate-900">
                  {ev.label}
                </div>
                <div className="text-xs text-slate-500">{ev.description}</div>
              </div>
            </label>
          ))}
        </div>

        {selectedEvent === "custom_date" && (
          <div className="mb-6">
            <label className="text-xs font-bold text-slate-600 block mb-2">
              Date (MM-DD)
            </label>
            <input
              type="text"
              placeholder="01-15"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500"
            />
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-900 font-bold hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-2 rounded-lg bg-green-500 text-white font-bold hover:bg-green-600 transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
