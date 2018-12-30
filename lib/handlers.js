/*
These are the request handlers
*/
//Dependencies
var _data = require('./data');
var helpers = require('./helpers');
//Define the handlers
var handlers = {};

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
                                callback(200);
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