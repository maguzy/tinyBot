const Bot = require("./bot")
const inquirer = require("inquirer");
const chalk = require("chalk");
const figlet = require("figlet");

const init = () => {
  console.log(
    chalk.green(
      figlet.textSync("Tiny RPG BOT")
    )
  );
}

const askQuestions = () => {
  const questions = [
    {
      name: "username",
      type: "input",
      message: "Login",
      validate: function (input) {
        var done = this.async();
        if (input.trim() == "") {
          done('Obrigatorio');
          return;
        }
        done(null, true);
      }
    },
    {
      name: "password",
      type: "password",
      message: "Senha",
      validate: function (input) {
        var done = this.async();
        if (input.trim() == "") {
          done('Obrigatorio');
          return;
        }
        done(null, true);
      }
    },
    {
      type: "list",
      name: "attribute",
      message: "Gostaria de qual atributo ao passar de level?",
      choices: ["Nenhum", "ATK", "AGI", "DEF"]
    },
    {
      type: "list",
      name: "isUsePot",
      message: "Gostaria de usar pot ?",
      choices: ["SIM", "NAO"],
      filter: function(val) {
        return val == "SIM" ? true : false
      }
    },
    {
      type: "list",
      name: "isSkipBoss",
      message: "Gostaria de skipar quando encontrar um boss ?",
      choices: ["SIM", "NAO"],
      filter: function(val) {
        return val == "SIM" ? true : false
      }
    }
  ];
  return inquirer.prompt(questions);
};

const run = async () => {
  init();
  const answers = await askQuestions();
  Bot.init(answers)
};

run();

// Bot.init(username, password, attr);



// console.log({login, senha, attr})
