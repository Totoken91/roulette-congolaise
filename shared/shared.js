// shared.js — briques communes à tous les jeux.
// Chargé en <script type="text/babel" src="shared/shared.js"></script>
// avant les scripts inline des pages, donc tout ce qui est exposé sur
// window est disponible dans le scope global de Babel ensuite.

// ─── storage ────────────────────────────────────────────────────────────
window.storage = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  },
  set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  },
  // variantes string brut (pour player name / flags simples)
  getStr(key, fallback = "") {
    try { return localStorage.getItem(key) ?? fallback; } catch (e) { return fallback; }
  },
  setStr(key, val) {
    try { localStorage.setItem(key, val); } catch (e) {}
  },
};

// ─── hall of shame global + migration depuis rc_history_v1 ──────────────
// Migration idempotente : flag hall_migrated_v1 garantit qu'on ne migre
// qu'une fois. L'ancienne clé est supprimée après migration.
(function migrateHallV1() {
  try {
    if (localStorage.getItem("hall_migrated_v1") === "1") return;
    const oldRaw = localStorage.getItem("rc_history_v1");
    if (oldRaw) {
      const old = JSON.parse(oldRaw);
      if (Array.isArray(old) && old.length > 0) {
        const cur = JSON.parse(localStorage.getItem("hall_global") || "[]");
        const migrated = old.map(e => ({ ...e, game: "roulette" }));
        // Ordre : nouvelles entrées de hall_global (plus récentes) en tête,
        // puis les anciennes migrées. Si hall_global est vide, on prend
        // simplement les migrées.
        const merged = Array.isArray(cur)
          ? [...cur, ...migrated]
          : migrated;
        localStorage.setItem("hall_global", JSON.stringify(merged));
      }
      localStorage.removeItem("rc_history_v1");
    }
    localStorage.setItem("hall_migrated_v1", "1");
  } catch (e) {}
})();

window.hall = {
  all() { return window.storage.get("hall_global", []); },
  byGame(game) {
    return window.storage.get("hall_global", []).filter(e => e.game === game);
  },
  add(entry) {
    const cur = window.storage.get("hall_global", []);
    const next = [{ ts: Date.now(), ...entry }, ...cur].slice(0, 200);
    window.storage.set("hall_global", next);
    return next;
  },
  clear(game) {
    if (!game) { window.storage.set("hall_global", []); return []; }
    const next = window.storage.get("hall_global", []).filter(e => e.game !== game);
    window.storage.set("hall_global", next);
    return next;
  },
};

