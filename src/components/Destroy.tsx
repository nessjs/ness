import React, {useContext} from 'react'
import {Box} from 'ink'
import {Task, TaskState} from './Task'
import {getStackId, NessContext} from '../context'
import {deleteCloudFormationStack} from '../utils/aws'

export const Destroy: React.FunctionComponent = () => {
  const context = useContext(NessContext)
  const {credentials} = context

  const destroy: () => Promise<TaskState> = async () => {
    try {
      await deleteCloudFormationStack(getStackId('web'), credentials!)
      await deleteCloudFormationStack(getStackId('alias'), credentials!)
      await deleteCloudFormationStack(getStackId('domain'), credentials!)
    } catch {
      return TaskState.Failure
    }

    return TaskState.Success
  }

  return (
    <Box flexDirection='column'>
      <Task name='Destroying site' note='☕ this could take a while' action={destroy} />
    </Box>
  )
}
