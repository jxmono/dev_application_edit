var fs = require("fs");

/*
 *  Operation that clones the application
 *
 *  Required data keys:
 *   - givenId: can be a mongo id or an application id
 *
 *  WARNING: If you pass an application id the application
 *           has to be imported in the database
 * */
exports.cloneApplication = function (link) {

    var givenId = link.data;

    if (!givenId) { link.send(400, "Missing mongo id."); }

    /////////////////////////////////
    // Search in database for givenId
    /////////////////////////////////
    M.datasource.resolve(link.params.ds, function(err, ds) {
        if (err) { return callback(err); }

        M.database.open(ds, function(err, db) {
            if (err) { return callback(err); }

            db.collection(ds.collection, function(err, collection) {
                if (err) { return callback(err); }

                var objectId;
                var filter;

                try {
                    objectId = M.mongo.ObjectID(givenId);
                    filter = {"_id": objectId };
                } catch (e) {}

                // It's not an Mongo ID
                if (!objectId) {
                    // suposse that given id is an app Mono id
                    filter = { "appId": givenId };
                }

                collection.findOne(filter, function(err, doc) {

                    if (err) { return link.send(400, err); }
                    if (!doc) { return link.send(400, "Provided an invalid id. Please provide a Mongo id or an application id."); }

                    // The logged user musts to have permissions to edit the application
                    // TODO Implement collaborator mode
                    if (doc.ownerUserName !== link.session.login) {
                        err = "You must have permissions to edit this files. You are logged as " +
                              link.session.login + " instead of " + doc.owner;
                        return link.send(400, err);
                    }

                    ////////////////////
                    // Clone application
                    ////////////////////
                    var path = "/edit/"+ link.session.login;
                    var dirName = M.config.APPLICATION_ROOT + "00000000000000000000000000000002/" + path;
                    var json = doc.descriptor;

                    try { json = JSON.parse(json);
                    } catch (e) {
                        return link.send(400, { "message": "Invalid application descriptor."});
                    }

                    var editDir = dirName + "/" + json.appId;
                    var appId = json.appId;

                    var response = {
                        message: "",
                        editDir: editDir,
                        path: path,
                        appId: appId,
                        // TODO Prevent the sending of full data.
                        doc: doc
                    };

                    var auth = link.session.auth;
                    auth.type = "oauth";
                    auth.secrets = require(M.config.APPLICATION_ROOT + "00000000000000000000000000000002/secrets.json")[link.session.provider];

                    var cloneOptions = {
                        depth: 5,
                        auth: auth
                    };

                    M.fs.makeDirectory(dirName, function(e){
                        M.repo.cloneToDir(doc.repo_url, dirName, json.appId, cloneOptions, function (err) {

                            if (err && err.code === "API_REPO_CLONE_DESTINATION_ALREADY_EXISTS") {
                                response.message = "Already cloned this app. Preparing to edit <strong>" + doc.name + "</strong>";
                                return link.send(200, response);
                            }

                            if (err) { return link.send(400, err); }

                            response.message = "Successfully cloned <strong>" + doc.name + "</strong>.";
                            link.send(200, response);
                        });
                    });
                });
            });
        });
    });
};

/*
 *  Initialize operation: after the application is cloned
 *  in the edit directory
 *
 *  Required data keys:
 *   - givenId
 * */
exports.initialize = function (link) {

    if (!link.data) { return link.send(400, "Missing data."); }
    if (!link.data.givenId) { return link.send(400, "Missing given id."); }

    var dirToSearch = M.config.APPLICATION_ROOT + link.data.givenId;

    // search for the application installed
    fs.readdir(dirToSearch, function (err) {

        // TODO Check if there isn't another error

        var response = {
            path: "/",
            appId: link.data.givenId,
            appType: "notInstalled"
        };

        // if the folder doesn't exist, application is not installed
        if (err) { return link.send(200, response); }

        var descriptor = require(dirToSearch + "/" + M.config.APPLICATION_DESCRIPTOR_NAME);
        response.editDir = dirToSearch,
        response.appType = "installed",
        response.doc = descriptor;

        link.send(200, response);
    });
};

/*
 *  Saves a file to disk
 *
 *  Required data keys:
 *   - editDir
 *   - content
 *   - fileName
 *   - appType
 *   - appId
 * */
exports.saveFile = function (link) {

    var data = link.data;

    if (!data) {
        return link.send(400, "Missing data.");
    }

    var requiredKeys = [
        "editDir",
        "content",
        "fileName",
        "appType",
        "appId"
    ];

    for (var key in requiredKeys) {
        if (!data[requiredKeys[key]]) {
            return link.send(400, "Missing " + requiredKeys[key] + ".");
        }
    }

    var filePath;

    if (data.appType !== "installed") {
        filePath = data.editDir + data.fileName;
    }
    else {
        filePath = M.config.APPLICATION_ROOT + data.appId + "/" + data.fileName;
    }

    fs.writeFile(filePath, link.data.content, function (err) {
        if (err) { return link.send(400, err); }

        link.send(200);
    });
};

/*
 *  Reads the directory and returns the array
 *  with the file names and directory names like
 *  in the following example:
 *  [
 *      "/file1",
 *      "/file2",
 *      "/dir1/",
 *      "/file3",
 *      "/dir2/"
 *  ]
 *
 *  Required data keys:
 *   - editDir
 *   - pathToParent
 *   - appType
 *
 * */
exports.getChildren = function (link) {

    if (!link.data) { return link.send(400, "Missing data."); }
    if (!link.data.editDir) { return link.send(400, "Missing edit directory."); }
    if (!link.data.pathToParent) { return link.send(400, "Missing the path to parent."); }
    if (!link.data.appType) { return link.send(400, "Missing the application type."); }

    var editDir = link.data.editDir;
    var path = link.data.pathToParent;

    var filesToSend = [];

    fs.readdir(editDir + path, function (err, files) {
        if (err) { return link.send(400, err); }

        for (var i in files) {
            if (files[i] === ".git") {
                files.splice(i, 1);
            }
        }

        for (var i in files) {
            (function (file) {
                fs.stat(editDir + path + file, function (err, stats) {
                    if (err) { return link.send(400, err); }

                    if (stats.isDirectory()) {
                        file = file + "/";
                    }

                    filesToSend.push(file);

                    if (filesToSend.length === files.length) {
                        link.send(200, filesToSend);
                    }
                });
            })(files[i]);
        }
    });
};

/*
 *  Opens a file from disk
 *
 *  Required data keys:
 *   - appId
 *   - fileName
 *   - appType
 *
 * */
exports.openFile = function (link) {

    if (!link.data) { return link.send(400, "Missing data."); }

    var requiredKeys = [
        "appId",
        "fileName",
        "appType"
    ];

    for (var key in requiredKeys) {
        if (!link.data[requiredKeys[key]]) {
            return link.send(400, "Missing " + requiredKeys[key] + ".");
        }
    }

    var fileToEdit;

    if (link.data.appType !== "installed") {
        fileToEdit = M.config.APPLICATION_ROOT + "00000000000000000000000000000002/edit/" + link.session.login + "/" + link.data.appId + link.data.fileName;
    }
    else {
        fileToEdit = M.config.APPLICATION_ROOT + link.data.appId + "/" + link.data.fileName;
    }

    fs.readFile(fileToEdit, function (err, data) {
        if (err) { return link.send(400, err); }

        link.send(200, data.toString());
    });
};