// ─── audio ──────────────────────────────────────────────────────────────
// Factory WebAudio. Chaque page peut désactiver via audio.setEnabled(false)
// (synchronisé avec son setting "son ON/OFF").
window.audio = (function () {
  let ctx = null;
  let enabled = true;

  function ac() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function playClick(volume = 0.15) {
    if (!enabled) return;
    try {
      const c = ac(); const t = c.currentTime;
      const o = c.createOscillator(); const g = c.createGain();
      o.type = "square";
      o.frequency.setValueAtTime(1800, t);
      o.frequency.exponentialRampToValueAtTime(400, t + 0.04);
      g.gain.setValueAtTime(volume, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      o.connect(g).connect(c.destination);
      o.start(t); o.stop(t + 0.06);
    } catch (e) {}
  }

  function playDrumroll(duration = 1.2, volume = 0.25) {
    if (!enabled) return { stop: () => {} };
    try {
      const c = ac(); const start = c.currentTime;
      const buf = c.createBuffer(1, c.sampleRate * duration, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.min(1, i / 2000);
      const src = c.createBufferSource();
      const filter = c.createBiquadFilter();
      filter.type = "bandpass"; filter.frequency.value = 180; filter.Q.value = 0.8;
      const g = c.createGain();
      g.gain.setValueAtTime(volume, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + duration);
      src.buffer = buf;
      src.connect(filter).connect(g).connect(c.destination);
      src.start(start);
      return { stop: () => { try { src.stop(); } catch (e) {} } };
    } catch (e) { return { stop: () => {} }; }
  }

  function playDing(volume = 0.18) {
    if (!enabled) return;
    try {
      const c = ac(); const t = c.currentTime;
      [880, 1320].forEach((f, i) => {
        const o = c.createOscillator(); const g = c.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(f, t + i * 0.05);
        g.gain.setValueAtTime(volume, t + i * 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.4);
        o.connect(g).connect(c.destination);
        o.start(t + i * 0.05); o.stop(t + i * 0.05 + 0.45);
      });
    } catch (e) {}
  }

  function playDefeat(volume = 0.18) {
    if (!enabled) return;
    try {
      const c = ac(); const start = c.currentTime;
      const notes = [523, 494, 466, 440, 415, 392];
      notes.forEach((freq, i) => {
        const t = start + i * 0.18;
        const o = c.createOscillator(); const g = c.createGain();
        o.type = "sawtooth";
        o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(volume, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        o.connect(g).connect(c.destination);
        o.start(t); o.stop(t + 0.25);
      });
      setTimeout(() => {
        if (!enabled) return;
        try {
          const t = ac().currentTime;
          const o = ac().createOscillator(); const g = ac().createGain();
          o.type = "triangle";
          o.frequency.setValueAtTime(98, t);
          o.frequency.exponentialRampToValueAtTime(70, t + 0.6);
          g.gain.setValueAtTime(volume * 1.4, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
          o.connect(g).connect(ac().destination);
          o.start(t); o.stop(t + 0.75);
        } catch (e) {}
      }, notes.length * 180);
    } catch (e) {}
  }

  return {
    setEnabled(v) { enabled = !!v; },
    isEnabled() { return enabled; },
    playClick, playDrumroll, playDing, playDefeat,
  };
})();

// ─── DustParticles ──────────────────────────────────────────────────────
// Canvas full viewport, ~35 particules dorées qui dérivent vers le haut.
// Désactivé via prefers-reduced-motion.
window.DustParticles = function DustParticles({ count = 35 }) {
  const canvasRef = React.useRef(null);
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (typeof matchMedia !== "undefined" &&
        matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    let w = 0, h = 0, dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.8 + Math.random() * 1.6,
      vy: 0.18 + Math.random() * 0.32,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.05 + Math.random() * 0.10,
    }));

    let raf, t = 0;
    const tick = () => {
      t += 0.016;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y -= p.vy;
        p.x += Math.sin(t + p.phase) * 0.18;
        if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(252, 211, 77, ${p.alpha})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [count]);

  return <canvas ref={canvasRef} className="dust-particles" aria-hidden="true" />;
};

// ─── useNameGate ────────────────────────────────────────────────────────
// Hook qui gate les actions nécessitant un nom de joueur. Retourne :
// - requireName(action) : wrap d'un onClick. Si playerName vide, ouvre la
//   modale et stocke l'action ; sinon exécute directement.
// - modal : JSX à rendre dans l'arbre (null si fermée).
//
// Usage :
//   const { requireName, modal } = useNameGate(playerName, setPlayerName);
//   <button onClick={requireName(spinFirst)}>...</button>
//   {modal}
window.useNameGate = function useNameGate(playerName, setPlayerName, opts = {}) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const pendingRef = React.useRef(null);

  const title = opts.title || "Votre nom";
  const hint = opts.hint || "Avant de continuer, on a besoin de savoir qui assume.";
  const ctaLabel = opts.ctaLabel || "Valider et continuer";

  const requireName = (action) => () => {
    if (playerName && playerName.trim()) { action(); return; }
    setDraft("");
    pendingRef.current = action;
    setOpen(true);
  };

  const cancel = () => { pendingRef.current = null; setOpen(false); };
  const submit = () => {
    const v = draft.trim();
    if (!v) return;
    setPlayerName(v);
    setOpen(false);
    const fn = pendingRef.current;
    pendingRef.current = null;
    if (fn) fn();
  };

  const modal = open ? (
    <div className="name-overlay" onClick={cancel}>
      <div className="name-card" onClick={e => e.stopPropagation()}>
        <div className="name-card-head">
          <div className="name-card-title">{title}</div>
          <button className="name-card-close" onClick={cancel} aria-label="Fermer">×</button>
        </div>
        <p className="name-hint">{hint}</p>
        <input className="name-input"
               autoFocus
               value={draft}
               onChange={e => setDraft(e.target.value.slice(0, 24))}
               onKeyDown={e => e.key === "Enter" && submit()}
               placeholder="Votre nom..."
               maxLength={24} />
        <button className="name-submit"
                onClick={submit}
                disabled={!draft.trim()}>{ctaLabel}</button>
      </div>
    </div>
  ) : null;

  return { requireName, modal };
};
