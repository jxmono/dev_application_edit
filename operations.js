var fs = require("fs");

/*
 *  Operation that clones the application
 *  The mongo id has to be passed in link.data
 */
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
 */
exports.initialize = function (link) {
    // prevent removing this function, maybe we will need it later.
    link.send(200);
};

/*
 *  Save file
 */
exports.saveFile = function (link) {

    var data = link.data;

    if (!data || !data.editDir || !data.content || !data.fileName) {
        return link.send(400, "Missing data.");
    }

    var filePath = link.data.editDir + link.data.fileName;

    fs.writeFile(filePath, link.data.content, function (err) {
        if (err) { return link.send(400, err); }
        link.send(200);
    });
};

exports.getChildren = function (link) {

    if (!link.data) { return link.send(400, "Missing data."); }
    if (!link.data.editDir) { return link.send(400, "Missing edit directory."); }
    if (!link.data.pathToParent) { return link.send(400, "Missing the path to parent."); }

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

exports.openFile = function (link) {

    if (!link.data || !link.data.appId || !link.data.fileName) {
        return link.send(400, "Missing data.");
    }

    var fileToEdit = M.config.APPLICATION_ROOT + "00000000000000000000000000000002/edit/" + link.session.login + "/" + link.data.appId + link.data.fileName;

    fs.readFile(fileToEdit, function (err, data) {
        if (err) { return link.send(400, err); }

        link.send(200, data.toString());
    });
};
