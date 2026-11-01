// Node loader hooks: lets plain `node` import the app's TypeScript (extensionless relative imports and the `@/` alias).
// Used only by gen-seed.mjs. Needs APP_DIR (absolute path of the app folder).
import { existsSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const APP = process.env.APP_DIR;
const tryResolve = (base) => {
  for (const c of [base, base + '.ts', path.join(base, 'index.ts')]) if (existsSync(c) && !c.endsWith('/') && /\.ts$/.test(c)) return c;
  return null;
};
export async function resolve(specifier, context, next) {
  let base = null;
  if (specifier.startsWith('@/')) base = path.join(APP, 'src', specifier.slice(2));
  else if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.startsWith('file:')) {
    base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
  }
  if (base) {
    const hit = tryResolve(base);
    if (hit) return { url: pathToFileURL(hit).href, shortCircuit: true };
  }
  return next(specifier, context);
}
