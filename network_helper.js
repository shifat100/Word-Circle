// network_helper.js
var NetworkHelper = (function () {
    'use strict';

    return {
        fetchJSON: function (url, successCallback, errorCallback, headersCallback) {
            var xhr = new XMLHttpRequest({ mozSystem: true });
            xhr.open('GET', url, true);
            // xhr.responseType = 'json'; // Keep as text for broader compatibility, parse manually

            xhr.onload = function () {
                if (xhr.status >= 200 && xhr.status < 300) {
                    var response = xhr.responseText; // Use responseText
                    try {
                        response = JSON.parse(response);
                    } catch (e) {
                        if (typeof errorCallback === 'function') errorCallback(new Error('JSON Parse Error: ' + e.message), xhr.status);
                        return;
                    }

                    if (typeof successCallback === 'function') successCallback(response);

                    if (typeof headersCallback === 'function') {
                        var lastModified = xhr.getResponseHeader('Last-Modified');
                        headersCallback({ lastModified: lastModified });
                    }
                } else {
                    if (typeof errorCallback === 'function') errorCallback(new Error('Request failed: ' + xhr.statusText), xhr.status);
                }
            };

            xhr.onerror = function () {
                if (typeof errorCallback === 'function') errorCallback(new Error('Network error'), xhr.status);
            };

            xhr.ontimeout = function () {
                if (typeof errorCallback === 'function') errorCallback(new Error('Request timeout'), xhr.status);
            };
            xhr.timeout = 15000;

            try {
                xhr.send();
            } catch (e) {
                 if (typeof errorCallback === 'function') errorCallback(e, 0);
            }
        },

        fetchHeaders: function(url, successCallback, errorCallback) {
            var xhr = new XMLHttpRequest({ mozSystem: true });
            xhr.open('HEAD', url, true);

            xhr.onload = function () {
                if (xhr.status >= 200 && xhr.status < 300) {
                    var lastModified = xhr.getResponseHeader('Last-Modified');
                    if (typeof successCallback === 'function') successCallback({ lastModified: lastModified });
                } else {
                     if (typeof errorCallback === 'function') errorCallback(new Error('HEAD Request failed: ' + xhr.statusText), xhr.status);
                }
            };
            xhr.onerror = function () {
                if (typeof errorCallback === 'function') errorCallback(new Error('Network error for HEAD request'), xhr.status);
            };
             xhr.ontimeout = function () {
                if (typeof errorCallback === 'function') errorCallback(new Error('HEAD Request timeout'), xhr.status);
            };
            xhr.timeout = 10000;
            xhr.send();
        }
    };
})();