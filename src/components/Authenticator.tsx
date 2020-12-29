import React, {useState, useContext} from 'react'
import {Text, Box, useFocusManager} from 'ink'
import Link from 'ink-link'
import {Form, Field} from 'react-final-form'
import {TextInput} from './TextInput'
import {TaskState, Task} from './Task'

import {
  Credentials,
  getCredentials,
  saveLocalCredentials,
  getAccount,
} from '../providers/aws/credentials'
import {getStackId, NessContext} from '../context'

type CredentialFormProps = {
  onCredentials: (credentials: Credentials) => void
}

export const CredentialForm: React.FunctionComponent<CredentialFormProps> = ({
  onCredentials,
}: CredentialFormProps) => {
  const {focusNext} = useFocusManager()
  const onSubmit = (handleSubmit: any) => {
    focusNext()
    handleSubmit()
  }

  return (
    <Form onSubmit={onCredentials}>
      {({handleSubmit}) => (
        <Box flexDirection='column'>
          <Text bold color='cyanBright'>
            Please provide your AWS credentials
          </Text>
          <Box paddingBottom={1}>
            <Link url='https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/getting-your-credentials.html'>
              <Text italic dimColor>
                Where can I find these?
              </Text>
            </Link>
          </Box>
          <Field name='accessKeyId'>
            {({input}) => (
              <TextInput
                {...input}
                name='AWS_ACCESS_KEY_ID'
                prefix='🔑'
                autoFocus
                onSubmit={() => onSubmit(handleSubmit)}
              />
            )}
          </Field>
          <Field name='secretAccessKey'>
            {({input}) => (
              <TextInput
                {...input}
                name='AWS_SECRET_ACCESS_KEY'
                prefix='🤐'
                onSubmit={() => onSubmit(handleSubmit)}
              />
            )}
          </Field>
          {/* <Field name='region'>
            {({ input }) => (
              <TextInput
                {...input}
                name='AWS_REGION'
                prefix='🌎'
                onSubmit={() => onSubmit(handleSubmit)}
              />
            )}
          </Field> */}
        </Box>
      )}
    </Form>
  )
}

export const Authenticator: React.FunctionComponent = ({
  children,
}: React.PropsWithChildren<any>) => {
  const context = useContext(NessContext)
  const {command, credentials, account, setContext} = context
  const [initialized, setInitialized] = useState(false)
  const [providedCredentials, setProvidedCredentials] = useState<Credentials>()

  const profile = command?.opts()?.profile

  const gather = async (): Promise<TaskState> => {
    const systemCredentials = await getCredentials(profile)

    if (systemCredentials) {
      handleCredentials(systemCredentials)
      return TaskState.Success
    }

    return TaskState.Failure
  }

  const validate = async (): Promise<TaskState> => {
    if (!providedCredentials) return TaskState.Failure

    const {accessKeyId, secretAccessKey} = providedCredentials
    if (!accessKeyId || !secretAccessKey) return TaskState.Failure

    const account = await getAccount(providedCredentials)
    if (!account) return TaskState.Failure

    const env = {
      NESS_DOMAIN_STACK_ID: getStackId('domain'),
      NESS_WEB_STACK_ID: getStackId('web'),
      NESS_ALIAS_STACK_ID: getStackId('alias'),
      AWS_ACCESS_KEY_ID: accessKeyId,
      AWS_SECRET_ACCESS_KEY: secretAccessKey,
    }

    if (setContext) {
      setContext({
        ...context,
        credentials: providedCredentials,
        account,
        env,
      })
    }

    await saveLocalCredentials(providedCredentials)
    return TaskState.Success
  }

  const handleCredentials = async (credentials: Credentials) => {
    const {accessKeyId, secretAccessKey} = credentials
    if (!accessKeyId || !secretAccessKey) return

    setProvidedCredentials(credentials)
  }

  const onSearchComplete = async () => {
    setInitialized(true)
  }

  const onValidated = async () => {
    setProvidedCredentials(undefined)
  }

  const Success: React.FC = () => (
    <>
      <Text>Validating AWS credentials</Text>
      {account && <Text color='gray'> (Account #{account})</Text>}
    </>
  )

  return (
    <Box flexDirection='column' paddingTop={1}>
      <Task
        name='Looking up AWS Credentials'
        action={gather}
        onComplete={onSearchComplete}
        persist={false}
      />
      {initialized && !providedCredentials && !credentials && (
        <CredentialForm onCredentials={handleCredentials} />
      )}
      {initialized && (providedCredentials || credentials) && (
        <Task
          name='Validating AWS credentials'
          action={validate}
          onComplete={onValidated}
          success={<Success />}
        />
      )}
      {initialized && credentials && children}
    </Box>
  )
}
