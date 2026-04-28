/**
 * Session-scoped draft persistence for the post composition form.
 * Only one draft exists at a time. Storing a new draft overwrites the old one.
 * The draft is cleared when a post is successfully submitted.
 *
 * Uses sessionStorage so drafts survive in-page navigation but not tab closes.
 */

const DRAFT_KEY = 'chirp-post-draft';

export interface PostDraft {
  content: string;
  contentWarning: string;
}

function readDraft(): PostDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.content === 'string' &&
      typeof parsed?.contentWarning === 'string'
    ) {
      return parsed as PostDraft;
    }
    return null;
  } catch {
    return null;
  }
}

function writeDraft(draft: PostDraft): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // sessionStorage may be unavailable (private browsing quota etc.)
  }
}

function removeDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

export const postDraft = {
  read: readDraft,
  save: writeDraft,
  clear: removeDraft,
};
