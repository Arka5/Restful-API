/*
These are the request handlers
*/
//Dependencies
var _data = require('./data');
var helpers = require('./helpers');
var config = require('./config');
//Define the handlers
var handlers = {};

/*
*
*HTML Handlers
*
*/

// Index handler
handlers.index = function (data, callback) {
    //Reject any request that isn't a GET
    if (data.method == 'get') {
        //Prepare data for interpolation
        var templateData = {
            'head.title': 'Uptime Monitoring - Made Simple',
            'head.description': 'We offer free, simple uptime monitoring for HTTP/HTTPS sites of all kinds. When your site status changes, we can send you an alert through a text message',
            'body.class': 'index'
        };

        //Read in a template as a string
        helpers.getTemplate('index',templateData, function (err, str) {
            if (!err && str) {
                //Add the universal headers and footers
                helpers.addUniversalTemplates(str, templateData, function (err, str) {
                    if (!err && str) {
                        //Return that page as HTML
                        callback(200, str, 'html');
                    }
                    else {
                        callback(500, undefined, 'html');
                    }
                })
            } else {
                callback(500, undefined, 'html');
            }
        })
    }
    else {
        callback(405, undefined, 'html');
    }
}

//Create account handler
handlers.accountCreate = function (data, callback) {
    //Reject any request that isn't a GET
    if (data.method == 'get') {
        //Prepare data for interpolation
        var templateData = {
            'head.title': 'Create an account',
            'head.description': 'Signup is easy and only takes a few seconds.',
            'body.class': 'accountCreate'
        };

        //Read in a template as a string
        helpers.getTemplate('accountCreate', templateData, function (err, str) {
            if (!err && str) {
                //Add the universal headers and footers
                helpers.addUniversalTemplates(str, templateData, function (err, str) {
                    if (!err && str) {
                        //Return that page as HTML
                        callback(200, str, 'html');
                    }
                    else {
                        callback(500, undefined, 'html');
                    }
                })
            } else {
                callback(500, undefined, 'html');
            }
        })
    }
    else {
        callback(405, undefined, 'html');
    }
}


//Favicon 
handlers.favicon = function (data, callback) {
    if (data.method == 'get') {
        //Read in the favicon's data
        helpers.getStaticAsset('favicon.ico', function (err, data) {
            if (!err && data) {
                //Callback the data
                callback(200, data, 'favicon');
            } else {
                callback(500);
            }
        })
    }
    else {
        callback(405);
    }
}

//Public assets
handlers.public = function (data, callback) {
    if (data.method == 'get') {
        //Get the filename being requested
        var trimmedAssetName = data.trimmedPath.replace('public/', '').trim();
        if (trimmedAssetName.length > 0) {
            //Read in the asset data
            helpers.getStaticAsset(trimmedAssetName, function (err, data) {
                if (!err && data) {
                    //Determine the content-type(default to plain text)
                    var contentType = 'plain';

                    if (trimmedAssetName.indexOf('.css') > -1) {
                        contentType = 'css';
                    }

                    if (trimmedAssetName.indexOf('.png') > -1) {
                        contentType = 'png';
                    }

                    if (trimmedAssetName.indexOf('.jpeg') > -1 || trimmedAssetName.indexOf('.jpg') > -1) {
                        contentType = 'jpeg';
                    }

                    if (trimmedAssetName.indexOf('.ico') > -1) {
                        contentType = 'favicon';
                    }

                    //Callback the data
                    callback(200, data, contentType);

                } else {
                    callback(404);
                }
            })
        } else {
            callback(404);
        }
    } else {
        callback(500);
    }
}






/*
*
*JSON API Handlers
*
*/


//User handler
handlers.users = function (data, callback) {
    var acceptableMethods = ['post', 'get', 'put', 'delete'];
    if (acceptableMethods.indexOf(data.method) >= -1) {
        handlers._users[data.method](data, callback);
    }
    else {
        callback(405);
    }
};

//Container for the users submethods
handlers._users = {};

