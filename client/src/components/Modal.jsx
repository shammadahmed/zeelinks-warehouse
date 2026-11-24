import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

export default function Modal({
  title,
  subtitle,
  children,
  onClose,
  busy = false,
  className = "",
  initialFocusRef,
}) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    (initialFocusRef?.current || ref.current).focus();
    const keydown = (event) => {
      if (event.key === "Escape" && !busy) closeRef.current();
      if (event.key !== "Tab") return;
      const focusable = [
        ...ref.current.querySelectorAll(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]',
        ),
      ];
      const first = focusable[0],
        last = focusable.at(-1);
      if (!first) {
        event.preventDefault();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === ref.current)
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          document.activeElement === ref.current)
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, [busy, initialFocusRef]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        className={`modal ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        ref={ref}
      >
        <header className="modal-header">
          <div>
            <span className="eyebrow">WAREHOUSE</span>
            <h2 id="modal-title">{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
            disabled={busy}
          >
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
