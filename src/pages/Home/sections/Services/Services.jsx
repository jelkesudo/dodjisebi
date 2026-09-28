import { ArrowRight } from 'lucide-react';
import { useScrollScene } from '../../../../hooks/useScrollScene';
import { range } from '../../../../utils/scroll';
import { services } from '../../../../data/services';
import { useScrollLockPoints } from '../../../../hooks/useScrollLockPoints';
import './Services.css';
export default function Services() {
  useScrollLockPoints({
    sectionId: 'rad',
    points: [0.16, 0.4, 0.64, 0.88],
    lockDuration: 650,
  });
  const ref = useScrollScene((el, p) => {
    el.style.setProperty('--p', p.toFixed(4));
    const cardStarts = [0.08, 0.32, 0.56, 0.80];

    services.forEach((_, i) => {
    const start = cardStarts[i];
    const end = start + 0.08;

    el.style.setProperty(
        `--card${i}`,
        range(p, start, end).toFixed(4)
    );
    });
  });
  return (
    <section id="rad" className="apple-scene services-scene" ref={ref}>
      <div className="sticky-stage services-stage">
        <div className="services-title">
          <p className="kicker">05 — ZAJEDNO</p>
          <h2>
            Kako možemo da radimo
            <br />
            <em>zajedno?</em>
          </h2>
        </div>
        <div className="services-stack">
          {services.map(({ num, title, text, Icon }, i) => (
            <article className={`service-sheet sheet-${i}`} key={title}>
              <div className="service-index">{num}</div>
              <Icon />
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
              <a href="#kontakt">
                Saznaj više <ArrowRight size={16} />
              </a>
            </article>
          ))}
        </div>
        <div className="service-caption">
          Nema jednog pravog puta. Postoji onaj koji ima smisla za tebe.
        </div>
      </div>
    </section>
  );
}
