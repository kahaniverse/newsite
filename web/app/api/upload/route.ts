import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname, extname } from 'path';
import { randomBytes } from 'crypto';
import { auth } from '@/lib/auth/config';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES     = 5 * 1024 * 1024; // 5 MB

const hasVercelBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  if (hasVercelBlob) return uploadViaVercelBlob(req, session.user.id);
  return uploadToLocalDisk(req, session.user.id);
}

// Production: the client POSTs the raw file binary (same contract as the dev
// path) with ?filename=&contentType=. We stream it straight to Vercel Blob via
// a server-side put() and return the public URL.
async function uploadViaVercelBlob(req: NextRequest, userId: string): Promise<NextResponse> {
  const sp          = req.nextUrl.searchParams;
  const filename    = sp.get('filename')    ?? 'upload.bin';
  const contentType = sp.get('contentType') ?? req.headers.get('content-type') ?? 'application/octet-stream';

  if (!ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json({ error: 'Disallowed content type', code: 'VALIDATION' }, { status: 400 });
  }

  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large', code: 'TOO_LARGE' }, { status: 413 });
  }

  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const key  = `${userId}/${safe}`;

  try {
    const blob = await put(key, buf, {
      access:          'public',
      contentType,
      addRandomSuffix: true,
    });
    return NextResponse.json({ url: blob.url, uploadUrl: blob.url });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Upload failed';
    return NextResponse.json({ error: msg, code: 'UPLOAD_ERROR' }, { status: 400 });
  }
}

// Dev-only: accept a raw binary body + ?filename=&contentType= and write into
// public/uploads/<userId>/. The file becomes available at /uploads/<userId>/...
// next.config.js's `localhost` remotePattern allows next/image to serve it.
async function uploadToLocalDisk(req: NextRequest, userId: string): Promise<NextResponse> {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'BLOB_READ_WRITE_TOKEN missing in production', code: 'UPLOAD_DISABLED' },
      { status: 503 },
    );
  }

  const sp          = req.nextUrl.searchParams;
  const filename    = sp.get('filename')    ?? 'upload.bin';
  const contentType = sp.get('contentType') ?? req.headers.get('content-type') ?? 'application/octet-stream';

  if (!ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json({ error: 'Disallowed content type', code: 'VALIDATION' }, { status: 400 });
  }

  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large', code: 'TOO_LARGE' }, { status: 413 });
  }

  const ext   = extname(filename).slice(0, 8) || '';
  const id    = randomBytes(8).toString('hex');
  const safe  = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const key   = `${userId}/${Date.now()}-${id}-${safe}${ext && !safe.endsWith(ext) ? ext : ''}`;
  const abs   = join(process.cwd(), 'public', 'uploads', key);

  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, buf);

  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/uploads/${key}`;
  return NextResponse.json({ url, uploadUrl: url, devStub: true });
}
