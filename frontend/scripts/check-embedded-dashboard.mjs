import { access, readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const frontendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repositoryDirectory = path.resolve(frontendDirectory, '..')
const builtDirectory = path.join(frontendDirectory, 'dist', 'client')
const embeddedDirectory = path.join(repositoryDirectory, 'dash')

await access(path.join(builtDirectory, 'index.html'))
await access(path.join(embeddedDirectory, 'index.html'))

async function filesBelow(directory, prefix = '') {
  const entries = await readdir(path.join(directory, prefix), { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const relativePath = path.join(prefix, entry.name)
    if (entry.isDirectory()) files.push(...(await filesBelow(directory, relativePath)))
    else files.push(relativePath.replaceAll('\\', '/'))
  }
  return files.sort()
}

const builtFiles = await filesBelow(builtDirectory)
const embeddedFiles = await filesBelow(embeddedDirectory)
const builtAssets = builtFiles.filter((file) => file !== 'index.html')
const embeddedAssets = embeddedFiles.filter((file) => file !== 'index.html')

if (JSON.stringify(builtAssets) !== JSON.stringify(embeddedAssets)) {
  throw new Error('Embedded dashboard assets are stale. Run npm run build:embed.')
}

for (const file of builtAssets) {
  const [built, embedded] = await Promise.all([
    readFile(path.join(builtDirectory, file)),
    readFile(path.join(embeddedDirectory, file)),
  ])
  if (!built.equals(embedded)) throw new Error(`Embedded dashboard asset differs: ${file}`)
}

const [builtIndex, embeddedIndex] = await Promise.all([
  readFile(path.join(builtDirectory, 'index.html'), 'utf8'),
  readFile(path.join(embeddedDirectory, 'index.html'), 'utf8'),
])
const assetPattern = /\/dash\/assets\/[^"'<>\s]+/g
const builtReferences = [...new Set(builtIndex.match(assetPattern) || [])].sort()
const embeddedReferences = [...new Set(embeddedIndex.match(assetPattern) || [])].sort()

if (JSON.stringify(builtReferences) !== JSON.stringify(embeddedReferences)) {
  throw new Error('Embedded dashboard index references stale assets. Run npm run build:embed.')
}

console.log(`Embedded dashboard verified (${embeddedFiles.length} files).`)
