import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const frontendDirectory = path.resolve(scriptDirectory, '..')
const repositoryDirectory = path.resolve(frontendDirectory, '..')
const stateDirectory = path.join(frontendDirectory, 'output', 'e2e')
const tokenPath = path.join(stateDirectory, 'setup-token.txt')
const dataDirectory = await mkdtemp(path.join(os.tmpdir(), 'fastschema-e2e-'))

await mkdir(stateDirectory, { recursive: true })
await rm(tokenPath, { force: true })

const child = spawn('go', ['run', './cmd', 'start', dataDirectory], {
  cwd: repositoryDirectory,
  env: {
    ...process.env,
    APP_PORT: '18080',
    APP_BASE_URL: 'http://127.0.0.1:18080',
    APP_DASH_URL: 'http://127.0.0.1:15173/dash',
  },
  shell: process.platform === 'win32',
  stdio: ['ignore', 'pipe', 'pipe'],
})

let tokenWritten = false
let startupOutput = ''
function forward(chunk, destination) {
  const output = chunk.toString()
  destination.write(output)
  if (tokenWritten) return
  startupOutput = `${startupOutput}${output}`.slice(-4096)
  const match = startupOutput.match(/\/setup\/\?token=([A-Za-z0-9_-]+)/)
  if (match?.[1]) {
    tokenWritten = true
    void writeFile(tokenPath, match[1], 'utf8')
  }
}

child.stdout.on('data', (chunk) => forward(chunk, process.stdout))
child.stderr.on('data', (chunk) => forward(chunk, process.stderr))

let cleaning = false
async function cleanup() {
  if (cleaning) return
  cleaning = true
  if (!child.killed) child.kill('SIGTERM')
  await rm(tokenPath, { force: true })
  await rm(dataDirectory, { recursive: true, force: true })
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    void cleanup().finally(() => process.exit(0))
  })
}

child.on('exit', (code) => {
  void cleanup().finally(() => process.exit(code ?? 1))
})
