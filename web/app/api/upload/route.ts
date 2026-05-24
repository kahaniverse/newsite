import { NextRequest, NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { auth } from '@/lib/auth/config';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES     = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = (await req.json()) as HandleUploadBody;

  try {
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        const session = await auth();
        if (!session?.user?.id) {
          throw new Error('Unauthorized');
        }
        // Scope upload to user folder to prevent overwrite collisions.
        const safe = pathname.replace(/[^a-zA-Z0-9._/-]/g, '_');
        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes:  MAX_BYTES,
          addRandomSuffix:     true,
          tokenPayload:        JSON.stringify({ userId: session.user.id, requested: safe }),
        };
      },
      onUploadCompleted: async () => {
        // No-op; the client receives the final URL directly from Vercel Blob.
      },
    });
    return NextResponse.json(json);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Upload failed';
    const status = msg === 'Unauthorized' ? 401 : 400;
    const code   = status === 401 ? 'UNAUTHORIZED' : 'UPLOAD_ERROR';
    return NextResponse.json({ error: msg, code }, { status });
  }
}
