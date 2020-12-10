import {Command} from 'commander'
import * as fs from 'fs'
import * as path from 'path'

const SETTINGS_FILENAME = 'ness.json'

/**
 * Ness Settings
 */
export interface NessSettings {
  dir?: string
  prod?: boolean
  domain?: string
  profile?: string
  redirectWww?: boolean
  hostedZoneId?: string
  hostedZoneName?: string
}

export function createCdkContext(settings?: NessSettings): Record<string, string | undefined> {
  if (!settings) return {}

  if (!settings.dir) {
    throw new Error('No publish directory specified')
  }

  return {
    prod: String(settings.prod || false),
    redirectWww: String(settings.redirectWww || false),
    publishDirectory: settings.dir,
    domain: settings.domain,
    hostedZoneId: settings.hostedZoneId,
    hostedZoneName: settings.hostedZoneName,
  }
}

/**
 * Get settings from local configuration file.
 *
 * @param entry Path to the project root. Defaults to process.cwd().
 */
export async function getSettingsFromFile(
  entry: string = process.cwd(),
): Promise<NessSettings | undefined> {
  const settingsJson = path.resolve(entry, SETTINGS_FILENAME)

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(settingsJson)
  } catch {
    return undefined
  }
}

/**
 * Get settings from command args.
 *
 * @param entry Path to the project root. Defaults to process.cwd().
 */
export async function getSettingsFromArgs(command: Command): Promise<NessSettings | undefined> {
  const options = command?.opts()
  return {
    dir: options.dir,
    prod: options.prod,
    domain: options.domain,
    profile: options.profile,
  }
}

/**
 * Persist settings to ./ness.json
 *
 * @param settings Settings to persist
 * @param entry Path to the project root. Defaults to process.cwd().
 */
export async function saveSettings(
  settings: NessSettings,
  entry: string = process.cwd(),
): Promise<boolean> {
  try {
    const settingsJson = path.resolve(entry, SETTINGS_FILENAME)
    const toPersist = {
      ...settings,
      profile: undefined,
      hostedZoneId: undefined,
      hostedZoneName: undefined,
    }
    await fs.promises.writeFile(settingsJson, JSON.stringify(toPersist, null, 2), {
      encoding: 'utf-8',
    })

    return true
  } catch {
    return false
  }
}
