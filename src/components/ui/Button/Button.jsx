import { ArrowRight } from 'lucide-react';
import './Button.css';

export default function Button({ children, href, onClick, small = false, className = '' }) {
  const classes = `btn${small ? ' btn--small' : ''} ${className}`.trim();
  if (href) return <a className={classes} href={href}>{children}<ArrowRight size={16}/></a>;
  return <button className={classes} type="button" onClick={onClick}>{children}<ArrowRight size={16}/></button>;
}
