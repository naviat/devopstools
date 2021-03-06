const http = require('http');
const https = require('https');
const url = require('url');
const ps = require('portscanner');

const ua = 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36';

const statusCodes = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    500: 'Internal Server Error',
    501: 'Not implemented',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout'
};

exports.handler = function(event, context, callback) {
    if (!event.host.startsWith('http'))
        event.host = 'http://' + event.host;

    var urlInfo = url.parse(event.host);
    if (urlInfo.host == null || urlInfo.host == '')
    {
        callback('Invalid host');
        return;
    }
    if (urlInfo.path != '/')
    {
        callback('Input must be hostname or IP only');
        return;
    }

    const options = {
        host: urlInfo.host,
        port: (urlInfo.protocol == 'http:') ? 80 : 443,
        headers: {'User-Agent': ua},
        timeout: 1000
    };
    const connector = (urlInfo.protocol == 'http:') ? http : https;

    var result;
    ps.checkPortStatus(options.port, options.host, function (err, status) {
        if (err || status != 'open') {
            result = {
                host: urlInfo.protocol + '//' + urlInfo.host,
                up: false,
                reason: urlInfo.host + ' isn\'t listening on port ' + options.port
            };
            callback(null, result);
            return;
        }

        var req = connector.request(options, function(res) {
            var statusCode = res.statusCode;
            var result;
            if (statusCode >= 400) {
                var reason = (statusCodes[statusCode] != null) ? 
                    'Bad status code (' + statusCode + ': ' + statusCodes[statusCode] + ')' :
                    'Bad status code (' + statusCode + ')';

                result = {
                    host: urlInfo.protocol + '//' + urlInfo.host,
                    up: false,
                    reason: reason,
                };
            }
            else {
                result = {
                    host: urlInfo.protocol + '//' + urlInfo.host,
                    up: true,
                    statusCode: statusCode
                };
            }
            callback(null, result);
        });
        req.on('error', function (err) {
            var result;
            if (err.syscall == 'getaddrinfo') {
                result = {
                    host: urlInfo.protocol + '//' + urlInfo.host,
                    up: false,
                    reason: 'Could not resolve domain',
                    hint: 'Double check that domain is typed correctly'
                };
            }
            else if (err.reason) {
                result = {
                    host: urlInfo.protocol + '//' + urlInfo.host,
                    up: false,
                    reason: err.reason
                };
            }
            else {
                result = {
                    host: urlInfo.protocol + '//' + urlInfo.host,
                    up: false,
                    reason: err.syscall + ' failed with code ' + err.code
                };
            }
            callback(null, result);
        });
        req.end();
    });
};

/*
var event = {
//   host: "<alert>script('test');</alert>"
//   host: "a"
//   host: "a.com/test.html"
   host: "https://www.experts-exchange.com"
//   host: "http://experts-exchange-437318971.us-east-1.elb.amazonaws.com"
//   host: "stackoverflow.com"
//   host: "carol.ns.cloudflare.com"
//   host: "https://8.8.8.8"
};
exports.handler(event, null, function(err, result) {
   console.log(err);
   console.log(result);
});
*/
