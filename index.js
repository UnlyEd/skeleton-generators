#!/usr/bin/env node
const CURR_DIR = process.cwd();
const inquirer = require('inquirer');
const fs = require('fs');
const fse = require('fs-extra');
const klawSync = require('klaw-sync');

const CHOICES = fs.readdirSync(`${__dirname}/templates`)
  .filter((fileName) => /^\w.*/.test(fileName));

const libFilesToDeploy = [
  '/lib',
  '/API.md',
];

let projectName;
let projectChoice;
let templatePath;

const QUESTIONS = [
  {
    name: 'project-choice',
    type: 'list',
    message: 'What project template would you like to generate?',
    choices: CHOICES,
  },
  {
    name: 'project-name',
    type: 'input',
    message: 'Project name:',
    validate(input) {
      if (/^([A-Za-z\-_\d])+$/.test(input)) return true;
      return 'Project name may only include letters, numbers, underscores and hashes.';
    },
  },
];

const QUESTIONS_NEXT = [
  {
    name: 'project-name',
    type: 'input',
    message: 'Please choose another project name (already exists):',
    validate(input) {
      if (/^([A-Za-z\-_\d])+$/.test(input)) return true;
      return 'Project name may only include letters, numbers, underscores and hashes.';
    },
  },
];

const addFilesKeyInLibrary = (path) => {
  const content = fs.readFileSync(path, 'utf8');

  try {
    const dataToJson = JSON.parse(content);
    dataToJson.files = libFilesToDeploy;
    fs.writeFileSync(path, JSON.stringify(dataToJson, null, 2));
  } catch (err) {
    console.log(err);
  }
};

const filterModules = (item) => !item.path.includes(`${templatePath}/node_modules`);

const readFilesAndWrite = () => {
  try {
    // return all files root path except directories
    const files = klawSync(templatePath, {
      traverseAll: true,
      filter: filterModules,
      nodir: true,
    });

    // change basePath to current directory
    const newfilesPath = files.map((file) => file.path.replace(templatePath, `${CURR_DIR}/${projectName}`));

    newfilesPath.forEach((filePath, index) => {
      const content = fs.readFileSync(files[index].path, 'utf8');

      // Almost the same as writeFileSync (i.e. it overwrites),
      // except that if the parent directory does not exist, it's created.
      // file must be a file path (a buffer or a file descriptor is not allowed).
      // options are what you'd pass to fs.writeFileSync().
      fse.outputFile(filePath, content, (err) => {
        const regexlibPath = new RegExp(`${CURR_DIR}/${projectName}/package.json$`);

        if (regexlibPath.test(filePath) && (/^library-/).test(projectChoice)) {
          addFilesKeyInLibrary(filePath);
        }
      });
    });

    console.log(`Done: ${newfilesPath.length} has been created in ${CURR_DIR}/${projectName}`);
  } catch (er) {
    console.error(er);
  }
};

const isDirAlreadyExist = (name) => {
  const askQuestions = (questions) => {
    inquirer.prompt(questions)
      .then((answers) => {
        projectName = answers['project-name'];
        isDirAlreadyExist(projectName);
      });
  };

  if (fs.existsSync(`${CURR_DIR}/${name}`)) {
    askQuestions(QUESTIONS_NEXT);
  } else {
    readFilesAndWrite();
  }
};


inquirer.prompt(QUESTIONS)
  .then((answers) => {
    projectName = answers['project-name'];
    projectChoice = answers['project-choice'];
    templatePath = `${__dirname}/templates/${projectChoice}`;

    isDirAlreadyExist(projectName);
  });
