import * as file from './file'
import * as fs from 'fs-extra'
import * as path from 'path'

interface FrameworkDetector {
  readonly requiredDependencies?: Array<string>
  readonly requiredFiles?: Array<string>
  readonly framework: Framework
}

const detectors: Array<FrameworkDetector> = [
  {
    framework: {name: 'gatsby', dist: 'public', build: 'gatsby build'},
    requiredFiles: ['package.json', 'gatsby-config.js'],
    requiredDependencies: ['gatsby'],
  },
  {
    framework: {name: 'hugo', dist: 'public', build: 'hugo'},
    requiredFiles: ['config.toml', 'config.yaml'],
  },
  {
    framework: {name: 'next', dist: '.next', build: 'next build'},
    requiredFiles: ['package.json'],
    requiredDependencies: ['next'],
  },
  {
    framework: {name: 'nuxt', dist: 'dist', build: 'nuxt'},
    requiredFiles: ['package.json'],
    requiredDependencies: ['nuxt'],
  },
]

export async function match(
  detector: FrameworkDetector,
  entry: string = process.cwd(),
): Promise<boolean> {
  const {dependencies, devDependencies} = getPackageJson(entry)
  for (const dependency of detector.requiredDependencies ?? []) {
    const inDependencies = dependencies && dependencies[dependency]
    const inDevDependencies = devDependencies && devDependencies[dependency]
    if (!inDependencies && !inDevDependencies) return false
  }

  for (const filename of detector.requiredFiles ?? []) {
    const fileExists = fs.pathExistsSync(path.resolve(entry, filename))
    if (!fileExists) return false
  }

  return true
}

async function getBuildScript(
  targetValue: string,
  entry: string = process.cwd(),
): Promise<string | undefined> {
  const {scripts}: Record<string, string> = getPackageJson(entry)
  if (!scripts) return undefined

  for (const [key, value] of Object.entries(scripts)) {
    if (value.includes(targetValue)) {
      const command = await getPackageManager(entry)
      return `${command} ${key}`
    }
  }

  return undefined
}

let packageManager: Record<string, string> = {}
let pkg: Record<string, unknown> = {}

async function getPackageManager(entry: string = process.cwd()): Promise<string> {
  const existing = packageManager[entry]
  if (existing) return existing

  const yarnLock = await fs.pathExists(path.resolve(entry, 'yarn.lock'))
  packageManager[entry] = yarnLock ? 'yarn' : 'npm run'
  return packageManager[entry]
}

function getPackageJson(entry: string = process.cwd()): any {
  const existing = pkg[entry]
  if (existing) return existing

  pkg[entry] = file.getPackageJson(entry)
  return pkg[entry]
}

/**
 * A static site generator framework.
 */
export interface Framework {
  /**
   * The name of the framework.
   */
  readonly name: string

  /**
   * The publish directory.
   */
  readonly dist: string

  /**
   * The build command used to generate the static site.
   *
   * @default - build command unknown
   */
  readonly build?: string
}

/**
 * Detect the framework this project is based on.
 */
export async function detectFramework(
  entry: string = process.cwd(),
): Promise<Framework | undefined> {
  for (const detector of detectors) {
    if (await match(detector, entry)) {
      const {framework} = detector
      // We want the npm/yarn build script
      const build = framework.build ? await getBuildScript(framework.build, entry) : undefined
      return {
        ...framework,
        build,
      }
    }
  }

  return undefined
}
