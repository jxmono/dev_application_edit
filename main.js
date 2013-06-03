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
  
    function processResponse (err, callback) {
        if (err) {alert(err); return location = "/"; }
        callback();
    }

    // clone application
    self.link("cloneApplication", { data: mongoId }, function (err, data) {
       processResponse(err, function () { 
            loading.start(data.message);

            // application cloned successfully, initialize it.
            self.link("initialize", { data: { editDir: data.editDir } }, function (err, files) {
                processResponse(err, function () {
                    createFilesList(files); 
                    loading.stop();
                });
            });
        });
    });
};

function createFilesList(files) {
    var template = $(".files-container").find(".template");

    for (var i in files) {
        
        var item = template.clone().removeClass("template");
        item.attr("data-file", files[i]);
        item.find("a").text(files[i]);

        $(".template").after(item);
    }
}
