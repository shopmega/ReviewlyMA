/**
 * Legacy module kept for backward compatibility.
 *
 * NOTE:
 * - Do not monkey-patch window.fetch or console here.
 * - Next.js RSC navigation relies on exact fetch semantics.
 */
export function installRscErrorHandler(): void {
  // Intentionally a no-op.
}
