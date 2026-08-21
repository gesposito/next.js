import type { AppHistoryState } from './router-reducer/router-reducer-types'
import { restore, traverse } from './navigator'

// Recorded by the inline script in server/app-render/history-bootstrap.ts,
// which runs with the shell, long before the Router effect installs the
// history handlers.
type EarlyHistory = {
  // The URL the document started on.
  href: string
  // Whether pushState, replaceState or popstate happened since.
  changed: boolean
}

type EarlyHistoryWrapper<T> = T & { __original?: T }

declare global {
  interface Window {
    __next_h?: EarlyHistory
  }
}

// The URL the server rendered for, so hydration matches the HTML. A fragment
// change keeps the same page, so it does not count as a change.
export function getHistoryActivationUrl(): URL {
  const earlyHistory = window.__next_h
  if (earlyHistory === undefined) {
    return new URL(window.location.href)
  }
  const activationUrl = new URL(earlyHistory.href)
  const currentUrl = new URL(window.location.href)
  activationUrl.hash = currentUrl.hash
  if (activationUrl.href === currentUrl.href) {
    earlyHistory.changed = false
  }
  return activationUrl
}

export function shouldSkipFirstHistoryWrite(): boolean {
  return window.__next_h?.changed === true
}

// A router-written entry is restored like a popstate. Any other entry is
// adopted at its current URL, as the first write used to do.
function replayEarlyHistoryChange(): void {
  if (window.history.state?.__NA) {
    handlePopState(window.history.state)
  } else {
    restore(new URL(window.location.href), undefined)
  }
}

/**
 * Handles a popstate event (or one that was missed before hydration).
 * By default dispatches ACTION_RESTORE, however if the history entry was not
 * pushed/replaced by app-router it will reload the page.
 * That case can happen when the old router injected the history entry.
 */
function handlePopState(state: PopStateEvent['state']): void {
  if (!state) {
    // TODO-APP: this case only happens when pushState/replaceState was called outside of Next.js. It should probably reload the page in this case.
    return
  }

  // This case happens when the history entry was pushed by the `pages` router.
  if (!state.__NA) {
    window.location.reload()
    return
  }

  traverse(window.location.href, state.__PRIVATE_NEXTJS_INTERNALS_TREE)
}

function copyNextJsInternalHistoryState(data: any) {
  if (data == null) data = {}
  const currentState = window.history.state
  const __NA = currentState?.__NA
  if (__NA) {
    data.__NA = __NA
  }
  const __PRIVATE_NEXTJS_INTERNALS_TREE =
    currentState?.__PRIVATE_NEXTJS_INTERNALS_TREE
  if (__PRIVATE_NEXTJS_INTERNALS_TREE) {
    data.__PRIVATE_NEXTJS_INTERNALS_TREE = __PRIVATE_NEXTJS_INTERNALS_TREE
  }

  return data
}

export function installHistoryHandlers(): () => void {
  const changedBeforeHydration = window.__next_h?.changed === true
  delete window.__next_h

  // An app may have wrapped these in turn; only remove our own wrappers.
  const pushStateWrapper: EarlyHistoryWrapper<History['pushState']> =
    window.history.pushState
  if (pushStateWrapper.__original !== undefined) {
    window.history.pushState = pushStateWrapper.__original
  }
  const replaceStateWrapper: EarlyHistoryWrapper<History['replaceState']> =
    window.history.replaceState
  if (replaceStateWrapper.__original !== undefined) {
    window.history.replaceState = replaceStateWrapper.__original
  }

  const originalPushState = window.history.pushState.bind(window.history)
  const originalReplaceState = window.history.replaceState.bind(window.history)

  // Ensure the canonical URL in the Next.js Router is updated when the URL is changed so that `usePathname` and `useSearchParams` hold the pushed values.
  const applyUrlFromHistoryPushReplace = (
    url: string | URL | null | undefined
  ) => {
    const href = window.location.href
    const appHistoryState: AppHistoryState | undefined =
      window.history.state?.__PRIVATE_NEXTJS_INTERNALS_TREE

    restore(new URL(url ?? href, href), appHistoryState)
  }

  /**
   * Patch pushState to ensure external changes to the history are reflected in the Next.js Router.
   * Ensures Next.js internal history state is copied to the new history entry.
   * Ensures usePathname and useSearchParams hold the newly provided url.
   */
  window.history.pushState = function pushState(
    data: any,
    _unused: string,
    url?: string | URL | null
  ): void {
    // TODO: Warn when Navigation API is available (navigation.navigate() should be used)
    // Avoid a loop when Next.js internals trigger pushState/replaceState
    if (data?.__NA || data?._N) {
      return originalPushState(data, _unused, url)
    }

    data = copyNextJsInternalHistoryState(data)

    if (url) {
      applyUrlFromHistoryPushReplace(url)
    }

    return originalPushState(data, _unused, url)
  }

  /**
   * Patch replaceState to ensure external changes to the history are reflected in the Next.js Router.
   * Ensures Next.js internal history state is copied to the new history entry.
   * Ensures usePathname and useSearchParams hold the newly provided url.
   */
  window.history.replaceState = function replaceState(
    data: any,
    _unused: string,
    url?: string | URL | null
  ): void {
    // TODO: Warn when Navigation API is available (navigation.navigate() should be used)
    // Avoid a loop when Next.js internals trigger pushState/replaceState
    if (data?.__NA || data?._N) {
      return originalReplaceState(data, _unused, url)
    }
    data = copyNextJsInternalHistoryState(data)

    if (url) {
      applyUrlFromHistoryPushReplace(url)
    }
    return originalReplaceState(data, _unused, url)
  }

  const onPopState = (event: PopStateEvent) => handlePopState(event.state)

  window.addEventListener('popstate', onPopState)

  if (changedBeforeHydration) {
    replayEarlyHistoryChange()
  }

  return () => {
    window.history.pushState = originalPushState
    window.history.replaceState = originalReplaceState
    window.removeEventListener('popstate', onPopState)
  }
}
