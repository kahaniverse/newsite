const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstile(token: string | undefined, remoteIp?: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // Allow local dev when the key is not configured; production must set it.
    return process.env.NODE_ENV !== 'production';
  }
  if (!token) return false;

  const params = new URLSearchParams();
  params.append('secret', secret);
  params.append('response', token);
  if (remoteIp) params.append('remoteip', remoteIp);

  const res = await fetch(VERIFY_URL, { method: 'POST', body: params }).catch(() => null);
  if (!res || !res.ok) return false;
  const data = (await res.json().catch(() => null)) as { success?: boolean } | null;
  return !!data?.success;
}
