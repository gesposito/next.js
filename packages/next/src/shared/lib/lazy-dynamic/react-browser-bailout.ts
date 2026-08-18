const REACT_BROWSER_BAILOUT_REASON = Symbol.for('next.browser-bailout-reason')

type ReactBrowserBailoutReason = {
  $$typeof: symbol
  reason: string
}

export function createReactBrowserBailoutReason(
  reason: string
): ReactBrowserBailoutReason {
  return {
    $$typeof: REACT_BROWSER_BAILOUT_REASON,
    reason,
  }
}

export function getReactBrowserBailoutReason(
  error: unknown
): string | undefined {
  const cause = (error as Error)?.cause as ReactBrowserBailoutReason | undefined
  return cause?.$$typeof === REACT_BROWSER_BAILOUT_REASON
    ? cause.reason
    : undefined
}
