import execa from 'execa'
import path from 'path'
import * as fs from 'fs'

const CONTEXT_JSON_PATH = 'cdk.context.json'

async function cleanup(): Promise<void> {
  const entry = process.cwd()
  const contextJsonPath = path.resolve(entry, CONTEXT_JSON_PATH)
  if (fs.existsSync(contextJsonPath)) {
    await fs.promises.unlink(contextJsonPath)
  }
}

export interface CdkCliOptions {
  readonly profile?: string
  readonly env?: Record<string, string>
  readonly context?: Record<string, string | undefined>
}

export type StackName = 'domain' | 'web' | 'alias'

async function invoke(
  stack: StackName,
  method: string,
  options?: CdkCliOptions,
  args?: string[],
): Promise<boolean> {
  let context = []
  for (const key in options?.context) {
    const value = options?.context[key]
    if (value === undefined) continue

    context.push('--context')
    context.push(`${key}=${value}`)
  }

  const {profile, env} = options || {}

  const cdkCli = require.resolve('aws-cdk/bin/cdk')
  const cdkApp = require.resolve(`./${stack}`)
  const cdkProcess = await execa(
    cdkCli,
    [
      method,
      '--app',
      cdkApp,
      ...(profile ? ['--profile', profile] : []),
      ...(args || []),
      '--output',
      '.ness',
      '--outputs-file',
      `.ness/${stack}.json`,
      ...context,
    ],
    {
      stdio: 'ignore',
      env,
    },
  )

  await cleanup()

  return cdkProcess.exitCode === 0
}

export async function getStackOutputs(stack: StackName): Promise<Record<string, string>> {
  const entry = process.cwd()
  const credentialsPath = path.resolve(entry, `.ness/${stack}.json`)
  const contents = await fs.promises.readFile(credentialsPath, {encoding: 'utf-8'})
  const parsed = JSON.parse(contents)
  const firstStack = parsed[Object.keys(parsed)[0]]
  return firstStack
}

export async function synth(stack: StackName, options?: CdkCliOptions): Promise<boolean> {
  return invoke(stack, 'synth', options)
}

export async function deploy(
  stack: StackName,
  options?: CdkCliOptions,
): Promise<Record<string, string>> {
  await invoke(stack, 'deploy', options, ['--require-approval', 'never'])
  return getStackOutputs(stack)
}

export async function destroy(
  stack: StackName,
  options?: CdkCliOptions,
): Promise<Record<string, string>> {
  await invoke(stack, 'destroy', options, ['--all', '--force'])
  return getStackOutputs(stack)
}

export async function bootstrap(stack: StackName, options?: CdkCliOptions): Promise<boolean> {
  return invoke(stack, 'bootstrap', options)
}
