import { useEffect, useRef } from 'react';
import { useRouter } from '@tanstack/react-router';

function isTypingTarget(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

function getFocusedArticle(): HTMLElement | null {
  return document.querySelector('article[data-keyboard-focused]');
}

function getArticles(): HTMLElement[] {
  return Array.from(document.querySelectorAll('article[data-post-id]'));
}

function setFocus(article: HTMLElement | null) {
  for (const el of getArticles()) {
    el.removeAttribute('data-keyboard-focused');
  }
  if (article) {
    article.setAttribute('data-keyboard-focused', 'true');
    article.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

export function useKeyboardNav(
  onToggleHelp: () => void,
  onCloseHelp?: () => void,
) {
  const router = useRouter();
  const onToggleHelpRef = useRef(onToggleHelp);
  onToggleHelpRef.current = onToggleHelp;
  const onCloseHelpRef = useRef(onCloseHelp);
  onCloseHelpRef.current = onCloseHelp;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isTypingTarget(document.activeElement)) return;

      // ? — toggle help overlay
      if (e.key === '?') {
        e.preventDefault();
        onToggleHelpRef.current();
        return;
      }

      // Escape — close help overlay if open, otherwise clear keyboard focus
      if (e.key === 'Escape') {
        if (onCloseHelpRef.current) {
          onCloseHelpRef.current();
        } else {
          setFocus(null);
        }
        return;
      }

      const articles = getArticles();
      if (articles.length === 0) return;

      const current = getFocusedArticle();
      const currentIndex = current ? articles.indexOf(current) : -1;

      // j / ArrowDown — next post
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        const next = articles[Math.min(currentIndex + 1, articles.length - 1)];
        setFocus(next);
        return;
      }

      // k / ArrowUp — prev post
      if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = articles[Math.max(currentIndex - 1, 0)];
        setFocus(currentIndex === -1 ? articles[0] : prev);
        return;
      }

      // All remaining shortcuts require a focused post
      if (!current) return;

      const postId = current.getAttribute('data-post-id');
      if (!postId) return;

      // l — like
      if (e.key === 'l') {
        e.preventDefault();
        const likeBtn = current.querySelector<HTMLButtonElement>(
          'button[title="Like"]',
        );
        likeBtn?.click();
        return;
      }

      // b — bookmark
      if (e.key === 'b') {
        e.preventDefault();
        const bookmarkBtn = current.querySelector<HTMLButtonElement>(
          'button[title="Bookmark"], button[title="Remove bookmark"]',
        );
        bookmarkBtn?.click();
        return;
      }

      // Enter / o — open post
      if (e.key === 'Enter' || e.key === 'o') {
        e.preventDefault();
        router.navigate({ to: '/posts/$postId', params: { postId } });
        return;
      }

      // r — reply (open post, reply input is there)
      if (e.key === 'r') {
        e.preventDefault();
        router.navigate({ to: '/posts/$postId', params: { postId } });
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [router]);
}
