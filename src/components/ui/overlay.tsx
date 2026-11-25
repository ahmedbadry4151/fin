"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { DUR, EASE_IN, EASE_OUT } from "../motion/tokens";
import { Button, IconButton } from "./button";

const ENTER = { duration: DUR.modal, ease: EASE_OUT };
const EXIT = { duration: DUR.exit, ease: EASE_IN };

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useDialogBehavior(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const container = ref.current;
    const focusables = container ? [...container.querySelectorAll<HTMLElement>(FOCUSABLE)] : [];
    (focusables[0] ?? container)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeRef.current();
        return;
      }
      if (e.key !== "Tab" || !container) return;
      const nodes = [...container.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previous?.focus?.();
    };
  }, [open]);

  return ref;
}

export function Drawer({ open, onClose, title, children, footer, width = 460 }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; footer?: ReactNode; width?: number }) {
  const dialogRef = useDialogBehavior(open, onClose);
  const enter = ENTER;
  const exit = EXIT;
  return (
    <AnimatePresence initial={false}>
      {open && (
        <div ref={dialogRef} tabIndex={-1} className="fixed inset-0 z-[90]" role="dialog" aria-modal="true">
          <motion.div className="absolute inset-0 bg-ink-deep/30 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: exit }} transition={enter} onClick={onClose} />
          <motion.aside
            className="motion-reveal absolute right-0 top-0 flex h-full w-full flex-col bg-card shadow-panel md:m-3 md:h-[calc(100%-24px)] md:rounded-[26px]"
            style={{ maxWidth: width }}
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 30, opacity: 0, transition: exit }}
            transition={enter}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-[15px] font-bold tracking-tight">{title}</h2>
              <IconButton label="Close" onClick={onClose}>
                <X className="h-4 w-4" />
              </IconButton>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
            {footer && <div className="border-t border-line px-5 py-4">{footer}</div>}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Modal({ open, onClose, title, children, footer, size = "md" }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; footer?: ReactNode; size?: "sm" | "md" | "lg" }) {
  const dialogRef = useDialogBehavior(open, onClose);
  const enter = ENTER;
  const exit = EXIT;
  const w = size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-3xl" : "max-w-lg";
  return (
    <AnimatePresence initial={false}>
      {open && (
        <div ref={dialogRef} tabIndex={-1} className="fixed inset-0 z-[95] grid place-items-center p-4" role="dialog" aria-modal="true">
          <motion.div className="absolute inset-0 bg-ink-deep/40 backdrop-blur-[3px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: exit }} transition={enter} onClick={onClose} />
          <motion.div
            className={`motion-reveal relative w-full ${w} rounded-[24px] bg-card p-6 shadow-panel`}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4, transition: exit }}
            transition={enter}
          >
            {title && <h2 className="mb-3 text-[18px] font-extrabold tracking-tight">{title}</h2>}
            {children}
            {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = "Confirm", destructive = false, loading = false, requireText }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; description: ReactNode; confirmLabel?: string; destructive?: boolean; loading?: boolean; requireText?: string }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={destructive ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-[13.5px] text-muted leading-relaxed">{description}</div>
      {requireText && <div className="mt-3 text-[11.5px] text-subtle">Type “{requireText}” is not required in this demo — confirm to proceed.</div>}
    </Modal>
  );
}
