import * as path from 'path'
import * as fs from 'fs-extra'
import * as crypto from 'crypto'

import {Route53, ResourceRecordSet} from '@aws-sdk/client-route-53'
import {S3, ListObjectsV2CommandOutput} from '@aws-sdk/client-s3'
import {ACM, ListCertificatesCommandOutput} from '@aws-sdk/client-acm'
import {CloudFormation} from '@aws-sdk/client-cloudformation'
import {
  CloudFront,
  DistributionSummary,
  waitForInvalidationCompleted,
} from '@aws-sdk/client-cloudfront'
import * as uuid from 'uuid'
import * as mime from 'mime'

import {Credentials} from './credentials'
import {
  changeSetHasNoChanges,
  CloudFormationStack,
  TemplateParameters,
  toYAML,
  waitForChangeSet,
  waitForStackDelete,
  waitForStackDeploy,
} from './cloudformation'
import {getStackId} from '../../context'
import * as yaml from './yaml'
import {walk} from '../../utils/file'

export interface HostedZone {
  id: string
  name?: string
}

const region = 'us-east-1'

/**
 * Get an existing HostedZone for a given domain
 *
 * @param domain Domain to lookup
 * @param credentials AWS credentials
 */
export async function getHostedZone(
  domain: string,
  credentials: Credentials,
): Promise<HostedZone | undefined> {
  try {
    const route53 = new Route53({credentials, region})
    const response = await route53.listHostedZonesByName({DNSName: domain})
    const hostedZone = response.HostedZones?.find(
      (zone) => zone.Name === `${domain}.` && zone.Config?.Comment !== 'Created by Ness',
    )
    if (!hostedZone || !hostedZone.Id) return undefined

    const id = path.basename(hostedZone.Id)
    const name = hostedZone.Name

    return {
      id,
      name,
    }
  } catch {
    return undefined
  }
}

/**
 * Get record sets from a Route53 hosted zone.
 *
 * @param hostedZoneId HostedZoneId of the hosted zone that should be cleaned up
 * @param credentials AWS credentials
 */
export async function getHostedZoneRecordSets(
  hostedZoneId: string,
  credentials: Credentials,
): Promise<ResourceRecordSet[] | undefined> {
  try {
    const route53 = new Route53({credentials, region})

    const recordSets = await route53.listResourceRecordSets({HostedZoneId: hostedZoneId})
    return recordSets.ResourceRecordSets
  } catch {
    return undefined
  }
}

/**
 * Get any existing A record for a given hosted zone.
 *
 * @param hostedZoneId HostedZoneId of the hosted zone that should be cleaned up
 * @param credentials AWS credentials
 */
export async function getHostedZoneARecord(
  hostedZoneId: string,
  domain: string | undefined,
  credentials: Credentials,
): Promise<ResourceRecordSet | undefined> {
  try {
    const recordSets = await getHostedZoneRecordSets(hostedZoneId, credentials)
    if (!recordSets) return

    const aRecord = recordSets.find((record) => record.Name === domain && record.Type === 'A')
    return aRecord
  } catch {
    return undefined
  }
}

/**
 * Deletes record sets from a hosted zone.
 *
 * @param hostedZoneId HostedZoneId of the hosted zone that should be cleaned up
 * @param records Record sets to be deleted
 * @param credentials AWS credentials
 */
export async function deleteHostedZoneRecords(
  hostedZoneId: string,
  records: ResourceRecordSet[],
  credentials: Credentials,
): Promise<void> {
  const route53 = new Route53({credentials, region})

  const changes = records.map((record) => ({
    Action: 'DELETE',
    ResourceRecordSet: record,
  }))

  await route53.changeResourceRecordSets({
    HostedZoneId: hostedZoneId,
    ChangeBatch: {Changes: changes},
  })
}

/**
 * Clear out any records in a Hosted Zone that were created by validating
 * a DNS Validated Certificate through ACM.
 *
 * @param hostedZoneId HostedZoneId of the hosted zone that should be cleaned up
 * @param credentials AWS credentials
 */
export async function cleanupHostedZoneRecords(
  hostedZoneId: string,
  credentials: Credentials,
): Promise<void> {
  const recordSets = await getHostedZoneRecordSets(hostedZoneId, credentials)
  if (!recordSets) return

  const targets = recordSets.filter(
    (record) =>
      record.Type === 'CNAME' &&
      record.ResourceRecords?.find((v) => v.Value?.endsWith('acm-validations.aws.')),
  )
  if (!targets || targets.length === 0) return

  await deleteHostedZoneRecords(hostedZoneId, targets, credentials)
}

