/* Node ESM resolve hook that tolerates extensionless relative specifiers.
 *
 * The `src/` tree is authored for Vite/vitest, which resolve
 * `import addition from "./addition"` to `./addition.js` automatically.
 * Plain node does not. Rather than rewrite ~100 imports across the app just
 * so a reporting script can run, this hook retries a failed relative
 * resolution with `.js`, then `/index.js`.
 *
 * Registered from `scripts/lib/registerResolve.js`.
 */

const CANDIDATE_SUFFIXES = [".js", ".jsx", "/index.js", "/index.jsx"];

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    const isRelative = specifier.startsWith("./") || specifier.startsWith("../");
    if (!isRelative) throw err;
    for (const suffix of CANDIDATE_SUFFIXES) {
      try {
        return await nextResolve(specifier + suffix, context);
      } catch {
        // try the next candidate
      }
    }
    throw err;
  }
}
