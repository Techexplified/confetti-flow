/* eslint-disable react/prop-types */
import React, { useEffect, useRef } from "react";
import { ArrowLeft, Globe, Ticket, XCircle, Plus } from "lucide-react";
import {
  SHAPE_OPTIONS,
  BURST_TYPES,
  BACKGROUND_EFFECTS,
} from "../constants/confettiConstants";

// ─── Canvas background-effect renderer ───────────────────────────────────────
// Returns a stop() function. Call it to cancel the animation.
function runBackgroundEffect(canvas, effectId, colors = []) {
  const ctx = canvas.getContext("2d");
  let raf;
  let particles = [];

  const W = canvas.width;
  const H = canvas.height;

  const rand = (a, b) => Math.random() * (b - a) + a;
  const pickColor = () =>
    colors.length
      ? colors[Math.floor(Math.random() * colors.length)]
      : "#FFD700";

  // ── Build initial particle set ──
  if (effectId === "balloons") {
    for (let i = 0; i < 18; i++) {
      particles.push({
        x: rand(0, W),
        y: rand(H * 0.3, H + 100),
        r: rand(18, 36),
        color: pickColor(),
        vx: rand(-0.4, 0.4),
        vy: rand(-0.6, -1.2),
        sway: rand(0, Math.PI * 2),
        swaySpeed: rand(0.01, 0.03),
      });
    }
  } else if (effectId === "petals") {
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: rand(0, W),
        y: rand(-H, 0),
        r: rand(6, 14),
        color: pickColor(),
        vx: rand(-0.5, 0.5),
        vy: rand(0.6, 1.6),
        rot: rand(0, Math.PI * 2),
        rotSpeed: rand(-0.04, 0.04),
        sway: rand(0, Math.PI * 2),
        swaySpeed: rand(0.01, 0.025),
      });
    }
  } else if (effectId === "sparks") {
    // continuously emit from bottom center
  } else if (effectId === "money") {
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: rand(0, W),
        y: rand(-H, 0),
        w: rand(16, 28),
        h: rand(9, 14),
        color: pickColor(),
        vy: rand(1, 2.5),
        vx: rand(-0.4, 0.4),
        rot: rand(0, Math.PI * 2),
        rotSpeed: rand(-0.03, 0.03),
      });
    }
  }

  // ── Draw helpers ──
  const drawBalloon = (p) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    // body
    ctx.beginPath();
    ctx.arc(0, 0, p.r, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = 0.85;
    ctx.fill();
    // shine
    ctx.beginPath();
    ctx.arc(-p.r * 0.3, -p.r * 0.3, p.r * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fill();
    // string
    ctx.beginPath();
    ctx.moveTo(0, p.r);
    ctx.quadraticCurveTo(p.r * 0.5, p.r * 2, 0, p.r * 3.5);
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.6;
    ctx.stroke();
    ctx.restore();
  };

  const drawPetal = (p) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, p.r * 0.5, p.r, 0, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = 0.75;
    ctx.fill();
    ctx.restore();
  };

  const drawMoney = (p) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = `bold ${p.h * 0.7}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("$", 0, 0);
    ctx.restore();
  };

  // ── Spark emitter state ──
  let sparks = [];
  const emitSparks = () => {
    for (let i = 0; i < 3; i++) {
      const angle = rand(-Math.PI * 0.9, -Math.PI * 0.1); // upward arc
      const speed = rand(2, 6);
      sparks.push({
        x: W / 2 + rand(-20, 20),
        y: H,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: rand(0.012, 0.025),
        r: rand(2, 4),
        color: ["#FF4500", "#FF8C00", "#FFD700", "#FFF"][
          Math.floor(rand(0, 4))
        ],
      });
    }
  };

  // ── Animation loop ──
  const tick = () => {
    ctx.clearRect(0, 0, W, H);

    if (effectId === "balloons") {
      particles.forEach((p) => {
        p.sway += p.swaySpeed;
        p.x += p.vx + Math.sin(p.sway) * 0.4;
        p.y += p.vy;
        if (p.y + p.r * 4 < 0) {
          p.y = H + p.r * 4;
          p.x = rand(0, W);
        }
        drawBalloon(p);
      });
    } else if (effectId === "petals") {
      particles.forEach((p) => {
        p.sway += p.swaySpeed;
        p.x += p.vx + Math.sin(p.sway) * 0.6;
        p.y += p.vy;
        p.rot += p.rotSpeed;
        if (p.y - p.r > H) {
          p.y = -p.r;
          p.x = rand(0, W);
        }
        drawPetal(p);
      });
    } else if (effectId === "sparks") {
      emitSparks();
      sparks.forEach((s) => {
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.12; // gravity
        s.life -= s.decay;
        ctx.save();
        ctx.globalAlpha = Math.max(0, s.life);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * s.life, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.fill();
        ctx.restore();
      });
      sparks = sparks.filter((s) => s.life > 0);
    } else if (effectId === "money") {
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.rotSpeed;
        if (p.y - p.h > H) {
          p.y = -p.h;
          p.x = rand(0, W);
        }
        drawMoney(p);
      });
    }

    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

// ─── BackgroundEffectCanvas component ────────────────────────────────────────
function BackgroundEffectCanvas({ effectId, colors }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !effectId || effectId === "none") return;
    const stop = runBackgroundEffect(canvas, effectId, colors);
    return stop;
  }, [effectId, colors?.join(",")]);

  if (!effectId || effectId === "none") return null;

  return (
    <canvas
      ref={canvasRef}
      width={520}
      height={256}
      className="absolute inset-0 w-full h-full pointer-events-none rounded-2xl"
    />
  );
}

// ─── Main EditorView ──────────────────────────────────────────────────────────
export default function EditorView({
  activeConfig,
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
  const currentEffect = activeConfig.backgroundEffect || "none";

  const ensureConfettiLoaded = () =>
    new Promise((resolve) => {
      if (window.confetti) return resolve();
      const script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.4/dist/confetti.browser.min.js";
      script.onload = resolve;
      document.body.appendChild(script);
    });

  const isActive =
    activeConfig.type === "confetti"
      ? savedConfetti.some((i) => i.id === activeConfig.id && i.isActive)
      : savedVouchers.some((i) => i.id === activeConfig.id && i.isActive);

  const handleTest = async () => {
    await ensureConfettiLoaded();
    const {
      particleCount = 200,
      spread = 90,
      gravity = 1.0,
      shapes = ["circle"],
      colors = ["#FFB396"],
      burstType = "cannon",
    } = activeConfig;

    fire({
      particleCount,
      spread,
      gravity,
      burstType,
      colors,
      shapes: shapes.length ? shapes : ["circle"],
      origin: { x: 0.5, y: 0.6 },
      startVelocity: 45,
      decay: 0.9,
      drift: 0,
    });
  };

  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] text-slate-900 overflow-hidden font-sans">
      {/* ── SETTINGS SIDEBAR ── */}
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

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          {/* General */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              General
            </h3>

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

          {/* 🆕 Background Effects */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Background Effect
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {BACKGROUND_EFFECTS.map((effect) => (
                <button
                  key={effect.id}
                  onClick={() =>
                    setActiveConfig({
                      ...activeConfig,
                      backgroundEffect: effect.id,
                    })
                  }
                  className={`p-2.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 ${
                    currentEffect === effect.id
                      ? "bg-purple-50 border-purple-500 text-purple-700"
                      : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span>{effect.emoji}</span>
                  <span>{effect.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Shapes (confetti only) */}
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

          {/* Physics */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Physics
            </h3>

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

          <button
            onClick={handleTest}
            className="w-full py-2.5 rounded-lg font-bold text-sm bg-gradient-to-r from-[#155E63] to-[#1F9D8B] text-white shadow-sm hover:shadow-md transition-shadow flex items-center justify-center gap-2"
          >
            Test Confetti
          </button>
        </div>

        {/* Save / Cancel */}
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

      {/* ── LIVE PREVIEW ── */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#F1F5F9]">
        <header className="flex items-center justify-between px-8 py-4 border-b border-slate-200 bg-white">
          <h3 className="font-bold text-sm text-slate-900">Live Preview</h3>
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

        <div className="flex-1 flex items-center justify-center p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />

          <div className="relative z-10 flex flex-col items-center gap-8 text-center max-w-md w-full">
            {/* Voucher UI */}
            {isVoucher && (
              <div className="relative bg-white rounded-2xl border border-slate-200 shadow-xl px-10 py-12 w-full overflow-hidden">
                <BackgroundEffectCanvas
                  effectId={currentEffect}
                  colors={activeConfig.colors}
                />
                <div className="relative z-10">
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
              </div>
            )}

            {/* Confetti UI */}
            {!isVoucher && (
              <div className="relative bg-white rounded-2xl border border-slate-200 h-64 w-full flex items-center justify-center overflow-hidden shadow-lg">
                {/* Background effect canvas */}
                <BackgroundEffectCanvas
                  effectId={currentEffect}
                  colors={activeConfig.colors}
                />

                {/* Colour blobs (only when no effect active) */}
                {currentEffect === "none" && (
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
                )}

                <p className="text-slate-400 font-medium text-sm relative z-10 flex flex-col items-center gap-2">
                  {currentEffect !== "none" ? (
                    <span className="text-2xl">
                      {
                        BACKGROUND_EFFECTS.find((e) => e.id === currentEffect)
                          ?.emoji
                      }
                    </span>
                  ) : (
                    "Preview Area"
                  )}
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
