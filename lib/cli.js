/*
*
*CLI-Related Files
*
*/

//Dependencies
var readLine = require('readline');
var util = require('util');
var debug = util.debuglog('cli');
var events = require('events');
var config = require('./config');
var os = require('os');
var v8 = require('v8');
var _data = require('./data');
var _logs = require('./logs');
var helpers = require('./helpers');
class _events extends events { };
var e = new _events();

//Instantiate the CLI module object
var cli = {};


//Input handlers
e.on('man', function (str) {
    cli.responders.help();
});

e.on('help', function (str) {
    cli.responders.help();
});

e.on('cls', function (str) {
    cli.responders.cls();
});

e.on('exit', function (str) {
    cli.responders.exit();
});

e.on('stats', function (str) {
    cli.responders.stats();
});

e.on('list users', function (str) {
    cli.responders.listUsers();
});

e.on('more user info', function (str) {
    cli.responders.moreUserInfo(str);
});

e.on('list checks', function (str) {
    cli.responders.listChecks(str);
});

e.on('more check info', function (str) {
    cli.responders.moreCheckInfo(str);
});

e.on('list logs', function (str) {
    cli.responders.listLogs();
});

e.on('more log info', function (str) {
    cli.responders.moreLogInfo(str);
});


//Responders object
cli.responders = {};

//Man / Help
cli.responders.help = function () {
    var commands = {
        'man': 'Show help',
        'help': 'Show help',
        'cls': 'Clears CLI interface screen',
        'exit': 'Kill the CLI and the rest of the processes of the application',
        'stats': 'Get statistics on the underlying operating system and resource utilization',
        'list users': 'Show list of the users, who are currently registered in our database',
        'more user info --{userId/userPhone}': 'Show details of a specific user',
        'list checks --up --down': 'Show a list of all the active checks in the database, including their state. Both \'--up\' and \'--down\' flags are optional.',
        'more check info --{checkId}': 'Show details of a specified check',
        'list logs': 'Show a list of all the log files available to be read(compressed)',
        'more log info --{fileName}': 'Show details of a specified log file'
    };

    //Show a header for the help page that is as wide as the screen
    cli.horizontalLine();
    cli.centred('CLI MANUAL');
    cli.horizontalLine();
    cli.verticalSpace(2);

    //Show each command, followed by its explanation, in white and yellow respectively
    for (var key in commands) {
        if (commands.hasOwnProperty(key)) {
            var value = commands[key];
            var line = '\x1b[33m' + key + '\x1b[0m';
            var padding = 55 - line.length;
            for (i = 0; i < padding; i++) {
                line += ' ';
            }
            line += value;
            console.log(line);
            cli.verticalSpace(1);
        }
    }
    cli.verticalSpace(1);
    cli.horizontalLine();
}

//Creates a vertical space
cli.verticalSpace = function (lines) {
    lines = typeof (lines) == 'number' && lines > 0 ? lines : 1;
    for (i = 0; i < lines; i++) {
        console.log('');
    }
}

//Creates a horizontal Line across the screen
cli.horizontalLine = function () {
    //Get the availiable screen size
    var width = process.stdout.columns;

    var line = '';
    for (i = 0; i < width; i++) {
        line += '-';
    }
    console.log(line);
};

//Create a centred text on the screen
cli.centred = function (str) {
    str = typeof (str) == 'string' && str.trim().length > 0 ? str.trim() : '';

    //Get the availiable screen size
    var width = process.stdout.columns;

    //Calculate the left padding there should be
    var leftPadding = Math.floor((width - str.length) / 2);

    //Put in the left padding
    var line = '';
    for (i = 0; i < leftPadding; i++) {
        line += ' ';
    }
    line += str;
    console.log(line);
}

//Exit
cli.responders.exit = function () {
    process.exit(0);
}

//Clears the screen
cli.responders.cls = function () {
    console.clear();
    cli.verticalSpace(2);
    cli.horizontalLine();
    cli.centred("Admin Console");
    cli.horizontalLine();
    console.log('\x1b[33m%s\x1b[0m', 'Background workers are running');
    console.log('\x1b[35m%s\x1b[0m', "The server is listening on Port " + config.httpPort + " in " + config.envName + " mode now!");
    console.log('\x1b[36m%s\x1b[0m', "The server is listening on Port " + config.httpsPort + " in " + config.envName + " mode now!");
    console.log('\x1b[34m%s\x1b[0m', "The CLI is running. Type 'help' or 'man' for CLI user manual");
}

