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
                    var path = "/editApplications/"+ link.session.login;
                    var dirName = M.config.APPLICATION_ROOT + "00000000000000000000000000000002/public" + path;
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

                    function clone() {
                        M.repo.cloneToDir(doc.repo_url, dirName, json.appId, { depth: 5 }, function (err) {
                            if (err && err.code === "API_REPO_CLONE_DESTINATION_ALREADY_EXISTS") { 
                                response.message = "Already cloned this app. Preparing to edit <strong>" + doc.name + "</strong>";
                                return link.send(200, response);
                            }

                            response.message = "Successfully cloned <strong>" + doc.name + "</strong>.";
                            link.send(200, response);
                        });
                    }

                    M.fs.makeDirectory(dirName, function(e){
                        clone();
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

    console.log(link.data);
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
   
    // TODO Only we really need...
    if (!link.data || !link.data.editDir || !link.data.editPath || !link.data.appId || !link.data.content || !link.data.fileName) { 
        return link.send(400, "Missing data."); 
    }

    var path = "/editApplications/"+ link.session.login;
    console.log(link.data);


    var filePath = link.data.editDir + link.data.fileName;

    console.log(filePath);

    fs.write(filePath, link.data.content, function (err) {
        if (err) { return link.send(400, err); }
        link.send(200);
    });
};

exports.openFile = function (link) {
    link.send(200);
};
