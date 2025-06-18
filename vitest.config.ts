import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

export default defineConfig(({ mode = 'test' }) => {
  // Load .env files and merge into process.env
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    test: {
      globals: true,
      environment: 'node',
      testTimeout: 10000,
      setupFiles: ['./test/setup.ts'],
      include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
      exclude: ['node_modules/**', 'dist/**'],
    },
    esbuild: {
      target: 'es2022'
    }
  };
});