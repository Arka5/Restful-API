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
var util = require('util');
var debug = util.debuglog('server');

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
  //DebugLine:debug("https server created successfully");
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
    //debug-debug("hello");
    //Choose the handler this should go to.
    var chosenHandler = typeof (server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

    //If the request is within the public directory
    chosenHandler = trimmedPath.indexOf('public/') > -1 ? handlers.public : chosenHandler;

    //Construct the data object to be sent to handler
    var data = {
      'trimmedPath': trimmedPath,
      'queryStringObject': queryStringObject,
      'method': method,
      'headers': headers,
      'payload': helpers.parseJsonToObject(buffer)
    };

    //console.log("\n\n\ndata from main server: ",data);
    //debug("hello");
    //Route the request to the handler specified in the router
    try {
      chosenHandler(data, function (statusCode, payload, contentType) {
        server.processHandlerResponse(res, method, trimmedPath, statusCode, payload, contentType);
      });
    } catch (e) {
      debug(e);
      server.processHandlerResponse(res, method, trimmedPath, 500, { 'Error': 'An unexpected error occured!' });
    }
  });
};

server.processHandlerResponse = function (res, method, trimmedPath, statusCode, payload, contentType) {
  //debug-debug("hello");
  //Determine the type of response (fallback to JSON)
  contentType = typeof (contentType) == 'string' ? contentType : 'json';

  //Use the status code called by the handler or any default code:200 in this case
  statusCode = typeof (statusCode) == 'number' ? statusCode : 200;

  //Return the response parts,that are content-specific
  var payloadString = '';

  //If content-type is JSON
  if (contentType == 'json') {
    res.setHeader('Content-Type', 'application/json');
    //Use the payload called by the handler or any default payload(an empty object,maybe)
    payload = typeof (payload) == 'object' ? payload : {};
    //Convert the payload to a payload string
    payloadString = JSON.stringify(payload);
  }

  //If content-type is html
  if (contentType == 'html') {
    res.setHeader('Content-Type', 'text/html');
    payloadString = typeof (payload) == 'string' ? payload : '';
  }

  //If content-type is favicon
  if (contentType == 'favicon') {
    res.setHeader('Content-Type', 'image/x-icon');
    payloadString = typeof (payload) != 'undefined' ? payload : '';
  }

  //If content-type is css
  if (contentType == 'css') {
    res.setHeader('Content-Type', 'text/css');
    payloadString = typeof (payload) != 'undefined' ? payload : '';
  }

  //If content-type is png
  if (contentType == 'png') {
    res.setHeader('Content-Type', 'image/png');
    payloadString = typeof (payload) != 'undefined' ? payload : '';
  }

  //If content-type is jpeg
  if (contentType == 'jpeg' || contentType == 'jpg') {
    res.setHeader('Content-Type', 'image/jpeg');
    payloadString = typeof (payload) != 'undefined' ? payload : '';
  }

  //If content-type is plain
  if (contentType == 'plain') {
    res.setHeader('Content-Type', 'text/plain');
    payloadString = typeof (payload) != 'undefined' ? payload : '';
  }


  //Return the response-parts that are common to all content-types
  res.writeHead(statusCode);
  res.end(payloadString);

  //If the response is 200 or 201, print it in green font, otherwise print it in red font
  if (statusCode == 200 || statusCode == 201) {
    debug('\x1b[32m%s\x1b[0m', method.toUpperCase() + ' /' + trimmedPath + ' ' + statusCode);
  } else {
    debug('\x1b[31m%s\x1b[0m', method.toUpperCase() + ' /' + trimmedPath + ' ' + statusCode);
  }
}
//Define a request router
server.router = {
  '': handlers.index,
  'account/create': handlers.accountCreate,
  'account/edit': handlers.accountEdit,
  'account/deleted': handlers.accountDeleted,
  'session/create': handlers.sessionCreate,
  'session/deleted': handlers.sessionDeleted,
  'checks/all': handlers.checksList,
  'checks/create': handlers.checksCreate,
  'checks/edit': handlers.checksEdit,
  'ping': handlers.ping,
  'api/users': handlers.users,
  'api/tokens': handlers.tokens,
  'api/checks': handlers.checks,
  'favicon.ico': handlers.favicon,
  'public': handlers.public,
  'examples/error': handlers.exampleError
};

//Init server
server.init = function () {
  //Start the HTTP server
  server.httpServer.listen(config.httpPort, function () {
    console.log('\x1b[35m%s\x1b[0m', "The server is listening on Port " + config.httpPort + " in " + config.envName + " mode now!");
  });
  //Start the HTTPS server
  server.httpsServer.listen(config.httpsPort, function () {
    console.log('\x1b[36m%s\x1b[0m', "The server is listening on Port " + config.httpsPort + " in " + config.envName + " mode now!");
  });
}
//Export the server
module.exports = server;