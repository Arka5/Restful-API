/*
Worker related tasks
*/

//Dependencies
var path = require('path');
var fs = require('fs');
var _data = require('./data');
var https = require('https');
var http = require('http');
var helpers = require('./helpers');
var url = require('url');
const intervalInMinute = 1;
var _logs = require('./logs');
var util = require('util');
var debug = util.debuglog('workers');
//Instantiate the workers object
var workers = {};

//Lookup all the checks,get their data and send it to a validator
workers.gatherAllChecks = function () {
    //Get all the checks
    _data.list('checks', function (err, checks) {
        if (!err && checks && checks.length > 0) {
            checks.forEach(function (check) {
                //Read in the check data
                _data.read('checks', check, function (err, originalCheckData) {
                    if (!err && originalCheckData) {
                        //Pass it to the check validator, and let the function continue or log errors as needed
                        workers.validateCheckData(originalCheckData);
                    }
                    else {
                        debug("Error reading one of the checks's data");
                    }
                });
            });
        }
        else {
            debug("Error: Could not find any checks to process");
        }
    })
}
//Sanity-check the check data
workers.validateCheckData = function (originalCheckData) {
    originalCheckData = typeof (originalCheckData) == 'object' && originalCheckData != null ? originalCheckData : false;
    originalCheckData.id = typeof (originalCheckData.id) == 'string' && originalCheckData.id.trim().length == 20 ? originalCheckData.id.trim() : false;
    originalCheckData.userPhone = typeof (originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.trim().length == 10 ? originalCheckData.userPhone.trim() : false;
    originalCheckData.protocol = typeof (originalCheckData.protocol) == 'string' && ['https', 'http'].indexOf(originalCheckData.protocol.trim()) > -1 ? originalCheckData.protocol.trim() : false;
    originalCheckData.url = typeof (originalCheckData.url) == 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url.trim() : false;
    originalCheckData.method = typeof (originalCheckData.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(originalCheckData.method.trim()) > -1 ? originalCheckData.method.trim() : false;
    originalCheckData.successCodes = typeof (originalCheckData.successCodes) == 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false;
    originalCheckData.timeoutSeconds = typeof (originalCheckData.timeoutSeconds) == 'number' && originalCheckData.timeoutSeconds % 1 == 0 && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false;

    //Debug
    /*
    if(!originalCheckData.protocol)
    debug("userPhoneprotocol");
    */

    //Set the keys that mey not be set(if the workers have never seen this check before)
    originalCheckData.state = typeof (originalCheckData.state) == 'string' && ['up', 'down'].indexOf(originalCheckData.state.trim()) > -1 ? originalCheckData.state.trim() : 'down';
    originalCheckData.lastChecked = typeof (originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;

    //If all the checks pass, pass the data along to the next step in the process
    if (originalCheckData.id &&
        originalCheckData.userPhone &&
        originalCheckData.protocol &&
        originalCheckData.url &&
        originalCheckData.method &&
        originalCheckData.successCodes &&
        originalCheckData.timeoutSeconds) {
        workers.performCheck(originalCheckData);
    }
    else {
        debug("Error: One of the checks is not properly formatted, skipping it");
    }
}

//Perform the check and send the originalCheckData and the outcome of the check process to the next step
workers.performCheck = function (originalCheckData) {
    //Prepare the initial check outcome
    var checkOutcome = {
        'error': false,
        'responseCode': false
    };

    //Mark that the outcome has not been sent yet
    var outcomeSent = false;

    //Parse the hostname and the path out of the original check data
    var parsedUrl = url.parse(originalCheckData.protocol + '://' + originalCheckData.url, true);
    var hostName = parsedUrl.hostname;
    var path = parsedUrl.path;//Path,not pathname because we want the querystring too(Investigation required)

    //Constructing the request
    var requestDetails = {
        'protocol': originalCheckData.protocol + ':',
        'hostname': hostName,
        'method': originalCheckData.method.toUpperCase(),
        'path': path,
        'timeout': originalCheckData.timeoutSeconds * 1000
    };
    debug(requestDetails);
    //Instantiate the request object(using either the http or https module)
    var _moduleToUse = originalCheckData.protocol == 'http' ? http : https;
    var req = _moduleToUse.request(requestDetails, function (res) {
        //debug(res);
        // Grab the status of the sent request
        var status = res.statusCode;

        // Update the checkOutcome and pass the data along
        checkOutcome.responseCode = status;
        if (!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    //Bind to the error event so that it doesn't get thrown
    req.on('error', function (e) {
        //Update the checkOutcome and pass the data along
        checkOutcome.error = {
            'error': true,
            'value': e
        };
        if (!outcomeSent) {
            //debug("Error happened "+ e);//Debug
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    //Bind to the timeout event
    req.on('timeout', function (e) {
        //Update the checkOutcome and pass the data along
        checkOutcome.error = {
            'error': true,
            'value': 'timeout'
        };
        if (!outcomeSent) {
            //debug("Timeout happened");//Debug
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    //End the request
    req.end();
};

//Process the check outcome and update the check data as needed, trigger an alert to the user if needed
//Special logic for accomodating a check that has never been tested before(Don't alert the user in that case)
workers.processCheckOutcome = function (originalCheckData, checkOutcome) {
    //Decide if the check is currently up or down
    var state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';

    //Decide an alert is warranted 
    var alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;//May be adjusted

    //Log the outcome
    var timeOfCheck = Date.now()
    workers.log(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck);

    //Update the check data
    var newCheckData = originalCheckData;
    newCheckData.state = state;
    newCheckData.lastChecked = Date.now();

    //Save the updates
    _data.update('checks', newCheckData.id, newCheckData, function (err) {
        if (!err) {
            //Send the new check data to the next phase in the process if needed
            if (alertWarranted) {
                workers.alertUserToStatusChange(newCheckData);
            }
            else {
                debug('Check outcome has not changed, no alert needed');
            }
        }
        else {
            debug("Error: Trying to save updates to one of the checks failed")
        }
    })
}

//Alert the user as to a change in their check status
workers.alertUserToStatusChange = function (newCheckData) {
    var msg = 'Alert: Your check for ' + newCheckData.method.toUpperCase() + ' ' + newCheckData.protocol + '://' + newCheckData.url + ' is currently ' + newCheckData.state;
    helpers.sendTwilioSMS(newCheckData.userPhone, msg, function (err) {
        if (!err) {
            debug('Success: User was alerted to a status change via SMS with a message ' + msg);
        }
        else {
            debug('Could not send SMS alert to an user who had a state change in their checks');
        }
    })

};

//Function for logging the outcome into a file
workers.log = function (originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck) {
    //Form the log data
    var logData = {
        'check': originalCheckData,
        'outcome': checkOutcome,
        'state': state,
        'alert': alertWarranted,
        'time': timeOfCheck
    };

    //Convert the data into a string
    var logString = JSON.stringify(logData);

    //Determine the name of the log file
    var logFileName = originalCheckData.id;

    //Append the log string to the file
    _logs.append(logFileName, logString, function (err) {
        if (!err) {
            debug("Logging to the file succeded");
        }
        else {
            debug("Logging to the file failed");
        }
    })
};
//Timer to execute the worker-process once per minute
workers.loop = function () {
    setInterval(function () {
        workers.gatherAllChecks();
    }, 1000 * 60 * intervalInMinute)
};

//Rotate (compress) log files
workers.rotateLogs = function () {
    //List all the non-compressed log files
    _logs.list(false, function (err, logs) {
        if (!err && logs && logs.length > 0) {
            logs.forEach(function (logName) {
                //Compress the data to different file
                var logId = logName.replace('.log', '');
                var newFileId = logId + '-' + Date.now();
                _logs.compress(logId, newFileId, function (err) {
                    if (!err) {
                        //Truncate the log file
                        _logs.truncate(logId, function (err) {
                            if (!err) {
                                debug('Success truncating log file');
                            }
                        })
                    }
                    else {
                        debug('Error compressing one of the logs: ', err);
                    }
                })
            })
        }
        else {
            debug('Something went wrong or no logs to process');
        }
    })
};

//Timer to execute the log-rotation process once per day
workers.logRotationLoop = function () {
    setInterval(function () {
        workers.rotateLogs();
    }, 1000 * 61 * 61 * 23);
};

//Function for removing expired tokens
workers.removeExpiredTokens = function () {
    //List all the tokens
    _data.list('tokens', function (err, tokens) {
        if (!err && tokens && tokens.length > 0) {
            tokens.forEach(function (token) {
                //Read in the token data
                _data.read('tokens', token, function (err, tokenData) {
                    if (!err && tokenData) {
                        if (tokenData.expires < Date.now()) {
                            _data.delete('tokens', tokenData.id, function (err) {
                                if (!err) {
                                    debug("Success: Deleted expired token");
                                }
                                else {
                                    debug("Error: Could not delete one of the expired tokens, TokenID= " + tokenData.id + " Error message: " + err);
                                }
                            })
                        }
                        else {
                            debug("This token is not expired yet,so skipping it");
                        }
                    }
                    else {
                        debug("Error: Cannot read one of the tokens' data");
                    }
                })
            });
        }
        else {
            debug("No token to process");
        }
    })
}

//Timer to execute Expired tokens removal process 
workers.removeExpiredTokensLoop = function () {
    setInterval(function () {
        workers.removeExpiredTokens();
    }, 1000 * 61 * 61 * 3);
}

//Init workers
workers.init = function () {
    //Send to console, in yellow
    console.log('\x1b[33m%s\x1b[0m', 'Background workers are running');
    //Execute all the checks immediately
    workers.gatherAllChecks();

    //Call a loop so that the check continues on their own(at later time)
    workers.loop();

    //Compress all the logs immediately
    workers.rotateLogs();

    //Call the compression loop so that logs will be compressed later on
    workers.logRotationLoop();

    //Remove expired tokens
    workers.removeExpiredTokens();

    //Call the loop for expired tokens removal
    workers.removeExpiredTokensLoop();
}
//Export the module
module.exports = workers;