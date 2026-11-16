/** Stage DSH packages for unsigned Desktop builds without a publication record. */

import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import {
  readClientBuildRecord,
  repositoryClientBuildEnvironment,
  resolveClientBuildEnvironment,
} from '../../../scripts/client-build-environment.ts'
import { releaseFamily } from '../../../scripts/release/families.ts'
import { packFamilyMembers, parsePackConcurrency } from '../../../scripts/release/pack.ts'

/**
 * Read the client build profile whose artifacts this stage may package.
 * @param value - `--client-profile` value, or undefined for a local build.
 * @returns the named client build profile.
 */
function parseClientProfile(value: string | undefined): 'local' | 'official' {
  const profile = value ?? 'local'
  if (profile !== 'local' && profile !== 'official') {
    throw new Error(`desktop local pack: --client-profile must be "local" or "official"; got ${JSON.stringify(profile)}`)
  }
  return profile
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: { out: { type: 'string' }, concurrency: { type: 'string' }, 'client-profile': { type: 'string' } },
    allowPositionals: false,
  })
  if (values.out === undefined) throw new Error('desktop local pack: --out must name the package staging directory')
  const concurrency = parsePackConcurrency(values.concurrency)
  const root = process.cwd()
  const environment = resolveClientBuildEnvironment(repositoryClientBuildEnvironment(root), parseClientProfile(values['client-profile']))
  readClientBuildRecord(root, environment)
  const destination = resolve(root, values.out)
  const packed = await packFamilyMembers(root, releaseFamily('dsh'), destination, concurrency)
  console.log(`desktop local pack: ${String(packed.length)} tarball(s) in ${destination}`)
}

await main()
