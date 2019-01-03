/*
Primary file for API
*/

//Dependencies
var server = require('./lib/server');
var workers = require('./lib/workers');
var cli = require('./lib/cli');
//Declare the app
var app = {}

//Init function
app.init = function () {
  console.clear();
  cli.verticalSpace(2);
  cli.horizontalLine();
  cli.centred("Admin Console");
  cli.horizontalLine();
  //Start the server
  server.init();

  //Start the worker
  workers.init();

  //Start the CLI, but make sure it starts last
  setTimeout(function () {
    cli.init();
  }, 50);
};

//Execute
app.init();

//Export the module
module.exports = app;