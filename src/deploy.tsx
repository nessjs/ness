import {Command} from 'commander'
import {Deploy} from './components/Deploy'
import {display} from './cli'

export default new Command()
  .command('deploy')
  .storeOptionsAsProperties(false)
  .description('Deploy a static site to your AWS account.')
  .option('--dir <dir>', 'The directory to publish')
  .option('--prod <prod>', 'This is a production environemnt')
  .option('--domain <domain>', 'Custom domain')
  .option('--profile <profile>', 'AWS profile')
  .option('--redirect-www <redirectWww>', 'Create a redirect from www.<domain> to <domain>')
  .option('--csp <csp>', 'Content-Security-Policy header value')
  .action((c: Command) => display(c, Deploy))
