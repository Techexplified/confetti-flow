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

          return shape; // circle, square
        })
      : ["circle"];

    const base = {
      particleCount: cfg.particleCount || 150,
      spread: cfg.spread || 70,
      gravity: cfg.gravity ?? 1,
      origin: cfg.origin || { x: 0.5, y: 0.6 },
      colors: cfg.colors,
      shapes: resolvedShapes,
    };

    switch (cfg.burstType) {
      case "fireworks": {
        for (let i = 0; i < 3; i++) {
          window.confetti({
            ...base,
            particleCount: Math.round(base.particleCount / 3),
            startVelocity: 50,
            ticks: 250,
            origin: {
              x: 0.2 + 0.3 * i,
              y: Math.random() * 0.4 + 0.1,
            },
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
        window.confetti({
          ...base,
          startVelocity: 45,
        });
    }
  }

  function renderVoucher(config) {
    if (config?.type !== "voucher") return;

    const root = document.getElementById("confetti-launcher-root");
    if (!root) return;

    const code =
      config.code || config.voucherCode || config.voucher?.code || "";

    const html = `
    <div id="confetti-voucher-card" style="
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 999999;
      background: white;
      border-radius: 18px;
      padding: 24px 28px 32px;
      width: 340px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.12);
      text-align: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      animation: fadeSlideIn 0.6s ease-out forwards;
      opacity: 0;
    ">
      
      <!-- ❌ Close Button -->
      <div id="confetti-voucher-close" style="
        position:absolute;
        top:10px;
        right:12px;
        font-size:18px;
        cursor:pointer;
        color:#64748b;
        font-weight:600;
        padding:4px;
      ">&times;</div>

      <div style="font-size: 15px; font-weight: 600; color:#111;">
        ${config.title}
      </div>

      <div style="
        margin-top: 12px;
        padding: 14px;
        background:#f5f7fa;
        border-radius: 12px;
        font-weight: 700;
        letter-spacing: 0.25em;
        font-size: 18px;
        color:#1e293b;
        border: 1px solid #e2e8f0;
      ">
        ${code}
      </div>
    </div>

    <style>
      @keyframes fadeSlideIn {
        0% { opacity: 0; transform: translate(-50%, -20px); }
        100% { opacity: 1; transform: translate(-50%, 0); }
      }
    </style>
  `;

    root.innerHTML = html;

    // 🎯 Add close button handler
    const closeBtn = document.getElementById("confetti-voucher-close");
    const card = document.getElementById("confetti-voucher-card");

    if (closeBtn && card) {
      closeBtn.addEventListener("click", () => {
        card.style.transition = "opacity 0.3s ease, transform 0.3s ease";
        card.style.opacity = "0";
        card.style.transform = "translate(-50%, -20px)";
        setTimeout(() => card.remove(), 300);
      });
    }
  }

  function init() {
    const settings = window.__CONFETTI_SETTINGS__;

    // support both old and new format safely
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
        if (config.type === "voucher") renderVoucher(config);
      };

      // PAGE LOAD
      if (trigger === "page_load") {
        fire();
      }

      // CLICK
      if (trigger === "click") {
        document.addEventListener("click", fire, { once: true });
      }

      // HOVER
      if (trigger === "hover") {
        document.addEventListener("mouseover", fire, { once: true });
      }

      // SCROLL
      if (trigger === "scroll") {
        const onScroll = () => {
          const scrollPercent =
            (window.scrollY /
              (document.body.scrollHeight - window.innerHeight)) *
            100;

          if (scrollPercent > 50) {
            fire();
            window.removeEventListener("scroll", onScroll);
          }
        };

        window.addEventListener("scroll", onScroll);
      }

      // CUSTOM DATE
      if (trigger === "custom_date" && date) {
        const today = new Date();
        const mmdd =
          String(today.getMonth() + 1).padStart(2, "0") +
          "-" +
          String(today.getDate()).padStart(2, "0");

        if (mmdd === date) {
          fire();
        }
      }

      // FORM SUBMIT
      if (trigger === "form_submit") {
        document.addEventListener("submit", fire, true);
      }

      // NEW YEAR
      if (trigger === "new_year") {
        const today = new Date();
        const mmdd =
          String(today.getMonth() + 1).padStart(2, "0") +
          "-" +
          String(today.getDate()).padStart(2, "0");

        if (mmdd === "01-01") {
          fire();
        }
      }

      // PURCHASE COMPLETE

      if (trigger === "purchase" || trigger === "purchase_complete") {
        const path = window.location.pathname;

        // Shopify uses hyphens in /thank-you, and /orders/ for status pages
        const isThankYouPage =
          path.includes("/thank-you") || path.includes("checkouts");

        if (isThankYouPage) {
          fire();
        }
      }
    });
  }

  window.addEventListener("popstate", init);

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", () => waitForConfetti(init));
  else waitForConfetti(init);
})();
