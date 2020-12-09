import * as path from 'path'

/**
 * Get package.json in the entry path.
 *
 * @param entry Path to the project root. Defaults to process.cwd().
 */
export function getPackageJson(entry: string = process.cwd()): any | undefined {
  const packageJson = path.resolve(entry, 'package.json')

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(packageJson)
  } catch {
    return undefined
  }
}
