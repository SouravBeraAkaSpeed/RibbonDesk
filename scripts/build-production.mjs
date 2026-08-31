import { spawnSync } from 'node:child_process';

const required = [
  'NEXT_PUBLIC_CONVEX_URL',
  'NEXT_PUBLIC_CONVEX_SITE_URL',
  'NEXT_PUBLIC_SITE_URL',
];

for (const name of required) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for a production build.`);

  const url = new URL(value);
  if (url.protocol !== 'https:' || ['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new Error(`${name} must be a public HTTPS URL, received ${url.origin}.`);
  }
}

if (process.env.NEXT_PUBLIC_CONVEX_URL === process.env.NEXT_PUBLIC_CONVEX_SITE_URL) {
  throw new Error('The Convex cloud and HTTP-site URLs must be distinct.');
}

const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run this release gate through npm run build:production.');

const result = spawnSync(process.execPath, [npmCli, 'run', 'build'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
