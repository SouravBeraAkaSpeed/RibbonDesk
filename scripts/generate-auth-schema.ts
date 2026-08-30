import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { getAuthTables } from 'better-auth/db';

import { createAuthOptions } from '../convex/auth';
import { createSchema } from '../node_modules/@convex-dev/better-auth/dist/client/create-schema.js';

const componentDirectory = fileURLToPath(new URL('../convex/betterAuth/', import.meta.url));
process.chdir(componentDirectory);

const generated = await createSchema({
  tables: getAuthTables(createAuthOptions({} as never)),
});

await writeFile(new URL('../convex/betterAuth/schema.ts', import.meta.url), generated.code, 'utf8');
