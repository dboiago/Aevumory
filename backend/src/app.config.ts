/**
 * Application Configuration
 *
 * Reads environment variables to configure the backend server.
 * Provides sensible defaults for development while allowing full customization.
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const getAppConfig = () => {
  const port = parseInt(process.env.PORT ?? '3000', 10);
  
  // DATA_DIR can be absolute or relative (relative to project root)
  const dataDir = process.env.DATA_DIR ?? join(__dirname, '../../data');

  return {
    port,
    dataDir,
  } as const;
};

export type AppConfig = ReturnType<typeof getAppConfig>;
