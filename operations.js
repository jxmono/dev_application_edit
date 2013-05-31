exports.initialize = function (link) {

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
                    link.send(200, JSON.stringify(link.session, null, 4));



                    callback(null, docs[0]);
                });
            });
        });
    });
};

exports.saveFile = function (link) {
    link.send(200);
};
