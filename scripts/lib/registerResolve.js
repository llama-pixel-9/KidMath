/* Installs the extensionless-import resolve hook for plain `node` runs.
 *
 * Usage:  node --import ./scripts/lib/registerResolve.js scripts/foo.js
 */
import { register } from "node:module";

register("./extensionlessResolve.js", import.meta.url);
