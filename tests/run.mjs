// Bundles the flow test with the server code, swapping in the Postgres-backed
// stand-in for Supabase, then runs it.
import { build } from 'esbuild'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, 'tests/.out/flow.mjs')
await build({
  entryPoints: [path.join(root, 'tests/flow.test.mjs')],
  bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'error',
  loader: { '.js': 'jsx' }, jsx: 'automatic',
  external: ['pg'],
  plugins: [{
    name: 'swap',
    setup(b) {
      b.onResolve({ filter: /^server-only$/ }, () => ({ path: 'server-only', namespace: 'empty' }))
      b.onLoad({ filter: /.*/, namespace: 'empty' }, () => ({ contents: '' }))
      b.onResolve({ filter: /\/supabase$/ }, (a) => (a.importer.includes('/server/') ? { path: path.join(root, 'tests/fakeSupabase.mjs') } : undefined))
      b.onResolve({ filter: /^@\// }, (a) => b.resolve('./' + a.path.slice(2), { resolveDir: path.join(root, 'src/pmt'), kind: a.kind }))
    },
  }],
})
await import(pathToFileURL(out).href)
