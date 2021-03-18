import * as path from 'path'
import * as fs from 'fs-extra'

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

export async function walk(dir: string, filter?: RegExp): Promise<string[]> {
  const files = await fs.readdir(dir)
  const output = []
  for (const file of files) {
    const pathToFile = path.join(dir, file)
    const isDirectory = fs.statSync(pathToFile).isDirectory()
    if (isDirectory) {
      output.push(...(await walk(pathToFile, filter)))
    } else if (!filter || filter.test(pathToFile)) {
      output.push(pathToFile)
    }
  }
  return output
}
