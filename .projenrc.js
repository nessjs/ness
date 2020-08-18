const { TypeScriptProject, Semver } = require('projen')

const project = new TypeScriptProject({
  name: 'ness',
  authorName: 'Adam Elmore',
  authorEmail: 'elmore.adam@gmail.com',
  authorOrganization: true,
  repository: 'https://github.com/nessjs/ness.git',
  license: 'MIT',
  devDependencies: {
    prettier: Semver.pinned('2.0.5'),
  },
  scripts: {
    format: "prettier --write '**/*.*' && eslint . --ext .ts --fix",
  },
  projenUpgradeSecret: 'PROJEN_UPGRADE_TOKEN',
})

project.synth()
