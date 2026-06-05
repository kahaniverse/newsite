'use server';

import { signIn } from '@/lib/auth/config';
import { DEMO_MODE } from '@/lib/auth/demo';

/**
 * Passwordless demo sign-in, used only by the marketing screencast rig. No-ops
 * unless DEMO_MODE is on; the `demo` provider it calls only exists in that case.
 */
export async function signInDemo() {
  if (!DEMO_MODE) return;
  await signIn('demo', { redirectTo: '/' });
}
