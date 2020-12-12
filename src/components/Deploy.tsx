import React, {useState, useContext} from 'react'
import {Box, Newline, Text} from 'ink'
import {Task, TaskState} from './Task'
import {createCdkCliOptions, getStackId, NessContext} from '../context'
import * as cdk from '../cdk'
import {delay} from '../utils'
import * as dns from 'dns'
import {
  cleanupHostedZoneRecords,
  getCertificateArn,
  getCloudFormationFailureReason,
  getHostedZoneNameservers,
} from '../utils/aws'

export const Deploy: React.FunctionComponent = () => {
  const context = useContext(NessContext)

  const [domainDeployed, setDomainDeployed] = useState(false)
  const [webDeployed, setWebDeployed] = useState(false)
  const [aliasDeployed, setAliasDeployed] = useState(false)
  const [webRedeployed, setWebRedeployed] = useState(false)

  const [error, setError] = useState<string>()

  const [siteUrl, setSiteUrl] = useState<string>()
  const [nameservers, setNameservers] = useState<string[]>()
  const [domainOutputs, setDomainOutputs] = useState<Record<string, string>>()
  const [webOutputs, setWebOutputs] = useState<Record<string, string>>()
  const [needsRedeploy, setNeedsRedeploy] = useState(true)

  const [dnsValidated, setDnsValidated] = useState(false)
  const {settings, credentials} = context
  const {domain, dir} = settings || {}

  if (!credentials) throw Error('Cannot deploy without AWS credentials')

  const hasCustomDomain = domain !== undefined

  const handleError = async (stack: string, error: string) => {
    const reason = await getCloudFormationFailureReason(getStackId(stack), credentials)
    setError(`${error}${reason ? `:\n\n${reason}` : ''}`)
  }

  const deployDomain: () => Promise<TaskState> = async () => {
    const options = createCdkCliOptions(context)

    try {
      const outputs = await cdk.deploy('domain', options)
      setDomainOutputs(outputs)

      const {websiteUrl} = outputs || {}
      setSiteUrl(websiteUrl)
    } catch {
      return TaskState.Failure
    }

    return TaskState.Success
  }

  const handleDomainDeployed = async (state: TaskState) => {
    if (state === TaskState.Failure) {
      await handleError('domain', 'Failed to create your custom domain')
      return
    }

    setDomainDeployed(true)
  }

  const deployWeb: () => Promise<TaskState> = async () => {
    const existingCertificateArn = domain ? await getCertificateArn(domain, credentials) : undefined

    const options = createCdkCliOptions(
      context,
      existingCertificateArn ? {certificateArn: existingCertificateArn} : undefined,
    )
    const needsRedeploy = existingCertificateArn === undefined
    setNeedsRedeploy(needsRedeploy)

    try {
      const outputs = await cdk.deploy('web', options)
      setWebOutputs(outputs)

      if (!hasCustomDomain && outputs) {
        setSiteUrl(outputs['bucketWebsiteUrl'])
      }
    } catch {
      return TaskState.Failure
    }

    return TaskState.Success
  }

  const handleWebDeployed = async (state: TaskState) => {
    if (state === TaskState.Failure) {
      await handleError('web', 'Failed to deploy your site')
      return
    }

    setWebDeployed(true)
  }

  const handleWebRedeployed = async (state: TaskState) => {
    if (state === TaskState.Failure) {
      await handleError('web', 'Failed to point custom domain at your site')
      return
    }

    setWebRedeployed(true)
  }

  const deployAlias: () => Promise<TaskState> = async () => {
    const options = createCdkCliOptions(context, {...domainOutputs, ...webOutputs})

    try {
      await cdk.deploy('alias', options)

      // We need to cleanup the record created by ACM when validating the cert
      const hostedZoneId = domainOutputs?.hostedZoneId
      if (hostedZoneId) await cleanupHostedZoneRecords(hostedZoneId, credentials)
    } catch {
      return TaskState.Failure
    }

    return TaskState.Success
  }

  const handleAliasDeployed = async (state: TaskState) => {
    if (state === TaskState.Failure) {
      await handleError('alias', 'Failed to setup SSL for your custom domain')
      return
    }

    setAliasDeployed(true)
  }

  const validateDns = async (): Promise<TaskState> => {
    if (!hasCustomDomain || !credentials) return TaskState.Skipped

    while (true) {
      try {
        const records = await dns.promises.resolveTxt(domain!)
        if (records.flat().find((r) => r.toLowerCase().includes('ness'))) {
          return TaskState.Success
        }
      } catch {
      } finally {
        await delay(1000)
      }

      if (!nameservers) {
        const {hostedZoneId} = domainOutputs || {}
        if (!hostedZoneId) return TaskState.Failure

        const nameservers = await getHostedZoneNameservers(hostedZoneId, credentials)
        setNameservers(nameservers)
      }
    }
  }

  const onDnsValidated = () => {
    setDnsValidated(true)
  }

  const finished =
    webDeployed && (!hasCustomDomain || webRedeployed || (!needsRedeploy && aliasDeployed))

  return (
    <Box flexDirection='column'>
      <Task
        name={`Deploying '${dir}' directory to AWS`}
        note='☕ this could take a while'
        action={deployWeb}
        onComplete={handleWebDeployed}
      />
      {hasCustomDomain && (
        <Task
          name={`Setting up custom domain (${domain})`}
          action={deployDomain}
          onComplete={handleDomainDeployed}
          persist={false}
        />
      )}
      {domainDeployed && (
        <Task
          name='Validating custom domain DNS'
          action={validateDns}
          persist={false}
          onComplete={onDnsValidated}
        />
      )}
      {nameservers && !dnsValidated && (
        <Box paddingTop={1} paddingLeft={2}>
          <Text color='gray'>
            Configure your domain registrar with the following nameservers:
            <Newline />
            <Newline />
            <Text color='cyan'>{nameservers.join('\n')}</Text>
          </Text>
        </Box>
      )}
      {webDeployed && dnsValidated && (
        <Task
          name='Setting up SSL'
          action={deployAlias}
          onComplete={handleAliasDeployed}
          success='Finalizing custom domain'
          persist={!needsRedeploy}
        />
      )}
      {aliasDeployed && needsRedeploy && (
        <Task name='Finalizing custom domain' action={deployWeb} onComplete={handleWebRedeployed} />
      )}
      {finished && (
        <Box paddingTop={1}>
          <Text>
            <Text>🎉 Site successfully deployed:</Text>
            <Newline />
            <Text>{siteUrl}</Text>
          </Text>
        </Box>
      )}
      {error && (
        <Box paddingTop={1}>
          <Text color='red'>{error}</Text>
        </Box>
      )}
    </Box>
  )
}
