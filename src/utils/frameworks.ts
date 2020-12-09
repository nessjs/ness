import * as file from './file'
import * as fs from 'fs'

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
    framework: {name: 'next', dist: 'out', build: 'next'},
    requiredFiles: ['package.json'],
    requiredDependencies: ['next'],
  },
  {
    framework: {name: 'nuxt', dist: 'dist', build: 'nuxt'},
    requiredFiles: ['package.json'],
    requiredDependencies: ['nuxt'],
  },
]

async function match(detector: FrameworkDetector): Promise<boolean> {
  const {dependencies, devDependencies} = getPackageJson()
  for (const dependency of detector.requiredDependencies ?? []) {
    const inDependencies = dependencies && dependencies[dependency]
    const inDevDependencies = devDependencies && devDependencies[dependency]
    if (!inDependencies && !inDevDependencies) return false
  }

  for (const filename of detector.requiredFiles ?? []) {
    const fileExists = fs.existsSync(filename)
    if (!fileExists) return false
  }

  return true
}

async function getBuildScript(targetValue: string): Promise<string | undefined> {
  const {scripts}: Record<string, string> = getPackageJson()
  if (!scripts) return undefined

  for (const [key, value] of Object.entries(scripts)) {
    if (value.includes(targetValue)) {
      const command = await getPackageManager()
      return `${command} ${key}`
    }
  }

  return undefined
}

let packageManager: string
let pkg: any

async function getPackageManager(): Promise<string> {
  if (packageManager) return packageManager

  const yarnLock = fs.existsSync('yarn.lock')
  packageManager = yarnLock ? 'yarn' : 'npm run'
  return packageManager
}

function getPackageJson(): any {
  if (pkg) return pkg

  pkg = file.getPackageJson()
  return pkg
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
export async function detectFramework(): Promise<Framework | undefined> {
  for (const detector of detectors) {
    if (match(detector)) {
      const {framework} = detector
      // We want the npm/yarn build script
      const build = framework.build ? await getBuildScript(framework.build) : undefined
      return {
        ...framework,
        build,
      }
    }
  }

  return undefined
}
