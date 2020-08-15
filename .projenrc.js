const { TypeScriptProject } = require('projen');

const project = new TypeScriptProject({
  "name": "ness",
  "authorName": "Adam Elmore",
  "authorEmail": "elmore.adam@gmail.com",
  "repository": "https://github.com/adamelmore/ness.git",
  "license": "MIT",
});

project.synth();
