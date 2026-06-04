// Dummy/sample imagery pulled from public placeholder services, used purely to
// demonstrate the old-app "picture everywhere" look while real uploads are
// sparse. Deterministic per `seed` so a given author/universe always renders
// the same image across the app. Swap these out once real media exists.

/** A sample portrait avatar (faces) — stable for a given seed. */
export function sampleAvatar(seed: string, size = 96): string {
  return `https://i.pravatar.cc/${size}?u=${encodeURIComponent(seed)}`;
}

/** A sample landscape cover/banner — stable for a given seed. */
export function sampleCover(seed: string, w = 800, h = 400): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed || 'kahaniverse')}/${w}/${h}`;
}
