import * as file from './file'

describe('getPackageJson', () => {
  test('returns expected package.json object', async () => {
    expect(await file.getPackageJson('./test/test-project').name).toBe('test-project-name')
    expect(await file.getPackageJson('./test/test-gatsby-project').name).toBe(
      'test-gatsby-project-name',
    )
    expect(await file.getPackageJson('./test/test-next-project').name).toBe(
      'test-next-project-name',
    )
  })

  test('returns undefined when no package.json exists', async () => {
    expect(await file.getPackageJson('./test')).toBe(undefined)
  })
})

describe('walk', () => {
  test('returns all files (no directories)', async () => {
    const files = await file.walk('./test/test-walk')
    expect(files).toStrictEqual([
      'test/test-walk/1/foo',
      'test/test-walk/1/test.txt',
      'test/test-walk/2/3/bar',
      'test/test-walk/2/test.txt',
    ])
  })
  test('returns all files (no directories) that pass the filter', async () => {
    const files = await file.walk('./test/test-walk', /\/test\.txt$/)
    expect(files).toStrictEqual(['test/test-walk/1/test.txt', 'test/test-walk/2/test.txt'])
  })
})
