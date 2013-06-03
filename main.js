var loading = {
    "start": function (message) {
        var loading = $(".loading");
        loading.fadeIn();
        loading.find(".message").html(message);
    },
    "stop": function () {
        var loading = $(".loading");
        $(".loading").fadeOut();
        loading.find(".message").html("");
    }
};

module.exports = function (config) {

    var self = this;

    loading.start("Cloning the application.");

    // first, scan the url
    var search = location.search;
    var mongoId = search.substring(9);
  
    function processResponse (err, data, callback) {
        if (err) {alert(err); return location = "/"; }
        callback();
    }

    // clone application
    self.link("cloneApplication", { data: mongoId }, function (err, data) {
       processResponse(err, data, function () { 
            loading.start(data);

            // application cloned successfully, initialize it.
            self.link("initialize", function (err, data) {
                processResponse(err, data, function () {
                    loading.start(data);
                });
            });
        });
    });
};

function initialize (self, mongoId, callback) {
    // initialize
    self.link("cloneApplication", { data: mongoId }, callback);
}
