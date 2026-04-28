import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Number of posts fetched per page.
 * Kept small so infinite scroll is demonstrable with the default seed data.
 */
export const FEED_PAGE_SIZE = 5;

interface FeedState {
  posts: any[];
  offset: number;
  hasMore: boolean;
}

/**
 * Module-level cache that survives component unmounts.
 * This lets us restore previously loaded posts instantly when the user
 * navigates to a post detail page and then presses the browser back button,
 * so TanStack Router's scrollRestoration can put them back at the right position.
 */
const feedCache = new Map<string, FeedState>();

/**
 * Infinite scroll hook.
 *
 * @param cacheKey  - Stable string key identifying the feed (e.g. "home", "explore").
 * @param fetchFn   - Async function that fetches a page given { limit, offset }.
 *
 * Returns:
 *  - posts        - Accumulated list of loaded posts.
 *  - loading      - True while the first page is being fetched.
 *  - loadingMore  - True while a subsequent page is being fetched.
 *  - hasMore      - False once the last page has been reached.
 *  - sentinelRef  - Ref to attach to a DOM element at the bottom of the list;
 *                   triggers the next page load when it enters the viewport.
 *  - reload       - Clears the cache and reloads from page 1 (used after creating a post).
 */
export function useInfiniteScroll(
  cacheKey: string,
  fetchFn: (options: { limit: number; offset: number }) => Promise<any[]>,
) {
  const [feedState, setFeedState] = useState<FeedState>(
    () => feedCache.get(cacheKey) ?? { posts: [], offset: 0, hasMore: true },
  );
  const [loading, setLoading] = useState(() => !feedCache.has(cacheKey));
  const [loadingMore, setLoadingMore] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  // Prevent concurrent fetches without re-rendering
  const isFetchingRef = useRef(false);
  // Keep latest fetchFn without adding it to effect deps (it is stable per route)
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;
  // Keep latest feed state readable inside callbacks without stale closure issues
  const feedStateRef = useRef(feedState);
  feedStateRef.current = feedState;

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    // Cache hit: data is already in state, skip the network request.
    if (feedCache.has(cacheKey)) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetchFnRef
      .current({ limit: FEED_PAGE_SIZE, offset: 0 })
      .then((posts) => {
        if (cancelled) return;
        const next: FeedState = {
          posts,
          offset: posts.length,
          hasMore: posts.length === FEED_PAGE_SIZE,
        };
        feedCache.set(cacheKey, next);
        setFeedState(next);
      })
      .catch((err) => console.error('Failed to load feed:', err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cacheKey]);

  // ── Load next page (called by IntersectionObserver) ───────────────────────
  const triggerLoadMore = useCallback(() => {
    const { hasMore: more, offset } = feedStateRef.current;
    if (isFetchingRef.current || !more) return;

    isFetchingRef.current = true;
    setLoadingMore(true);

    fetchFnRef
      .current({ limit: FEED_PAGE_SIZE, offset })
      .then((newPosts) => {
        setFeedState((prev) => {
          const next: FeedState = {
            posts: [...prev.posts, ...newPosts],
            offset: prev.offset + newPosts.length,
            hasMore: newPosts.length === FEED_PAGE_SIZE,
          };
          feedCache.set(cacheKey, next);
          return next;
        });
      })
      .catch((err) => console.error('Failed to load more posts:', err))
      .finally(() => {
        isFetchingRef.current = false;
        setLoadingMore(false);
      });
  }, [cacheKey]);

  // ── IntersectionObserver ──────────────────────────────────────────────────
  useEffect(() => {
    const sentinel = sentinelRef.current;
    // Don't observe until the initial load is complete.
    if (!sentinel || loading) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) triggerLoadMore();
      },
      // Start loading slightly before the sentinel reaches the viewport for
      // a seamless scrolling experience.
      { rootMargin: '200px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loading, triggerLoadMore]);

  // ── Reload from scratch ───────────────────────────────────────────────────
  const reload = useCallback(() => {
    feedCache.delete(cacheKey);
    isFetchingRef.current = false;
    setLoading(true);
    setFeedState({ posts: [], offset: 0, hasMore: true });

    fetchFnRef
      .current({ limit: FEED_PAGE_SIZE, offset: 0 })
      .then((posts) => {
        const next: FeedState = {
          posts,
          offset: posts.length,
          hasMore: posts.length === FEED_PAGE_SIZE,
        };
        feedCache.set(cacheKey, next);
        setFeedState(next);
      })
      .catch((err) => console.error('Failed to reload feed:', err))
      .finally(() => setLoading(false));
  }, [cacheKey]);

  return {
    posts: feedState.posts,
    loading,
    loadingMore,
    hasMore: feedState.hasMore,
    sentinelRef,
    reload,
  };
}
