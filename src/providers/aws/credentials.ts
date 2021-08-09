import * as fs from 'fs-extra'
import * as os from 'os'
import * as path from 'path'

import {STS} from '@aws-sdk/client-sts'
import {defaultProvider} from '@aws-sdk/credential-provider-node'

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
    const sts = new STS({credentials})
    const response = await sts.getCallerIdentity({})
    return response.Account
  } catch {
    return undefined
  }
}

/**
 * Get AWS credentials from environment variables or INI files.
 *
 * @param profile AWS profile to use
 */
export async function getCredentials(profile?: string): Promise<Credentials | undefined> {
  try {
    const provider = defaultProvider({profile})
    const credentials = await provider()
    return credentials
  } catch {
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
    const credentialsExist = await fs.pathExists(credentialsPath)
    if (credentialsExist) return false

    const {accessKeyId, secretAccessKey} = credentials

    const contents = `
[default]
aws_access_key_id=${accessKeyId}
aws_secret_access_key=${secretAccessKey}`
    await fs.writeFile(credentialsPath, contents, {encoding: 'utf-8'})

    return true
  } catch {
    return false
  }
}
