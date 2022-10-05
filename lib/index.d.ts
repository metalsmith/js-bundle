import Metalsmith from 'metalsmith';
import { BuildOptions } from 'esbuild';

export default initJsBundle;
export interface Options extends Omit<BuildOptions, 'entryPoints'|'write'|'metafile'|'outdir'|'absWorkingDir'> {
  entries: Record<string, string>
}
/**
 * A metalsmith plugin that bundles your JS using [esbuild](https://esbuild.github.io)
 * @example
 *
 * metalsmith.use(
 *   jsBundle({ entries: {
 *     index: 'lib/index.js',
 *     'second/src/file': 'second/bundle/output.js'
 *   }})
 * )
 */
declare function initJsBundle(options?: Options): Metalsmith.Plugin;
