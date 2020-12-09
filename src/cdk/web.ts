import * as cdk from '@aws-cdk/core'
import * as s3deploy from '@aws-cdk/aws-s3-deployment'
import * as cloudfront from '@aws-cdk/aws-cloudfront'
import {DeletableBucket} from '@cloudcomponents/cdk-deletable-bucket'
import path from 'path'

class NessWebStack extends cdk.Stack {
  readonly distribution?: cloudfront.IDistribution

  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props)

    const publishDirectory = this.node.tryGetContext('publishDirectory')
    if (!publishDirectory) throw new Error('Must specify a publishDirectory')

    const publishPath = path.resolve(process.cwd(), publishDirectory)

    const prod = this.node.tryGetContext('prod') === 'true'
    const domain = this.node.tryGetContext('domain')
    const certificateArn = this.node.tryGetContext('certificateArn')

    const websiteIndexDocument = this.node.tryGetContext('indexDocument') || 'index.html'
    const websiteErrorDocument = this.node.tryGetContext('errorDocument') || 'error.html'
    const removalPolicy = this.node.tryGetContext('removalPolicy') || cdk.RemovalPolicy.DESTROY

    const bucketProperties = {
      bucketName: domain,
      publicReadAccess: true,
      websiteIndexDocument,
      websiteErrorDocument,
      removalPolicy,
    }

    const bucket = new DeletableBucket(this, 'Bucket', {...bucketProperties, forceDelete: true})

    if (domain) {
      this.distribution = new cloudfront.CloudFrontWebDistribution(this, 'Distribution', {
        priceClass: prod
          ? cloudfront.PriceClass.PRICE_CLASS_ALL
          : cloudfront.PriceClass.PRICE_CLASS_100,
        aliasConfiguration: certificateArn
          ? {
              acmCertRef: certificateArn,
              names: [domain],
              sslMethod: cloudfront.SSLMethod.SNI,
              securityPolicy: cloudfront.SecurityPolicyProtocol.TLS_V1_1_2016,
            }
          : undefined,
        originConfigs: [
          {
            customOriginSource: {
              domainName: bucket.bucketWebsiteDomainName,
              originProtocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
            },
            behaviors: [{isDefaultBehavior: true}],
          },
        ],
      })

      new cdk.CfnOutput(this, 'distributionId', {value: this.distribution.distributionId})
      new cdk.CfnOutput(this, 'distributionDomainName', {
        value: this.distribution.distributionDomainName,
      })
    }

    new s3deploy.BucketDeployment(this, 'BucketDeployment', {
      sources: [s3deploy.Source.asset(publishPath)],
      destinationBucket: bucket,
      distribution: this.distribution,
      distributionPaths: this.distribution ? ['/*'] : undefined,
    })

    new cdk.CfnOutput(this, 'bucketName', {value: bucket.bucketName})
    new cdk.CfnOutput(this, 'bucketWebsiteUrl', {value: bucket.bucketWebsiteUrl})
  }
}

const stackId = process.env.NESS_WEB_STACK_ID || 'ness-web-stack'

const app = new cdk.App()
new NessWebStack(app, stackId, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
})

app.synth()