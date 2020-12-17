import * as cdk from '@aws-cdk/core'
import * as acm from '@aws-cdk/aws-certificatemanager'
import * as route53 from '@aws-cdk/aws-route53'
import * as cloudfront from '@aws-cdk/aws-cloudfront'
import * as targets from '@aws-cdk/aws-route53-targets'
import {HttpsRedirect} from '@aws-cdk/aws-route53-patterns'

class NessAliasStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props)

    const domain = this.node.tryGetContext('domain')
    const hasCustomDomain = domain !== undefined

    const hostedZoneId = this.node.tryGetContext('hostedZoneId')
    const zoneName = this.node.tryGetContext('hostedZoneName')
    const distributionId = this.node.tryGetContext('distributionId')
    const distributionDomainName = this.node.tryGetContext('distributionDomainName')
    const redirectWww = hasCustomDomain && this.node.tryGetContext('redirectWww') === 'true'

    const zone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      hostedZoneId,
      zoneName,
    })

    // Creating the certificate here since it depends on DNS being setup in the
    // domain step. We create the domain and app stacks in parallel, so this is
    // the first time we can be certain that DNS can be resolved.
    const certificate = new acm.DnsValidatedCertificate(this, 'Certificate', {
      domainName: domain,
      subjectAlternativeNames: [`*.${domain}`],
      hostedZone: zone,
      region: 'us-east-1', // Cloudfront only checks this region for certificates.
    })

    const distribution = cloudfront.CloudFrontWebDistribution.fromDistributionAttributes(
      this,
      'Distribution',
      {
        distributionId,
        domainName: distributionDomainName,
      },
    )

    new route53.ARecord(this, 'AliasRecord', {
      recordName: domain,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
      zone,
    })

    if (redirectWww) {
      new HttpsRedirect(this, 'WwwRedirect', {
        recordNames: [`www.${domain}`],
        targetDomain: domain,
        zone,
        certificate,
      })
    }

    new cdk.CfnOutput(this, 'certificateArn', {value: certificate.certificateArn})
  }
}

const stackId = process.env.NESS_ALIAS_STACK_ID || 'ness-alias-stack'

const app = new cdk.App()
new NessAliasStack(app, stackId, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
})

app.synth()