//Users-post
//Required data: firstName, lastName, phone, password, tosAgreement
//Optional Data: none
handlers._users.post = function (data, callback) {
    //Check that all required fields are filled out
    var firstName = typeof (data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    var lastName = typeof (data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    var phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    var password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    var tosAgreement = typeof (data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

    if (firstName && lastName && phone && password && tosAgreement) {
        //Make sure that the user already doesn't exist
        _data.read('users', phone, function (err, data) {
            if (err) {
                //Hash the password
                var hashedPassword = helpers.hash(password);
                if (hashedPassword) {

                    //Create the user object
                    var userObject = {
                        'firstName': firstName,
                        'lastName': lastName,
                        'phone': phone,
                        'hashedPassword': hashedPassword,
                        'tosAgreement': true
                    }

                    //Store the user
                    _data.create('users', phone, userObject, function (err) {
                        if (!err) {
                            callback(200);
                        }
                        else {
                            console.log(err);
                            callback(500, { 'Error': 'Could not create the new user' });
                        }
                    });
                }
                else {
                    callback(500, { 'Error': 'Could not hash the password' });
                }
            }
            else {
                //User already exists
                callback(400, { 'Error': 'User with that phone number already exists' });
            }
        })
    }
    else {
        callback(400, { 'Error': 'Missing required fields' });
    }
};

//Users-delete
//Required data :phone
//Optional data:none
//Change is needed
handlers._users.delete = function (data, callback) {
    //Check Phone number is registered
    var phone = typeof (data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    if (phone) {
        //Get the token from the headers
        var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
        //Verify that the given token is valid for the phone number
        handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
            if (tokenIsValid) {
                //Lookup the user
                _data.read('users', phone, function (err, userData) {
                    if (!err && userData) {
                        _data.delete('users', phone, function (err) {
                            if (!err) {
                                //Delete each of the checks associated with the user
                                var userChecks = typeof (userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                                var checksToDelete = userChecks.length;
                                if (checksToDelete > 0) {
                                    var checksDeleted = 0;
                                    var deletionErrors = false;
                                    //Loop through checks
                                    userChecks.forEach(function (checkId) {
                                        _data.delete('checks', checkId, function (err) {
                                            if (err) {
                                                deletionErrors = true;
                                            }
                                            checksDeleted++;
                                            if (checksDeleted == checksToDelete) {
                                                if (!deletionErrors) {
                                                    callback(200);
                                                }
                                                else {
                                                    callback(500, { 'Error': 'Errors encountered while attempting to delete the checks, associated with the user' });
                                                }
                                            }
                                        })
                                    })
                                }
                                else {
                                    callback(200);
                                }
                            }
                            else {
                                callback(500, { 'Error': 'Could not delete the user' });
                            }
                        });
                    }
                    else {
                        callback(400, { 'Error': 'Could not find the specified user' });
                    }
                })
            }
            else {
                callback(403, { 'Error': 'Missing required token in Header or token is invalid' });
            }
        })
    }
    else {
        callback(400, { 'Error': 'Missing required fields' });
    }
};

//Users-put
//Required Data: phone
//Optional data: firstName, lastName, password(at least one must be specified)
handlers._users.put = function (data, callback) {
    //Check for the required field
    var phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;

    //Check for the optional fields
    var firstName = typeof (data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    var lastName = typeof (data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    var password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    //Error if the phone is invalid
    if (phone) {
        if (firstName || lastName || password) {
            //Get the token from the headers
            var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
            //Verify that the given token is valid for the phone number
            handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
                if (tokenIsValid) {
                    //Lookup the user
                    _data.read('users', phone, function (err, userData) {
                        if (!err && userData) {
                            //Update the necessary fields
                            if (firstName) {
                                userData.firstName = firstName;
                            }
                            if (lastName) {
                                userData.lastName = lastName;
                            }
                            if (password) {
                                userData.hashedPassword = helpers.hash(password);
                            }
                            //Store the updated file
                            _data.update('users', phone, userData, function (err) {
                                if (!err) {
                                    callback(200);
                                }
                                else {
                                    console.log(err);
                                    callback(500, { 'Error': 'Could not update' });
                                }
                            })
                        }
                        else {
                            callback(400, { 'Error': 'The specified user doesn\'t exist' });
                        }
                    })
                }
                else {
                    callback(403, { 'Error': 'Missing required token in Header or token is invalid' });
                }
            })
        }
        else {
            callback(400, { 'Error': 'Missing fields to update' });
        }
    }
    else {
        callback(400, { 'Error': 'Missing required fields' });
    }
};

//Users-get
//Required field: phone
handlers._users.get = function (data, callback) {
    //Check Phone number is registered
    var phone = typeof (data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;
    if (phone) {
        //Get the token from the headers
        //Debug-console.log(typeof(data.headers.token));
        var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
        //Verify that the given token is valid for the phone number
        handlers._tokens.verifyToken(token, phone, function (tokenIsValid) {
            if (tokenIsValid) {
                //Lookup the user
                _data.read('users', phone, function (err, userData) {
                    if (!err && userData) {
                        //debug-console.log("hello");
                        //Remove the hashed password from the user object before returing it to the user 
                        delete userData.hashedPassword;
                        callback(200, userData);
                    }
                    else {
                        callback(404);
                    }
                })
            }
            else {
                callback(403, { 'Error': 'Missing required token in Header or token is invalid' });
            }
        })
    }
    else {
        callback(400, { 'Error': 'Missing required fields' });
    }
};

//Tokens handler
handlers.tokens = function (data, callback) {
    var acceptableMethods = ['post', 'get', 'put', 'delete'];
    if (acceptableMethods.indexOf(data.method) >= -1) {
        handlers._tokens[data.method](data, callback);
    }
    else {
        callback(405);
    }
};

//Container for all the tokens methods
handlers._tokens = {}

//Tokens-post
//Required data:phone,password
handlers._tokens.post = function (data, callback) {
    var phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    var password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    if (phone && password) {
        //Lookup the user who matches this phone number
        _data.read('users', phone, function (err, userData) {
            if (!err && userData) {
                //Hash the sent password and compare it to the stored password
                var hashedPassword = helpers.hash(password);
                if (hashedPassword == userData.hashedPassword) {
                    //If valid, create a new token with a random name. It will be valid for 1 hour
                    var token = helpers.createRandomString(20);
                    var expires = Date.now() + 1000 * 60 * 60;
                    var tokenObject = {
                        'phone': phone,
                        'id': token,
                        'expires': expires
                    };
                    //Store the token
                    _data.create('tokens', token, tokenObject, function (err) {
                        if (!err) {
                            callback(200, tokenObject);
                        }
                        else {
                            callback(500, { 'Error': 'Could not create new token' });
                        }
                    })
                }
                else {
                    callback(400, { 'Error': 'Password did not match' });
                }
            }
            else {
                callback(400, { 'Error': 'Couldn\'t find the specified user' });
            }
        })
    }
    else {
        callback(400, { 'Error': 'Missing required fields' })
    }
}

//Tokens-put
//Required data:id,extend
handlers._tokens.put = function (data, callback) {
    var id = typeof (data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
    var extend = typeof (data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;
    if (id && extend) {
        //Lookup the token
        _data.read('tokens', id, function (err, tokenData) {
            if (!err && tokenData) {
                //Check to make sure the token isn't already expired
                if (tokenData.expires > Date.now()) {
                    tokenData.expires = Date.now() + 1000 * 60 * 60;

                    //Store the new updated token
                    _data.update('tokens', id, tokenData, function (err) {
                        if (!err) {
                            callback(200);
                        }
                        else {
                            callback(500, { 'Error': 'Could not update token expiration' });
                        }
                    })
                }
                else {
                    callback(400, { 'Error': 'The token has already expired and can\'t be extended' });
                }
            }
            else {
                callback(400, { 'Error': 'The specified token doesn\'t exist' });
            }
        })
    }
    else {
        callback(400, "Missing required fields");
    }
}
//Tokens-delete
//Required data: id
handlers._tokens.delete = function (data, callback) {
    //Check id is valid
    var id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if (id) {
        //Lookup the user
        _data.read('tokens', id, function (err, tokenData) {
            if (!err && tokenData) {
                _data.delete('tokens', id, function (err) {
                    if (!err) {
                        callback(200);
                    }
                    else {
                        callback(500, { 'Error': 'Could not delete the token' });
                    }
                });
            }
            else {
                callback(400, { 'Error': 'Could not find the specified token' });
            }
        })
    }
    else {
        callback(400, { 'Error': 'Missing required fields' });
    }
}
//Tokens-get
//Required data:id
//Optional data:none
handlers._tokens.get = function (data, callback) {
    //Check that the id is valid
    var id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if (id) {
        //Lookup the token
        _data.read('tokens', id, function (err, tokenData) {
            if (!err && tokenData) {
                //debug-console.log("hello");
                callback(200, tokenData);
            }
            else {
                callback(404);
            }
        })
    }
    else {
        callback(400, { 'Error': 'Missing required fields' });
    }
}

//Verify a given token is currently valid for a given user
handlers._tokens.verifyToken = function (id, phone, callback) {
    //Lookup the token
    //console.log(id);
    _data.read('tokens', id, function (err, tokenData) {
        if (!err && tokenData) {
            //Check that the token is for that given user and hasn't expired
            if (tokenData.expires > Date.now() && tokenData.phone == phone) {
                callback(true);
            }
            else {
                callback(false);
            }
        }
        else {
            callback(false);
        }
    })
}

//Checks handler
handlers.checks = function (data, callback) {
    var acceptableMethods = ['post', 'get', 'put', 'delete'];
    if (acceptableMethods.indexOf(data.method) >= -1) {
        handlers._checks[data.method](data, callback);
    }
    else {
        callback(405);
    }
};

//Container for all the checks
handlers._checks = {};

//Checks-post
//Required data-protocol,url,method,successCodes,timeoutSeconds
//Optional data:none
handlers._checks.post = function (data, callback) {
    //Validate inputs
    var protocol = typeof (data.payload.protocol) == 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
    var url = typeof (data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    var method = typeof (data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
    var successCodes = typeof (data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    var timeoutSeconds = typeof (data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 == 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

    if (protocol && url && method && successCodes && timeoutSeconds) {
        //Get the token from the headers
        var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;

        //Lookup the user by reading the token
        _data.read('tokens', token, function (err, tokenData) {
            if (!err && tokenData) {
                var userPhone = tokenData.phone;

                //Lookup the user
                _data.read('users', userPhone, function (err, userData) {
                    if (!err && userData) {
                        var userChecks = typeof (userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                        //Verify that the user has checks less than MAX_CHECK
                        if (userChecks.length < config.maxChecks) {
                            //Create a random id for the check
                            var checkId = helpers.createRandomString(20);

                            //Create the check object, and include the user's phone
                            var checkObject = {
                                'id': checkId,
                                'userPhone': userPhone,
                                'protocol': protocol,
                                'url': url,
                                'successCodes': successCodes,
                                'method': method,
                                'timeoutSeconds': timeoutSeconds
                            };

                            //Store the object
                            _data.create('checks', checkId, checkObject, function (err) {
                                if (!err) {
                                    //Add the check id to the user object
                                    userData.checks = userChecks;
                                    userData.checks.push(checkId);

                                    //Save the new user data
                                    _data.update('users', userPhone, userData, function (err) {
                                        if (!err) {
                                            //Return the data about the new check
                                            callback(200, checkObject);
                                        }
                                        else {
                                            callback(500, { 'Error': 'Could not update the user with new check' });
                                        }
                                    })
                                }
                                else {
                                    callback(500, { 'Error': 'Could not create the new check' });
                                }
                            })
                        }
                        else {
                            callback(400, { 'Error': 'User already has the number of maximum allowed checks' });
                        }
                    }
                    else {
                        callback(403);
                    }
                })
            }
            else {
                callback(403);
            }
        })
    }
    else {
        callback(400, { 'Error': 'Missing required inputs or inputs are invalid' });
    }
};

//Checks-get
//Required data:checkId
//Optional data:none
handlers._checks.get = function (data, callback) {
    //Check Phone number is registered
    var id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if (id) {
        //Lookup the check
        _data.read('checks', id, function (err, checkData) {
            if (!err && checkData) {
                //Get the token from the headers
                //Debug-console.log(typeof(data.headers.token));
                var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
                //Verify that the given token is valid and belongs to the user who created the check
                handlers._tokens.verifyToken(token, checkData.userPhone, function (tokenIsValid) {
                    if (tokenIsValid) {
                        //Return the check Data
                        callback(200, checkData);
                    }
                    else {
                        callback(403);
                    }
                })
            }
            else {
                callback(404);
            }
        });

    }
}

//Checks-put
//Required data : id
//Optional data : protocol,url,method,successCodes,,timeoutSeconds(one must be sent)
handlers._checks.put = function (data, callback) {
    var id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;

    //Validate inputs
    var protocol = typeof (data.payload.protocol) == 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
    var url = typeof (data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    var method = typeof (data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
    var successCodes = typeof (data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    var timeoutSeconds = typeof (data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 == 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;
    if (id) {
        if (protocol || url || method || successCodes || timeoutSeconds) {
            _data.read('checks', id, function (err, checkData) {
                if (!err && checkData) {
                    //Get the token from the headers
                    //Debug-console.log(typeof(data.headers.token));
                    var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
                    //Verify that the given token is valid and belongs to the user who created the check
                    handlers._tokens.verifyToken(token, checkData.userPhone, function (tokenIsValid) {
                        if (tokenIsValid) {
                            if (protocol) {
                                checkData.protocol = protocol;
                            }
                            if (url) {
                                checkData.url = url;
                            }
                            if (successCodes) {
                                checkData.successCodes = successCodes;
                            }
                            if (method) {
                                checkData.method = method;
                            }
                            if (timeoutSeconds) {
                                checkData.timeoutSeconds = timeoutSeconds;
                            }

                            //Store the updates
                            _data.update('checks', id, checkData, function (err) {
                                if (!err) {
                                    callback(200);
                                }
                                else {
                                    callback(500, { 'Error': 'Couldn\'t update the check' });
                                }
                            })
                        }
                        else {
                            callback(403);
                        }
                    })
                }
                else {
                    callback(400, { 'Error': 'Check ID doesn\'t exist' });
                }
            })
        }
        else {
            callback(400, { 'Error': 'Missing fields to update' });
        }
    }
    else {
        callback(400, { 'Error': 'Missing required fields' });
    }
}

//Checks-delete
//Required data:id
handlers._checks.delete = function (data, callback) {
    //Check id is valid
    var id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    if (id) {
        //Lookup the check
        _data.read('checks', id, function (err, checkData) {
            if (!err && callback) {
                //Get the token from the headers
                var token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
                //Verify that the given token is valid for the phone number
                handlers._tokens.verifyToken(token, checkData.userPhone, function (tokenIsValid) {
                    if (tokenIsValid) {
                        //Delete the check Data
                        _data.delete('checks', id, function (err) {
                            if (!err) {
                                //Lookup the user
                                _data.read('users', checkData.userPhone, function (err, userData) {
                                    if (!err && userData) {
                                        var userChecks = typeof (userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];

                                        //Remove the deleted check from their list of checks
                                        var checkPosition = userChecks.indexOf(id);
                                        if (checkPosition > -1) {
                                            userChecks.splice(checkPosition, 1);
                                            //ReSave the user's data
                                            //userData.checks=userChecks;//May need change
                                            _data.update('users', checkData.userPhone, userData, function (err) {
                                                if (!err) {
                                                    callback(200);
                                                }
                                                else {
                                                    callback(500, { 'Error': 'Could not find the specified user' });
                                                }
                                            })
                                        }
                                        else {
                                            callback(500, { 'Error': 'Could not find the check on the user\'s object' });
                                        }
                                    }
                                    else {
                                        callback(500, { 'Error': 'Could not find the user data' });
                                    }
                                })
                            }
                            else {
                                callback(500, { 'Error': 'Could not delete the check data' });
                            }
                        })
                    }
                    else {
                        callback(403, { 'Error': 'Missing required token in Header or token is invalid' });
                    }
                })
            }
            else {
                callback(400, { 'Error': 'Specified check ID doesn\'t exist' });
            }
        })

    }
    else {
        callback(400, { 'Error': 'Missing required fields' });
    }
}
//Ping handler
handlers.ping = function (data, callback) {
    callback(200);
};

//Not found handler
handlers.notFound = function (data, callback) {
    callback(404);
};

//Export the handlers
module.exports = handlers;