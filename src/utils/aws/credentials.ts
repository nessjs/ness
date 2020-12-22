import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

import {STS, STSClient, AssumeRoleCommand} from '@aws-sdk/client-sts'
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
    const provider = defaultProvider({
      profile,
      roleAssumer: async (credentials, params) => {
        // no idea why we have to implement this ourselves.
        const sts = new STSClient({credentials})
        const response = await sts.send(new AssumeRoleCommand(params))
        return {
          accessKeyId: response.Credentials?.AccessKeyId!,
          secretAccessKey: response.Credentials?.SecretAccessKey!,
          sessionToken: response.Credentials?.SessionToken,
          expiration: response.Credentials?.Expiration,
        }
      },
    })
    const credentials = await provider()
    return credentials
  } catch (e) {
    console.log(e)
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
