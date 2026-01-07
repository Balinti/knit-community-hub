// Admin utilities

export function getAdminEmailAllowlist(): string[] {
  const allowlist = process.env.ADMIN_EMAIL_ALLOWLIST
  if (!allowlist) return []
  return allowlist.split(',').map(email => email.trim().toLowerCase())
}

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false
  const allowlist = getAdminEmailAllowlist()
  if (allowlist.length === 0) return false
  return allowlist.includes(email.toLowerCase())
}

export function isAdminConfigured(): boolean {
  return getAdminEmailAllowlist().length > 0
}
