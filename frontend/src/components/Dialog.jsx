import { useEffect, useRef, useId } from 'react';

export default function Dialog({ title, onClose, children, busy = false, className = '' }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    dialog.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <dialog ref={ref} className={`dialog ${className}`} aria-labelledby={titleId} onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}>
      <div className="dialog-heading">
        <h2 id={titleId}>{title}</h2>
        <button className="icon-button" type="button" aria-label="Close dialog" onClick={onClose} disabled={busy}>×</button>
      </div>
      {children}
    </dialog>
  );
}
