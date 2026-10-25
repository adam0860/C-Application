import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

/** Centered dialog on wide screens, bottom sheet on phones. */
export function Modal({
  open,
  onClose,
  children,
  label,
  className,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  label: string;
  className?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  // Keep the latest onClose without re-running the focus effect: callers often pass
  // an inline function, and re-focusing the panel on every render stole focus from inputs.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current();
      }
    };
    window.addEventListener('keydown', h, true);
    return () => {
      window.removeEventListener('keydown', h, true);
      prev?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${className ?? ''}`} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} ref={panel}>
        <div className="sheet-grip" aria-hidden="true" />
        <button type="button" className="icon-btn modal-close" onClick={onClose} aria-label="Close">
          <Icon name="x" size={20} />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
