import path from 'path'
import branch from 'git-branch'
import {Command} from 'commander'
import React from 'react'
import {getPackageJson} from './utils/file'
import {Credentials} from './utils/credentials'
import {createCdkContext, NessSettings} from './utils/settings'
import {CdkCliOptions} from './cdk'

export type NessContextProps = {
  readonly command?: Command
  readonly account?: string
  readonly credentials?: Credentials
  readonly env?: Record<string, string>
  readonly settings?: NessSettings
  readonly setContext?: (context: NessContextProps) => void
}

export const NessContext = React.createContext<NessContextProps>({})

export function createCdkCliOptions(
  context: NessContextProps,
  additionalContext?: Record<string, string>,
): CdkCliOptions {
  const {env, settings} = context
  const cdkContext = createCdkContext(settings)

  return {
    env,
    context: {...cdkContext, ...(additionalContext || {})},
    profile: settings?.profile,
  }
}

/**
 * Get a valid, stable stack ID for this stack in this project on the current branch.
 *
 * @param stack Stack name (ie, 'web', 'domain', or 'alias').
 * @param entry Path to the project root. Defaults to process.cwd().
 */
export function getStackId(stack: string, entry: string = process.cwd()): string {
  return `ness-${stack}-${getProjectName(entry)}-${getBranch(entry)}`
}

/**
 * Get the project name. This is pulled from package.name, if package.json is
 * present; otherwise, the name of the current working directory is used.
 *
 * @param entry Path to the project root. Defaults to process.cwd().
 */
export function getProjectName(entry: string = process.cwd()): string | undefined {
  const packageJson = getPackageJson(entry)
  const workingDir = path.basename(path.resolve(entry))
  return clean(packageJson?.name ?? workingDir)
}

/**
 * Get the current git branch. Defaults to 'main' if there is no git repository.
 *
 * @param entry Path to the project root. Defaults to process.cwd().
 */
export function getBranch(path: string = process.cwd()): string | undefined {
  return clean(branch.sync(path) || 'main')
}

function clean(input?: string): string | undefined {
  return input?.replace(/[\W_]/g, '-')
}
