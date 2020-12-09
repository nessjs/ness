import React, {useContext, useState} from 'react'
import {Box} from 'ink'
import {TaskState, Task} from './Task'
import {isBootstrapped, bootstrap} from '../cdk'
import {createCdkCliOptions, NessContext} from '../context'

export const Bootstrapper: React.FunctionComponent = ({children}: React.PropsWithChildren<any>) => {
  const context = useContext(NessContext)
  const {settings} = context
  const [bootstrapped, setBootstrapped] = useState(false)
  const [checked, setChecked] = useState(false)

  const checkIsBootstrapped: () => Promise<TaskState> = async () => {
    try {
      let result = await isBootstrapped(settings?.profile)
      setBootstrapped(result)
    } finally {
      return TaskState.Success
    }
  }

  const bootstrapCdk: () => Promise<TaskState> = async () => {
    try {
      const options = createCdkCliOptions(context)
      await bootstrap('web', options)

      const result = await isBootstrapped(settings?.profile)
      setBootstrapped(result)
      return result ? TaskState.Success : TaskState.Failure
    } catch {
      return TaskState.Failure
    }
  }

  const onChecked = async () => {
    setChecked(true)
  }

  return (
    <Box flexDirection='column'>
      <Task
        name='Initializing'
        action={checkIsBootstrapped}
        onComplete={onChecked}
        persist={false}
      />
      {checked && !bootstrapped && (
        <Task name='Bootstrapping the CDK' action={bootstrapCdk} persist={false} />
      )}
      {checked && bootstrapped && children}
    </Box>
  )
}
