import { Check, Sparkles } from 'lucide-react';
import { useScrollScene } from '../../../../hooks/useScrollScene';
import { clamp, range } from '../../../../utils/scroll';
import { feelings, changes } from '../../../../data/process';
import { useScrollLockPoints } from '../../../../hooks/useScrollLockPoints';
import './Process.css';
export default function Process() {
  useScrollLockPoints({
    sectionId: 'zastani',
    points: [0.1, 0.35, 0.6, 0.85],
    lockDuration: 650,
  });
  const ref = useScrollScene((el, p) => {
    const a = Math.min(
        range(p, 0.02, 0.10),
        1 - range(p, 0.22, 0.29)
    );
    const b = Math.min(
        range(p, 0.27, 0.35),
        1 - range(p, 0.47, 0.54)
    );
    const c = Math.min(
        range(p, 0.52, 0.60),
        1 - range(p, 0.72, 0.79)
    );
    const d = range(p, 0.77, 0.85);
    el.style.setProperty('--p', p.toFixed(4));
    el.style.setProperty('--a', clamp(a).toFixed(4));
    el.style.setProperty('--b', clamp(b).toFixed(4));
    el.style.setProperty('--c', clamp(c).toFixed(4));
    el.style.setProperty('--d', clamp(d).toFixed(4));
  });
  return (
    <section id="zastani" className="apple-scene process-scene" ref={ref}>
      <div className="sticky-stage process-stage">
        <div className="process-orbit orbit-a" />
        <div className="process-orbit orbit-b" />
        <div className="process-number">01</div>
        <div className="process-progress">
          <i />
        </div>
        <article className="process-panel panel-a">
          <p className="kicker light">01 — TRENUTAK ZA SEBE</p>
          <h2>
            Za početak,
            <br />
            <em>stani.</em>
          </h2>
          <p className="intro">
            Ne moraš odmah ništa da rešavaš. Dovoljno je da primetiš gde si i šta trenutno nosiš.
          </p>
          <div className="feelings-grid">
            {feelings.map(([n, t]) => (
              <div className="feeling-card" key={n}>
                <span>{n}</span>
                <p>{t}</p>
              </div>
            ))}
          </div>
        </article>
        <article className="process-panel panel-b">
          <p className="kicker">02 — ISKRENO</p>
          <h2>
            Bez osude.
            <br />
            <em>Samo iskreno.</em>
          </h2>
          <div className="statement-stack">
            <span>Šta mi treba?</span>
            <span>Gde previše dajem?</span>
            <span>Šta više nije moje?</span>
          </div>
          <div className="scribble">„Vreme je da se vratim sebi.“</div>
        </article>
        <article className="process-panel panel-c">
          <p className="kicker">03 — PROMENA</p>
          <h2>
            Promena ne mora
            <br />
            <em>da bude glasna.</em>
          </h2>
          <div className="accept-list">
            {changes.map((x) => (
              <div key={x}>
                <Check size={18} />
                <span>{x}</span>
              </div>
            ))}
          </div>
        </article>
        <article className="process-panel panel-d">
          <p className="kicker light">04 — POVRATAK SEBI</p>
          <h2>
            Ne menjaš
            <br />
            ko si.
          </h2>
          <p className="final-line">Samo se vraćaš sebi.</p>
          <Sparkles className="final-spark" />
        </article>
      </div>
    </section>
  );
}
