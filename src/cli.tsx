import {Command} from 'commander'
import React from 'react'
import {render} from 'ink'
import chalk from 'chalk'
import updates from 'update-notifier'
import {exit} from 'process'
import {App} from './components/App'
import deploy from './deploy'
import destroy from './destroy'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pkg = require('../package.json')
const oneWeek = 1000 * 60 * 60 * 24 * 7

const buildProgram = async () => {
  const program = new Command()
  program.version(pkg.version).description(pkg.description).addCommand(deploy).addCommand(destroy)

  return program
}

export const display = async (command: Command, Display: React.FunctionComponent) => {
  const instance = render(
    <App initial={{command}}>
      <Display />
    </App>,
  )
  await instance.waitUntilExit()
}

/**
 * Ness CLI
 */
export const main = async (): Promise<void> => {
  try {
    const program = await buildProgram()
    await program.parseAsync(process.argv)
    const notifier = updates({pkg, updateCheckInterval: oneWeek})
    if (notifier.update) notifier.notify()
  } catch (e) {
    console.error(`\n${chalk.redBright(e)}`)
    exit(1)
  }
}

main()
