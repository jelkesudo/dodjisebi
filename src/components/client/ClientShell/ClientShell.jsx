import { useState } from 'react';
import { LogOut, Menu, UserRound, LayoutDashboard, ShoppingBag, Settings } from 'lucide-react';
import { authService } from '../../../services/auth/authService';
import './ClientShell.css';

const links = [
  ['/nalog', 'Pregled', LayoutDashboard],
  ['/nalog/ponuda', 'Ponuda', ShoppingBag],
  ['/nalog/podesavanja', 'Podešavanja', Settings],
];

export default function ClientShell({ children, email }) {
  const [open, setOpen] = useState(false);
  const path = window.location.pathname;
  const go = (href) => { window.history.pushState({}, '', href); window.dispatchEvent(new PopStateEvent('popstate')); setOpen(false); };
  const logout = async () => { await authService.signOut(); window.history.replaceState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')); };
  return <div className="client-layout">
    <aside className={`client-sidebar ${open ? 'open' : ''}`}>
      <button className="client-logo" onClick={() => go('/')}>DOĐI SEBI</button>
      <nav>{links.map(([href,label,Icon]) => <button key={href} className={path === href ? 'active' : ''} onClick={() => go(href)}><Icon size={18}/>{label}</button>)}</nav>
      <div className="client-user"><UserRound size={18}/><span>{email || 'Moj nalog'}</span></div>
      <button className="client-logout" onClick={logout}><LogOut size={18}/>Odjavi se</button>
    </aside>
    <div className="client-main">
      <header className="client-mobile-head"><button onClick={() => setOpen(v=>!v)} aria-label="Meni"><Menu/></button><strong>DOĐI SEBI</strong></header>
      <main>{children}</main>
    </div>
    {open && <button className="client-scrim" onClick={()=>setOpen(false)} aria-label="Zatvori meni"/>}
  </div>;
}
