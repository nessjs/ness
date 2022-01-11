import React, {useState, useContext} from 'react'
import * as fs from 'fs-extra'
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

export const Settings: React.FunctionComponent = ({children}: React.PropsWithChildren<any>) => {
  const context = useContext(NessContext)
  const {command, setContext} = context
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
    const dir = fromArgs?.dir || fromFile?.dir || framework?.dist

    const merged = {
      prod:
        fromArgs?.prod !== undefined
          ? fromArgs?.prod
          : fromFile?.prod !== undefined
          ? fromFile?.prod
          : undefined,
      redirectWww:
        fromArgs?.redirectWww !== undefined
          ? fromArgs?.redirectWww
          : fromFile?.redirectWww !== undefined
          ? fromFile?.redirectWww
          : undefined,
      spa:
        fromArgs?.spa !== undefined
          ? fromArgs?.spa
          : fromFile?.spa !== undefined
          ? fromFile?.spa
          : undefined,
      dir,
      domain,
      csp: fromArgs?.csp || fromFile?.csp,
      indexDocument: fromArgs?.indexDocument || fromFile?.indexDocument,
      errorDocument: fromArgs?.errorDocument || fromFile?.errorDocument,
      verbose: fromArgs?.verbose,
    }

    if (!dir) {
      setError(
        'Unable to detect framework and no publish directory was specified.\nPlease specify a directory to publish with --dir (e.g., ness deploy --dir dist).',
      )
      return TaskState.Failure
    }

    const dirExists = await fs.pathExists(dir)
    if (!dirExists) {
      setError(`Publish directory (${dir}) doesn't exist. Did you forget to build your project?`)
      return TaskState.Failure
    }

    setSettings(merged)

    if (setContext) {
      setContext({
        ...context,
        settings: merged,
        framework,
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
