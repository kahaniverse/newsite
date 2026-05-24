import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sendEmail } from '@/lib/email/client';

describe('sendEmail dev shim', () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...origEnv };
    vi.restoreAllMocks();
  });

  it('logs to stdout instead of failing when no RESEND_API_KEY and not production', async () => {
    delete process.env.RESEND_API_KEY;
    process.env.NODE_ENV = 'development';
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const res = await sendEmail({ from: 'a@b.com', to: 'c@d.com', subject: 'Hi', html: '<p>x</p>' });
    expect(res.ok).toBe(true);
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls.flat().join('\n')).toContain('c@d.com');
  });

  it('returns ok:false in production when key missing', async () => {
    delete process.env.RESEND_API_KEY;
    process.env.NODE_ENV = 'production';
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await sendEmail({ from: 'a@b.com', to: 'c@d.com', subject: 'Hi', html: '<p>x</p>' });
    expect(res.ok).toBe(false);
  });
});
