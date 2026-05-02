// audio.jsx — sons générés via WebAudio (pas d'assets externes)

let __ac = null;
function ac() {
  if (!__ac) {
    __ac = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (__ac.state === "suspended") __ac.resume();
  return __ac;
}

// Petit clic métallique pour le défilement de la slot
function playClick(volume = 0.15) {
  const c = ac();
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "square";
  o.frequency.setValueAtTime(1800, t);
  o.frequency.exponentialRampToValueAtTime(400, t + 0.04);
  g.gain.setValueAtTime(volume, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + 0.06);
}

// Drumroll pendant le suspense
function playDrumroll(duration = 1.2, volume = 0.25) {
  const c = ac();
  const start = c.currentTime;
  const buf = c.createBuffer(1, c.sampleRate * duration, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.min(1, i / 2000);
  }
  const src = c.createBufferSource();
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 180;
  filter.Q.value = 0.8;
  const g = c.createGain();
  g.gain.setValueAtTime(volume, start);
  g.gain.exponentialRampToValueAtTime(0.001, start + duration);
  src.buffer = buf;
  src.connect(filter).connect(g).connect(c.destination);
  src.start(start);
  return { stop: () => { try { src.stop(); } catch (e) {} } };
}

// Fanfare de défaite — descente chromatique
function playDefeat(volume = 0.18) {
  const c = ac();
  const start = c.currentTime;
  const notes = [523, 494, 466, 440, 415, 392]; // do, si, sib, la, lab, sol
  notes.forEach((freq, i) => {
    const t = start + i * 0.18;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + 0.25);
  });
  // tuba final
  setTimeout(() => {
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(98, t);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.6);
    g.gain.setValueAtTime(volume * 1.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + 0.75);
  }, notes.length * 180);
}

// Ding de validation quand on choisit
function playDing(volume = 0.18) {
  const c = ac();
  const t = c.currentTime;
  [880, 1320].forEach((f, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(f, t + i * 0.05);
    g.gain.setValueAtTime(volume, t + i * 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.4);
    o.connect(g).connect(c.destination);
    o.start(t + i * 0.05);
    o.stop(t + i * 0.05 + 0.45);
  });
}

Object.assign(window, { playClick, playDrumroll, playDefeat, playDing });
