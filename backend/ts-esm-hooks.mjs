// Node's native TypeScript execution strips types but does not remap the
// NodeNext-style ".js" specifiers this codebase writes for its still-".ts"
// source files (that remapping is otherwise done by `tsc`'s own resolver,
// and by vitest/esbuild) — so `node src/server.ts` fails to resolve its own
// relative imports. This hook retries a failed relative ".js" resolution as
// ".ts" before giving up, letting the existing import convention run
// unmodified directly from source with no compiled dist/ output.
import { register } from 'node:module';

register(import.meta.url);

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    const isRelative = specifier.startsWith('./') || specifier.startsWith('../');
    if (isRelative && specifier.endsWith('.js') && error?.code === 'ERR_MODULE_NOT_FOUND') {
      return nextResolve(`${specifier.slice(0, -3)}.ts`, context);
    }
    throw error;
  }
}
