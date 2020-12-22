# [![Ness logo][]][ness home]

[![release badge][]][release]
[![npm badge][]][npm]
[![GitHub license badge][]][github license]
[![Mentioned in Awesome CDK](https://awesome.re/mentioned-badge.svg)](https://github.com/kolomied/awesome-cdk)

## No-Effort Static Sites.

Ness is the easiest way to stand up a production-ready web site on your own cloud infrastructure.

```sh
# Setup your site using React, Vue, Gatsby, Next.js, Docusaurus, etc.
$ npm init gatsby
$ cd gatsby-site
$ npx gatsby build

# Ness deploys your site to your AWS account.
$ npx ness deploy
```

## Features

- 🤩 Deployed to your AWS account—no third-party accounts necessary
- 💨 Global CDN (CloudFront) for speedy delivery of your site's assets
- ✨ Custom domains with HTTPS (SSL)
- 🔒 Security headers that follow best practices
- 🤖 Automatically detects static site frameworks (Gatsby, Next.js, etc.)
- ⚛️ Works with single page applications (include the `--spa` flag to redirect 404s)
- 👀 (Coming soon) Pull request previews (powered by GitHub Actions)

## Getting Started

Ness ships with two commands: `deploy` and `destroy`. By default, the `deploy` command will stand up a simple S3 website and output the site URL. Running `destroy` will tear it down and put your AWS account back in the state that it was prior to `deploy`.

On deploy, Ness will attempt to detect any static site frameworks and publish the appropriate build output directory. If Ness is unable to detect which framework you're using, or you haven't built your site, `deploy` will fail with an error that should point you in the right direction.

### AWS Credentials

Ness leans heavily on the [AWS SDK](https://aws.amazon.com/sdk-for-node-js/). Your AWS credentials will be picked up automatically, and Ness will guide you through the process of adding them if you haven't already. Pass the `--profile` flag to leverage a specific AWS profile configured on your machine.

```sh
$ npx ness deploy --profile example
```

### Custom Domains

Ness supports custom domains with the `--domain` flag:

```sh
$ npx ness deploy --domain example.com
```

When a custom domain is specified, Ness stands up a CloudFront distribution along with an SSL certificate (through [ACM](https://aws.amazon.com/certificate-manager/)) for HTTPS support.

Ness will validate that DNS is configured properly during deploy. If your domain was registered in Route53 and you already have a HostedZone configured, no additional setup will be necessary. If your domain was registered outside of AWS, Ness will guide you through the process of updating your registrar with the appropriate name server configuration.

Once you've deployed a given site with a custom domain, you can leave the `--domain` flag out of subsequent deploys. Ness stores project settings in `./ness.json`, where you'll find the configured domain among other settings.

### Single Page Applications (SPAs)

Ness can deploy your single page applications as well. Pass the `--spa` flag to have ness configure 404 routing to your index document (configured with `--index-doc`, and defaulted to `index.html`).

### Options

Run `npx ness deploy --help` to see all of the available options:

```
Usage: ness deploy [options]

Deploy a web site to your AWS account.

Options:
  --dir <dir>              the directory to publish
  --domain <domain>        custom domain
  --profile <profile>      AWS profile
  --csp <csp>              content-security-policy header value
  --index-doc <index-doc>  index document for your site
  --error-doc <error-doc>  error document for your site
  --prod                   this is a production environment
  --redirect-www           create a redirect from www.<domain> to <domain>
  --spa                    single page application handling (redirect 404s)
  -h, --help               display help for command
```

[ness logo]: https://raw.githubusercontent.com/nessjs/ness/main/assets/ness.png
[github license badge]: https://img.shields.io/github/license/nessjs/ness?style=flat
[github license]: https://github.com/nessjs/ness/blob/main/LICENSE
[ness home]: https://github.com/nessjs/ness
[npm badge]: https://img.shields.io/npm/v/ness
[npm]: https://www.npmjs.com/package/ness
[release badge]: https://img.shields.io/github/workflow/status/nessjs/ness/Release
[release]: https://github.com/nessjs/ness/actions?query=workflow%3ARelease
