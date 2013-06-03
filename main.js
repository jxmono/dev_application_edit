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

var EDIT_DIRECTORY;
var EDIT_PATH;
var APP_ID;

var MODES = {
    "js": "ace/mode/javascript",
    "css": "ace/mode/css",
    "html": "ace/mode/html"
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

            EDIT_DIRECTORY = data.editDir;
            EDIT_PATH = data.path;
            APP_ID = data.appId;

            // application cloned successfully, initialize it.
            self.link("initialize", { data: { editDir: EDIT_DIRECTORY } }, function (err, files) {
                processResponse(err, function () {
                    createFileList(files); 
                    handlers(self);

                    var editor = ace.edit("editor");
                    editor.setTheme("ace/theme/monokai");
                    editor.getSession().setMode("ace/mode/javascript");

                    loading.stop();
                });
            });
        });
    });
};

function createFileList(files) {
    var template = $(".files-container").find(".template");

    for (var i in files) {
        
        var item = template.clone().removeClass("template").addClass("appItem");
        item.attr("data-file", files[i]);
        item.find("a").text(files[i]);

        $(".template").after(item);
    }
}

function handlers(self) {
    var editor = ace.edit("editor");

    $(document).on("click", ".appItem", function () {
        $(".appItem").removeClass("active");
        $(this).addClass("active");
        
        var fileName = $(this).attr("data-file");

        self.link(EDIT_PATH + "/" + APP_ID + fileName, function (err, data) {
            if (err) { return alert(err); }

            var extension = fileName.substring(fileName.lastIndexOf(".") + 1);
            editor.getSession().setMode(MODES[extension]);
            editor.setValue(data);
            editor.gotoLine(1, 1, false);
            editor.focus();
        });

        return false;
    });

    $(document).on("click", ".btn-danger", function () {
        self.link("saveFile", { data: editor.getValue() }, function (err) {
            if (err) { return alert(err); }
        });
    });
}
