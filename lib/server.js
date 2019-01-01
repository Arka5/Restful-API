/*
These are server-related tasks
*/

//Dependencies

const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
var config = require('./config');
var fs = require('fs');
var handlers = require('./handlers');
var helpers = require('./helpers');
var path = require('path');

//Instantiate the server module object
var server = {};

//Instantiate the HTTP server
server.httpServer = http.createServer(function (req, res) {
  server.unifiedServer(req, res);
});

//Instantiate the HTTPS Server
server.httpsServerOptions = {
  'key': fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
  'cert': fs.readFileSync(path.join(__dirname, '/../https/cert.pem'))
};
server.httpsServer = https.createServer(server.httpsServerOptions, function (req, res) {
  //DebugLine:console.log("https server created successfully");
  server.unifiedServer(req, res);
});


//All the server logic for both the http and https server
server.unifiedServer = function (req, res) {
  // get the url and parse
  var parsedUrl = url.parse(req.url, true);

  //get the path
  var path = parsedUrl.pathname;
  var trimmedPath = path.replace(/^\/+|\/+$/g, '');

  //get the query string as an object
  var queryStringObject = parsedUrl.query;

  //get the HTTP Method
  var method = req.method.toLowerCase();

  //get the headers as an object
  var headers = req.headers;

  //Get the payload, if any
  var decoder = new StringDecoder('utf-8');
  var buffer = '';
  req.on('data', function (data) {
    buffer += decoder.write(data);
  });
  req.on('end', function () {
    buffer += decoder.end();
    //debug-console.log("hello");
    //Choose the handler this should go to.
    var chosenHandler = typeof (server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

    //Construct the data object to be sent to handler
    var data = {
      'trimmedPath': trimmedPath,
      'queryStringObject': queryStringObject,
      'method': method,
      'headers': headers,
      'payload': helpers.parseJsonToObject(buffer)
    };
    //console.log("hello");
    //Route the request to the handler specified in the router
    chosenHandler(data, function (statusCode, payload) {
      //debug-console.log("hello");
      //Use the status code called by the handler or any default code:200 in this case
      statusCode = typeof (statusCode) == 'number' ? statusCode : 200;

      //Use the payload called by the handler or any default payload(an empty object,maybe)
      payload = typeof (payload) == 'object' ? payload : {};

      //Convert the payload to a payload string
      var payloadString = JSON.stringify(payload);

      //Return the response
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(statusCode);
      res.end(payloadString);

      //Log the request path
      console.log("Returning this response: ", statusCode, payloadString);

    });
  });
};


//Define a request router
server.router = {
  'ping': handlers.ping,
  'users': handlers.users,
  'tokens': handlers.tokens,
  'checks': handlers.checks
};
//Init server
server.init = function () {
  //Start the HTTP server
  server.httpServer.listen(config.httpPort, function () {
    console.log("The server is listening on Port ", config.httpPort, " in ", config.envName, " mode now!");
  });
  //Start the HTTPS server
  server.httpsServer.listen(config.httpsPort, function () {
    console.log("The server is listening on Port ", config.httpsPort, " in ", config.envName, " mode now!");
  });
}
//Export the server
module.exports = server;