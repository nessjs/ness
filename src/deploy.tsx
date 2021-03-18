import {Command} from 'commander'
import {Deploy} from './components/Deploy'
import {display} from './cli'

export default new Command()
  .command('deploy')
  .storeOptionsAsProperties(false)
  .description('Deploy a web site to your AWS account.')
  .option('--dir <dir>', 'the directory to publish')
  .option('--domain <domain>', 'custom domain')
  .option('--profile <profile>', 'AWS profile')
  .option('--csp <csp>', 'content-security-policy header value')
  .option('--index-doc <index-doc>', 'index document for your site')
  .option('--error-doc <error-doc>', 'error document for your site')
  .option('--prod', 'this is a production environment')
  .option('--redirect-www', 'create a redirect from www.<domain> to <domain>')
  .option('--spa', 'single page application handling (redirect 404s)')
  .option('--verbose', 'verbose log output')
  .action((_options: unknown, c: Command) => display(c, Deploy))
