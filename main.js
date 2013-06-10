// control overlay loading
var loading = {
    "start": function (message) {
        var loading = $(".overlay-loading");
        loading.fadeIn();
        loading.find(".message").html(message);
    },
    "stop": function () {
        var loading = $(".overlay-loading");
        loading.fadeOut();
        loading.find(".message").html("");
    }
};

var EDIT_DIRECTORY;
var EDIT_PATH;
var APP_ID;
// TODO Prevent to make it global.
//      The multiple file edits will be possible.
var FILE_NAME;

var modes = {
    "js": "javascript"
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

            $("#project-root").text(data.doc.name);

            // application cloned successfully, initialize it.
            self.link("initialize", { data: { editDir: EDIT_DIRECTORY } }, function (err, files) {
                processResponse(err, function () {
                    createFileList(files);
                    buildTreeFrom(files);

                    var editor = ace.edit("editor");
                    editor.setTheme("ace/theme/monokai");

                    loading.stop();
                    handlers(self);
                });
            });
        });
    });
};

function createFileList(files) {
    var template = $(".file-manager").find(".template");

    for (var i in files) {

        var extension = files[i].substring(files[i].lastIndexOf(".") + 1);

        var item = template.clone()
                        .removeClass("template")
                        .addClass("appItem");
        item.find("a").addClass("file")
                      .addClass("ext-" + extension)
                      .text(files[i]);

        item.attr("data-file", files[i]);

        template.after(item);
    }
}

function handlers(self) {

    var editor = ace.edit("editor");
    $(".toast-item-wrapper").hide();

    // ctrl key
    $.ctrl = function(key, callback, args) {
        $(document)
            .keydown(function(e) {
            if (!args) args = [];
            if (e.keyCode == key && (e.ctrlKey || e.metaKey)) {
                callback.apply(this, args);
                return false;
            }
        });
    };

     /***********************
     *  OPEN FILE OPERATION *
     ***********************/
    // return false on click on a file name
    $(document).on("click", ".appItem", function () {
        return false;
    });

    // double click -> open a file
    $(document).on("dblclick", ".appItem", function () {

        var clickedAppItem = $(this).find("a");
        clickedAppItem.addClass("loading");

        FILE_NAME = $(this).attr("data-file");

        var dataObject = {
            appId: APP_ID,
            fileName: FILE_NAME
        };

        // call operation
        self.link("openFile", { data: dataObject },  function (err, content) {

            clickedAppItem.removeClass("loading");

            if (err) { return alert(err); }

            if (typeof content === "object") {
                content = JSON.stringify(content, null, 4);
            }


            var label = $("#tab-list-active-files").find(".active").find(".label");
            var lastSlash = FILE_NAME.lastIndexOf("/");
            var path = FILE_NAME.substring(1, lastSlash + 1);
            var file = FILE_NAME.substring(lastSlash + 1);

            // TODO Why this doesn't work?
            // var fileNameSpan = $("<span></span>");
            // fileNameSpan.addClass("file-name")
            // fileNameSpan.text(file);
            // var html = fileNameSpan.html();

            var text = path + "<span class='file-name'>" + file + "</span>";
            label.html(text);

            var extension = FILE_NAME.substring(FILE_NAME.lastIndexOf(".") + 1);

            var mode = modes[extension] || extension;

            editor.getSession().setMode("ace/mode/" + mode);
            editor.setValue(content);
            editor.scrollToLine(1, false, true);
            editor.gotoLine(0, 0, false);
            editor.focus();
        });

        return false;
    });

    /***********************
    *  SAVE FILE OPERATION *
    ***********************/
    // CTRL + S:
    $.ctrl("83", function() {
        var dataToSend = {
            editDir: EDIT_DIRECTORY,
            fileName: FILE_NAME,
            content: editor.getValue()
        };

        var timeout;
        self.link("saveFile", { data: dataToSend }, function (err) {
            var toastItem = $(".toast-item-wrapper");
            var toastItemImage = toastItem.find(".toast-item-image");

            toastItemImage
                .removeClass("toast-item-image-success")
                .removeClass("toast-item-image-error")

            if (timeout) { clearTimeout(timeout); }

            toastItem.fadeIn(function () {
                timeout = setTimeout(function () {
                    toastItem.fadeOut();
                }, 3000);
            });

            if (err) {
                toastItem.find(".message").text(err);
                toastItemImage.addClass("toast-item-image-error");
                return;
            }

            toastItem.find(".message").text("File saved.");
            toastItemImage.addClass("toast-item-image-success");
        });
    });
}

 /*
    ==============================
    The files and directories tree
    ==============================
 */

function buildTreeFrom (files) {
    var root = {};
    root.files = [];
/*
    var files = [
        "/.gitignore",
        "/application.json",
        "/public/sample1.html",
        "/public/sample2.html",
        "/public/sample3.html",
        "/public/tabs.html",
        "/readme.md"
    ];

    {
        "files": [
            ".gitignore",
            "application.json",
            "readme.md"
        ],
        "public": {
            "files": [
                "sample1.html",
                "sample2.html",
                "sample3.html",
                "tabs.html"
            ]
        }
    }
*/
// TODO
//    for (var file in files) {
//        var count = files[file].split("/").length - 1;
//
//        if (count === 1) {
//            root.files.push(files[file]);
//        }
//        else if (count > 1) {
//            var dir = files[file].substring(1);
//            var path = dir.substring(0, dir.indexOf("/"));
//
//            var dirs = path.split("/");
//            console.log(dirs);
//
//            if (!root[dir]) { root[dir] = {}; }
//
//
//        }
//    }
//
//    console.log(tree);
}
