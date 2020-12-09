import {AwsCliCompatible} from 'aws-cdk/lib/api/aws-auth/awscli-compatible'
import * as aws from 'aws-sdk'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

/**
 * AWS Credentials
 */
export interface Credentials {
  /**
   * AWS access key ID
   */
  accessKeyId: string

  /**
   * AWS secret access key
   */
  secretAccessKey: string

  /**
   * AWS profile
   */
  profile?: string
}

/**
 * Returns true if the provided AWS credentials are valid.
 *
 * @param credentials AWS credentials to validate
 */
export async function getAccount(credentials: Credentials): Promise<string | undefined> {
  try {
    const sts = new aws.STS()
    sts.config.credentials = credentials
    const response = await sts.getCallerIdentity().promise()
    return response.Account
  } catch {
    return undefined
  }
}

/**
 * Get AWS credentials from environment variables or .aws/credentials INI file.
 *
 * @param profile AWS profile to use
 */
export async function getCredentials(profile?: string): Promise<Credentials | undefined> {
  try {
    const credentialChain = await AwsCliCompatible.credentialChain({profile})
    const credentials = await credentialChain.resolvePromise()
    return credentials
  } catch (e) {
    // If the user specified an invalid profile, we should let them know...
    if (e.message === `Profile ${profile} not found`)
      throw Error(`No AWS profile named '${profile}' found`)

    return undefined
  }
}

/**
 * Persist AWS credentials to .aws/credentials if they aren't already present
 *
 * @param credentials AWS credentials to persist
 */
export async function saveLocalCredentials(credentials: any): Promise<boolean> {
  try {
    const homedir = os.homedir()
    const credentialsPath = path.resolve(homedir, '.aws/credentials')
    if (fs.existsSync(credentialsPath)) return false

    const {accessKeyId, secretAccessKey} = credentials

    const contents = `
[default]
aws_access_key_id=${accessKeyId}
aws_secret_access_key=${secretAccessKey}`
    await fs.promises.writeFile(credentialsPath, contents, {encoding: 'utf-8'})

    return true
  } catch {
    return false
  }
}

/**
 * Get AWS region from environment variables or .aws/config INI file.
 *
 * @param profile AWS profile to use
 */
export async function getRegion(profile?: string): Promise<string | undefined> {
  try {
    const region = await AwsCliCompatible.region({profile})
    return region
  } catch {
    return undefined
  }
}
