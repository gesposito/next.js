// Runs with the shell, before the bootstrap scripts. Records history changes
// until the App Router takes over (see client/components/history-handlers.ts).
const historyBootstrapScript = String.raw`
;(function () {
  const earlyHistory = {
    href: location.href,
    changed: false,
  }
  self.__next_h = earlyHistory

  function recordChange() {
    earlyHistory.changed = true
  }

  const originalPushState = history.pushState
  function pushState(data, unused, url) {
    recordChange()
    return originalPushState.call(history, data, unused, url)
  }
  pushState.__original = originalPushState

  const originalReplaceState = history.replaceState
  function replaceState(data, unused, url) {
    recordChange()
    return originalReplaceState.call(history, data, unused, url)
  }
  replaceState.__original = originalReplaceState

  history.pushState = pushState
  history.replaceState = replaceState
  addEventListener('popstate', recordChange)
})()
`

export function prependHistoryBootstrap(
  bootstrapScriptContent: string | undefined
): string {
  return bootstrapScriptContent
    ? `${historyBootstrapScript};${bootstrapScriptContent}`
    : historyBootstrapScript
}
