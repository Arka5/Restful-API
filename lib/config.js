/*
Create an export configuration variable
*/

//Container for all the environments
var environments = {};

//Staging (default) environment
environments.staging = {
    'httpPort': 3000,
    'httpsPort': 3001,
    'envName': 'staging',
    'hashingSecret': 'bvdhfbhdbfhdbhfbdhbfdbsidvbi',
    'maxChecks': 5,
    'twilio': {
        'accountSid': 'AC9aefd47dcef9f32c2bd86bb6e52ca15a',
        'authToken': '1340faf142dc2f4c3922506b0a4bcf16',
        'fromPhone': '+19203450713'
    }
};

//Production environment
environments.production = {
    'httpPort': 5000,
    'httpsPort': 5001,
    'envName': 'production',
    'hashingSecret': 'fbhdbfhbdhbvbdbshdskbvsbvfbis',
    'maxChecks': 5,
    'twilio': {
        'accountSid': 'AC9aefd47dcef9f32c2bd86bb6e52ca15a',
        'authToken': '1340faf142dc2f4c3922506b0a4bcf16',
        'fromPhone': '+19203450713'
    }
};

//Determinne which environment was passed as a command line argument
var currentEnvironment = typeof (process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.trim().toLowerCase() : '';

//Check that current environment is one of the environments defined above
var environmentToExport = typeof (environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

//Export the module
module.exports = environmentToExport;