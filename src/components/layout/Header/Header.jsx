import { useState } from 'react';
import { Menu } from 'lucide-react';
import Button from '../../ui/Button/Button';
import './Header.css';

export default function Header({ onApply }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  return (
    <header className="site-header">
      <a className="logo" href="#top" onClick={closeMenu}>DOĐI SEBI</a>
      <nav className={menuOpen ? 'is-open' : ''} aria-label="Glavna navigacija">
        <a href="#zastani" onClick={closeMenu}>Proces</a>
        <a href="#rad" onClick={closeMenu}>Radimo zajedno</a>
        <a href="#price" onClick={closeMenu}>Priče</a>
        <a href="#kontakt" onClick={closeMenu}>Kontakt</a>
      </nav>
      <Button small onClick={() => { closeMenu(); onApply(); }}>Prijavi se</Button>
      <button className="hamb" type="button"
        aria-label={menuOpen ? 'Zatvori meni' : 'Otvori meni'}
        aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
        <Menu />
      </button>
    </header>
  );
}
