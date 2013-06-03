var fs = require("fs");
var Dir = require("./directory");

/* 
 *  Operation that clones the application
 *  The mongo id has to be passed in link.data
 */
exports.cloneApplication = function (link) {

    var mongoId = link.data;

    if (!mongoId) { link.send(400, "Missing mongo id."); }
    
    /////////////////////////////////
    // Search in database for mongoId
    /////////////////////////////////
    M.datasource.resolve(link.params.ds, function(err, ds) {
        if (err) { return callback(err); }
        
        M.database.open(ds, function(err, db) {
            if (err) { return callback(err); }

            db.collection(ds.collection, function(err, collection) {
                if (err) { return callback(err); }

                collection.findOne({"_id":M.mongo.ObjectID(mongoId) }, function(err, doc) {

                    if (err) { return link.send(400, err); }
                    if (!doc) { return link.send(400, "Invalid mongo id."); }
                    
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
                        appId: appId
                    };

                    M.fs.makeDirectory(dirName, function(e){
                        M.repo.cloneToDir(doc.repo_url, dirName, json.appId, { depth: 5 }, function (err) {
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

    if (!link.data || !link.data.editDir) { return link.send(400, "Missing data."); }

    var editDir = link.data.editDir;

    Dir.read(editDir, function (err, files) {
        if (err) { return link.send(400, err); }

        var filesToSend = [];

        for (var i in files) {
            if (files[i].indexOf("/.git/") === -1) {
                filesToSend.push(files[i].replace(editDir, ""));
            }
        }

        link.send(200, filesToSend);
    });
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
