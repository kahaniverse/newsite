import { cookies } from 'next/headers';
import { normalizePersona, PERSONA_COOKIE, type Persona } from './persona';

/** Server-component helper. Reads the persona cookie via next/headers. */
export function getPersona(): Persona {
  return normalizePersona(cookies().get(PERSONA_COOKIE)?.value);
}
