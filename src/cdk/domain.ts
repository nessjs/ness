import * as cdk from '@aws-cdk/core'
import * as route53 from '@aws-cdk/aws-route53'
import {HttpsRedirect} from '@aws-cdk/aws-route53-patterns'

class NessDomainStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props)

    const domain = this.node.tryGetContext('domain')
    const hasCustomDomain = domain !== undefined

    const hostedZoneId = this.node.tryGetContext('hostedZoneId')
    const hostedZoneName = this.node.tryGetContext('hostedZoneName')
    const redirectWww = hasCustomDomain && this.node.tryGetContext('redirectWww') === 'true'

    const domainParts = domain?.split('.')
    const hasSubdomain = domainParts?.length > 2
    const domainName = hasSubdomain ? domainParts.slice(-2).join('.') : domain

    const zone =
      hostedZoneId && hostedZoneName
        ? route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
            hostedZoneId,
            zoneName: hostedZoneName,
          })
        : new route53.PublicHostedZone(this, 'HostedZone', {
            zoneName: domainName,
            comment: 'Created by Ness',
          })

    if (redirectWww) {
      new HttpsRedirect(this, 'WwwRedirect', {
        recordNames: [`www.${domainName}`],
        targetDomain: domainName,
        zone,
      })
    }

    // TODO: this will fail if they already have a txt record...
    new route53.TxtRecord(this, 'TxtRecord', {zone, values: ['Ness site inside']})

    new cdk.CfnOutput(this, 'websiteUrl', {value: `https://${domain}`})
    new cdk.CfnOutput(this, 'hostedZoneId', {value: zone.hostedZoneId})
    new cdk.CfnOutput(this, 'hostedZoneName', {value: zone.zoneName})
  }
}

const stackId = process.env.NESS_DOMAIN_STACK_ID || 'ness-domain-stack'

const app = new cdk.App()
new NessDomainStack(app, stackId, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
})

app.synth()
