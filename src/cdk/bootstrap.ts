import AWS, {CloudFormation} from 'aws-sdk'
import {delay} from '../utils'

AWS.config.update({region: 'us-east-1'})

async function getStackStatus(): Promise<string> {
  const cf = new CloudFormation()
  try {
    const stacks = await cf.describeStacks({StackName: 'CDKToolkit'}).promise()

    if (!stacks?.Stacks || !stacks?.Stacks[0]) {
      throw new Error('Stack does not exist')
    }

    const [stack] = stacks.Stacks
    let {StackStatus: status} = stack
    return status
  } catch {
    return 'FAILED'
  }
}

export async function isBootstrapped(profile?: string): Promise<boolean> {
  if (profile) {
    var credentials = new AWS.SharedIniFileCredentials({profile})
    AWS.config.credentials = credentials
  }

  try {
    let status = await getStackStatus()
    while (status === 'IN_PROGRESS') {
      await delay(1000)
      status = await getStackStatus()
    }

    return status === 'UPDATE_COMPLETE' || status === 'CREATE_COMPLETE'
  } catch {
    return false
  }
}
