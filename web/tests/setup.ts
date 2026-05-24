// Loaded before every Vitest run.
// Keep this lean — heavier per-file setup belongs in the test file itself.

// Provide defaults so importing modules don't throw on import.
process.env.NODE_ENV               ??= 'test';
process.env.NEXTAUTH_SECRET        ??= 'test-secret-for-vitest-only';
process.env.NEXT_PUBLIC_APP_URL    ??= 'http://localhost:3000';
process.env.UPSTASH_REDIS_REST_URL ??= 'http://localhost:8079';
process.env.UPSTASH_REDIS_REST_TOKEN ??= 'local-dev-token';
process.env.DATABASE_URL           ??= 'postgres://postgres:postgres@localhost:55432/kahaniverse_test?sslmode=disable';
process.env.DATABASE_URL_UNPOOLED  ??= process.env.DATABASE_URL;
process.env.NEON_LOCAL_PROXY_URL   ??= 'http://localhost:4455/sql';
