// app.jsx — Roulette Congolaise : app principale
const { useState, useEffect, useRef, useCallback } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "soundOn": true,
  "spinSpeed": "normal",
  "shake": true,
  "showVocabEditor": false
}/*EDITMODE-END*/;

// ──────────────────────────────────────────────────────────────
// Vocab editor — composant qui édite les listes en live
function VocabEditor({ vocab, setVocab }) {
  const [tab, setTab] = useState("actions");
  const [draft, setDraft] = useState("");
  const list = vocab[tab];

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (list.includes(v)) { setDraft(""); return; }
    const next = { ...vocab, [tab]: [...list, v] };
    setVocab(next);
    setDraft("");
  };

  const remove = (i) => {
    if (list.length <= 2) return;
    const next = { ...vocab, [tab]: list.filter((_, j) => j !== i) };
    setVocab(next);
  };

  const reset = () => {
    if (!confirm("Réinitialiser cette liste aux valeurs par défaut ?")) return;
    const next = { ...vocab, [tab]: [...DEFAULT_VOCAB[tab]] };
    setVocab(next);
  };

  const tabs = [
    { k: "actions",     l: "Actions" },
    { k: "noms",        l: "Noms" },
    { k: "adjectifs",   l: "Adjectifs" },
    { k: "recompenses", l: "Récompenses" },
  ];

  return (
    <div className="vocab-editor">
      <div className="vocab-tabs">
        {tabs.map(t => (
          <button key={t.k} className={"vocab-tab " + (t.k === tab ? "active" : "")}
                  onClick={() => setTab(t.k)}>
            {t.l} <span className="vocab-count">{vocab[t.k].length}</span>
          </button>
        ))}
      </div>
      <div className="vocab-add">
        <input className="vocab-input" value={draft}
               onChange={e => setDraft(e.target.value)}
               onKeyDown={e => e.key === "Enter" && add()}
               placeholder={`Ajouter un(e) ${tab.slice(0, -1)}...`} />
        <button className="vocab-btn" onClick={add}>+</button>
      </div>
      <div className="vocab-list">
        {list.map((it, i) => (
          <div key={i} className="vocab-item">
            <span>{it}</span>
            <button className="vocab-x" onClick={() => remove(i)}
                    title={list.length <= 2 ? "Minimum 2 entrées" : "Supprimer"}
                    disabled={list.length <= 2}>×</button>
          </div>
        ))}
      </div>
      <button className="vocab-reset" onClick={reset}>↺ Réinitialiser cette liste</button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
function HallOfShame({ history, onClear, onClose }) {
  return (
    <div className="hos-overlay" onClick={onClose}>
      <div className="hos-modal" onClick={e => e.stopPropagation()}>
        <div className="hos-head">
          <div>
            <div className="hos-title">Tableau de la Honte</div>
            <div className="hos-sub">{history.length} destinée{history.length > 1 ? "s" : ""} subie{history.length > 1 ? "s" : ""}</div>
          </div>
          <button className="hos-close" onClick={onClose}>×</button>
        </div>
        <div className="hos-list">
          {history.length === 0 ? (
            <div className="hos-empty">Aucune destinée subie. Pour l'instant.</div>
          ) : history.map((h, i) => (
            <div key={i} className="hos-row">
              <div className="hos-num">#{history.length - i}</div>
              <div className="hos-text">
                <b className="hos-name">{h.name || "Anonyme"}</b> a choisi de se faire <i>{h.action}</i> par <b>{h.nom}</b> {h.adjectif} pour <span className="hos-reward">{h.recompense}</span>.
              </div>
            </div>
          ))}
        </div>
        {history.length > 0 && (
          <button className="hos-clear" onClick={onClear}>Effacer l'historique</button>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
function DestinCard({ destin, side, onPick, disabled, revealed, locked }) {
  if (!destin) {
    return (
      <div className={"destin-card empty " + side}>
        <div className="destin-corner tl">{side === "left" ? "A" : "B"}</div>
        <div className="destin-corner br">{side === "left" ? "A" : "B"}</div>
        <div className="destin-empty-text">
          {locked ? "À RÉVÉLER…" : ""}
        </div>
      </div>
    );
  }
  return (
    <div className={"destin-card " + (revealed ? "revealed " : "") + side}>
      <div className="destin-corner tl">{side === "left" ? "A" : "B"}</div>
      <div className="destin-corner br">{side === "left" ? "A" : "B"}</div>
      <div className="destin-text">
        <span className="destin-prefix">Se faire</span>
        <span className="destin-action">{destin.action}</span>
        <span className="destin-prefix">par</span>
        <span className="destin-nom">{destin.nom}</span>
        <span className="destin-adj">{destin.adjectif}</span>
        <div className="destin-divider">⸺ pour ⸺</div>
        <span className="destin-reward">{destin.recompense}</span>
      </div>
      <button className={"destin-pick " + side} onClick={onPick} disabled={disabled}>
        Je choisis {side === "left" ? "A" : "B"}
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [vocab, setVocabState] = useState(() => loadVocab());
  const setVocab = useCallback((v) => { setVocabState(v); saveVocab(v); }, []);

  const [history, setHistory] = useState(() => loadHistory());
  const [playerName, setPlayerNameState] = useState(() => loadName());
  const setPlayerName = (n) => { setPlayerNameState(n); saveName(n); };
  const [showShame, setShowShame] = useState(false);
  const [showShare, setShowShare] = useState(null);

  // Phases :
  //  idle    → bouton TOURNER (1er spin)
  //  spin1   → la slot tourne et s'arrête sur la destinée A
  //  reveal1 → carte A révélée, bouton "Tirer la 2e destinée"
  //  spin2   → la slot tourne et s'arrête sur la destinée B
  //  choose  → les 2 cartes sont visibles, on doit choisir
  //  resolved
  const [phase, setPhase] = useState("idle");
  const [destinA, setDestinA] = useState(null);
  const [destinB, setDestinB] = useState(null);
  const [slotTarget, setSlotTarget] = useState(null);
  const [spinKey, setSpinKey] = useState(0);
  const [shaking, setShaking] = useState(false);

  const drumrollRef = useRef(null);

  const speedMs = { lent: 3500, normal: 2200, rapide: 1300 }[t.spinSpeed] || 2200;

  const startDrumroll = () => {
    if (t.soundOn) {
      drumrollRef.current = playDrumroll(speedMs / 1000 + 1.0, 0.18);
    }
  };
  const stopDrumroll = () => {
    if (drumrollRef.current) { drumrollRef.current.stop(); drumrollRef.current = null; }
  };

  // 1er spin : tirer A et lancer la slot
  const spinFirst = () => {
    if (phase === "spin1" || phase === "spin2") return;
    const a = rollDestin(vocab);
    setDestinA(a);
    setDestinB(null);
    setSlotTarget(a);
    setPhase("spin1");
    setSpinKey(k => k + 1);
    startDrumroll();
  };

  // 2e spin : tirer B (différente de A) et relancer
  const spinSecond = () => {
    if (phase === "spin1" || phase === "spin2") return;
    let b = rollDestin(vocab);
    let tries = 0;
    while (destinA && formatDestin(destinA) === formatDestin(b) && tries < 20) {
      b = rollDestin(vocab); tries++;
    }
    setDestinB(b);
    setSlotTarget(b);
    setPhase("spin2");
    setSpinKey(k => k + 1);
    startDrumroll();
  };

  const onAllLanded = () => {
    stopDrumroll();
    if (t.soundOn) playDing();
    setPhase(prev => {
      if (prev === "spin1") return "reveal1";
      if (prev === "spin2") return "choose";
      return prev;
    });
  };

  const choose = (which) => {
    if (phase !== "choose") return;
    const picked = which === "A" ? destinA : destinB;
    const entry = { ...picked, name: playerName || "Anonyme", at: Date.now() };
    setHistory(h => {
      const next = [entry, ...h];
      saveHistory(next);
      return next;
    });
    if (t.soundOn) playDefeat();
    if (t.shake) {
      setShaking(true);
      setTimeout(() => setShaking(false), 800);
    }
    setShowShare({ destin: picked, choice: which });
    setPhase("resolved");
  };

  const reset = () => {
    setShowShare(null);
    setDestinA(null);
    setDestinB(null);
    setSlotTarget(null);
    setPhase("idle");
  };

  const shareDestin = (d) => {
    const who = playerName || "Quelqu'un";
    const text = `🎰 ROULETTE CONGOLAISE\n\n${who} a dû se faire ${d.action} par ${d.nom} ${d.adjectif} pour ${d.recompense}.\n\nEt vous, vous tombez sur quoi ?`;
    if (navigator.clipboard) navigator.clipboard.writeText(text);
    return text;
  };

  const isSpinning = phase === "spin1" || phase === "spin2";
  const showCards = phase === "reveal1" || phase === "spin2" || phase === "choose";

  return (
    <div className={"app " + (shaking ? "shaking" : "")}>
      <div className="bg-vignette" />
      <div className="bg-stars">{Array.from({length: 60}).map((_, i) => (
        <span key={i} style={{
          left: `${(i * 73) % 100}%`,
          top: `${(i * 37) % 100}%`,
          animationDelay: `${(i * 0.13) % 3}s`
        }} />
      ))}</div>

      <header className="head">
        <div className="head-left">
          <button className="ghost-btn" onClick={() => setShowShame(true)}>
            <span className="ghost-num">{history.length}</span>
            Tableau de la honte
          </button>
        </div>
        <div className="title-wrap">
          <div className="title-sub">— ★ établi 2026 ★ —</div>
          <h1 className="title">Roulette Congolaise</h1>
          <div className="title-tag">on ne peut que perdre</div>
        </div>
        <div className="head-right">
          <button className="ghost-btn" onClick={() => setTweak('showVocabEditor', !t.showVocabEditor)}>
            {t.showVocabEditor ? "Fermer la banque" : "Banque de mots"}
          </button>
          <div className="player-input-wrap">
            <span className="player-label">Joueur</span>
            <input className="player-input"
                   value={playerName}
                   onChange={e => setPlayerName(e.target.value.slice(0, 24))}
                   placeholder="Votre nom..."
                   maxLength={24} />
          </div>
        </div>
      </header>

      <main className="stage">
        <SlotMachine
          vocab={vocab}
          target={slotTarget}
          spinKey={spinKey}
          spinning={isSpinning}
          durationMs={speedMs}
          soundOn={t.soundOn}
          onAllLanded={onAllLanded}
        />

        {/* Indicateur de phase */}
        {phase !== "idle" && phase !== "resolved" && (
          <div className="phase-indicator">
            <span className={"phase-dot " + (destinA ? "done" : (phase === "spin1" ? "active" : ""))}>1</span>
            <span className="phase-line" />
            <span className={"phase-dot " + (destinB ? "done" : (phase === "spin2" ? "active" : (phase === "reveal1" ? "next" : "")))}>2</span>
            <span className="phase-text">
              {phase === "spin1" && "Tirage de la destinée A…"}
              {phase === "reveal1" && "Destinée A révélée — il en reste une"}
              {phase === "spin2" && "Tirage de la destinée B…"}
              {phase === "choose" && "Faites votre choix. Aucun n'est bon."}
            </span>
          </div>
        )}

        {phase === "idle" && (
          <div className="cta-wrap">
            <button className="big-spin" onClick={spinFirst}>
              <span className="big-spin-inner">TOURNER LA ROUE</span>
            </button>
            <div className="cta-warn">⚠ deux destinées vous seront proposées, l'une après l'autre. Vous devrez en choisir une. Il n'y a pas d'échappatoire.</div>
          </div>
        )}

        {phase === "reveal1" && (
          <div className="cta-wrap">
            <button className="big-spin secondary" onClick={spinSecond}>
              <span className="big-spin-inner">TIRER LA 2ᵉ DESTINÉE</span>
            </button>
            <div className="cta-warn">Le sort en a décidé une. La roulette tournera encore une fois.</div>
          </div>
        )}

        {showCards && (
          <div className={"destinies " + (phase === "choose" ? "show" : "partial")}>
            <div className="vs-badge">VS</div>
            <DestinCard destin={destinA} side="left"
                        revealed={true}
                        onPick={() => choose("A")}
                        disabled={phase !== "choose"} />
            <DestinCard destin={destinB} side="right"
                        revealed={phase === "choose"}
                        locked={phase === "reveal1" || phase === "spin2"}
                        onPick={() => choose("B")}
                        disabled={phase !== "choose"} />
          </div>
        )}

        {phase === "resolved" && showShare && (
          <ShareSheet
            destin={showShare.destin}
            choice={showShare.choice}
            playerName={playerName}
            onShare={() => shareDestin(showShare.destin)}
            onAgain={reset} />
        )}
      </main>

      {showShame && (
        <HallOfShame
          history={history}
          onClear={() => { setHistory([]); saveHistory([]); }}
          onClose={() => setShowShame(false)} />
      )}

      {t.showVocabEditor && (
        <div className="vocab-overlay" onClick={() => setTweak('showVocabEditor', false)}>
          <div className="vocab-modal" onClick={e => e.stopPropagation()}>
            <div className="vocab-head">
              <div className="vocab-title">Banque de mots</div>
              <button className="hos-close" onClick={() => setTweak('showVocabEditor', false)}>×</button>
            </div>
            <VocabEditor vocab={vocab} setVocab={setVocab} />
          </div>
        </div>
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Audio & FX" />
        <TweakToggle label="Sons" value={t.soundOn} onChange={v => setTweak('soundOn', v)} />
        <TweakToggle label="Screen shake" value={t.shake} onChange={v => setTweak('shake', v)} />
        <TweakSection label="Roulette" />
        <TweakRadio label="Vitesse" value={t.spinSpeed} options={['lent','normal','rapide']}
                    onChange={v => setTweak('spinSpeed', v)} />
        <TweakSection label="Banque" />
        <TweakButton label="Ouvrir la banque de mots"
                     onClick={() => setTweak('showVocabEditor', true)} />
        <TweakButton secondary label="Effacer l'historique"
                     onClick={() => { setHistory([]); saveHistory([]); }} />
      </TweaksPanel>

      <footer className="foot">
        <span>♠ ♥ ♣ ♦</span>
        <span className="foot-mid">aucune chance n'a été harmée durant ce jeu</span>
        <span>♦ ♣ ♥ ♠</span>
      </footer>
    </div>
  );
}

function ShareSheet({ destin, choice, onShare, onAgain, playerName }) {
  const [copied, setCopied] = useState(false);
  const click = () => {
    onShare();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="result-sheet">
      <div className="result-stamp">VERDICT</div>
      <div className="result-choice">{playerName ? <>Vous, <b>{playerName}</b>, avez choisi <b>{choice}</b></> : <>Vous avez choisi <b>{choice}</b></>}</div>
      <div className="result-text">
        <span className="r-prefix">se faire</span>
        <span className="r-action">{destin.action}</span>
        <span className="r-prefix">par</span>
        <span className="r-nom">{destin.nom}</span>
        <span className="r-adj">{destin.adjectif}</span>
        <div className="r-div">— pour —</div>
        <span className="r-rew">{destin.recompense}</span>
      </div>
      <div className="result-row">
        <button className="result-btn share" onClick={click}>
          {copied ? "✓ copié" : "Partager mon destin"}
        </button>
        <button className="result-btn again" onClick={onAgain}>
          Encore !
        </button>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
