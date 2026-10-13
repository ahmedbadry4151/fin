"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { EASE_OUT } from "../motion/stagger";
import { Button, IconButton } from "./button";

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
}

export function Drawer({ open, onClose, title, children, footer, width = 460 }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; footer?: ReactNode; width?: number }) {
  useEscape(open, onClose);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true">
          <motion.div className="absolute inset-0 bg-ink-deep/30 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} onClick={onClose} />
          <motion.aside
            className="absolute right-0 top-0 flex h-full w-full flex-col bg-card shadow-panel md:m-3 md:h-[calc(100%-24px)] md:rounded-[26px]"
            style={{ maxWidth: width }}
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 30, opacity: 0 }}
            transition={{ duration: 0.32, ease: EASE_OUT }}
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
  useEscape(open, onClose);
  const w = size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-3xl" : "max-w-lg";
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[95] grid place-items-center p-4" role="dialog" aria-modal="true">
          <motion.div className="absolute inset-0 bg-ink-deep/40 backdrop-blur-[3px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} onClick={onClose} />
          <motion.div
            className={`relative w-full ${w} rounded-[24px] bg-card p-6 shadow-panel`}
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ duration: 0.28, ease: EASE_OUT }}
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
