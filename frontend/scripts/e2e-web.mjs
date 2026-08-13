import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const frontendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const viteBin = path.join(frontendDirectory, 'node_modules', 'vite', 'bin', 'vite.js')
const child = spawn(process.execPath, [viteBin, '--host', '127.0.0.1', '--port', '15173'], {
  cwd: frontendDirectory,
  env: { ...process.env, VITE_API_PROXY_TARGET: 'http://127.0.0.1:18080' },
  stdio: 'inherit',
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal))
}
child.on('exit', (code) => process.exit(code ?? 1))
