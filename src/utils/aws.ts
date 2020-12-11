import * as aws from 'aws-sdk'
import * as path from 'path'
import {delay} from '.'
import {Credentials} from './credentials'

export interface HostedZone {
  id: string
  name: string
}

/**
 * Get an existing HostedZone for a given domain
 *
 * @param domain Domain to lookup
 * @param credentials AWS credentials
 */
export async function getHostedZone(
  domain: string,
  credentials: Credentials,
  excludeNessCreated = true,
): Promise<HostedZone | undefined> {
  try {
    const route53 = new aws.Route53()
    route53.config.credentials = credentials
    const hostedZones = await route53.listHostedZonesByName({DNSName: domain}).promise()
    const [hostedZone] = hostedZones.HostedZones
    if (
      !hostedZone ||
      hostedZone.Name !== `${domain}.` ||
      // We don't want to return a hosted zone that we created. The CDK stack
      // will handle updating these.
      (excludeNessCreated && hostedZone.Config?.Comment === 'Created by Ness')
    )
      return undefined

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
    const acm = new aws.ACM()
    acm.config.credentials = credentials

    let nextToken = undefined
    do {
      const certificates: aws.ACM.ListCertificatesResponse = await acm
        .listCertificates({CertificateStatuses: ['ISSUED'], NextToken: nextToken})
        .promise()

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
  try {
    const route53 = new aws.Route53()
    route53.config.credentials = credentials

    const recordSets = await route53.listResourceRecordSets({HostedZoneId: hostedZoneId}).promise()
    if (!recordSets) return

    const targets = recordSets.ResourceRecordSets.filter(
      (record) =>
        record.Type === 'CNAME' &&
        record.ResourceRecords?.find((v) => v.Value.endsWith('acm-validations.aws.')),
    )
    if (!targets) return

    const changes: aws.Route53.Changes = targets.map((target) => ({
      Action: 'DELETE',
      ResourceRecordSet: target,
    }))

    await route53
      .changeResourceRecordSets({
        HostedZoneId: hostedZoneId,
        ChangeBatch: {Changes: changes},
      })
      .promise()
  } catch {
    return undefined
  }
}

export async function getHostedZoneNameservers(
  hostedZoneId: string,
  credentials: Credentials,
): Promise<string[] | undefined> {
  try {
    const route53 = new aws.Route53()
    route53.config.credentials = credentials
    const hostedZone = await route53.getHostedZone({Id: hostedZoneId}).promise()
    if (!hostedZone) return undefined

    return hostedZone.DelegationSet?.NameServers
  } catch {
    return undefined
  }
}

export async function deleteCloudFormationStack(
  stack: string,
  credentials: Credentials,
): Promise<void> {
  const cf = new aws.CloudFormation()
  cf.config.credentials = credentials

  await cf.deleteStack({StackName: stack}).promise()
  let status = 'UNKNOWN'
  while (status !== 'DELETE_COMPLETE') {
    const response = await cf.describeStacks({StackName: stack}).promise()
    const [firstStack] = response.Stacks || []
    status = firstStack?.StackStatus

    if (status === 'DELETE_FAILED') {
      throw new Error('Failed to delete your site. Please try again.')
    }

    await delay(1000)
  }
}
