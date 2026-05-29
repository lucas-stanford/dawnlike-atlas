// MovablePanel: a reusable floating HUD panel that the player can drag and
// collapse. State (position + collapsed) is persisted to localStorage keyed
// by `storageKey` so the user's layout sticks across reloads.
//
// Header is the drag handle. The right-side chevron toggles collapse without
// initiating a drag. Double-clicking the header (anywhere not a control) resets
// the position back to `defaultAnchor`.
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, GripHorizontal } from 'lucide-react';

const DEFAULT_HUD = {
  text: '#e8eaf0',
  panelBg: 'rgba(12,16,24,0.92)',
  border: '1px solid rgba(160,180,210,0.18)',
  shadow: '0 6px 18px rgba(0,0,0,0.55)',
  accent: '#5dd4d4',
};

function readStored(storageKey, defaultCollapsed) {
  if (typeof window === 'undefined') return { pos: null, collapsed: defaultCollapsed };
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return { pos: null, collapsed: defaultCollapsed };
    const parsed = JSON.parse(raw);
    const pos = (parsed && Number.isFinite(parsed.left) && Number.isFinite(parsed.top))
      ? { left: parsed.left, top: parsed.top } : null;
    const collapsed = !!(parsed && parsed.collapsed);
    return { pos, collapsed };
  } catch (_) {
    return { pos: null, collapsed: defaultCollapsed };
  }
}

function writeStored(storageKey, { pos, collapsed }) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify({
      left: pos?.left,
      top: pos?.top,
      collapsed: !!collapsed,
    }));
  } catch (_) {}
}

export function MovablePanel({
  storageKey,
  defaultAnchor = { left: 12, top: 12 },
  width,
  title,
  icon: IconCmp,
  accent = DEFAULT_HUD.accent,
  defaultCollapsed = false,
  collapsible = true,
  headerExtras = null,
  collapsedPreview = null,
  children,
  zIndex = 60,
  bodyPadding = '8px 10px 10px',
  fontFamily = 'system-ui, sans-serif',
  className,
}) {
  const panelRef = useRef(null);
  const dragRef = useRef(null);

  const [state, setState] = useState(() => readStored(storageKey, defaultCollapsed));
  const [dragging, setDragging] = useState(false);

  const clampToParent = useCallback((left, top) => {
    const el = panelRef.current;
    if (!el || !el.offsetParent) return { left, top };
    const parentRect = el.offsetParent.getBoundingClientRect();
    const panelRect = el.getBoundingClientRect();
    const maxLeft = Math.max(0, parentRect.width - panelRect.width);
    const maxTop = Math.max(0, parentRect.height - panelRect.height);
    return {
      left: Math.min(Math.max(0, left), maxLeft),
      top: Math.min(Math.max(0, top), maxTop),
    };
  }, []);

  useEffect(() => {
    if (!state.pos) return;
    const next = clampToParent(state.pos.left, state.pos.top);
    if (next.left !== state.pos.left || next.top !== state.pos.top) {
      setState((p) => {
        const merged = { ...p, pos: next };
        writeStored(storageKey, merged);
        return merged;
      });
    }
  }, [state.collapsed, clampToParent, storageKey, state.pos]);

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('[data-mp-control]')) return;
    const el = panelRef.current;
    if (!el || !el.offsetParent) return;
    const parentRect = el.offsetParent.getBoundingClientRect();
    const panelRect = el.getBoundingClientRect();
    dragRef.current = {
      parentRect, panelRect,
      grabOffsetX: e.clientX - panelRect.left,
      grabOffsetY: e.clientY - panelRect.top,
      pointerId: e.pointerId,
    };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
    setDragging(true);
    e.preventDefault();
  };

  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const left = e.clientX - d.parentRect.left - d.grabOffsetX;
    const top = e.clientY - d.parentRect.top - d.grabOffsetY;
    const maxLeft = Math.max(0, d.parentRect.width - d.panelRect.width);
    const maxTop = Math.max(0, d.parentRect.height - d.panelRect.height);
    const clamped = {
      left: Math.min(Math.max(0, left), maxLeft),
      top: Math.min(Math.max(0, top), maxTop),
    };
    setState((p) => ({ ...p, pos: clamped }));
  };

  const finishDrag = (e) => {
    const d = dragRef.current;
    if (!d) return;
    try { e.currentTarget.releasePointerCapture(d.pointerId); } catch (_) {}
    dragRef.current = null;
    setDragging(false);
    setState((p) => {
      if (p.pos) writeStored(storageKey, p);
      return p;
    });
  };

  const onDoubleClick = (e) => {
    if (e.target.closest('[data-mp-control]')) return;
    setState((p) => {
      const merged = { ...p, pos: null };
      writeStored(storageKey, merged);
      return merged;
    });
  };

  const toggleCollapse = (e) => {
    e.stopPropagation();
    setState((p) => {
      const merged = { ...p, collapsed: !p.collapsed };
      writeStored(storageKey, merged);
      return merged;
    });
  };

  const positionStyle = state.pos
    ? { left: state.pos.left, top: state.pos.top, right: 'auto', bottom: 'auto', transform: 'none' }
    : { ...defaultAnchor };

  return (
    <div
      ref={panelRef}
      className={className}
      style={{
        position: 'absolute',
        zIndex,
        width,
        background: DEFAULT_HUD.panelBg,
        border: dragging ? `1px solid ${accent}aa` : DEFAULT_HUD.border,
        boxShadow: dragging ? `${DEFAULT_HUD.shadow}, 0 0 22px ${accent}55` : DEFAULT_HUD.shadow,
        borderRadius: 8,
        fontFamily,
        color: DEFAULT_HUD.text,
        userSelect: 'none',
        transition: dragging ? 'none' : 'box-shadow 160ms ease, border-color 160ms ease',
        overflow: 'hidden',
        ...positionStyle,
      }}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onDoubleClick={onDoubleClick}
        title="Drag to move · double-click to reset position"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 8px',
          fontSize: 10, fontWeight: 700, letterSpacing: '2px',
          color: accent,
          background: `linear-gradient(180deg, ${accent}18 0%, ${accent}05 100%)`,
          borderBottom: state.collapsed ? 'none' : `1px solid ${accent}26`,
          touchAction: 'none',
          cursor: dragging ? 'grabbing' : 'grab',
        }}
      >
        {IconCmp && <IconCmp size={11} color={accent} strokeWidth={2.2} />}
        <span style={{
          flex: 1, textTransform: 'uppercase',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {title}
        </span>
        {state.collapsed && collapsedPreview}
        {headerExtras}
        <GripHorizontal size={11} color={accent} strokeWidth={2} style={{ opacity: 0.45 }} />
        {collapsible && (
          <button
            data-mp-control
            type="button"
            onClick={toggleCollapse}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={state.collapsed ? 'Expand panel' : 'Collapse panel'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 18, height: 18, padding: 0,
              background: 'transparent', border: 'none',
              color: accent, cursor: 'pointer',
              borderRadius: 3,
            }}
          >
            {state.collapsed ? <ChevronDown size={13} strokeWidth={2.4} /> : <ChevronUp size={13} strokeWidth={2.4} />}
          </button>
        )}
      </div>
      {!state.collapsed && (
        <div style={{ padding: bodyPadding }}>
          {children}
        </div>
      )}
    </div>
  );
}

export default MovablePanel;
