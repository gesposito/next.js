import { browser } from 'react-dom'
import { BailoutToCSRError } from '../../shared/lib/lazy-dynamic/bailout-to-csr'

/**
 * Aborting a resumed render with a recoverable reason tells React to leave the
 * postponed boundary for the browser instead of reporting a render error.
 */
export function createRenderInBrowserAbortSignal(
  reactBrowserBailout: boolean
): AbortSignal {
  const controller = new AbortController()
  const reason = 'Render in Browser'
  if (reactBrowserBailout) {
    // @ts-expect-error TODO: Update @types/react-dom to include the reason argument.
    controller.abort(browser(reason))
  } else {
    controller.abort(new BailoutToCSRError(reason))
  }
  return controller.signal
}
