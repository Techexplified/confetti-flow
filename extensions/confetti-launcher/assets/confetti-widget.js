(function () {
  function waitForConfetti(cb) {
    if (window.confetti) cb();
    else setTimeout(() => waitForConfetti(cb), 50);
  }

  function fireConfetti(cfg) {
    if (!cfg || !window.confetti) return;

    const resolvedShapes = cfg.shapes
      ? cfg.shapes.map((shape) => {
          if (shape === "heart") {
            return window.confetti.shapeFromPath({
              path: "M12,21.35L10.55,20.03C5.4,15.36,2,12.28,2,8.5C2,5.42,4.42,3,7.5,3C9.24,3,10.91,3.81,12,5.09C13.09,3.81,14.76,3,16.5,3C19.58,3,22,5.42,22,8.5C22,12.28,18.6,15.36,13.45,20.03L12,21.35Z",
            });
          }
          if (shape === "star") {
            return window.confetti.shapeFromPath({
              path: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z",
            });
          }
          return shape;
        })
      : ["circle"];

    const base = {
      particleCount: cfg.particleCount || 150,
      spread: cfg.spread || 70,
      gravity: cfg.gravity ?? 1,
      origin: cfg.origin || { x: 0.5, y: 0.6 },
      colors: cfg.colors,
      shapes: resolvedShapes,
      scalar: 1.2,
      startVelocity: cfg.startVelocity || 45,
      decay: cfg.decay || 0.9,
      drift: cfg.drift || 0,
    };

    switch (cfg.burstType) {
      case "fireworks": {
        for (let i = 0; i < 3; i++) {
          window.confetti({
            ...base,
            particleCount: Math.round(base.particleCount / 3),
            startVelocity: 50,
            ticks: 250,
            origin: { x: 0.2 + 0.3 * i, y: Math.random() * 0.4 + 0.1 },
          });
        }
        break;
      }
      case "snow":
        window.confetti({
          ...base,
          particleCount: base.particleCount ?? 250,
          spread: 160,
          gravity: 0.3,
          startVelocity: 10,
          ticks: 400,
        });
        break;
      case "pride":
        window.confetti({
          ...base,
          spread: 120,
          startVelocity: 35,
          ticks: 300,
          gravity: 0.7,
        });
        break;
      default:
        window.confetti({ ...base, startVelocity: 45 });
    }
  }

  // ─── Background Effects ───────────────────────────────────────────────────
  function runBackgroundEffect(effectId, colors) {
    const existing = document.getElementById("confetti-bg-canvas");
    if (existing) existing.remove();

    if (!effectId || effectId === "none") return;

    const canvas = document.createElement("canvas");
    canvas.id = "confetti-bg-canvas";
    canvas.style.cssText =
      "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:999990;";
    document.body.appendChild(canvas);

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    const rand = (a, b) => Math.random() * (b - a) + a;
    const pickColor = () =>
      colors && colors.length
        ? colors[Math.floor(Math.random() * colors.length)]
        : "#FFD700";

    let particles = [];
    let sparks = [];
    let raf;

    if (effectId === "balloons") {
      for (let i = 0; i < 22; i++) {
        particles.push({
          x: rand(0, W),
          y: rand(H * 0.3, H + 100),
          r: rand(18, 36),
          color: pickColor(),
          vx: rand(-0.4, 0.4),
          vy: rand(-0.7, -3),
          sway: rand(0, Math.PI * 2),
          swaySpeed: rand(0.01, 0.03),
        });
      }
    } else if (effectId === "petals") {
      for (let i = 0; i < 55; i++) {
        particles.push({
          x: rand(0, W),
          y: rand(-H, 0),
          r: rand(7, 16),
          color: pickColor(),
          vx: rand(-0.5, 0.5),
          vy: rand(0.7, 3),
          rot: rand(0, Math.PI * 2),
          rotSpeed: rand(-0.04, 0.04),
          sway: rand(0, Math.PI * 2),
          swaySpeed: rand(0.01, 0.025),
        });
      }
    } else if (effectId === "money") {
      for (let i = 0; i < 40; i++) {
        particles.push({
          x: rand(0, W),
          y: rand(-H, 0),
          w: rand(20, 36),
          h: rand(11, 18),
          color: pickColor(),
          vy: rand(1.2, 3),
          vx: rand(-0.5, 0.5),
          rot: rand(0, Math.PI * 2),
          rotSpeed: rand(-0.03, 0.03),
        });
      }
    }
    // sparks: emitted every tick, no initial set

    const drawBalloon = (p) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.beginPath();
      ctx.arc(0, 0, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-p.r * 0.3, -p.r * 0.3, p.r * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, p.r);
      ctx.quadraticCurveTo(p.r * 0.5, p.r * 2.5, 0, p.r * 4);
      ctx.strokeStyle = "rgba(0,0,0,0.2)";
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.5;
      ctx.stroke();
      ctx.restore();
    };

    const drawPetal = (p) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, p.r * 0.45, p.r, 0, 0, Math.PI * 2);
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
      ctx.globalAlpha = 0.88;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = `bold ${p.h * 0.75}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("$", 0, 0);
      ctx.restore();
    };

    const emitSparks = () => {
      for (let i = 0; i < 4; i++) {
        const angle = rand(-Math.PI * 0.95, -Math.PI * 0.05);
        const speed = rand(2.5, 7);
        sparks.push({
          x: W / 2 + rand(-30, 30),
          y: H,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: rand(0.012, 0.025),
          r: rand(2, 5),
          color: ["#FF4500", "#FF8C00", "#FFD700", "#FFF5E0"][
            Math.floor(rand(0, 4))
          ],
        });
      }
    };

    const tick = () => {
      ctx.clearRect(0, 0, W, H);

      if (effectId === "balloons") {
        particles.forEach((p) => {
          p.sway += p.swaySpeed;
          p.x += p.vx + Math.sin(p.sway) * 0.5;
          p.y += p.vy;
          if (p.y + p.r * 5 < 0) {
            p.y = H + p.r * 5;
            p.x = rand(0, W);
          }
          drawBalloon(p);
        });
      } else if (effectId === "petals") {
        particles.forEach((p) => {
          p.sway += p.swaySpeed;
          p.x += p.vx + Math.sin(p.sway) * 0.7;
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
          s.vy += 0.15;
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

    // Auto-stop background effect after 12 seconds
    setTimeout(() => {
      cancelAnimationFrame(raf);
      canvas.remove();
    }, 5000);
  }

  // ─── Voucher card ─────────────────────────────────────────────────────────
  function renderVoucher(config) {
    if (config?.type !== "voucher") return;

    const root = document.getElementById("confetti-launcher-root");
    if (!root) return;

    const code =
      config.code || config.voucherCode || config.voucher?.code || "";

    root.innerHTML = `
    <div id="confetti-voucher-card" style="
      position:fixed;top:20px;left:50%;transform:translateX(-50%);
      z-index:999999;background:white;border-radius:18px;
      padding:24px 28px 32px;width:340px;
      box-shadow:0 12px 40px rgba(0,0,0,0.12);
      text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
      animation:fadeSlideIn 0.6s ease-out forwards;opacity:0;">
      <div id="confetti-voucher-close" style="position:absolute;top:10px;right:12px;font-size:18px;cursor:pointer;color:#64748b;font-weight:600;padding:4px;">&times;</div>
      <div style="font-size:15px;font-weight:600;color:#111;">${config.title}</div>
      <div style="margin-top:12px;padding:14px;background:#f5f7fa;border-radius:12px;font-weight:700;letter-spacing:.25em;font-size:18px;color:#1e293b;border:1px solid #e2e8f0;">${code}</div>
    </div>
    <style>@keyframes fadeSlideIn{0%{opacity:0;transform:translate(-50%,-20px)}100%{opacity:1;transform:translate(-50%,0)}}</style>`;

    const closeBtn = document.getElementById("confetti-voucher-close");
    const card = document.getElementById("confetti-voucher-card");
    if (closeBtn && card) {
      closeBtn.addEventListener("click", () => {
        card.style.transition = "opacity .3s ease,transform .3s ease";
        card.style.opacity = "0";
        card.style.transform = "translate(-50%,-20px)";
        setTimeout(() => card.remove(), 300);
      });
    }
  }

  // ─── Init ─────────────────────────────────────────────────────────────────
  function init() {
    const settings = window.__CONFETTI_SETTINGS__;

    const configs = settings?.configs
      ? settings.configs
      : settings?.config
        ? [
            {
              config: settings.config,
              trigger: settings.trigger,
              date: settings.date,
            },
          ]
        : [];

    if (!configs.length) return;

    configs.forEach(({ config, trigger, date }) => {
      const fire = () => {
        fireConfetti(config);
        // 🆕 Run background effect alongside confetti
        if (config.backgroundEffect && config.backgroundEffect !== "none") {
          runBackgroundEffect(config.backgroundEffect, config.colors);
        }
        if (config.type === "voucher") renderVoucher(config);
      };

      if (trigger === "page_load") fire();
      if (trigger === "click")
        document.addEventListener("click", fire, { once: true });
      if (trigger === "hover")
        document.addEventListener("mouseover", fire, { once: true });

      if (trigger === "scroll") {
        const onScroll = () => {
          const pct =
            (window.scrollY /
              (document.body.scrollHeight - window.innerHeight)) *
            100;
          if (pct > 50) {
            fire();
            window.removeEventListener("scroll", onScroll);
          }
        };
        window.addEventListener("scroll", onScroll);
      }

      if (trigger === "custom_date" && date) {
        const today = new Date();
        const mmdd =
          String(today.getMonth() + 1).padStart(2, "0") +
          "-" +
          String(today.getDate()).padStart(2, "0");
        if (mmdd === date) fire();
      }

      if (trigger === "form_submit")
        document.addEventListener("submit", fire, true);

      if (trigger === "new_year") {
        const today = new Date();
        const mmdd =
          String(today.getMonth() + 1).padStart(2, "0") +
          "-" +
          String(today.getDate()).padStart(2, "0");
        if (mmdd === "01-01") fire();
      }

      if (trigger === "purchase" || trigger === "purchase_complete") {
        const path = window.location.pathname;
        const isThankYouPage =
          path.includes("/thank-you") ||
          path.includes("/thank_you") ||
          path.includes("/orders/") ||
          path.includes("checkouts") ||
          window.location.search.includes("?r=") ||
          (typeof Shopify !== "undefined" &&
            Shopify.Checkout?.step === "thank_you");

        if (isThankYouPage) fire();
      }
    });
  }

  window.addEventListener("popstate", init);

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", () => waitForConfetti(init));
  else waitForConfetti(init);
})();
