import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { rm } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

// The upload route reads auth() from config directly (not requireAuth), and
// config.ts pulls in the full NextAuth provider stack — so mock it.
const sessionHolder: { id: string | null } = { id: 'test-upload-user' };
vi.mock('@/lib/auth/config', () => ({
  auth: async () => (sessionHolder.id ? { user: { id: sessionHolder.id } } : null),
}));

// Ensure the Vercel-Blob branch is off so the dev local-disk path runs.
delete process.env.BLOB_READ_WRITE_TOKEN;

async function importRoute() { return import('@/app/api/upload/route'); }

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'test-upload-user');

function uploadReq(bytes: Uint8Array, opts: { filename?: string; contentType?: string } = {}): NextRequest {
  const qs = new URLSearchParams();
  if (opts.filename)    qs.set('filename', opts.filename);
  if (opts.contentType) qs.set('contentType', opts.contentType);
  return new NextRequest(`http://localhost/api/upload?${qs.toString()}`, {
    method: 'POST',
    body:   bytes,
  });
}

describe('POST /api/upload (dev local-disk path)', () => {
  beforeEach(() => { sessionHolder.id = 'test-upload-user'; });
  afterAll(async () => { await rm(UPLOAD_DIR, { recursive: true, force: true }); });

  it('401s when unauthenticated', async () => {
    sessionHolder.id = null;
    const { POST } = await importRoute();
    const res = await POST(uploadReq(new Uint8Array([1, 2, 3]), { filename: 'a.png', contentType: 'image/png' }));
    expect(res.status).toBe(401);
  });

  it('400s on a disallowed content type', async () => {
    const { POST } = await importRoute();
    const res = await POST(uploadReq(new Uint8Array([1]), { filename: 'a.gif', contentType: 'image/gif' }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('VALIDATION');
  });

  it('413s when the file exceeds the 5 MB cap', async () => {
    const { POST } = await importRoute();
    const big = new Uint8Array(5 * 1024 * 1024 + 1);
    const res = await POST(uploadReq(big, { filename: 'big.png', contentType: 'image/png' }));
    expect(res.status).toBe(413);
    expect((await res.json()).code).toBe('TOO_LARGE');
  });

  it('writes the file and returns a dev-stub url', async () => {
    const { POST } = await importRoute();
    const res = await POST(uploadReq(new Uint8Array([137, 80, 78, 71]), { filename: 'pic.png', contentType: 'image/png' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.devStub).toBe(true);
    expect(json.url).toContain('/uploads/test-upload-user/');
    expect(existsSync(UPLOAD_DIR)).toBe(true);
  });
});
