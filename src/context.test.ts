import * as config from './context'
// eslint-disable-next-line import/no-extraneous-dependencies
import {mocked} from 'ts-jest/utils'
import {sync} from 'git-branch'
jest.mock('git-branch')

const mockedSync = mocked(sync, true)

afterEach(() => {
  jest.clearAllMocks()
})

const mockBranch = (value: string) => {
  mockedSync.mockReturnValue(value)
}

describe('getBranch should return the current branch, sanitized', () => {
  test('simple branch name returns', () => {
    mockBranch('test')
    expect(config.getBranch()).toBe('test')
  })

  test('branch with special characters', () => {
    mockBranch('user/branch_name')
    expect(config.getBranch()).toBe('user-branch-name')
  })

  test('no git repository defaults to main', () => {
    mockBranch('')
    expect(config.getBranch()).toBe('main')
  })
})

test('getProjectName', () => {
  expect(config.getProjectName('./test/test-project')).toBe('test-project-name')
})

test('getStackId', () => {
  mockBranch('test-branch')
  expect(config.getStackId('web', './test/test-project')).toBe(
    'ness-web-test-project-name-test-branch',
  )
})
