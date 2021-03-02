import * as frameworks from './frameworks'

describe('match', () => {
  const gatsbyDetector = {
    framework: {name: 'gatsby', dist: 'public', build: 'gatsby build'},
    requiredFiles: ['package.json', 'gatsby-config.js'],
    requiredDependencies: ['gatsby'],
  }

  const nextDetector = {
    framework: {name: 'next', dist: '.next', build: 'next'},
    requiredFiles: ['package.json'],
    requiredDependencies: ['next'],
  }

  test('gatsby detector matches gatsby projects only', async () => {
    expect(await frameworks.match(gatsbyDetector, './test/test-gatsby-project')).toBe(true)
    expect(await frameworks.match(gatsbyDetector, './test/test-next-project')).toBe(false)
    expect(await frameworks.match(gatsbyDetector, './test/test-project')).toBe(false)
  })

  test('next detector matches next projects only', async () => {
    expect(await frameworks.match(nextDetector, './test/test-next-project')).toBe(true)
    expect(await frameworks.match(nextDetector, './test/test-gatsby-project')).toBe(false)
    expect(await frameworks.match(nextDetector, './test/test-project')).toBe(false)
  })
})

describe('detectFramework', () => {
  test('gatsby project detected', async () => {
    const framework = await frameworks.detectFramework('./test/test-gatsby-project')
    expect(framework).toMatchObject({name: 'gatsby', dist: 'public', build: 'npm run build'})
  })
  test('next project detected', async () => {
    const framework = await frameworks.detectFramework('./test/test-next-project')
    expect(framework).toMatchObject({name: 'next', dist: '.next', build: 'yarn build'})
  })
  test('no framework detected', async () => {
    const framework = await frameworks.detectFramework('./test/test-project')
    expect(framework).toBe(undefined)
  })
})