/**
 * Get an existing Cloudfront Distribution for a given domain
 *
 * @param domain Domain to lookup
 * @param credentials AWS credentials
 */
export async function getDistribution(
  domain: string,
  credentials: Credentials,
): Promise<DistributionSummary | undefined> {
  try {
    const cloudfront = new CloudFront({credentials, region})
    const response = await cloudfront.listDistributions({})
    const distribution = response.DistributionList?.Items?.find(
      (distro) =>
        distro.Aliases?.Items?.find((a) => a === domain) && distro.Comment !== 'Created by Ness',
    )
    return distribution
  } catch {
    return undefined
  }
}

export async function invalidateDistribution(
  distributionId: string,
  credentials: Credentials,
  paths: string[] = ['/*'],
): Promise<void> {
  const cloudfront = new CloudFront({credentials, region})
  const invalidation = await cloudfront.createInvalidation({
    DistributionId: distributionId,
    InvalidationBatch: {
      CallerReference: Date.now().toString(),
      Paths: {Quantity: paths.length, Items: paths},
    },
  })

  await waitForInvalidationCompleted(
    {client: cloudfront, maxWaitTime: 5 * 60},
    {DistributionId: distributionId, Id: invalidation.Invalidation?.Id},
  )
}

/**
 * Get an existing certificate ARN for a given domain
 *
 * @param domain Domain to lookup
 * @param credentials AWS credentials
 */
export async function getCertificateArn(
  domain: string,
  credentials: Credentials,
): Promise<string | undefined> {
  try {
    const acm = new ACM({credentials, region})

    let nextToken = undefined
    do {
      const certificates: ListCertificatesCommandOutput = await acm.listCertificates({
        CertificateStatuses: ['ISSUED'],
        NextToken: nextToken,
      })

      const certificate = certificates?.CertificateSummaryList?.find(
        (cert) => cert.DomainName === domain,
      )
      if (certificate) return certificate.CertificateArn

      nextToken = certificates?.NextToken
    } while (nextToken)

    return undefined
  } catch {
    return undefined
  }
}

export async function getHostedZoneNameservers(
  hostedZoneId: string,
  credentials: Credentials,
): Promise<string[] | undefined> {
  try {
    const route53 = new Route53({credentials, region})
    const hostedZone = await route53.getHostedZone({Id: hostedZoneId})
    if (!hostedZone) return undefined

    return hostedZone.DelegationSet?.NameServers
  } catch {
    return undefined
  }
}

export type NessStack = 'domain' | 'web' | 'alias' | 'support'

export interface Stack {
  /**
   * The physical name of this stack.
   */
  stackName: string

  /**
   * CloudFormation parameters to pass to the stack.
   */
  parameters: {[id: string]: string | undefined}

  /**
   * The stack template.
   */
  template: any
}

interface CloudFormationResource {
  Type: string
}

interface CloudFormationLambdaFunction extends CloudFormationResource {
  Properties: {
    Code: {
      S3Key?: {
        Ref: string
      }
      ZipFile?: {
        'Fn::Sub': string
      }
    }
  }
}

interface CloudFormationLambdaFunctionVersion extends CloudFormationResource {
  Properties: {
    FunctionName: {
      Ref: string
    }
  }
}

interface CloudFormationTemplate {
  Resources: Record<string, CloudFormationResource>
}

