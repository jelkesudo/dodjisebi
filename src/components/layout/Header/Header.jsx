import { Menu } from 'lucide-react';
import Button from '../../ui/Button/Button';
import './Header.css';

export default function Header({ onApply }) {
  const scrollToSceneProgress = (e, id, progress) => {
    e.preventDefault();

    const section = document.getElementById(id);
    if (!section) return;

    const travel = Math.max(
      1,
      section.offsetHeight - window.innerHeight
    );

    const sectionTop =
      section.getBoundingClientRect().top + window.scrollY;

    window.scrollTo({
      top: sectionTop + travel * progress,
      behavior: 'smooth',
    });

    history.replaceState(null, '', `#${id}`);
  };

  return (
    <header className="site-header">
      <a className="logo" href="#top">
        DOĐI SEBI
      </a>

      <nav aria-label="Glavna navigacija">
        <a href="#zastani" onClick={(e) => scrollToSceneProgress(e, 'zastani', 0.10)}>
          Proces
        </a>

        <a
          href="#rad"
          onClick={(e) => scrollToSceneProgress(e, 'rad', 0.16)}
        >
          Radimo zajedno
        </a>

        <a href="#price" onClick={(e) => scrollToSceneProgress(e, 'price', 0.26)}>
          Priče
        </a>

        <a href="#kontakt">
          Kontakt
        </a>
      </nav>

      <Button small onClick={onApply}>
        Prijavi se
      </Button>

      <button
        className="hamb"
        aria-label="Otvori meni"
      >
        <Menu />
      </button>
    </header>
  );
}