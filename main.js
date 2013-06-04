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
var FILE_NAME;

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
        
        FILE_NAME = $(this).attr("data-file");

        var dataObject = {
            appId: APP_ID,
            fileName: FILE_NAME
        };

        self.link("openFile", { data: dataObject },  function (err, content) {
            if (err) { return alert(err); }
    
            if (typeof content === "object") {
                content = JSON.stringify(content, null, 4);
            }

            var extension = FILE_NAME.substring(FILE_NAME.lastIndexOf(".") + 1);

            editor.getSession().setMode(MODES[extension] || "ace/mode/" + extension);
            editor.setValue(content);
            editor.scrollToLine(1, false, true);
            editor.gotoLine(0, 0, false);
            editor.focus();
        });

        return false;
    });

    $(document).on("click", ".btn-danger", function () {
        
        var dataToSend = {
            editDir: EDIT_DIRECTORY,
            fileName: FILE_NAME,
            content: editor.getValue()
        };

        self.link("saveFile", { data: dataToSend }, function (err) {
            if (err) { return alert(err); }
        });
    });
}
