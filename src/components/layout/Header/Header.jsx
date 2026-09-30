import { useState } from 'react';
import { Menu, UserRound } from 'lucide-react';
import { getStoredSession } from '../../../services/supabase/supabaseClient';
import Button from '../../ui/Button/Button';
import './Header.css';

export default function Header({ onApply }) {
  const [menuOpen,setMenuOpen]=useState(false); const session=getStoredSession();
  const accountHref=session?.access_token?'/nalog':'/prijava'; const accountLabel=session?.access_token?'Moj nalog':'Prijava na nalog';
  const go=(href)=>{setMenuOpen(false);window.history.pushState({},'',href);window.dispatchEvent(new PopStateEvent('popstate'));};
  const closeMenu=()=>setMenuOpen(false);
  return <header className="site-header">
    <a className="logo" href="#top" onClick={closeMenu}>DOĐI SEBI</a>
    <nav className={menuOpen?'is-open':''} aria-label="Glavna navigacija">
      <a href="#zastani" onClick={closeMenu}>Proces</a><a href="#rad" onClick={closeMenu}>Radimo zajedno</a><a href="#price" onClick={closeMenu}>Priče</a><a href="#kontakt" onClick={closeMenu}>Kontakt</a>
      <button className="mobile-account-link" type="button" onClick={()=>go(accountHref)}><UserRound size={18}/>{accountLabel}</button>
    </nav>
    <div className="header-actions"><button className="desktop-account" type="button" onClick={()=>go(accountHref)} aria-label={accountLabel}><UserRound size={21}/></button><Button small onClick={()=>{closeMenu();onApply();}}>Prijavi se</Button></div>
    <button className="hamb" type="button" aria-label={menuOpen?'Zatvori meni':'Otvori meni'} aria-expanded={menuOpen} onClick={()=>setMenuOpen(v=>!v)}><Menu/></button>
  </header>;
}
