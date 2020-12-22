import {Stack} from '@aws-sdk/client-cloudformation'

/**
 * A utility class to inspect CloudFormation stack statuses.
 *
 * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-describing-stacks.html
 */
export class StackStatus {
  public static fromStackDescription(description: Stack) {
    const {StackStatus: name, StackStatusReason: reason} = description
    if (!name) throw new Error('StackStatus must be provided')

    return new StackStatus(name, reason)
  }

  constructor(public readonly name: string, public readonly reason?: string) {}

  get isCreationFailure(): boolean {
    return this.name === 'ROLLBACK_COMPLETE' || this.name === 'ROLLBACK_FAILED'
  }

  get isDeleted(): boolean {
    return this.name.startsWith('DELETE_')
  }

  get isFailure(): boolean {
    return this.name.endsWith('FAILED')
  }

  get isInProgress(): boolean {
    return this.name.endsWith('_IN_PROGRESS')
  }

  get isNotFound(): boolean {
    return this.name === 'NOT_FOUND'
  }

  get isDeploySuccess(): boolean {
    return !this.isNotFound && (this.name === 'CREATE_COMPLETE' || this.name === 'UPDATE_COMPLETE')
  }

  public toString(): string {
    return this.name + (this.reason ? ` (${this.reason})` : '')
  }
}