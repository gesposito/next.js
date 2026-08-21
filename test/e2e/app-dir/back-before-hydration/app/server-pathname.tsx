'use client'

import { usePathname } from 'next/navigation'

// Rendered on the server and during hydration, so a mismatch is an error.
export function ServerPathname() {
  return <output id="server-pathname">{usePathname()}</output>
}