cli.responders.stats = function () {
    //Compie an object for stats
    var stats = {
        'Load Average': os.loadavg().join(' '),
        'CPU Count': os.cpus().length,
        'Free Memory': os.freemem(),
        'Current Mallocated Memory': v8.getHeapStatistics().malloced_memory,
        'Peak Mallocated Memory': v8.getHeapStatistics().peak_malloced_memory,
        'Allocated Heap Used (%)': Math.round((v8.getHeapStatistics().used_heap_size / v8.getHeapStatistics().total_heap_size) * 100),
        'Available Heap Allocated (%)': Math.round((v8.getHeapStatistics().total_heap_size / v8.getHeapStatistics().heap_size_limit) * 100),
        'Uptime': Math.round(os.uptime()) + ' Seconds'
    };

    //Show a header for the stats page
    cli.horizontalLine();
    cli.centred('SYSTEM STATISTICS');
    cli.horizontalLine();
    cli.verticalSpace(2);

    //Log out each stat
    for (var key in stats) {
        if (stats.hasOwnProperty(key)) {
            var value = stats[key];
            var line = '\x1b[33m' + key + '\x1b[0m';
            var padding = 55 - line.length;
            for (i = 0; i < padding; i++) {
                line += ' ';
            }
            line += value;
            console.log(line);
            cli.verticalSpace(1);
        }
    }
    cli.verticalSpace(1);
    cli.horizontalLine();
};

cli.responders.listUsers = function () {
    _data.list('users', function (err, userIds) {
        if (!err && userIds && userIds.length > 0) {
            cli.verticalSpace();
            userIds.forEach(function (userId) {
                _data.read('users', userId, function (err, userData) {
                    if (!err && userData) {
                        var line = 'Name: ' + userData.firstName + ' ' + userData.lastName + '  Phone: ' + userData.phone;
                        var numberOfChecks = typeof (userData.checks) == 'object' && userData.checks instanceof Array && userData.checks.length > 0 ? userData.checks.length : 0;
                        line += '  Checks: ' + numberOfChecks;
                        console.log(line);
                        cli.verticalSpace(1);
                    }
                })
            })
        }
    })
}

cli.responders.listChecks = function (str) {
    _data.list('checks', function (err, checkIds) {
        if (!err && checkIds && checkIds.length > 0) {
            cli.verticalSpace();
            checkIds.forEach(function (checkId) {
                _data.read('checks', checkId, function (err, checkData) {
                    var includeCheck = false;
                    var lowerString = str.toLowerCase();

                    //Get the state of the check,default to down
                    var state = typeof (checkData.state) == 'string' ? checkData.state : 'down';
                    //Get the state of the check,default to unknown
                    var stateOrUnknown = typeof (checkData.state) == 'string' ? checkData.state : 'unknown';
                    //If the user has specified the state, or hasn't specified any state, include the current states accordingly
                    if (lowerString.indexOf('--' + state) > -1 || ((lowerString.indexOf('--up') == -1) && (lowerString.indexOf('--down') == -1))) {
                        var line = 'ID: ' + checkData.id + '   ' + checkData.method.toUpperCase() + '   ' + checkData.protocol + '://' + checkData.url + '   State: ' + stateOrUnknown.toUpperCase();
                        console.log(line);
                        cli.verticalSpace();
                    }
                })
            })
        } else {
            console.log("No check found in database");
        }
    })
}

//Function for listing all compressed logs on Admin Console
cli.responders.listLogs = function () {
    _logs.list(true, function (err, logFileNames) {
        if (!err && logFileNames && logFileNames.length > 0) {
            cli.verticalSpace();
            logFileNames.forEach(function (logFileName) {
                if (logFileName.indexOf('-') > -1) {
                    console.log(logFileName);
                    cli.verticalSpace();
                }
            })
        } else {
            console.log("An error occured or No log file in Database.")
        }
    })
}

