/**
 * ConfettiFlow - High-Performance Storefront Celebrations Engine
 * Version 2.0
 */
(function () {
  "use strict";

  // Prevent multiple initializations
  if (window.__CONFETTI_FLOW_INITIALIZED__) return;
  window.__CONFETTI_FLOW_INITIALIZED__ = true;

  const state = {
    shop:
      window.__CONFETTI_FLOW__?.shop ||
      window.Shopify?.shop ||
      window.location.hostname,
    effects: [],
    loaded: false,
    // App Proxy URL injected by Liquid — works in both dev (Cloudflare tunnel) and production
    effectsEndpoint:
      window.__CONFETTI_FLOW__?.effectsEndpoint ||
      "/apps/confetti/effects",
    analyticsEndpoint:
      window.__CONFETTI_FLOW__?.analyticsEndpoint ||
      "/apps/confetti/analytics/track",
  };

  console.log("[ConfettiFlow] Initializing for shop:", state.shop, "| Endpoint:", state.effectsEndpoint);

  // --------------------------------------------------------------------------
  // 0. ANALYTICS BEACON — fire-and-forget, never blocks confetti
  // --------------------------------------------------------------------------
  function trackFire(effectId, effectName, completed) {
    try {
      const payload = JSON.stringify({
        shop: state.shop,
        effectId: effectId || "",
        effectName: effectName || "Unknown",
        completed: completed !== false,
      });
      // sendBeacon is the most reliable non-blocking method
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon(state.analyticsEndpoint, blob);
      } else {
        fetch(state.analyticsEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(function () {});
      }
    } catch (e) {
      // Never throw — analytics must never break confetti
    }
  }

  // Expose global API for theme developers
  window.ConfettiFlow = {
    effects: [],
    trigger: function (identifier) {
      if (!state.effects.length) return;
      const target = state.effects.find(
        (eff) =>
          eff.id === identifier ||
          eff.name?.toLowerCase() === String(identifier).toLowerCase()
      );
      if (target) {
        launchEffect(target);
      } else {
        // Fallback: fire the first active effect
        launchEffect(state.effects[0]);
      }
    },
    fire: function (config) {
      launchEffect(config);
    },
  };

  // --------------------------------------------------------------------------
  // --------------------------------------------------------------------------
  // 1. SOUND SYNTHESIZER & AUTOPLAY UNLOCK ENGINE
  // --------------------------------------------------------------------------
  // Sound file name → asset filename mapping (.mp3 lightweight assets: 20-50KB each)
  var SOUND_FILES = {
    "Fairy magic sparkle":              "mixkit-fairy-magic-sparkle-871.mp3",
    "Magic wand sparkle":               "mixkit-magic-wand-sparkle-3062.mp3",
    "Magic sparkle touch":              "mixkit-magic-sparkle-touch-3083.mp3",
    "Magic sparkle poof hit":           "mixkit-magic-sparkle-poof-hit-3082.mp3",
    "Fairy sparkle whoosh":             "mixkit-fairy-sparkle-whoosh-869.mp3",
    "Sparkling fairy glow":             "mixkit-sparkling-fairy-glow-870.mp3",
    "Sparkle hybrid transition":        "mixkit-sparkle-hybrid-transition-3060.mp3",
    "Magic sparkle whoosh":             "mixkit-magic-sparkle-whoosh-2350.mp3",
    "Magic notification ring":          "mixkit-magic-notification-ring-2344.mp3",
    "Fantasy game success notification":"mixkit-fantasy-game-success-notification-270.mp3",
  };

  var _audioCtx = null;
  var _bufferCache = {};
  var _preloadedSounds = {};
  var _pendingSound = null;

  function getAudioContext() {
    try {
      if (!_audioCtx) {
        var AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return null;
        _audioCtx = new AudioCtx();
      }
      return _audioCtx;
    } catch (e) {
      return null;
    }
  }

  function getSoundUrl(fileName) {
    var raw = (window.__CONFETTI_FLOW__ && window.__CONFETTI_FLOW__.soundBaseUrl) || "";
    if (raw) {
      if (raw.includes("?file=")) {
        return raw + encodeURIComponent(fileName);
      }
      return raw.replace(/\/?$/, "/") + encodeURIComponent(fileName);
    }
    var appUrl = (window.__CONFETTI_FLOW__ && window.__CONFETTI_FLOW__.appUrl) || "";
    if (appUrl) {
      return appUrl.replace(/\/?$/, "/") + "/api/storefront/sound?file=" + encodeURIComponent(fileName);
    }
    return "/api/storefront/sound?file=" + encodeURIComponent(fileName);
  }

  // Preload and pre-decode active sounds (preset or custom Base64 audio into RAM buffer)
  function preloadSound(soundType, customSoundData, customKey) {
    var key = customKey || soundType;
    if (!key || _preloadedSounds[key] || _bufferCache[key]) return;
    _preloadedSounds[key] = true;

    var ctx = getAudioContext();
    if (!ctx) return;

    if (customSoundData) {
      // Decode Base64 custom audio into RAM buffer for zero-latency playback
      fetch(customSoundData)
        .then(function (r) { return r.arrayBuffer(); })
        .then(function (ab) {
          ctx.decodeAudioData(
            ab,
            function (buf) {
              _bufferCache[key] = buf;
              console.log("[ConfettiFlow Audio] RAM buffer ready for custom sound:", key);
            },
            function (err) {
              console.warn("[ConfettiFlow Audio] Custom sound decode failed:", err);
            }
          );
        })
        .catch(function () {});
      return;
    }

    var fileName = SOUND_FILES[soundType];
    if (!fileName) return;
    var url = getSoundUrl(fileName);
    fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.arrayBuffer();
      })
      .then(function (ab) {
        ctx.decodeAudioData(
          ab,
          function (buf) {
            _bufferCache[key] = buf;
            console.log("[ConfettiFlow Audio] RAM buffer ready for active sound:", soundType);
          },
          function () {}
        );
      })
      .catch(function () {});
  }

  function preloadActiveSounds(effects) {
    if (!Array.isArray(effects)) return;
    effects.forEach(function (eff) {
      var isSoundOn = eff.soundEnabled === true || eff.soundEnabled === "true";
      if (isSoundOn) {
        if (eff.customSound) {
          preloadSound(null, eff.customSound, "custom_" + eff.id);
        } else if (eff.soundType) {
          preloadSound(eff.soundType);
        }
      }
    });
  }

  function playCelebrationSound(soundType, customSoundData, effectId) {
    var customKey = effectId ? "custom_" + effectId : null;
    var cacheKey = (customSoundData && customKey) ? customKey : soundType;

    var ctx = getAudioContext();
    if (ctx && ctx.state === "running" && cacheKey && _bufferCache[cacheKey]) {
      try {
        var source = ctx.createBufferSource();
        source.buffer = _bufferCache[cacheKey];
        source.connect(ctx.destination);
        source.start(0);
        return;
      } catch (e) {}
    }

    // Try HTMLAudioElement
    try {
      var audioSrc = customSoundData || (soundType && SOUND_FILES[soundType] ? getSoundUrl(SOUND_FILES[soundType]) : null);
      if (!audioSrc) return;
      var audio = new Audio(audioSrc);
      audio.volume = 0.85;
      var playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(function (err) {
          console.log("[ConfettiFlow Audio] Autoplay awaiting interaction:", err.name);
          _pendingSound = { soundType: soundType, customSoundData: customSoundData, effectId: effectId };
        });
      }
    } catch (e) {
      _pendingSound = { soundType: soundType, customSoundData: customSoundData, effectId: effectId };
    }
  }

  // Unlock AudioContext + kick off active sound loading immediately on first user gesture
  function setupAudioUnlocker() {
    var handler = function () {
      var ctx = getAudioContext();
      if (ctx && ctx.state === "suspended") {
        ctx.resume().catch(function () {});
      }
      if (state.effects && state.effects.length) {
        preloadActiveSounds(state.effects);
      }
      if (_pendingSound) {
        var s = _pendingSound;
        _pendingSound = null;
        if (typeof s === "object" && s !== null) {
          playCelebrationSound(s.soundType, s.customSoundData, s.effectId);
        } else {
          playCelebrationSound(s);
        }
      }
    };
    ["pointerdown", "touchstart", "click", "keydown", "scroll"].forEach(function (evt) {
      document.addEventListener(evt, handler, { passive: true, once: true });
    });
  }
  setupAudioUnlocker();

  // --------------------------------------------------------------------------
  // 1.5 STOREFRONT BRAND COLOR RESOLUTION ENGINE
  // --------------------------------------------------------------------------
  function generateClientHarmoniousPalette(baseHex, extraHexes) {
    function hexToHsl(hex) {
      var c = hex.replace("#", "").trim();
      if (c.length === 3) c = c.split("").map(function (x) { return x + x; }).join("");
      var num = parseInt(c, 16);
      var r = (num >> 16) / 255, g = ((num >> 8) & 255) / 255, b = (num & 255) / 255;
      var max = Math.max(r, g, b), min = Math.min(r, g, b);
      var h = 0, s = 0, l = (max + min) / 2;
      if (max !== min) {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
    }

    function hslToHex(h, s, l) {
      s /= 100; l /= 100;
      var c = (1 - Math.abs(2 * l - 1)) * s;
      var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
      var m = l - c / 2;
      var r = 0, g = 0, b = 0;
      if (h < 60) { r = c; g = x; b = 0; }
      else if (h < 120) { r = x; g = c; b = 0; }
      else if (h < 180) { r = 0; g = c; b = x; }
      else if (h < 240) { r = 0; g = x; b = c; }
      else if (h < 300) { r = x; g = 0; b = c; }
      else { r = c; g = 0; b = x; }
      var toHex = function (n) {
        var val = Math.round((n + m) * 255).toString(16);
        return val.length === 1 ? "0" + val : val;
      };
      return "#" + toHex(r) + toHex(g) + toHex(b);
    }

    var hsl = hexToHsl(baseHex);
    if (hsl.s < 15) {
      return [baseHex, "#f59e0b", "#475569", "#fbbf24", "#94a3b8"];
    }

    var palette = [baseHex];
    if (Array.isArray(extraHexes)) {
      for (var i = 0; i < extraHexes.length; i++) {
        var ex = extraHexes[i];
        if (palette.length < 3 && palette.indexOf(ex) === -1) {
          palette.push(ex);
        }
      }
    }

    if (palette.length < 2) palette.push(hslToHex(hsl.h, Math.min(100, Math.max(70, hsl.s + 10)), Math.min(75, Math.max(55, hsl.l + 22))));
    if (palette.length < 3) palette.push(hslToHex(hsl.h, hsl.s, Math.max(16, hsl.l - 12)));
    if (palette.length < 4) palette.push(hslToHex((hsl.h + 35) % 360, Math.min(100, Math.max(65, hsl.s)), Math.min(70, Math.max(45, hsl.l))));
    if (palette.length < 5) palette.push(hslToHex((hsl.h + 65) % 360, Math.min(100, Math.max(70, hsl.s)), Math.min(65, Math.max(50, hsl.l))));
    return palette.slice(0, 5);
  }

  function resolveStorefrontBrandPalette(fallbackColors) {
    try {
      var candidates = [];

      // 1. Check window.__CONFETTI_FLOW__.themeColors injected by Liquid
      if (Array.isArray(window.__CONFETTI_FLOW__ && window.__CONFETTI_FLOW__.themeColors)) {
        for (var i = 0; i < window.__CONFETTI_FLOW__.themeColors.length; i++) {
          var c = window.__CONFETTI_FLOW__.themeColors[i];
          if (typeof c === "string" && /^#[0-9a-fA-F]{3,6}$/.test(c.trim())) {
            candidates.push(c.trim().toLowerCase());
          }
        }
      }

      // 2. Check CSS variables on :root and body
      if (typeof window !== "undefined" && window.getComputedStyle) {
        var rootStyle = getComputedStyle(document.documentElement);
        var bodyStyle = getComputedStyle(document.body);
        var varNames = [
          "--color-button",
          "--color-primary",
          "--color-base-accent-1",
          "--color-base-solid-button-labels",
          "--color-base-accent-2",
          "--color-accent",
        ];
        for (var j = 0; j < varNames.length; j++) {
          var name = varNames[j];
          var val = (rootStyle.getPropertyValue(name) || bodyStyle.getPropertyValue(name) || "").trim();
          if (val) {
            if (/^#[0-9a-fA-F]{3,6}$/.test(val)) {
              candidates.push(val.toLowerCase());
            } else if (/^\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}$/.test(val)) {
              var parts = val.split(",").map(function (n) { return parseInt(n.trim(), 10); });
              var hex = "#" + parts.map(function (n) {
                var s = n.toString(16);
                return s.length === 1 ? "0" + s : s;
              }).join("");
              candidates.push(hex.toLowerCase());
            }
          }
        }
      }

      // 3. Fallback to colors configured on the effect
      if (Array.isArray(fallbackColors) && fallbackColors.length) {
        for (var k = 0; k < fallbackColors.length; k++) {
          var fc = fallbackColors[k];
          if (typeof fc === "string" && /^#[0-9a-fA-F]{3,6}$/.test(fc.trim())) {
            candidates.push(fc.trim().toLowerCase());
          }
        }
      }

      // Filter out neutral whites, pure blacks
      var unique = [];
      for (var u = 0; u < candidates.length; u++) {
        var candidate = candidates[u];
        if (
          candidate !== "#ffffff" &&
          candidate !== "#000000" &&
          candidate !== "#fff" &&
          candidate !== "#000" &&
          unique.indexOf(candidate) === -1
        ) {
          unique.push(candidate);
        }
      }

      if (unique.length >= 4) {
        return unique.slice(0, 5);
      }

      var primary = unique[0] || (Array.isArray(fallbackColors) && fallbackColors[0]) || "#008060";
      return generateClientHarmoniousPalette(primary, unique);
    } catch (e) {
      return Array.isArray(fallbackColors) && fallbackColors.length
        ? fallbackColors
        : ["#008060", "#004c3f", "#479ccf", "#0099e6", "#002aff"];
    }
  }

  // --------------------------------------------------------------------------
  // 2. PHYSICS CANVAS ENGINE (Full Screen Hardware Accelerated)
  // --------------------------------------------------------------------------
  function launchEffect(config) {
    if (!config) return;

    // Track this fire immediately (non-blocking beacon)
    trackFire(config.id, config.name, true);

    const isSoundOn =
      config.soundEnabled === true || config.soundEnabled === "true";
    if (isSoundOn && (config.soundType || config.customSound)) {
      playCelebrationSound(config.soundType, config.customSound, config.id);
    } else {
      console.log(
        "[ConfettiFlow Audio] Sound pairing inactive for this effect (soundEnabled: " +
          config.soundEnabled +
          ", soundType: " +
          config.soundType +
          ")"
      );
    }

    const container =
      document.getElementById("confetti-flow-canvas-container") ||
      document.body;

    const canvas = document.createElement("canvas");
    canvas.style.cssText =
      "position: fixed; inset: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 9999999; overflow: hidden;";
    container.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.scale(dpr, dpr);

    // Preload custom image if present
    let customImg = null;
    if (config.shape === "custom" && config.customImage) {
      customImg = new Image();
      customImg.src = config.customImage;
    }

    const mode = config.mode || "Burst";
    const position = config.position || "Full screen";
    const duration = config.duration || 3;
    const intensity = config.intensity || 2;
    let colors =
      config.colors && config.colors.length
        ? config.colors.slice()
        : ["#e11d48", "#fbbf24", "#6366f1", "#10b981", "#ec4899"];

    // If useBrandColor is enabled, dynamically resolve the storefront's active theme palette
    if (config.useBrandColor === true || config.useBrandColor === "true") {
      var brandPalette = resolveStorefrontBrandPalette(config.colors);
      if (brandPalette && brandPalette.length) {
        colors = brandPalette;
      }
    }

    const durationMs = duration * 1000;
    const intensityScale = [0.7, 1.0, 1.5, 2.2][intensity - 1] || 1.0;
    const startTime = performance.now();

    // Determine Origin
    const getOrigin = () => {
      let ox = width / 2;
      let oy = height / 2;
      if (position === "Top") oy = height * 0.15;
      else if (position === "Bottom") oy = height * 0.85;
      else if (position === "Left side") ox = width * 0.2;
      else if (position === "Right side") ox = width * 0.8;
      return { ox, oy };
    };

    const { ox, oy } = getOrigin();
    let particles = [];

    const shapeList = (config.shape || "circle").split(",").map((s) => s.trim());
    const getParticleShape = () =>
      shapeList[Math.floor(Math.random() * shapeList.length)] || "circle";

    // Helper: draw customized shape
    const drawShape = (p) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.scale(p.scaleX, 1);
      ctx.globalAlpha = Math.max(0, p.alpha);

      const activeShape = p.shape || getParticleShape();

      if (activeShape === "custom" && customImg && customImg.complete) {
        ctx.drawImage(customImg, -p.size / 2, -p.size / 2, p.size, p.size);
      } else if (activeShape === "snowflake") {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1.4, p.size * 0.16);
        ctx.lineCap = "round";
        ctx.beginPath();
        const r = p.size * 0.9;
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3;
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          const bX = Math.cos(a) * (r * 0.6);
          const bY = Math.sin(a) * (r * 0.6);
          ctx.moveTo(bX, bY);
          ctx.lineTo(
            bX + Math.cos(a + Math.PI / 4) * (r * 0.35),
            bY + Math.sin(a + Math.PI / 4) * (r * 0.35)
          );
          ctx.moveTo(bX, bY);
          ctx.lineTo(
            bX + Math.cos(a - Math.PI / 4) * (r * 0.35),
            bY + Math.sin(a - Math.PI / 4) * (r * 0.35)
          );
        }
        ctx.stroke();
      } else if (activeShape === "rectangle") {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        const w = p.size * 1.1;
        const h = p.size * 1.8;
        ctx.rect(-w / 2, -h / 2, w, h);
        ctx.fill();
      } else if (activeShape === "tag") {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        const w = p.size * 1.2;
        const h = p.size * 1.8;
        const cut = w * 0.35;
        ctx.moveTo(-w / 2, -h / 2 + cut);
        ctx.lineTo(-w / 2 + cut, -h / 2);
        ctx.lineTo(w / 2 - cut, -h / 2);
        ctx.lineTo(w / 2, -h / 2 + cut);
        ctx.lineTo(w / 2, h / 2);
        ctx.lineTo(-w / 2, h / 2);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, -h / 2 + cut * 0.85, p.size * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      } else if (activeShape === "star") {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        const spikes = 5;
        const outerR = p.size;
        const innerR = p.size * 0.45;
        for (let s = 0; s < spikes * 2; s++) {
          const r = s % 2 === 0 ? outerR : innerR;
          const a = (s * Math.PI) / spikes;
          if (s === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
      } else if (activeShape === "heart") {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        const h = p.size * 0.8;
        ctx.moveTo(0, -h * 0.3);
        ctx.bezierCurveTo(-h * 0.6, -h * 0.9, -h, -h * 0.2, 0, h * 0.7);
        ctx.bezierCurveTo(h, -h * 0.2, h * 0.6, -h * 0.9, 0, -h * 0.3);
        ctx.fill();
      } else if (activeShape === "triangle") {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.lineTo(p.size * 0.86, p.size * 0.5);
        ctx.lineTo(-p.size * 0.86, p.size * 0.5);
        ctx.closePath();
        ctx.fill();
      } else {
        // Circle / oval confetti
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    // 1. BURST MODE
    if (mode === "Burst") {
      const count = Math.round(90 * intensityScale);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed =
          (Math.random() * 9 + 5) * (0.85 + intensityScale * 0.15);
        particles.push({
          x: ox,
          y: oy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2.5,
          color: colors[i % colors.length],
          size: Math.random() * 5 + 6,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.3,
          scaleX: 1,
          scaleSpeed: Math.random() * 0.08 + 0.04,
          gravity: 0.24,
          friction: 0.97,
          alpha: 1,
        });
      }
    }

    let animFrame = null;
    let lastTime = performance.now();
    let lastCannonVolley = -1;

    function renderLoop(now) {
      const elapsed = now - startTime;
      if (
        elapsed > durationMs + 2500 ||
        (elapsed > durationMs && particles.length === 0)
      ) {
        canvas.remove();
        return;
      }

      ctx.clearRect(0, 0, width, height);

      // SPAWN MODES: Falling, Fountain, Fireworks
      if (mode === "Falling" && elapsed < durationMs) {
        const spawnCount = Math.round(2 * intensityScale);
        for (let i = 0; i < spawnCount; i++) {
          particles.push({
            x: Math.random() * width,
            y: -15,
            vx: (Math.random() - 0.5) * 1.8,
            vy: Math.random() * 2.5 + 2.2,
            swaySpeed: Math.random() * 0.04 + 0.02,
            swayAmp: Math.random() * 25 + 15,
            swayOffset: Math.random() * Math.PI * 2,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: Math.random() * 4 + 6,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.15,
            scaleX: 1,
            scaleSpeed: Math.random() * 0.06 + 0.03,
            alpha: 1,
            fadeStart: durationMs - 500,
          });
        }
      } else if (mode === "Fountain" && elapsed < durationMs * 0.88) {
        // Resolve reservoir origin based on position setting
        let fountainX = width * 0.5;
        let fountainY = Math.min(height - 24, height * 0.95);

        if (position === "Center") {
          fountainX = width * 0.5;
          fountainY = height * 0.58;
        } else if (position === "Around button/element") {
          fountainX = width * 0.5;
          fountainY = height * 0.55;
        } else if (position === "Top") {
          fountainX = width * 0.5;
          fountainY = height * 0.35;
        } else if (position === "Left side") {
          fountainX = width * 0.22;
          fountainY = Math.min(height - 24, height * 0.95);
        } else if (position === "Right side") {
          fountainX = width * 0.78;
          fountainY = Math.min(height - 24, height * 0.95);
        }

        // Reservoir spread: visible width at the lower reservoir base
        const reservoirWidth = Math.min(70, width * 0.08);

        // Dynamically compute target rise so the higher point (apex) reaches the upper viewport (~15-22% from top)
        const targetApexY = Math.max(
          height * 0.12,
          Math.min(height * 0.22, fountainY * 0.25)
        );
        const targetRise = Math.max(120, fountainY - targetApexY);
        const baseSpeed = Math.sqrt(targetRise * 1.05);

        const spawnCount = Math.round(3.2 * intensityScale);
        for (let i = 0; i < spawnCount; i++) {
          const isSplash = i === 0 && Math.random() < 0.45;

          let angle;
          if (isSplash) {
            // Lower reservoir splash: wider angle, smaller rise to keep the reservoir visibly bubbling
            angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
          } else if (position === "Left side") {
            angle = -Math.PI / 2 + (Math.random() - 0.35) * 0.55;
          } else if (position === "Right side") {
            angle = -Math.PI / 2 + (Math.random() - 0.65) * 0.55;
          } else {
            angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.55;
          }

          let speed;
          if (isSplash) {
            speed = (Math.random() * 4 + 4) * (0.85 + intensityScale * 0.15);
          } else {
            const speedMult = 0.76 + Math.random() * 0.36; // 0.76 to 1.12
            speed = baseSpeed * speedMult * (0.85 + intensityScale * 0.15);
          }

          particles.push({
            x: fountainX + (Math.random() - 0.5) * reservoirWidth,
            y: fountainY + (Math.random() - 0.5) * 6,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: isSplash ? Math.random() * 3 + 4 : Math.random() * 5 + 6,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.3,
            scaleX: 1,
            scaleSpeed: Math.random() * 0.08 + 0.04,
            gravity: isSplash ? 0.35 : 0.28,
            friction: isSplash ? 0.97 : 0.988,
            alpha: 1,
          });
        }
      } else if (mode === "Cannon" && elapsed < durationMs * 0.8) {
        const cannonVolleyInterval = 480;
        const currentVolley = Math.floor(elapsed / cannonVolleyInterval);
        if (currentVolley > lastCannonVolley) {
          lastCannonVolley = currentVolley;
          const volleyCount = Math.round(28 * intensityScale);
          const targetDist = Math.max(width * 0.72, height * 0.85);
          const baseSpeed = Math.sqrt(targetDist * 1.35);

          // Left Cannon (blasts towards upper-right)
          if (position !== "Right side") {
            const originX =
              position === "Around button/element" ? width * 0.42 : 0;
            const originY =
              position === "Around button/element"
                ? height * 0.52
                : Math.min(height - 10, height * 0.94);
            for (let i = 0; i < volleyCount; i++) {
              const angle = -Math.PI * 0.30 + (Math.random() - 0.5) * 0.36;
              const speedMult = 0.82 + Math.random() * 0.38;
              const speed =
                baseSpeed * speedMult * (0.85 + intensityScale * 0.15);
              particles.push({
                x: originX,
                y: originY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: colors[Math.floor(Math.random() * colors.length)],
                shape: getParticleShape(),
                size: Math.random() * 6 + 7,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.35,
                scaleX: 1,
                scaleSpeed: Math.random() * 0.07 + 0.04,
                gravity: 0.22,
                friction: 0.984,
                alpha: 1,
              });
            }
          }

          // Right Cannon (blasts towards upper-left)
          if (position !== "Left side") {
            const originX =
              position === "Around button/element" ? width * 0.58 : width;
            const originY =
              position === "Around button/element"
                ? height * 0.52
                : Math.min(height - 10, height * 0.94);
            for (let i = 0; i < volleyCount; i++) {
              const angle = -Math.PI * 0.70 + (Math.random() - 0.5) * 0.36;
              const speedMult = 0.82 + Math.random() * 0.38;
              const speed =
                baseSpeed * speedMult * (0.85 + intensityScale * 0.15);
              particles.push({
                x: originX,
                y: originY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: colors[Math.floor(Math.random() * colors.length)],
                shape: getParticleShape(),
                size: Math.random() * 6 + 7,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.35,
                scaleX: 1,
                scaleSpeed: Math.random() * 0.07 + 0.04,
                gravity: 0.22,
                friction: 0.984,
                alpha: 1,
              });
            }
          }
        }
      } else if (mode === "Fireworks") {
        if (Math.random() < 0.12 * intensityScale && elapsed < durationMs - 400) {
          const fx = Math.random() * (width * 0.7) + width * 0.15;
          const fy = Math.random() * (height * 0.45) + height * 0.15;
          const count = Math.round(35 * intensityScale);
          for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
            const speed = Math.random() * 5.5 + 2.5;
            particles.push({
              x: fx,
              y: fy,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              color: colors[Math.floor(Math.random() * colors.length)],
              size: Math.random() * 4 + 5,
              rotation: Math.random() * Math.PI * 2,
              rotSpeed: (Math.random() - 0.5) * 0.3,
              scaleX: 1,
              scaleSpeed: Math.random() * 0.08 + 0.04,
              gravity: 0.18,
              friction: 0.965,
              alpha: 1,
            });
          }
        }
      }

      // Physics update & render
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        if (mode === "Falling") {
          p.x += p.vx + Math.sin(elapsed * p.swaySpeed + p.swayOffset) * 0.8;
          p.y += p.vy;
          if (elapsed > p.fadeStart) {
            p.alpha = Math.max(0, 1 - (elapsed - p.fadeStart) / 500);
          }
        } else {
          p.vx *= p.friction || 0.97;
          p.vy *= p.friction || 0.97;
          p.vy += p.gravity || 0.24;
          p.x += p.vx;
          p.y += p.vy;

          if (elapsed > durationMs) {
            p.alpha = Math.max(0, 1 - (elapsed - durationMs) / 1200);
          }
        }

        p.rotation += p.rotSpeed;
        p.scaleX = Math.cos(elapsed * p.scaleSpeed);

        if (p.alpha > 0.01 && p.y < height + 80) {
          drawShape(p);
        } else {
          particles.splice(i, 1);
        }
      }

      animFrame = requestAnimationFrame(renderLoop);
    }

    animFrame = requestAnimationFrame(renderLoop);
  }

  // --------------------------------------------------------------------------
  // 3. STOREFRONT TRIGGER EVALUATOR
  // --------------------------------------------------------------------------
  function evaluateTriggers() {
    if (!state.effects.length) {
      console.log("[ConfettiFlow] evaluateTriggers: No effects loaded.");
      return;
    }

    console.log(`[ConfettiFlow] Evaluating ${state.effects.length} effect(s) for path: ${window.location.pathname}`);

    state.effects.forEach((eff) => {
      const trigger = eff.triggerEvent;
      const cond = eff.triggerConditions || {};

      console.log(`[ConfettiFlow] Effect "${eff.name}" | Trigger: ${trigger}`);

      // Trigger 1: Order Created / Thank-You Page
      if (trigger === "Order created") {
        const path = window.location.pathname.toLowerCase();
        const isThankYou =
          path.includes("/thank_you") ||
          path.includes("/thank-you") ||
          path.includes("/orders/") ||
          window.Shopify?.Checkout?.step === "thank_you" ||
          window.Shopify?.checkout?.order_id != null ||
          document.querySelector('[data-order-number]') != null;

        console.log(`[ConfettiFlow] Order created: isThankYou=${isThankYou}`);

        if (isThankYou) {
          // Evaluate orderValueMin condition (cart.total_price passed via Liquid)
          if (cond.orderValueMin) {
            const minVal = parseFloat(cond.orderValueMin);
            const cartTotal = window.__CONFETTI_FLOW__?.cartTotal || 0;
            if (!isNaN(minVal) && cartTotal < minVal) {
              console.log(`[ConfettiFlow] Order value ${cartTotal} < min ${minVal}, skipping.`);
              return;
            }
          }

          // firstTimeBuyer: only apply if we have customer order count from Liquid
          if (cond.firstTimeBuyer === "Yes (First-time buyers only)") {
            const orderCount = window.__CONFETTI_FLOW__?.customerOrdersCount || 0;
            if (orderCount > 1) {
              console.log(`[ConfettiFlow] Not first-time buyer (orders: ${orderCount}), skipping.`);
              return;
            }
          }

          // Prevent duplicate execution on page refresh
          const firedKey =
            "confetti_flow_order_fired_" +
            (window.Shopify?.checkout?.order_id || eff.id + path);
          if (!sessionStorage.getItem(firedKey)) {
            sessionStorage.setItem(firedKey, "true");
            console.log("[ConfettiFlow] Firing Order created effect!");
            setTimeout(() => launchEffect(eff), 500);
          } else {
            console.log("[ConfettiFlow] Already fired this session, skipping.");
          }
        }
      }

      // Trigger 2: Page Viewed
      if (trigger === "Page viewed") {
        let matches = true;
        const currentPath = window.location.pathname;

        // Only apply path condition if productTagVal is set
        if (cond.productTagVal && cond.productTagVal.trim() !== "") {
          const val = cond.productTagVal.toLowerCase().trim();
          if (cond.productTagOp === "Contains") {
            matches = currentPath.toLowerCase().includes(val);
          } else if (cond.productTagOp === "Equals") {
            matches = currentPath.toLowerCase() === val;
          } else if (cond.productTagOp === "Starts with") {
            matches = currentPath.toLowerCase().startsWith(val);
          }
        }

        console.log(`[ConfettiFlow] Page viewed: path=${currentPath}, matches=${matches}`);

        if (matches) {
          setTimeout(() => launchEffect(eff), 400);
        }
      }

      // Trigger 3: Customer Created (New Account Sign-up / First-Time Welcome)
      //
      // Shopify's storefront Liquid does not expose a `created_at` timestamp.
      // Additionally, stores with "New Customer Accounts" authenticate via
      // `shopify.com/authentication/...` and redirect back to `/`, not `/account/register`.
      //
      // Reliable detection:
      //   1. customerId exists      → User is logged in
      //   2. ordersCount === 0      → Customer has never ordered (new account)
      //   3. !alreadyCelebrated     → Has not seen the welcome celebration on this device yet
      //
      // localStorage ensures it fires exactly ONCE per customer on this browser
      // and will not fire on repeated page loads or product navigation.
      if (trigger === "Customer created") {
        const search = window.location.search.toLowerCase();
        const cf     = window.__CONFETTI_FLOW__ || {};

        const customerId  = cf.customerId;
        const ordersCount = cf.customerOrdersCount || 0;

        const isLoggedIn   = !!customerId;
        const isFirstTimer = ordersCount === 0;

        const localKey   = "cf_customer_celebrated_" + (customerId || "guest");
        const sessionKey = "cf_customer_created_fired_" + (customerId || "guest");

        let alreadyCelebrated = false;
        try {
          alreadyCelebrated =
            localStorage.getItem(localKey) === "1" ||
            sessionStorage.getItem(sessionKey) === "1";
        } catch (e) {
          alreadyCelebrated = false;
        }

        // Dev simulation or manual test trigger
        const isAppSimulation =
          search.includes("customer_posted=true") ||
          search.includes("cf_test=customer");

        const isNewCustomer =
          isAppSimulation || (isLoggedIn && isFirstTimer && !alreadyCelebrated);

        console.log("[ConfettiFlow] Customer created check:", {
          customerId,
          ordersCount,
          isLoggedIn,
          isFirstTimer,
          alreadyCelebrated,
          isAppSimulation,
          willTrigger: isNewCustomer,
        });

        if (isNewCustomer) {
          if (!isAppSimulation) {
            try {
              localStorage.setItem(localKey, "1");
            } catch (e) {}
          }
          try {
            sessionStorage.setItem(sessionKey, "1");
          } catch (e) {}
          setTimeout(() => launchEffect(eff), 600);
        }
      }

      // Trigger 4: Custom event — handled by setupCustomTriggerListeners below
    });

    // Trigger: Cart Updated (AJAX Cart Listeners)
    setupCartListener();

    // Trigger: Custom Events / Button Clicks
    setupCustomTriggerListeners();
  }

  // Intercept Shopify Cart Additions & Drawer Updates
  function setupCartListener() {
    const cartEffects = state.effects.filter(
      (eff) => eff.triggerEvent === "Cart updated"
    );
    if (!cartEffects.length) return;

    function triggerCartCelebration() {
      cartEffects.forEach((eff) => {
        const cond = eff.triggerConditions || {};
        if (cond.quantityMin && window.__CONFETTI_FLOW__?.cartCount) {
          if (window.__CONFETTI_FLOW__.cartCount < parseInt(cond.quantityMin)) {
            return;
          }
        }
        launchEffect(eff);
      });
    }

    // Standard Shopify theme cart events
    [
      "cart:updated",
      "cart:refresh",
      "cart:item-added",
      "ajaxCart.afterCartLoad",
    ].forEach((evt) => {
      document.addEventListener(evt, triggerCartCelebration, { passive: true });
    });

    // Intercept Fetch API calls to /cart/add
    const originalFetch = window.fetch;
    if (typeof originalFetch === "function") {
      window.fetch = function () {
        const url = arguments[0];
        const urlStr =
          typeof url === "string" ? url : url instanceof Request ? url.url : "";

        return originalFetch.apply(this, arguments).then((response) => {
          if (
            urlStr.includes("/cart/add") ||
            urlStr.includes("/cart/change") ||
            urlStr.includes("/cart/update")
          ) {
            if (response.ok) {
              setTimeout(triggerCartCelebration, 150);
            }
          }
          return response;
        });
      };
    }

    // Intercept XMLHttpRequest calls to /cart/add
    const originalXhrOpen = XMLHttpRequest.prototype.open;
    const originalXhrSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url) {
      this._confettiUrl = url;
      return originalXhrOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function () {
      this.addEventListener("load", () => {
        if (
          this._confettiUrl &&
          typeof this._confettiUrl === "string" &&
          (this._confettiUrl.includes("/cart/add") ||
            this._confettiUrl.includes("/cart/change")) &&
          this.status >= 200 &&
          this.status < 300
        ) {
          setTimeout(triggerCartCelebration, 150);
        }
      });
      return originalXhrSend.apply(this, arguments);
    };
  }

  // Delegated Click Listener for Elements with data-confetti-trigger
  function setupCustomTriggerListeners() {
    document.addEventListener("click", function (e) {
      const triggerElem = e.target.closest(
        "[data-confetti-trigger], .confetti-trigger"
      );
      if (triggerElem) {
        const effectId = triggerElem.getAttribute("data-confetti-trigger");
        if (effectId && effectId !== "true") {
          window.ConfettiFlow.trigger(effectId);
        } else {
          // Play first available custom event effect or default
          const customEff =
            state.effects.find((eff) => eff.triggerEvent === "Custom event") ||
            state.effects[0];
          if (customEff) launchEffect(customEff);
        }
      }
    });
  }

  // --------------------------------------------------------------------------
  // 4. FETCH ACTIVE EFFECTS FROM APP BACKEND
  // --------------------------------------------------------------------------
  async function loadActiveEffects() {
    const shop = state.shop;
    if (!shop) {
      console.warn("[ConfettiFlow] No shop domain found, skipping effect load.");
      return;
    }

    // Use the configured endpoint (injected by Liquid from metafield, or App Proxy fallback)
    const shopParam = `shop=${encodeURIComponent(shop)}`;
    const endpoint = state.effectsEndpoint || "/apps/confetti/effects";
    const primaryUrl = endpoint.includes("?")
      ? `${endpoint}&${shopParam}`
      : `${endpoint}?${shopParam}`;

    console.log("[ConfettiFlow] Fetching active effects from:", primaryUrl);

    async function tryFetch(url) {
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const preview = await res.text();
        throw new Error(`Non-JSON response (${ct}). Page starts: ${preview.slice(0, 60)}`);
      }
      return res.json();
    }

    let data = null;

    // Try primary URL
    try {
      data = await tryFetch(primaryUrl);
    } catch (err) {
      console.warn("[ConfettiFlow] Primary endpoint failed:", err.message);
    }

    // Fallback if primary endpoint failed
    if (!data) {
      const fallbackUrls = [];
      const proxyFallback = `/apps/confetti/effects?${shopParam}`;
      if (proxyFallback !== primaryUrl) fallbackUrls.push(proxyFallback);

      const directAppUrl = window.__CONFETTI_FLOW__ && window.__CONFETTI_FLOW__.appUrl;
      if (directAppUrl) {
        const directFallback = `${directAppUrl.replace(/\/$/, "")}/api/storefront/effects?${shopParam}`;
        if (directFallback !== primaryUrl) fallbackUrls.push(directFallback);
      }

      for (let i = 0; i < fallbackUrls.length; i++) {
        if (!data) {
          try {
            console.log("[ConfettiFlow] Trying fallback endpoint:", fallbackUrls[i]);
            data = await tryFetch(fallbackUrls[i]);
            if (data && data.success) break;
          } catch (err2) {
            console.warn("[ConfettiFlow] Fallback endpoint failed:", fallbackUrls[i], err2.message);
          }
        }
      }
    }

    if (data && data.success && Array.isArray(data.effects)) {
      state.effects = data.effects;
      window.ConfettiFlow.effects = data.effects;
      state.loaded = true;
      preloadActiveSounds(data.effects);
      console.log(`[ConfettiFlow] ${data.effects.length} active effect(s) ready. Evaluating triggers...`);
      evaluateTriggers();
    } else {
      console.warn("[ConfettiFlow] No active effects found or unexpected response:", data);
    }
  }

  // Bootstrap when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadActiveEffects);
  } else {
    loadActiveEffects();
  }
})();
