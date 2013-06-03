var fs = require("fs");

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
                    var dirName = M.config.APPLICATION_ROOT + "00000000000000000000000000000002/edit/"+ link.session.login;

                    var json = doc.descriptor;
                    try { json = JSON.parse(json);
                    } catch (e) {
                        return link.send(400, "Invalid application descriptor.");
                    }
                
                    function clone() {
                        M.repo.cloneToDir(doc.repo_url, dirName, json.appId, { depth: 5 }, function (err) {
                            if (err && err.code === "API_REPO_CLONE_DESTINATION_ALREADY_EXISTS") { return link.send(200, "Already cloned this app. Preparing to edit <strong>" + doc.name + "</strong>"); }
                            link.send(200, "Successfully cloned <strong>" + doc.name + "</strong>.");
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
    link.send(200);
};

/*
 *  Save file
 */
exports.saveFile = function (link) {
    link.send(200);
};
