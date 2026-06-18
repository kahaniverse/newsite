/**
 * Pen-name generator. Used to seed a default, editable pen name at signup so a
 * user never has to reveal their real name — and, on the server, to replace any
 * name an OAuth provider would otherwise hand us (we take the auth, not the
 * identity). Pure/isomorphic: safe in both client forms and server callbacks.
 */

const ADJECTIVES = [
  'Velvet', 'Crimson', 'Silent', 'Wandering', 'Golden', 'Hidden', 'Ember',
  'Midnight', 'Lunar', 'Gilded', 'Restless', 'Whispering', 'Iron', 'Sable',
  'Dawnlit', 'Storm', 'Ashen', 'Cobalt', 'Feral', 'Quiet', 'Saffron',
  'Obsidian', 'Wild', 'Frost', 'Amber', 'Hollow', 'Radiant', 'Twilight',
];

const NOUNS = [
  'Quill', 'Scribe', 'Lantern', 'Raven', 'Ink', 'Voyager', 'Cipher',
  'Fable', 'Wanderer', 'Echo', 'Verse', 'Compass', 'Chronicle', 'Drifter',
  'Sparrow', 'Oracle', 'Nomad', 'Glyph', 'Saga', 'Phoenix', 'Marker',
  'Tale', 'Weaver', 'Beacon', 'Mariner', 'Folio', 'Wren', 'Comet',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * A two-word pen name plus a short numeric tail (e.g. "EmberScribe47"). The tail
 * keeps collisions rare without forcing global uniqueness — pen names are pure
 * display; the stable internal id is the real identity.
 */
export function generatePenName(): string {
  const tail = Math.floor(Math.random() * 90) + 10; // 10–99
  return `${pick(ADJECTIVES)}${pick(NOUNS)}${tail}`;
}
