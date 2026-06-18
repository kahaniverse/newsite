/**
 * Kid / Grown-up persona — a CONTENT FILTER, not an age check.
 *
 * We deliberately do not verify or store age (see migration 007: dob was
 * dropped). The persona is a viewer preference held in a cookie. "kid" hides any
 * content an author has self-rated mature; "grownup" shows everything. Default is
 * "grownup" so we never silently hide content from someone who hasn't chosen.
 *
 * IMPORTANT: this is parental-guidance tooling, not a guarantee — there is no
 * server-side identity behind it. State that wherever the toggle appears.
 *
 * Client-safe module: holds only types/constants and pure helpers. The
 * next/headers reader lives in ./persona.server so client components can import
 * from here without dragging server-only APIs into their bundle.
 */

export type Persona = 'kid' | 'grownup';

export const PERSONA_COOKIE = 'kv_persona';
export const DEFAULT_PERSONA: Persona = 'grownup';
// 1 year — a sticky viewer preference, not a session token.
export const PERSONA_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function normalizePersona(value: string | undefined | null): Persona {
  return value === 'kid' ? 'kid' : DEFAULT_PERSONA;
}

/** Grown-up sees mature content; kid does not. Drives the SQL `includeMature`. */
export function personaIncludesMature(persona: Persona): boolean {
  return persona === 'grownup';
}

/** Route-handler helper. Reads the persona cookie off the incoming request. */
export function personaFromRequest(req: { cookies: { get(name: string): { value: string } | undefined } }): Persona {
  return normalizePersona(req.cookies.get(PERSONA_COOKIE)?.value);
}