export async function getStack(
  stack: NessStack,
  parameters: {[id: string]: string | undefined},
): Promise<Stack> {
  const stackName = getStackId(stack)
  const contents = await fs.readFile(
    path.resolve(__dirname, `../../../static/stacks/${stack}.yaml`),
    'utf-8',
  )

  const template: CloudFormationTemplate = yaml.deserialize(contents)

  const getCodeFromLambda = (resource: CloudFormationResource): string | undefined => {
    const lambda = resource as CloudFormationLambdaFunction
    if (!lambda) return undefined

    return lambda.Properties.Code.ZipFile ? lambda.Properties.Code.ZipFile['Fn::Sub'] : undefined
  }

  const getS3KeyFromLambda = (resource: CloudFormationResource): string | undefined => {
    const lambda = resource as CloudFormationLambdaFunction
    if (!lambda) return undefined

    return lambda.Properties.Code.S3Key?.Ref
  }

  const resources = template.Resources
  const functions = Object.keys(resources)
    .filter((resource) => resources[resource].Type === 'AWS::Lambda::Function')
    .map((resource) => ({
      key: resource,
      code: getCodeFromLambda(resources[resource]),
      s3key: getS3KeyFromLambda(resources[resource]),
    }))
    .filter(({code, s3key}) => code || s3key)

  const versions = Object.keys(resources)
    .filter((resource) => resources[resource].Type === 'AWS::Lambda::Version')
    .map((resource) => ({
      key: resource,
      functionName: (resources[resource] as CloudFormationLambdaFunctionVersion).Properties
        .FunctionName.Ref,
    }))

  let updatedContents = contents

  for (const lambdaFunction of functions) {
    const {key, code, s3key} = lambdaFunction

    let hash: string = ''

    if (code) {
      let codeWithReplacements = code
      for (const param of Object.keys(parameters)) {
        const value = parameters[param]
        if (value === undefined) continue

        codeWithReplacements = codeWithReplacements.replace('${' + param + '}', value)
      }

      hash = crypto.createHash('sha256').update(codeWithReplacements).digest('hex')
    } else {
      if (!s3key || !parameters[s3key]) continue

      const key = parameters[s3key] as string
      // default-lambda.<hash>.zip
      hash = key.split('.')[1]
    }

    const version = versions.find((version) => version.functionName === key)
    if (!version) continue

    const regex = new RegExp(version.key, 'gi')
    updatedContents = updatedContents.replace(regex, hash)
  }

  return {
    stackName,
    parameters,
    template: yaml.deserialize(updatedContents),
  }
}

export interface DeployStackOptions {
  /**
   * The stack to be deployed
   */
  stack: Stack

  /**
   * The AWS credentials to deploy with
   */
  credentials: Credentials
}

export async function deployStack(options: DeployStackOptions): Promise<{[name: string]: string}> {
  const {stack, credentials} = options
  const {stackName, parameters, template} = stack

  const cfn = new CloudFormation({credentials, region})
  let cloudFormationStack = await CloudFormationStack.lookup(cfn, stackName)

  if (cloudFormationStack.stackStatus.isCreationFailure) {
    await cfn.deleteStack({StackName: stackName})
    const deletedStack = await waitForStackDelete(cfn, stackName)
    if (deletedStack && deletedStack.stackStatus.name !== 'DELETE_COMPLETE') {
      throw new Error(
        `Failed deleting stack ${stackName} that had previously failed creation (current state: ${deletedStack.stackStatus})`,
      )
    }

    // Update variable to mark that the stack does not exist anymore, but avoid
    // doing an actual lookup in CloudFormation (which would be silly to do if
    // we just deleted it).
    cloudFormationStack = CloudFormationStack.doesNotExist(cfn, stackName)
  }

  const templateParams = TemplateParameters.fromTemplate(template)
  const stackParams = templateParams.supplyAll(parameters)
  const templateJson = toYAML(stack.template)

  const executionId = uuid.v4()
  const changeSetName = `ness-${executionId}`
  const update =
    cloudFormationStack.exists && cloudFormationStack.stackStatus.name !== 'REVIEW_IN_PROGRESS'

  await cfn.createChangeSet({
    StackName: stackName,
    ChangeSetName: changeSetName,
    ChangeSetType: update ? 'UPDATE' : 'CREATE',
    Description: `Ness changeset for execution ${executionId}`,
    TemplateBody: templateJson,
    Parameters: stackParams.apiParameters,
    Capabilities: ['CAPABILITY_IAM', 'CAPABILITY_NAMED_IAM', 'CAPABILITY_AUTO_EXPAND'],
    // RoleARN: options.roleArn,
    // NotificationARNs: options.notificationArns,
    // Tags: options.tags,
  })

  const changeSetDescription = await waitForChangeSet(cfn, stackName, changeSetName)

  if (changeSetHasNoChanges(changeSetDescription)) {
    await cfn.deleteChangeSet({StackName: stackName, ChangeSetName: changeSetName})
    return cloudFormationStack.outputs
  }

  await cfn.executeChangeSet({StackName: stackName, ChangeSetName: changeSetName})
  const finalStack = await waitForStackDeploy(cfn, stackName)

  // This shouldn't really happen, but catch it anyway. You never know.
  if (!finalStack) {
    throw new Error('Stack deploy failed (the stack disappeared while we were deploying it)')
  }

  cloudFormationStack = finalStack
  return cloudFormationStack.outputs
}

