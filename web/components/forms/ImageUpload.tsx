'use client';
import { useRef, useState } from 'react';

interface Props {
  onUploaded: (url: string) => void;
  label?:     string;
  /** Visual style: overlay button (on the cover preview) or inline. */
  variant?:   'overlay' | 'inline';
}

// Easy image upload button — opens the native file picker (mobile shows a
// camera / photo-library / files chooser), uploads to /api/upload, and
// returns the public URL.
export function ImageUpload({ onUploaded, label = 'Upload / capture image', variant = 'overlay' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState('');

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setErr('');
    try {
      const res = await fetch(
        `/api/upload?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}`,
        { method: 'POST', headers: { 'Content-Type': file.type }, body: file },
      );
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.url) onUploaded(json.url as string);
      else setErr(json.error ?? 'Upload failed');
    } catch {
      setErr('Upload failed');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const cls =
    variant === 'overlay'
      ? 'inline-flex items-center gap-1.5 bg-black/55 text-white text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur hover:bg-black/70 transition'
      : 'inline-flex items-center gap-1.5 text-xs font-medium text-accent-deep hover:underline';

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        aria-label="Upload or capture an image"
        title="Upload or capture an image"
        className="hidden"
        onChange={handleFile}
      />
      <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className={cls}>
        <span aria-hidden>📷</span>
        {busy ? 'Uploading…' : label}
      </button>
      {err && <span className="block text-xs text-error mt-1">{err}</span>}
    </>
  );
}
