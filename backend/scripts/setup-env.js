import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '..');
const envPath = path.join(backendDir, '.env');
const envExamplePath = path.join(backendDir, '.env.example');

// If DATABASE_URL is not set in the environment and .env does not exist
if (!process.env.DATABASE_URL) {
  if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
      try {
        fs.copyFileSync(envExamplePath, envPath);
        console.log('[setup-env] Created .env from .env.example');
      } catch (err) {
        console.warn('[setup-env] Could not copy .env.example:', err.message);
      }
    } else {
      try {
        fs.writeFileSync(
          envPath,
          'DATABASE_URL="file:./prisma/dev.db"\nPORT=5000\nAPI_SECRET_KEY="apla-dev-secret-key-2026"\n'
        );
        console.log('[setup-env] Created default .env');
      } catch (err) {
        console.warn('[setup-env] Could not write .env:', err.message);
      }
    }
  }

  // Also set for current process fallback
  process.env.DATABASE_URL = 'file:./prisma/dev.db';
}
