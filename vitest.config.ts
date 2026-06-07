import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit-backend',
          environment: 'node',
          include: ['tests/unit/backend/**/*.test.ts'],
          setupFiles: ['tests/setup/env.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'unit-frontend',
          environment: 'jsdom',
          include: ['tests/unit/frontend/**/*.test.{ts,tsx}'],
          setupFiles: ['tests/setup/frontend.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          environment: 'node',
          include: ['tests/integration/**/*.test.ts'],
          setupFiles: ['tests/setup/env.ts'],
          testTimeout: 15000,
        },
      },
    ],
  },
});
