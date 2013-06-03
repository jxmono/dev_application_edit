var fs = require("fs");

var readDirRecursive = function(dir, done) {
    
    var results = [];
    
    fs.readdir(dir, function(err, list) {
       
        if (err) return done(err);
        
        var pending = list.length;
        
        if (!pending) {
            
            return done(null, results);
        }
        
        list.forEach(function(file) {
            
            file = dir + '/' + file;
            
            fs.stat(file, function(err, stat) {
                
                if (stat && stat.isDirectory()) {
                    
                    readDirRecursive(file, function(err, res) {
                        
                        results = results.concat(res);
                        
                        if (!--pending) {
                            
                            done(null, results);
                        }
                    });
                    
                } else {
                    
                    results.push(file);
                    
                    if (!--pending) {
                        
                        done(null, results);
                    }
                }
            });
        });
    });
};

exports.read = function (root, callback) {
    readDirRecursive(root, function (err, files) {
        if (err) { return callback(err); }
        
        callback(null, files.sort());
    });
};
