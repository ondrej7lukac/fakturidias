import { useEffect, useState } from 'react';

export interface ScreenNarration {
  text: string;
  mode: 'field' | 'section';
}

const FIELD_TAGS = new Set(['INPUT', 'SELECT', 'TEXTAREA']);

function resolveFieldLabel(el: Element): string {
  const aria = el.getAttribute('aria-label');
  if (aria) return aria.trim();

  const id = el.getAttribute('id');
  if (id) {
    const forLabel = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (forLabel?.textContent?.trim()) return forLabel.textContent.trim();
  }

  const field = el.closest('.ap-field, label');
  const label = field?.querySelector('label');
  if (label?.textContent?.trim()) return label.textContent.trim();

  const placeholder = el.getAttribute('placeholder');
  if (placeholder) return placeholder.trim();

  return '';
}

/**
 * Narrates what the user is currently doing on screen — the focused field, or
 * the section scrolled into view. Acts like a lightweight accessibility summary
 * to help orientation, especially on mobile. Returns null when nothing relevant
 * is in focus or view.
 *
 * @param rebindKey changes when the screen swaps (view/dashboard) so the
 *                  section observer re-binds to the freshly rendered DOM.
 */
export function useScreenNarration(rebindKey: string): ScreenNarration | null {
  const [focusLabel, setFocusLabel] = useState('');
  const [sectionLabel, setSectionLabel] = useState('');

  // Focused form field → "what the user is editing"
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const el = e.target as Element | null;
      if (el && FIELD_TAGS.has(el.tagName)) setFocusLabel(resolveFieldLabel(el));
    };
    const onFocusOut = (e: FocusEvent) => {
      const next = e.relatedTarget as Element | null;
      // keep the label while moving between fields; only clear when focus leaves
      if (!next || !FIELD_TAGS.has(next.tagName)) setFocusLabel('');
    };
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  // Section scrolled into view → "what the user is looking at"
  useEffect(() => {
    const titles = Array.from(
      document.querySelectorAll<HTMLElement>('.ap-card__title'),
    );
    if (!titles.length) {
      setSectionLabel('');
      return;
    }

    const visible = new Set<HTMLElement>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target as HTMLElement);
          else visible.delete(entry.target as HTMLElement);
        }
        const top = Array.from(visible).sort(
          (a, b) =>
            a.getBoundingClientRect().top - b.getBoundingClientRect().top,
        )[0];
        if (top) setSectionLabel(top.textContent?.trim() || '');
      },
      { rootMargin: '-90px 0px -60% 0px', threshold: 0 },
    );

    titles.forEach((title) => observer.observe(title));
    return () => observer.disconnect();
  }, [rebindKey]);

  if (focusLabel) return { text: focusLabel, mode: 'field' };
  if (sectionLabel) return { text: sectionLabel, mode: 'section' };
  return null;
}
