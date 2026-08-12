import { access, cp, mkdir, readFile, rename, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const frontendDirectory = path.resolve(scriptDirectory, '..')
const repositoryDirectory = path.resolve(frontendDirectory, '..')
const sourceDirectory = path.join(frontendDirectory, 'dist', 'client')
const dashboardDirectory = path.join(repositoryDirectory, 'dash')
const transactionId = `${process.pid}-${Date.now()}`
const stagedDirectory = path.join(repositoryDirectory, `.dash-staged-${transactionId}`)
const backupDirectory = path.join(repositoryDirectory, `.dash-backup-${transactionId}`)

const indexPath = path.join(sourceDirectory, 'index.html')
await access(indexPath)

const indexHtml = await readFile(indexPath, 'utf8')
if (!indexHtml.includes('/dash/assets/')) {
  throw new Error('Dashboard build does not use the expected /dash/ asset base')
}
await mkdir(stagedDirectory, { recursive: true })
await cp(sourceDirectory, stagedDirectory, { recursive: true })

let hasBackup = false
try {
  await access(dashboardDirectory)
  await rename(dashboardDirectory, backupDirectory)
  hasBackup = true
  await rename(stagedDirectory, dashboardDirectory)
  await rm(backupDirectory, { recursive: true, force: true })
  console.log(`Embedded dashboard from ${sourceDirectory}`)
} catch (error) {
  await rm(stagedDirectory, { recursive: true, force: true })
  if (hasBackup) {
    await rm(dashboardDirectory, { recursive: true, force: true })
    await rename(backupDirectory, dashboardDirectory)
  }
  throw error
}
