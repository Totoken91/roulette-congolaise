// slot.jsx — la slot machine 4 colonnes
// Affiche les 4 colonnes (action / nom / adjectif / récompense) avec défilement
// vertical infini. La fonction expose une animation contrôlée pour spinTo(target).

const { useState, useEffect, useRef, useMemo } = React;

const COL_HEIGHT = 88; // hauteur d'une cellule en px
const VISIBLE_ROWS = 3;

// Une colonne unique. Démarre arrêtée sur la 1ère valeur. spin(target, durationMs)
// fait défiler N tours puis aligne sur target.
function SlotColumn({ items, target, spinning, spinKey, durationMs, onTick, onLand, accent }) {
  const innerRef = useRef(null);
  const [offset, setOffset] = useState(0);
  const tickRef = useRef(0);

  useEffect(() => {
    if (!spinning || !target) return;
    const list = items;
    if (list.length === 0) return;
    const targetIdx = list.indexOf(target);
    if (targetIdx < 0) return;

    const totalRotations = 4 + Math.random() * 2; // 4-6 tours complets
    // Le cadre highlight la cellule du milieu (index 1 visible).
    // On veut donc que targetIdx soit en position MIDDLE :
    // translateY = -(targetIdx - 1) * COL_HEIGHT  → targetIdx ends up at row index 1
    const finalOffset = -((targetIdx - 1) * COL_HEIGHT + Math.floor(totalRotations) * list.length * COL_HEIGHT);
    const startOffset = offset;
    const startTime = performance.now();
    let raf;

    const tick = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      // ease-out cubique
      const eased = 1 - Math.pow(1 - t, 3);
      const cur = startOffset + (finalOffset - startOffset) * eased;
      setOffset(cur);

      // tick sonore quand on traverse une cellule
      const cellIdx = Math.floor(-cur / COL_HEIGHT);
      if (cellIdx !== tickRef.current) {
        tickRef.current = cellIdx;
        if (onTick) onTick();
      }

      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        // normaliser l'offset : target en position middle
        const normalized = -(targetIdx - 1) * COL_HEIGHT;
        setOffset(normalized);
        if (onLand) onLand();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [spinKey]);

  // construire 3 copies pour l'effet boucle
  const repeated = useMemo(() => [...items, ...items, ...items, ...items, ...items], [items]);

  return (
    <div className="slot-col" style={{ "--accent": accent }}>
      <div className="slot-col-inner" ref={innerRef}
           style={{ transform: `translateY(${offset}px)` }}>
        {repeated.map((it, i) => (
          <div key={i} className="slot-cell">{it}</div>
        ))}
      </div>
      <div className="slot-fade slot-fade-top" />
      <div className="slot-fade slot-fade-bot" />
      <div className="slot-window" />
    </div>
  );
}

// SlotMachine — gère les 4 colonnes en parallèle avec un délai d'arrêt cascadé
function SlotMachine({ vocab, target, spinKey, spinning, durationMs = 2200, onTick, onAllLanded, soundOn }) {
  const cols = [
    { key: "action",     items: vocab.actions,     target: target?.action,     dur: durationMs,         accent: "#f0c987" },
    { key: "nom",        items: vocab.noms,        target: target?.nom,        dur: durationMs + 350,   accent: "#e8a96b" },
    { key: "adjectif",   items: vocab.adjectifs,   target: target?.adjectif,   dur: durationMs + 700,   accent: "#d97757" },
    { key: "recompense", items: vocab.recompenses, target: target?.recompense, dur: durationMs + 1050,  accent: "#c14b4b" },
  ];
  const labels = ["SE FAIRE", "PAR", "", "POUR"];
  const landedCount = useRef(0);

  useEffect(() => {
    landedCount.current = 0;
  }, [spinKey]);

  return (
    <div className="slot-machine">
      <div className="slot-frame">
        {cols.map((c, i) => (
          <React.Fragment key={c.key}>
            <div className="slot-cell-wrap">
              <div className="slot-label">{labels[i] || "\u00A0"}</div>
              <SlotColumn
                items={c.items}
                target={c.target}
                spinning={spinning}
                spinKey={spinKey}
                durationMs={c.dur}
                accent={c.accent}
                onTick={() => { if (soundOn) playClick(0.07); }}
                onLand={() => {
                  if (soundOn) playClick(0.18);
                  landedCount.current += 1;
                  if (landedCount.current === cols.length && onAllLanded) onAllLanded();
                }}
              />
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { SlotMachine, SlotColumn, COL_HEIGHT });
