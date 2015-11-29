﻿(function () {

    function setImageIntoElement(elem, url) {

        if (elem.tagName !== "IMG") {

            elem.style.backgroundImage = "url('" + url + "')";

        } else {
            elem.setAttribute("src", url);
        }
    }

    // Request Quota (only for File System API)  
    var requestedBytes = 1024 * 1024 * 500; // 200MB
    var imageCacheDirectoryEntry;
    var imageCacheFolder = 'images';

    function createDir(rootDirEntry, folders, callback, errorCallback) {
        // Throw out './' or '/' and move on to prevent something like '/foo/.//bar'.
        if (folders[0] == '.' || folders[0] == '') {
            folders = folders.slice(1);
        }
        rootDirEntry.getDirectory(folders[0], { create: true }, function (dirEntry) {
            // Recursively add the new subfolder (if we still have another to create).
            if (folders.length > 1) {
                createDir(dirEntry, folders.slice(1), callback, errorCallback);
            } else {
                callback(dirEntry);
            }
        }, errorCallback);
    }

    navigator.webkitPersistentStorage.requestQuota(
        requestedBytes, function (grantedBytes) {

            var requestMethod = window.webkitRequestFileSystem || window.requestFileSystem;

            requestMethod(PERSISTENT, grantedBytes, function (fs) {

                fileSystem = fs;

                createDir(fileSystem.root, imageCacheFolder.split('/'), function (dirEntry) {

                    imageCacheDirectoryEntry = dirEntry;

                });

            });

        });

    var fileSystem;

    function imageFileStore() {

        var self = this;

        function getCacheKey(url) {

            // Try to strip off the domain to share the cache between local and remote connections
            var index = url.indexOf('://');

            if (index != -1) {
                url = url.substring(index + 3);

                index = url.indexOf('/');

                if (index != -1) {
                    url = url.substring(index + 1);
                }

            }

            return CryptoJS.MD5(url).toString();
        }

        function downloadToFile(url, dir, filename, callback, errorCallback) {

            Logger.log('Downloading ' + url);

            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = "arraybuffer";

            xhr.onload = function (e) {
                if (this.status == 200) {
                    writeData(dir, filename, this.getResponseHeader('Content-Type'), this.response, callback, errorCallback);
                } else {
                    errorCallback();
                }
            }

            xhr.send();
        }

        function writeData(dir, filename, fileType, data, callback, errorCallback) {

            dir.getFile(filename, { create: true }, function (fileEntry) {

                // Create a FileWriter object for our FileEntry (log.txt).
                fileEntry.createWriter(function (fileWriter) {

                    fileWriter.onwriteend = function (e) {
                        callback(fileEntry);
                    };

                    fileWriter.onerror = errorCallback;

                    // Create a new Blob and write it to log.txt.
                    var blob = new Blob([data], { type: fileType });

                    fileWriter.write(blob);

                }, errorCallback);

            }, errorCallback);
        }

        self.getImageUrl = function (originalUrl) {

            return new Promise(function (resolve, reject) {

                if (originalUrl.indexOf('tag=') != -1) {
                    originalUrl += "&accept=webp";
                }

                var key = getCacheKey(originalUrl);

                var fileEntryCallback = function (fileEntry) {
                    resolve(fileEntry.toURL());
                };

                var errorCallback = function (e) {
                    Logger.log('Imagestore error: ' + e.name);
                    reject();
                };

                if (!fileSystem || !imageCacheDirectoryEntry) {
                    errorCallback('');
                    return;
                }

                var path = '/' + imageCacheFolder + "/" + key;

                fileSystem.root.getFile(path, { create: false }, fileEntryCallback, function () {

                    downloadToFile(originalUrl, imageCacheDirectoryEntry, key, fileEntryCallback, errorCallback);
                });
            });
        };

        self.setImageInto = function (elem, url) {

            self.getImageUrl(url).then(function (localUrl) {

                setImageIntoElement(elem, localUrl);

            }, function () {
                setImageIntoElement(elem, url);
            });
        };

        window.ImageStore = self;
    }

    new imageFileStore();

})();