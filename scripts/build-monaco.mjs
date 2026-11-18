import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const monacoEsmRoot = path.resolve(projectRoot, 'node_modules/monaco-editor/esm');
const missingStyles = new Set();

const monacoCssCompatibility = {
  name: 'monaco-css-compatibility',
  setup(build) {
    build.onResolve({ filter: /\.css$/ }, (args) => {
      const importer = path.resolve(args.importer);
      if (!importer.startsWith(monacoEsmRoot + path.sep)) return null;

      const cssPath = path.resolve(path.dirname(importer), args.path);
      if (fs.existsSync(cssPath)) return null;

      missingStyles.add(path.relative(monacoEsmRoot, cssPath));
      return { path: cssPath, namespace: 'missing-monaco-css' };
    });

    build.onLoad({ filter: /.*/, namespace: 'missing-monaco-css' }, (args) => ({
      contents: `/* Not included in the published Monaco ESM package: ${path.relative(monacoEsmRoot, args.path).replaceAll('\\', '/')} */`,
      loader: 'css'
    }));
  }
};

await esbuild.build({
  entryPoints: [
    'apps/desktop/src/renderer/monaco-entry.js',
    'apps/desktop/src/renderer/monaco-worker.js'
  ],
  bundle: true,
  outdir: 'dist/monaco',
  entryNames: '[name]',
  format: 'esm',
  target: 'es2022',
  loader: { '.ttf': 'file' },
  assetNames: 'assets/[name]-[hash]',
  plugins: [monacoCssCompatibility]
});

if (missingStyles.size > 0) {
  console.warn(`Monaco package omitted ${missingStyles.size} imported ESM stylesheet(s):`);
  for (const style of [...missingStyles].sort()) console.warn(`  ${style}`);
}
