import React, {useState, useContext} from 'react'
import * as fs from 'fs'
import {Box, Text} from 'ink'
import {TaskState, Task} from './Task'

import {
  detectFramework,
  getSettingsFromArgs,
  getSettingsFromFile,
  gitIgnoreNessDirectory,
  isIgnoringNessDirectory,
  NessSettings,
  saveSettings,
} from '../utils'
import {NessContext} from '../context'
import {getHostedZone} from '../utils/aws'

export const Settings: React.FunctionComponent = ({children}: React.PropsWithChildren<any>) => {
  const context = useContext(NessContext)
  const {command, credentials, setContext} = context
  const [initialized, setInitialized] = useState(false)
  const [settings, setSettings] = useState<NessSettings>({})
  const [needsGitIgnore, setNeedsGitIgnore] = useState<boolean>()

  const [error, setError] = useState<string>()

  const gather = async (): Promise<TaskState> => {
    const isGitIgnored = await isIgnoringNessDirectory()
    setNeedsGitIgnore(!isGitIgnored)

    const fromFile = await getSettingsFromFile()
    const fromArgs = await getSettingsFromArgs(command!)
    const framework = await detectFramework()

    const domain = fromArgs?.domain || fromFile?.domain
    const zone = domain ? await getHostedZone(domain, credentials!) : undefined
    const dir = fromArgs?.dir || fromFile?.dir || framework?.dist

    const merged = {
      dir,
      prod:
        fromArgs?.prod !== undefined
          ? fromArgs?.prod
          : fromFile?.prod !== undefined
          ? fromFile?.prod
          : false,
      domain,
      profile: fromArgs?.profile || fromFile?.profile || credentials?.profile,
      hostedZoneId: zone?.id,
      hostedZoneName: zone?.name,
    }

    if (!dir) {
      setError(
        'Unable to detect framework and no publish directory was specified.\nPlease specify a directory to publish with --dir (e.g., ness deploy --dir dist).',
      )
      return TaskState.Failure
    }

    if (!fs.existsSync(dir)) {
      setError(`Publish directory (${dir}) doesn't exist. Did you forget to build your project?`)
      return TaskState.Failure
    }

    setSettings(merged)

    if (setContext) {
      setContext({
        ...context,
        settings: merged,
      })
    }

    await saveSettings(merged)

    return TaskState.Success
  }

  const updateGitIgnore: () => Promise<TaskState> = async () => {
    const updated = await gitIgnoreNessDirectory()
    return updated ? TaskState.Success : TaskState.Skipped
  }

  const onLoadComplete = (state: TaskState) => {
    setInitialized(state === TaskState.Success)
  }

  return (
    <Box flexDirection='column'>
      <Task name='Initializing' action={gather} onComplete={onLoadComplete} persist={false} />
      {needsGitIgnore && (
        <Task name='Updating .gitignore to ignore .ness directory' action={updateGitIgnore} />
      )}
      {error && (
        <Box paddingTop={1}>
          <Text color='red'>{error}</Text>
        </Box>
      )}
      {initialized && settings && children}
    </Box>
  )
}
