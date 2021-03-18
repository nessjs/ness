import * as crypto from 'crypto'
import * as fs from 'fs-extra'
import * as path from 'path'

import archiver from 'archiver'
import * as glob from 'glob'
import {Builder} from '@sls-next/lambda-at-edge'

const nextBuildDir = '.ness/.next'
const nextLambdaDir = '.ness/.next/__lambdas'

export type DynamicPageKeyValue = {
  [key: string]: {
    file: string
    regex: string
  }
}

export type OriginRequestApiHandlerManifest = {
  apis: {
    dynamic: DynamicPageKeyValue
    nonDynamic: {
      [key: string]: string
    }
  }
  domainRedirects: {
    [key: string]: string
  }
  enableHTTPCompression: boolean
  authentication?: {
    username: string
    password: string
  }
}

export type OriginRequestDefaultHandlerManifest = {
  buildId: string
  logLambdaExecutionTimes: boolean
  pages: {
    ssr: {
      dynamic: DynamicPageKeyValue
      nonDynamic: {
        [key: string]: string
      }
    }
    html: {
      nonDynamic: {
        [path: string]: string
      }
      dynamic: DynamicPageKeyValue
    }
    ssg: {
      nonDynamic: {
        [path: string]: unknown
      }
      dynamic: {
        [path: string]: unknown
      }
    }
  }
  publicFiles: {
    [key: string]: string
  }
  trailingSlash: boolean
  enableHTTPCompression: boolean
  domainRedirects: {
    [key: string]: string
  }
  authentication?: {
    username: string
    password: string
  }
}

export type OriginRequestImageHandlerManifest = {
  enableHTTPCompression: boolean
  domainRedirects: {
    [key: string]: string
  }
}

export type RedirectData = {
  statusCode: number
  source: string
  destination: string
  regex: string
  internal?: boolean
}

export type RewriteData = {
  source: string
  destination: string
  regex: string
}

export type Header = {
  key: string
  value: string
}

export type HeaderData = {
  source: string
  headers: Header[]
  regex: string
}

export type I18nData = {
  locales: string[]
  defaultLocale: string
}

export type RoutesManifest = {
  basePath: string
  redirects: RedirectData[]
  rewrites: RewriteData[]
  headers: HeaderData[]
  i18n?: I18nData
}

const PUBLIC_DIR_CACHE_CONTROL = 'public, max-age=31536000, must-revalidate'
const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable'
const SERVER_CACHE_CONTROL = 'public, max-age=0, s-maxage=2678400, must-revalidate'

type CacheConfig = Record<
  string,
  {
    cacheControl: string
    path: string
    prefix: string
  }
>

const filterNonExistentPathKeys = (config: CacheConfig) => {
  return Object.keys(config).reduce(
    (newConfig, nextConfigKey) => ({
      ...newConfig,
      ...(fs.pathExistsSync(config[nextConfigKey].path)
        ? {[nextConfigKey]: config[nextConfigKey]}
        : {}),
    }),
    {} as CacheConfig,
  )
}

const readAssetsDirectory = (dir: string): CacheConfig => {
  const publicFiles = path.join(dir, 'public')
  const staticFiles = path.join(dir, 'static')
  const staticPages = path.join(dir, 'static-pages')
  const nextData = path.join(dir, '_next', 'data')
  const nextStatic = path.join(dir, '_next', 'static')

  return filterNonExistentPathKeys({
    publicFiles: {
      path: publicFiles,
      cacheControl: PUBLIC_DIR_CACHE_CONTROL,
      prefix: path.relative(dir, publicFiles) + '/',
    },
    staticFiles: {
      path: staticFiles,
      cacheControl: PUBLIC_DIR_CACHE_CONTROL,
      prefix: path.relative(dir, staticFiles) + '/',
    },
    staticPages: {
      path: staticPages,
      cacheControl: SERVER_CACHE_CONTROL,
      prefix: path.relative(dir, staticPages) + '/',
    },
    nextData: {
      path: nextData,
      cacheControl: SERVER_CACHE_CONTROL,
      prefix: path.relative(dir, nextData) + '/',
    },
    nextStatic: {
      path: nextStatic,
      cacheControl: IMMUTABLE_CACHE_CONTROL,
      prefix: path.relative(dir, nextStatic) + '/',
    },
  })
}

/**
 * We don't need to invalidate sub paths if a parent has a wild card
 * invalidation. i.e. if `/users/*` exists, we don't need to invalidate `/users/details/*`
 */
export const reduceInvalidationPaths = (invalidationPaths: string[]): string[] => {
  const wildCardDirectories = invalidationPaths
    .filter((invalidationPath) => invalidationPath.endsWith('/*'))
    .map((invalidationPath) => invalidationPath.replace('/*', ''))

  return invalidationPaths.filter((invalidationPath) => {
    return !wildCardDirectories.some(
      (wildCardDirectory) =>
        invalidationPath.startsWith(wildCardDirectory) &&
        invalidationPath !== `${wildCardDirectory}*` &&
        invalidationPath !== `${wildCardDirectory}/*` &&
        wildCardDirectory !== invalidationPath,
    )
  })
}

const dynamicPathToInvalidationPath = (dynamicPath: string) => {
  const [firstSegment] = dynamicPath.split('/:')
  return path.join(firstSegment || '/', '*')
}

export const readInvalidationPathsFromManifest = (
  manifest: OriginRequestDefaultHandlerManifest,
): string[] => {
  return [
    ...Object.keys(manifest.pages.html.dynamic).map(dynamicPathToInvalidationPath),
    ...Object.keys(manifest.pages.html.nonDynamic),
    ...Object.keys(manifest.pages.ssr.dynamic).map(dynamicPathToInvalidationPath),
    ...Object.keys(manifest.pages.ssr.nonDynamic),
    ...Object.keys(manifest.pages.ssg?.dynamic || {}).map(dynamicPathToInvalidationPath),
    ...Object.keys(manifest.pages.ssg?.nonDynamic || {}),
  ]
}

