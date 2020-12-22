import React, {useContext, useState} from 'react'
import {Box, Text} from 'ink'
import {Task, TaskState} from './Task'
import {getStackId, NessContext} from '../context'
import {
  clearS3Bucket,
  deleteCloudFormationStack,
  getCloudFormationFailureReason,
  getCloudFormationStackOutputs,
} from '../utils/aws'

export const Destroy: React.FunctionComponent = () => {
  const context = useContext(NessContext)
  const {credentials} = context

  const [error, setError] = useState<string>()

  const handleError = async (stack: string, error: string) => {
    const reason = await getCloudFormationFailureReason(getStackId(stack), credentials!)
    setError(`${error}${reason ? `:\n\n${reason}` : ''}`)
  }

  const destroy: () => Promise<TaskState> = async () => {
    const webStack = getStackId('web')

    const webStackOutputs = await getCloudFormationStackOutputs(webStack, credentials!)
    if (!webStackOutputs) {
      setError("Couldn't find site. Are you sure you've deployed (from this branch)?")
      return TaskState.Failure
    }

    try {
      await clearS3Bucket(webStackOutputs!.BucketName, credentials!)
    } catch {}

    try {
      await deleteCloudFormationStack(getStackId('alias'), credentials!)
    } catch {
      handleError('alias', 'Unable to delete site')
      return TaskState.Failure
    }

    // We first have to delete so that it goes to DELETE_FAILED, then we can
    // specify the resources to retain (the edge lambdas)
    try {
      await deleteCloudFormationStack(webStack, credentials!)
    } catch {}

    try {
      await deleteCloudFormationStack(webStack, credentials!, [
        'ViewerRequestFunction',
        'OriginResponseFunction',
      ])
    } catch {
      handleError('web', 'Unable to delete site')
      return TaskState.Failure
    }

    try {
      await deleteCloudFormationStack(getStackId('domain'), credentials!)
    } catch {
      handleError('domain', 'Unable to delete site')
      return TaskState.Failure
    }

    return TaskState.Success
  }

  return (
    <Box flexDirection='column'>
      <Task name='Destroying site' note='☕ this could take a while' action={destroy} />

      {error && (
        <Box paddingTop={1}>
          <Text color='red'>{error}</Text>
        </Box>
      )}
    </Box>
  )
}
