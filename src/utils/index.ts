export * from './aws/credentials'
export * from './frameworks'
export * from './gitignore'
export * from './settings'

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