async function readJsonFile<T>(pathToFile: string): Promise<T | undefined> {
  try {
    await fs.access(pathToFile)
    const contents = await fs.readFile(pathToFile, {encoding: 'utf-8'})
    return JSON.parse(contents) as T
  } catch {
    return undefined
  }
}

const getNextApiBuildManifest = async (): Promise<OriginRequestApiHandlerManifest | undefined> => {
  return readJsonFile(path.join(nextBuildDir, 'api-lambda/manifest.json'))
}

const getNextDefaultManifest = async (): Promise<
  OriginRequestDefaultHandlerManifest | undefined
> => {
  return readJsonFile(path.join(nextBuildDir, 'default-lambda/manifest.json'))
}

const getNextImageBuildManifest = async (): Promise<
  OriginRequestImageHandlerManifest | undefined
> => {
  return readJsonFile(path.join(nextBuildDir, 'image-lambda/manifest.json'))
}

const getNextRoutesManifest = async (): Promise<RoutesManifest | undefined> => {
  return readJsonFile(path.join(nextBuildDir, 'default-lambda/routes-manifest.json'))
}

function zipDirectory(directory: string, outputFile: string): Promise<string> {
  return new Promise(async (resolve, reject) => {
    // The below options are needed to support following symlinks when building zip files:
    // - nodir: This will prevent symlinks themselves from being copied into the zip.
    // - follow: This will follow symlinks and copy the files within.
    const globOptions = {
      dot: true,
      nodir: true,
      follow: true,
      cwd: directory,
    }
    const files = glob.sync('**', globOptions) // The output here is already sorted

    const shasum = crypto.createHash('sha256')
    const output = fs.createWriteStream(outputFile)

    const archive = archiver('zip')
    archive.on('warning', reject)
    archive.on('error', reject)
    archive.on('data', (data) => {
      shasum.update(data)
    })

    // archive has been finalized and the output file descriptor has closed, resolve promise
    // this has to be done before calling `finalize` since the events may fire immediately after.
    // see https://www.npmjs.com/package/archiver
    output.once('close', () => {
      const hash = shasum.digest('hex')
      resolve(hash)
    })

    archive.pipe(output)

    // Append files serially to ensure file order
    for (const file of files) {
      const fullPath = path.resolve(directory, file)
      const [data, stat] = await Promise.all([fs.readFile(fullPath), fs.stat(fullPath)])
      archive.append(data, {
        name: file,
        mode: stat.mode,
      })
    }

    await archive.finalize()
  })
}

export type NextBuild = {
  lambdaBuildDir: string
  defaultLambdaPath: string
  imageLambdaPath?: string
  apiLambdaPath?: string
  assets: CacheConfig
  basePath: string
  staticPath: string
  dataPath: string
  imagePath?: string
  apiPath?: string
  invalidationPaths?: string[]
}

export const buildNextApp = async (entry: string = process.cwd()): Promise<NextBuild> => {
  const buildDir = path.resolve(entry, nextBuildDir)
  await fs.remove(buildDir)

  const builder = new Builder(entry, nextBuildDir, {args: ['build']})
  await builder.build()

  const [
    defaultManifest,
    apiBuildManifest,
    imageBuildManifest,
    routesManifest,
  ] = await Promise.all([
    getNextDefaultManifest(),
    getNextApiBuildManifest(),
    getNextImageBuildManifest(),
    getNextRoutesManifest(),
  ])

  const lambdaBuildDir = path.resolve(entry, nextLambdaDir)
  await fs.mkdir(lambdaBuildDir, {recursive: true})

  const zipLambda = async (lambdaName: string): Promise<string> => {
    const zipped = path.join(lambdaBuildDir, `${lambdaName}.zip`)
    const hash = await zipDirectory(path.join(buildDir, lambdaName), zipped)

    const output = path.join(lambdaBuildDir, `${lambdaName}.${hash}.zip`)
    await fs.rename(zipped, output)
    return path.basename(output)
  }

  const pathPattern = (pattern: string): string => {
    const {basePath} = routesManifest || {}
    return basePath && basePath.length > 0 ? `${basePath.slice(1)}/${pattern}` : pattern
  }

  const defaultLambdaPath = await zipLambda('default-lambda')
  let apiLambdaPath = undefined
  let imageLambdaPath = undefined

  const apis = apiBuildManifest?.apis
  const hasApi =
    apis && (Object.keys(apis.nonDynamic).length > 0 || Object.keys(apis.dynamic).length > 0)
  if (hasApi) {
    apiLambdaPath = await zipLambda('api-lambda')
  }

  const hasImages = !!imageBuildManifest
  if (hasImages) {
    imageLambdaPath = await zipLambda('image-lambda')
  }

  const assetsDir = path.join(buildDir, 'assets')
  const assets = readAssetsDirectory(assetsDir)

  return {
    lambdaBuildDir,
    defaultLambdaPath,
    apiLambdaPath,
    imageLambdaPath,
    assets,
    imagePath: hasImages ? pathPattern('_next/image*') : undefined,
    dataPath: pathPattern('_next/data/*'),
    basePath: pathPattern('_next/*'),
    staticPath: pathPattern('static/*'),
    apiPath: hasApi ? pathPattern('api/*') : undefined,
    invalidationPaths: defaultManifest
      ? reduceInvalidationPaths(readInvalidationPathsFromManifest(defaultManifest))
      : undefined,
  }
}
