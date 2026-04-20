/* eslint-disable react/prop-types */
import React from "react";
import { ArrowLeft, Globe, Ticket, XCircle, Plus } from "lucide-react";
import { SHAPE_OPTIONS, BURST_TYPES } from "../constants/confettiConstants";

export default function EditorView({
  activeConfig,
  // eslint-disable-next-line react/prop-types
  setActiveConfig,
  fire,
  saveDraft,
  setView,
  savedConfetti,
  savedVouchers,
  onActivate,
  onDeactivate,
}) {
  if (!activeConfig) return null;

  const isVoucher = activeConfig.type === "voucher";

  const buildFirePayload = (config) => ({
    particleCount: config.particleCount ?? 200,
    spread: config.spread ?? 90,
    gravity: config.gravity ?? 1.0,
    colors: config.colors ?? ["#FFB396"],
    shapes: config.shapes?.length ? config.shapes : ["circle"],

    // REQUIRED defaults (your old version always included these)
    origin: { x: 0.5, y: 0.6 },
    startVelocity: 45,
    decay: 0.9,
    drift: 0,

    burstType: config.burstType ?? "cannon",
  });

  const ensureConfettiLoaded = () => {
    return new Promise((resolve) => {
      if (window.confetti) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.4/dist/confetti.browser.min.js";
      script.onload = resolve;
      document.body.appendChild(script);
    });
  };

  // Determine active state based on correct type
  const isActive =
    activeConfig.type === "confetti"
      ? savedConfetti.some((i) => i.id === activeConfig.id && i.isActive)
      : savedVouchers.some((i) => i.id === activeConfig.id && i.isActive);

  const handleTest = async () => {
    await ensureConfettiLoaded();

    // Extract values with safe fallbacks
    const {
      particleCount = 200,
      spread = 90,
      gravity = 1.0,
      shapes = ["circle"],
      colors = ["#FFB396"],
      burstType = "cannon",
    } = activeConfig;

    // OLD working payload
    const payload = {
      particleCount,
      spread,
      gravity,
      burstType,
      colors,
      shapes: shapes.length ? shapes : ["circle"],

      // REQUIRED defaults (old code used these always)
      origin: { x: 0.5, y: 0.6 },
      startVelocity: 45,
      decay: 0.9,
      drift: 0,
    };

    fire(payload);
  };

  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] text-slate-900 overflow-hidden font-sans">
      {/* SETTINGS SIDEBAR */}
      <aside className="w-96 bg-white border-r border-slate-200 flex flex-col overflow-hidden z-10 shadow-sm">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
          <button
            onClick={() => setView("dashboard")}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-bold text-sm text-slate-900">Configuration</h2>
        </div>

        {/* MAIN SETTINGS */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          {/* General */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              General
            </h3>

            {/* Title */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600">Name</label>
              <input
                type="text"
                value={activeConfig.title}
                onChange={(e) =>
                  setActiveConfig({ ...activeConfig, title: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm text-slate-900 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
              />
            </div>

            {/* Voucher Code */}
            {isVoucher && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600">
                  Voucher Code
                </label>
                <input
                  type="text"
                  value={activeConfig.code}
                  onChange={(e) =>
                    setActiveConfig({ ...activeConfig, code: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm font-mono font-bold tracking-[0.1em] uppercase text-green-600 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
                />
              </div>
            )}
          </section>

          {/* Burst Types */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Burst Type
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {BURST_TYPES.map((burst) => (
                <button
                  key={burst.id}
                  onClick={() =>
                    setActiveConfig({ ...activeConfig, burstType: burst.value })
                  }
                  className={`p-2.5 rounded-lg text-xs font-bold transition-all border ${
                    activeConfig.burstType === burst.value
                      ? "bg-green-50 border-green-500 text-green-700"
                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {burst.label}
                </button>
              ))}
            </div>
          </section>

          {/* Shapes (ONLY Confetti) */}
          {!isVoucher && (
            <section className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Shapes
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {SHAPE_OPTIONS.map((shape) => (
                  <button
                    key={shape.id}
                    onClick={() => {
                      const shapes = activeConfig.shapes || [];
                      const newShapes = shapes.includes(shape.id)
                        ? shapes.filter((s) => s !== shape.id)
                        : [...shapes, shape.id];
                      setActiveConfig({
                        ...activeConfig,
                        shapes: newShapes.length > 0 ? newShapes : ["circle"],
                      });
                    }}
                    className={`p-3 rounded-lg transition-all border aspect-square flex items-center justify-center ${
                      (activeConfig.shapes || []).includes(shape.id)
                        ? "bg-pink-50 border-pink-500 text-pink-600"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-400"
                    }`}
                    title={shape.label}
                  >
                    <shape.icon className="w-5 h-5" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* PHYSICS */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Physics
            </h3>

            {/* Gravity */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-600">
                  Gravity
                </label>
                <span className="text-xs font-bold text-green-500">
                  {activeConfig.gravity.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min={0.1}
                max={3}
                step={0.1}
                value={activeConfig.gravity}
                onChange={(e) =>
                  setActiveConfig({
                    ...activeConfig,
                    gravity: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-green-500 cursor-pointer bg-slate-200 rounded-lg h-1.5 appearance-none"
              />
            </div>

            {/* Spread */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-600">
                  Spread
                </label>
                <span className="text-xs font-bold text-green-500">
                  {activeConfig.spread}°
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={360}
                value={activeConfig.spread}
                onChange={(e) =>
                  setActiveConfig({
                    ...activeConfig,
                    spread: parseInt(e.target.value, 10),
                  })
                }
                className="w-full accent-green-500 cursor-pointer bg-slate-200 rounded-lg h-1.5 appearance-none"
              />
            </div>

            {/* Particle Count */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-600">
                  Particle Count
                </label>
                <span className="text-xs font-bold text-green-500">
                  {activeConfig.particleCount}
                </span>
              </div>
              <input
                type="range"
                min={50}
                max={500}
                step={10}
                value={activeConfig.particleCount}
                onChange={(e) =>
                  setActiveConfig({
                    ...activeConfig,
                    particleCount: parseInt(e.target.value, 10),
                  })
                }
                className="w-full accent-green-500 cursor-pointer bg-slate-200 rounded-lg h-1.5 appearance-none"
              />
            </div>
          </section>

          {/* Colors */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Colors
            </h3>
            <div className="grid grid-cols-5 gap-3">
              {(activeConfig.colors || []).map((color, i) => (
                <div key={i} className="relative group">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => {
                      const next = [...(activeConfig.colors || [])];
                      next[i] = e.target.value;
                      setActiveConfig({ ...activeConfig, colors: next });
                    }}
                    className="w-full aspect-square rounded-lg border border-slate-200 cursor-pointer shadow-sm"
                  />
                  <button
                    onClick={() => {
                      const next = activeConfig.colors.filter(
                        (_, idx) => idx !== i,
                      );
                      setActiveConfig({
                        ...activeConfig,
                        colors: next.length > 0 ? next : ["#FFB396"],
                      });
                    }}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-slate-200 hover:bg-red-500 text-slate-600 hover:text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                  >
                    ×
                  </button>
                </div>
              ))}

              {/* Add Color */}
              <button
                onClick={() =>
                  setActiveConfig({
                    ...activeConfig,
                    colors: [...(activeConfig.colors || []), "#FFB396"],
                  })
                }
                className="aspect-square border border-dashed border-slate-300 rounded-lg text-slate-400 hover:text-green-500 hover:border-green-500 hover:bg-green-50 transition-all flex items-center justify-center"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </section>

          {/* Test */}
          <button
            onClick={handleTest}
            className="w-full py-2.5 rounded-lg font-bold text-sm bg-gradient-to-r from-[#155E63] to-[#1F9D8B] text-white shadow-sm hover:shadow-md transition-shadow flex items-center justify-center gap-2"
          >
            Test Confetti
          </button>
        </div>

        {/* Save/Cancel */}
        <div className="px-6 py-4 border-t border-slate-100 space-y-3 bg-white">
          <button
            onClick={saveDraft}
            className="w-full py-2.5 rounded-lg font-bold text-sm bg-slate-900 text-white hover:bg-slate-800 transition-colors"
          >
            Save Draft
          </button>

          <button
            onClick={() => setView("dashboard")}
            className="w-full py-2.5 rounded-lg font-bold text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </aside>

      {/* LIVE PREVIEW */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#F1F5F9]">
        <header className="flex items-center justify-between px-8 py-4 border-b border-slate-200 bg-white">
          <h3 className="font-bold text-sm text-slate-900">Live Preview</h3>

          {/* ACTIVATE / DEACTIVATE BUTTON */}
          <button
            onClick={async () => {
              if (isActive) {
                await onDeactivate(activeConfig);
              } else {
                await onActivate(activeConfig);
              }
              setView("dashboard");
            }}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors flex items-center gap-2 ${
              isActive
                ? "bg-red-50 text-red-600 hover:bg-red-100"
                : "bg-slate-900 text-white hover:bg-slate-800"
            }`}
          >
            {isActive ? (
              <>
                <XCircle size={14} /> Deactivate
              </>
            ) : (
              <>
                <Globe size={14} /> Activate on Store
              </>
            )}
          </button>
        </header>

        {/* PREVIEW CONTENT */}
        <div className="flex-1 flex items-center justify-center p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-40"></div>

          <div className="relative z-10 flex flex-col items-center gap-8 text-center max-w-md w-full">
            {/* Voucher UI */}
            {isVoucher && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xl px-10 py-12 w-full">
                <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center text-green-500 mx-auto mb-4">
                  <Ticket className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-4">
                  {activeConfig.title}
                </h4>
                <div className="bg-slate-50 border border-slate-200 rounded-xl py-3 px-6 font-mono text-2xl font-bold tracking-[0.1em] text-slate-800">
                  {activeConfig.code}
                </div>
              </div>
            )}

            {/* Confetti UI */}
            {!isVoucher && (
              <div className="relative bg-white rounded-2xl border border-slate-200 h-64 w-full flex items-center justify-center overflow-hidden shadow-lg">
                <div className="absolute inset-0 opacity-40">
                  {activeConfig.colors?.map((color, i) => (
                    <div
                      key={i}
                      className="absolute rounded-full"
                      style={{
                        width: Math.random() * 80 + 30 + "px",
                        height: Math.random() * 80 + 30 + "px",
                        left: Math.random() * 100 + "%",
                        top: Math.random() * 100 + "%",
                        backgroundColor: color,
                        filter: "blur(20px)",
                      }}
                    />
                  ))}
                </div>

                <p className="text-slate-400 font-medium text-sm relative z-10 flex flex-col items-center gap-2">
                  Preview Area
                </p>
              </div>
            )}

            {/* Test button */}
            <div>
              <button
                onClick={handleTest}
                className="px-8 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-[#155E63] to-[#1F9D8B] hover:bg-slate-800 transition-all shadow-lg active:scale-95 flex items-center gap-2"
              >
                {isVoucher ? "Reveal Voucher" : "Launch Confetti"}
              </button>
              <div className="mt-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
                Click to test
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
