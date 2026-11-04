/**
 * Email verification helpers.
 *
 * A user is considered UNVERIFIED when:
 *  - `isVerified` is explicitly false, or
 *  - `isVerified` is missing (legacy doc, migration not run yet) AND `needs_setup` is true.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isUserVerified(user: Record<string, any> | null | undefined): boolean {
  if (!user) return false;
  if (user.isVerified === false) return false;
  if (user.isVerified === undefined && user.needs_setup) return false;
  return true;
}

export const VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000; // code valid for 10 minutes
export const VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000; // 60s between sends
export const VERIFICATION_MAX_ATTEMPTS = 5;