cli.responders.moreCheckInfo = function (str) {
    //console.log(str);
    //Get the ID from the string
    var arr = str.split('--');
    var checkId = typeof (arr[1]) == 'string' && arr[1].trim().length > 0 ? arr[1].trim() : false;
    if (checkId) {
        //Lookup the check
        _data.read('checks', checkId, function (err, checkData) {
            if (!err && checkData) {
                //Print the JSON with text highligting
                cli.verticalSpace();
                console.dir(checkData, { 'colors': true });
            } else {
                console.log("Could not find the check with provided check Id!");
            }
        })
    }
    else {
        console.log("Syntax Error! Please type 'help' for CLI user manual");
    }
}

cli.responders.moreUserInfo = function (str) {
    //Get the ID from the string
    var arr = str.split('--');
    var userId = typeof (arr[1]) == 'string' && arr[1].trim().length > 0 ? arr[1].trim() : false;
    if (userId) {
        //Lookup the user
        _data.read('users', userId, function (err, userData) {
            if (!err && userData) {
                //Remove the hashed password
                delete userData.hashedPassword;

                //Print the JSON with text highligting
                cli.verticalSpace();
                console.dir(userData, { 'colors': true });
            } else {
                console.log("Could not find the user with provided user Id!");
            }
        })
    }
    else {
        console.log("Syntax Error! Please type 'help' for CLI user manual");
    }
}

cli.responders.moreLogInfo = function (str) {
    //console.log(str);
    //Get the fileName from the string
    var arr = str.split('--');
    var logFileName = typeof (arr[1]) == 'string' && arr[1].trim().length > 0 ? arr[1].trim() : false;
    if (logFileName) {
        cli.verticalSpace();
        //Decompress the log file
        _logs.decompress(logFileName, function (err, strData) {
            if (!err && strData) {
                //Split and Parse JSON string
                var arr = strData.split('\n');
                arr.forEach(function (jsonString) {
                    if (typeof (jsonString) == 'string' && jsonString.length > 0 && jsonString !== '{}') {
                        var logObject = helpers.parseJsonToObject(jsonString);
                        if (logObject && JSON.stringify(logObject) !== '{}') {
                            console.dir(logObject, { 'colors': 'true' });
                            cli.verticalSpace();
                        }
                        else {
                            console.log("Error reading data of the specified check.");
                        }
                    }
                })
            }
            else {
                console.log("An error occured while decompressing the log object");
            }
        })
    }
    else {
        console.log("Syntax Error! Please type 'help' for CLI user manual");
    }
}


//Input processor
cli.processInput = function (str) {
    str = typeof (str) == 'string' && str.trim().length > 0 ? str.trim() : false;
    if (str) {
        //Clarify the unique strings that identify the unique questions allowed to be asked
        var uniqueInputs = [
            'man',
            'help',
            'exit',
            'cls',
            'stats',
            'list users',
            'more user info',
            'list checks',
            'more check info',
            'list logs',
            'more log info'
        ];

        //Go through the possible inputs, emit an event when a match is found
        var matchFound = false;
        var counter = 0;
        uniqueInputs.some(function (input) {
            if (str.toLowerCase().indexOf(input) > -1) {
                matchFound = true;
                //Emit an event matching the unique input, and include the full string given
                e.emit(input, str.toLowerCase());
                return true;
            }
        });

        // IF no match is found, tell the user to try again
        if (!matchFound) {
            console.log("\'" + str + "\' is not recognized as an internal command! Please try again!");
        }
    }
};

//Init script
cli.init = function () {
    //Send the start message to the console in dark blue
    console.log('\x1b[34m%s\x1b[0m', "The CLI is running. Type 'help' or 'man' for CLI user manual");

    //Start the interface
    var _interface = readLine.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '>>'
    });

    //Create an initial prompt
    _interface.prompt();

    //Handle each of the line seperately
    _interface.on('line', function (str) {
        //Send to the input processor
        cli.processInput(str);

        //Re-initialize the prompt after some delay
        setTimeout(function () {
            _interface.prompt();
        }, 100);
    });

    //If the user stops the CLI, kill the associated process
    _interface.on('close', function () {
        process.exit(0);
    });

};


//Export the module
module.exports = cli;