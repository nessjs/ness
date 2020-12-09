import {Command} from 'commander'
import {Destroy} from './components/Destroy'
import {display} from './cli'

export default new Command()
  .command('destroy')
  .storeOptionsAsProperties(false)
  .description('Destroy a deployed site in your AWS account.')
  .option('--dir <dir>', 'The directory that was published')
  .option('--prod <prod>', 'This is a production environemnt')
  .option('--domain <domain>', 'Custom domain')
  .option('--profile <profile>', 'AWS profile')
  .action((c: Command) => display(c, Destroy))
