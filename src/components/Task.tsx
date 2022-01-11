import React, {useState, useEffect} from 'react'
import {Text, Box} from 'ink'
import {delay} from '../utils'
import Spinner from 'ink-spinner'

export enum TaskState {
  Pending,
  Success,
  Failure,
  Skipped,
}

export type TaskProps = {
  /**
   * Text to be displayed while the action is running.
   */
  readonly name: React.ReactElement | string

  /**
   * Text to be displayed beside the name in gray.
   */
  readonly note?: string

  /**
   * The action to perform. If not action is provided, the task will await any children Tasks.
   */
  readonly action: () => Promise<TaskState>

  /**
   * A callback that's fired when the action is complete.
   */
  readonly onComplete?: (state: TaskState) => void

  /**
   * Text to be displayed on success. If this isn't specified, `text` will remain unchanged.
   */
  readonly success?: React.ReactElement | string

  /**
   * Text to be displayed on failure. If this isn't specified, `text` will remain unchanged.
   */
  readonly failure?: React.ReactElement | string

  /**
   * Text to be displayed when the task is skipped. If this isn't specified, `text` will remain unchanged.
   */
  readonly skipped?: React.ReactElement | string

  /**
   * True if the task should remain visible after completion.
   *
   * @default true
   */
  readonly persist?: boolean

  /**
   * Minimum duration in miliseconds.
   *
   * @default 750
   */
  readonly minimumDuration?: number

  /**
   * Color of the loading spinner. Any chalk supported colors are valid.
   *
   * @default 'green'
   */
  readonly spinnerColor?: string
}

export const Task: React.FunctionComponent<TaskProps> = ({
  children,
  ...props
}: React.PropsWithChildren<TaskProps>) => {
  const [visible, setVisible] = useState(true)
  const [state, setState] = useState(TaskState.Pending)
  const [text, setText] = useState<React.ReactElement | string>(props.name)

  const persist = props.persist ?? true
  const duration = props.minimumDuration ?? 750
  const spinnerColor = props.spinnerColor ?? 'green'
  const {note} = props

  let display: React.ReactElement | string
  switch (state) {
    case TaskState.Success:
      display = props.success ?? text
      break
    case TaskState.Failure:
      display = props.failure ?? text
      break

    default:
      display = text
  }

  useEffect(() => {
    const run = async (action: () => Promise<TaskState>) => {
      const started = Date.now()

      let resultingState = TaskState.Pending

      try {
        resultingState = await action()
        const elapsed = Date.now() - started
        const remaining = duration - elapsed
        if (remaining > 0) await delay(remaining)
        setState(resultingState)
      } catch (e) {
        setState(TaskState.Failure)
        if (e instanceof Error) {
          setText(e.message)
        }
      } finally {
        if (!persist) setVisible(false)
        if (props.onComplete) props.onComplete(resultingState)
      }
    }

    run(props.action)
  }, [])

  return (
    <Box flexDirection='column'>
      {visible && (
        <Text>
          {state === TaskState.Pending && (
            <Text color={spinnerColor}>
              <Spinner type='dots' />
            </Text>
          )}
          {state === TaskState.Success && <Text color='green'>✔</Text>}
          {state === TaskState.Failure && <Text color='red'>✘</Text>}
          {state === TaskState.Skipped && <Text color='gray'>-</Text>}
          <Text> </Text>
          {display}
          {state === TaskState.Pending && note && <Text color='gray'> ({note})</Text>}
          {state === TaskState.Skipped && <Text color='gray'> (skipped)</Text>}
        </Text>
      )}
      <Box marginLeft={1}>{children}</Box>
    </Box>
  )
}
