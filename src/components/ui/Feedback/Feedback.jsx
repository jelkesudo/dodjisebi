import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X, LoaderCircle } from 'lucide-react';
import './Feedback.css';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const remove = useCallback((id) => setToasts((items) => items.filter((x) => x.id !== id)), []);
  const push = useCallback((message, type = 'info', duration = 3800) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((items) => [...items, { id, message, type }]);
    window.setTimeout(() => remove(id), duration);
    return id;
  }, [remove]);
  const api = useMemo(() => ({
    success: (m) => push(m, 'success'), error: (m) => push(m, 'error', 5000),
    info: (m) => push(m, 'info'), warning: (m) => push(m, 'warning', 5000),
  }), [push]);
  return <ToastContext.Provider value={api}>{children}<div className="ds-toast-stack" aria-live="polite">{toasts.map((t) => {
    const Icon = t.type === 'success' ? CheckCircle2 : t.type === 'error' || t.type === 'warning' ? AlertCircle : Info;
    return <div className={`ds-toast ${t.type}`} key={t.id}><Icon size={20}/><span>{t.message}</span><button onClick={() => remove(t.id)} aria-label="Zatvori"><X size={17}/></button></div>;
  })}</div></ToastContext.Provider>;
}

export function useToast() { const value = useContext(ToastContext); if (!value) throw new Error('useToast mora biti unutar ToastProvider'); return value; }

export function PageLoader({ label = 'Učitavanje...' }) {
  return <div className="ds-page-loader" role="status" aria-live="polite"><div className="ds-loader-mark">DS</div><LoaderCircle className="ds-spinner" size={30}/><span>{label}</span></div>;
}

export function ButtonSpinner() { return <LoaderCircle className="ds-spinner ds-button-spinner" size={17} aria-hidden="true"/>; }

export function ConfirmDialog({ open, title, message, confirmLabel = 'Potvrdi', cancelLabel = 'Otkaži', danger = false, busy = false, onConfirm, onCancel }) {
  if (!open) return null;
  return <div className="ds-dialog-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onCancel?.(); }}>
    <section className="ds-dialog" role="dialog" aria-modal="true" aria-labelledby="ds-dialog-title">
      <button className="ds-dialog-x" onClick={onCancel} disabled={busy} aria-label="Zatvori"><X size={20}/></button>
      <p className="kicker">POTVRDA</p><h2 id="ds-dialog-title">{title}</h2><p>{message}</p>
      <div className="ds-dialog-actions"><button className="client-btn secondary" onClick={onCancel} disabled={busy}>{cancelLabel}</button><button className={`client-btn ${danger ? 'danger' : ''}`} onClick={onConfirm} disabled={busy}>{busy && <ButtonSpinner/>}{confirmLabel}</button></div>
    </section>
  </div>;
}
