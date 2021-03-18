import * as fs from 'fs-extra'
import * as path from 'path'

/**
 * Check whether .ness is already being gitignored.
 */
export async function isIgnoringNessDirectory(): Promise<boolean> {
  try {
    const gitIgnorePath = path.resolve('.gitignore')
    const gitIgnoreContents = await fs.readFile(gitIgnorePath, 'utf8')
    return gitIgnoreContents.includes('.ness')
  } catch {
    return false
  }
}

/**
 * Add .ness to .gitignore if it's not already there.
 */
export async function gitIgnoreNessDirectory() {
  return await gitIgnore('.ness', 'Local Ness directory')
}

/**
 * Add a pattern to .gitignore. If .gitignore does not exist, it will be created.
 *
 * @param pattern The pattern to be added to .gitignore.
 * @param comment An optional comment above the ignore statement.
 */
export async function gitIgnore(pattern: string, comment?: string): Promise<boolean> {
  const gitIgnorePath = path.resolve('.gitignore')
  const content = comment ? `\n# ${comment}\n${pattern}` : `\n${pattern}`

  const hasGitIgnore = await fs.pathExists(gitIgnorePath)
  if (!hasGitIgnore) {
    // No .gitignore file. Create one and add ignore statement.
    await fs.writeFile(gitIgnorePath, content, 'utf8')
    return true
  }

  let gitIgnoreContents
  let gitIgnoreLines
  try {
    gitIgnoreContents = await fs.readFile(gitIgnorePath, 'utf8')
    gitIgnoreLines = gitIgnoreContents.split(/[\r\n]+/)
  } catch {
    // ignore
  }

  // Not already ignoring pattern so add it to .gitignore.
  if (gitIgnoreLines && !gitIgnoreLines.includes(pattern)) {
    const updatedContents = `${gitIgnoreContents}\n${content}`
    await fs.writeFile(gitIgnorePath, updatedContents, 'utf8')
    return true
  }

  return false
}
