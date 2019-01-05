@ECHO OFF
SET /P NODE_ENV=Please choose application running environment: 
SET /P NODE_DEBUG=Please choose application debugging option: 
start /max node index.js
