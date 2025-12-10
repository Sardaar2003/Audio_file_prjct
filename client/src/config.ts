// Some TypeScript configurations don't pick up the Vite import.meta typings during `tsc` builds.
// Casting to `any` here avoids build-time type errors while still using the Vite runtime value.
// At runtime, `import.meta.env.VITE_API_URL` is provided by Vite.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const viteEnv = (import.meta as any).env as { VITE_API_URL?: string };

export const API_BASE_URL = viteEnv.VITE_API_URL || 'http://localhost:5000';

