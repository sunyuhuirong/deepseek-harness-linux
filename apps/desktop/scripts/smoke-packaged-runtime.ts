/** Validate the assembled application, including native Office conversion outside ASAR. */
import { cpSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { desktopArtifactOutput, resolveDesktopBuildTarget, resolveDesktopTargetBuildPaths } from './desktop-build-paths.mjs'
import { readDesktopRuntime, verifyDesktopRuntime } from '../src/runtime-tree.ts'
import { verifyWindowsCode } from './windows-runtime-signature.mjs'
import { smokePreparedRuntime } from './smoke-prepared-runtime.ts'
import { resolveDesktopPackageTarget } from './package-target.ts'

/** Paths the packaged application exposes to the smoke test. */
function packagedPaths(application: string, windows: boolean, linux: boolean): { resources: string; executable: string } {
  return {
    resources: join(application, windows || linux ? 'resources' : 'Resources'),
    executable: windows ? join(application, 'DeepSeek Harness.exe')
      : linux ? join(application, 'deepseek-harness')
        : join(application, 'MacOS', 'DeepSeek Harness'),
  }
}

const paths = resolveDesktopTargetBuildPaths()
const { values } = parseArgs({ options: { unsigned: { type: 'boolean', default: false }, 'skip-notarization': { type: 'boolean', default: false } }, allowPositionals: false })
const target = resolveDesktopBuildTarget()
const windows = target === 'win-x64'
const linux = target === 'linux-x64'
const artifacts = desktopArtifactOutput(paths, { unsigned: values.unsigned, skipNotarization: values['skip-notarization'] }).directory
const application = windows ? join(artifacts, 'win-unpacked')
  : linux ? join(artifacts, 'linux-unpacked')
    : join(artifacts, target === 'mac-arm64' ? 'mac-arm64' : 'mac', 'DeepSeek Harness.app', 'Contents')
const descriptor = await verifyDesktopRuntime(paths.dsh, readDesktopRuntime(paths.dsh).release.version,
  resolveDesktopPackageTarget(target))
if (windows && !values.unsigned) await verifyWindowsCode(application)
// Electron's ASAR reader cannot open an absolute path containing non-ASCII characters on Linux, so a checkout
// below such a directory is smoked from a temporary ASCII copy rather than through the archive in place.
const staging = linux && /[^\x20-\x7e]/u.test(application) ? mkdtempSync(join(tmpdir(), 'dsh-desktop-smoke-')) : undefined
try {
  if (staging !== undefined && /[^\x20-\x7e]/u.test(staging)) {
    throw new Error(`desktop package: the packaged runtime smoke needs an ASCII temporary directory, not ${staging}`)
  }
  const applicationRoot = staging === undefined ? application : join(staging, 'linux-unpacked')
  if (staging !== undefined) cpSync(application, applicationRoot, { recursive: true })
  const { resources, executable } = packagedPaths(applicationRoot, windows, linux)
  await smokePreparedRuntime(join(resources, 'app.asar', 'dsh'), executable, join(resources, 'runtime'), descriptor)
} finally {
  if (staging !== undefined) rmSync(staging, { recursive: true, force: true })
}
