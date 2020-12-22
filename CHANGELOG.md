# [1.0.0](https://github.com/nessjs/ness/compare/v0.7.3...v1.0.0) (2020-12-22)


### Bug Fixes

* reuse certificate in redirect ([c3874e0](https://github.com/nessjs/ness/commit/c3874e081f6803a3bc46c4ec1cc3c1a34c2467be))


### Features

* lighter and faster ness ([#37](https://github.com/nessjs/ness/issues/37)) ([7847e32](https://github.com/nessjs/ness/commit/7847e326030078cead5ba25196334d3dc89bd79e))


### BREAKING CHANGES

* All of the AWS resources will be recreated as a result of moving from the AWS CDK to hand-rolled CloudFormation templates. This means the first time you run `npx ness deploy` with the latest version your site will experience a brief downtime while the resources are recreated.

## [0.7.3](https://github.com/nessjs/ness/compare/v0.7.2...v0.7.3) (2020-12-17)


### Bug Fixes

* default csp is too strict ([49cb5ea](https://github.com/nessjs/ness/commit/49cb5eab186a34b8290df420971b72d7bf4a9f49))

## [0.7.2](https://github.com/nessjs/ness/compare/v0.7.1...v0.7.2) (2020-12-12)


### Bug Fixes

* cleanup and bump for publish to npm ([72e00ba](https://github.com/nessjs/ness/commit/72e00ba235ec9ab2d9ee9cdceee5c965722b0bf9))

## [0.7.1](https://github.com/nessjs/ness/compare/v0.7.0...v0.7.1) (2020-12-12)


### Bug Fixes

* release workflow broken ([d9e002b](https://github.com/nessjs/ness/commit/d9e002bc7bc66a35e4301bb0969cb0c473d5275b))

# [0.7.0](https://github.com/nessjs/ness/compare/v0.6.0...v0.7.0) (2020-12-12)


### Features

* show errors that come out of cloudformation ([eefa0df](https://github.com/nessjs/ness/commit/eefa0df366a8507577a8e9f68dcdf976dc35d130))
