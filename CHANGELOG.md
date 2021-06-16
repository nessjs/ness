# [1.6.0](https://github.com/nessjs/ness/compare/v1.5.2...v1.6.0) (2021-06-16)


### Bug Fixes

* final url not displayed without custom domain ([da3450c](https://github.com/nessjs/ness/commit/da3450c5af71a616c22e92089b052600b66c3123))


### Features

* next.js ISR support ([2bda454](https://github.com/nessjs/ness/commit/2bda45472f53177b396f7b94adbdff1ca06f4e97))

## [1.5.2](https://github.com/nessjs/ness/compare/v1.5.1...v1.5.2) (2021-05-03)


### Bug Fixes

* release script not building first ([31aa1ad](https://github.com/nessjs/ness/commit/31aa1ad0787c3756866188ceeaa2196bb2eff192))

## [1.5.1](https://github.com/nessjs/ness/compare/v1.5.0...v1.5.1) (2021-05-03)


### Bug Fixes

* immutable cache-control for fonts ([fbc78f6](https://github.com/nessjs/ness/commit/fbc78f6b3e80edbe68e1a71fb1c41ed9f0efffbf))

# [1.5.0](https://github.com/nessjs/ness/compare/v1.4.3...v1.5.0) (2021-05-02)


### Features

* latest @sls-next/lambda-at-edge ([c2211ca](https://github.com/nessjs/ness/commit/c2211ca02c678c01374504fe9df125bfe162ad1f))

## [1.4.3](https://github.com/nessjs/ness/compare/v1.4.2...v1.4.3) (2021-04-05)


### Bug Fixes

* auto csp doesn't support wss ([fef737b](https://github.com/nessjs/ness/commit/fef737bec812281c985e8f4143b4064a7ae65336))

## [1.4.2](https://github.com/nessjs/ness/compare/v1.4.1...v1.4.2) (2021-03-18)


### Bug Fixes

* node v10 compatibility ([e38f361](https://github.com/nessjs/ness/commit/e38f36124ec0b3cd8ffaa86234e9b27447f659bd))

## [1.4.1](https://github.com/nessjs/ness/compare/v1.4.0...v1.4.1) (2021-03-18)


### Bug Fixes

* provide cost and infra info in the readme ([1f245dc](https://github.com/nessjs/ness/commit/1f245dc7eb79d3462a06347c73d273e0cd240d0f))

# [1.4.0](https://github.com/nessjs/ness/compare/v1.3.0...v1.4.0) (2021-03-18)


### Bug Fixes

* don't persist verbose flag ([498a186](https://github.com/nessjs/ness/commit/498a186e272a33127608621a229b2d84c0b069e1))
* framework detection not detecting next ([1902599](https://github.com/nessjs/ness/commit/1902599a7539297666d623d4440eb87e41fbeee3))


### Features

* next.js serverless support w/ lambda@edge ([5eeebbc](https://github.com/nessjs/ness/commit/5eeebbc7db13a960a93eac329886c324bbecfc61))

# [1.3.0](https://github.com/nessjs/ness/compare/v1.2.2...v1.3.0) (2021-03-02)


### Bug Fixes

* move txt record to ness.<domain> ([0b55979](https://github.com/nessjs/ness/commit/0b55979795799315df312676dc65f5225343739f)), closes [#79](https://github.com/nessjs/ness/issues/79)


### Features

* verbose option ([29cc4a7](https://github.com/nessjs/ness/commit/29cc4a76adfb49e3f54f070096bc55db63e7a518))

## [1.2.2](https://github.com/nessjs/ness/compare/v1.2.1...v1.2.2) (2021-03-01)


### Bug Fixes

* content-type header missing in uploads ([304e6d0](https://github.com/nessjs/ness/commit/304e6d07aee0d600aecc207c1122cc6050b20d06))

## [1.2.1](https://github.com/nessjs/ness/compare/v1.2.0...v1.2.1) (2020-12-30)


### Bug Fixes

* destroy could fail due to certificate dep ([885f6c9](https://github.com/nessjs/ness/commit/885f6c93afc4e1b8665384e702a41d18c3847f9a))

# [1.2.0](https://github.com/nessjs/ness/compare/v1.1.1...v1.2.0) (2020-12-29)


### Bug Fixes

* only generate SRI hash if not already present ([73057ef](https://github.com/nessjs/ness/commit/73057efa5a6d73a95f362631cb34fe48f40c5f12))


### Features

* add SRI hashes to external script tags ([f35d644](https://github.com/nessjs/ness/commit/f35d6449b5b4550aab62a10311995e5fcde2ee13))
* auto generated content-security-policy ([34f4f98](https://github.com/nessjs/ness/commit/34f4f981d37467fd53f8279ecff24a3ec9453583))

## [1.1.1](https://github.com/nessjs/ness/compare/v1.1.0...v1.1.1) (2020-12-23)


### Bug Fixes

* tracking api being down should be ignored ([a95a01c](https://github.com/nessjs/ness/commit/a95a01ca0b8f9d10be3445130038ed379036aabb))

# [1.1.0](https://github.com/nessjs/ness/compare/v1.0.1...v1.1.0) (2020-12-23)


### Features

* usage and error reporting ([1a834f4](https://github.com/nessjs/ness/commit/1a834f477dbfa60492d82c97a4f00eabb86b75b3))

## [1.0.1](https://github.com/nessjs/ness/compare/v1.0.0...v1.0.1) (2020-12-23)


### Bug Fixes

* certificate, A record removed in some cases ([0eabdfc](https://github.com/nessjs/ness/commit/0eabdfcb717cf726f125abec43385372d9d9837e))

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