export async function deleteCloudFormationStack(
  stack: string,
  credentials: Credentials,
  retain: string[] | undefined = undefined,
): Promise<void> {
  const cfn = new CloudFormation({credentials, region})

  const currentStack = await CloudFormationStack.lookup(cfn, stack)
  if (!currentStack.exists) {
    return
  }

  await cfn.deleteStack({StackName: stack, RetainResources: retain})
  const destroyedStack = await waitForStackDelete(cfn, stack)

  if (destroyedStack && destroyedStack.stackStatus.name !== 'DELETE_COMPLETE') {
    throw new Error(`Failed to destroy ${stack}: ${destroyedStack.stackStatus}`)
  }
}

export async function getCloudFormationStackOutputs(
  stack: string,
  credentials: Credentials,
): Promise<Record<string, string> | undefined> {
  const cfn = new CloudFormation({credentials, region})

  const currentStack = await CloudFormationStack.lookup(cfn, stack)
  if (!currentStack.exists) {
    return undefined
  }

  return currentStack.outputs
}

export async function getCloudFormationFailureReason(
  stack: string,
  credentials: Credentials,
): Promise<string | undefined> {
  const cf = new CloudFormation({credentials, region})

  const {StackEvents: events} = (await cf.describeStackEvents({StackName: stack})) || {}
  if (!events) return undefined

  for (const event of events) {
    const {ResourceStatus: status, ResourceStatusReason: reason} = event
    if (!status || !reason) continue

    if (
      ['CREATE_FAILED', 'UPDATE_FAILED'].includes(status) &&
      reason !== 'Resource creation cancelled'
    ) {
      return reason
    }
  }

  return undefined
}

export async function clearS3Bucket(
  bucket: string,
  credentials: Credentials,
  prefix?: string,
): Promise<void> {
  const s3 = new S3({credentials, region})

  let nextToken: string | undefined = undefined
  do {
    const response: ListObjectsV2CommandOutput = await s3.listObjectsV2({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: nextToken,
    })
    if (!response?.Contents || response.Contents.length === 0) return

    const objects = response.Contents?.map((item) => ({Key: item.Key}))
    await s3.deleteObjects({Bucket: bucket, Delete: {Objects: objects}})

    nextToken = response.NextContinuationToken
  } while (nextToken)
}

export type SyncProps = {
  dir: string
  bucket: string
  credentials: Credentials
  prefix?: string
  prune?: boolean
  verbose?: boolean
  cacheControl?: string
}

export async function syncLocalToS3(props: SyncProps): Promise<void> {
  const {dir, bucket, credentials, cacheControl} = props
  const prune = props.prune || false
  const verbose = props.verbose || false
  const prefix = props.prefix || ''

  if (prune) {
    await clearS3Bucket(bucket, credentials, props.prefix)
  }

  const localPath = path.resolve(dir)

  const s3 = new S3({credentials, region, useAccelerateEndpoint: true})

  const cacheMustRevalidate = 'public, max-age=0, must-revalidate'
  const cacheImmutable = 'public, max-age=31536000, immutable'
  const mustRevalidate = (path: string) => {
    // For now, we're handling Gatsby specific cache settings based on
    // https://github.com/gatsbyjs/gatsby/blob/master/docs/docs/caching.md
    const isHtml = path.endsWith('.html')
    const isPageDataJson = /page-data\/.*\.json$/.test(path)
    const isSwJs = path === 'sw.js'

    return isHtml || isPageDataJson || isSwJs
  }

  const files = await walk(localPath)
  await Promise.all(
    files.map((file) => {
      const content = fs.readFileSync(file)
      const relativeToBaseFilePath = path.normalize(path.relative(localPath, file))
      const relativeToBaseFilePathForS3 = relativeToBaseFilePath.split(path.sep).join('/')
      const contentType = mime.getType(file) || undefined
      const isFont = contentType && contentType.includes('font')

      if (verbose) {
        console.log(`${file}: ${contentType}`)
      }

      const CacheControl = isFont
        ? cacheImmutable
        : cacheControl ||
          (mustRevalidate(relativeToBaseFilePathForS3) ? cacheMustRevalidate : cacheImmutable)

      return s3.putObject({
        Bucket: bucket,
        Key: `${prefix}${relativeToBaseFilePathForS3}`,
        Body: content,
        ContentType: contentType,
        CacheControl,
      })
    }),
  )
}
