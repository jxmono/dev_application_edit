$(document).ready(function () {

    var TerminalContainer = $(".terminal-container");

    // mouse enter -> show
    var Terminal = {
        "selector": ".terminal-container",
        "size": {
            "initial": {
                "w": TerminalContainer.css("width"),
                "h": TerminalContainer.css("height")
            },
            "active": {
                "w": "100%",
                "h": "150px"
            }
        },
        "active": false,
        "moving": false
    };

    TerminalContainer
    .on("mouseenter", function () {
        if (Terminal.active || Terminal.moving) { return; }

        Terminal.moving = true;

        TerminalContainer.animate({"width": Terminal.size.active.w }, function () {
            TerminalContainer.animate({"height": Terminal.size.active.h }, function () {
                Terminal.active = true;
                Terminal.moving = false;
            });
        });
    })
    // mouse leave -> timeout --> hide
    .on("mouseleave", function () {
        if (!Terminal.active || Terminal.moving) { return; }
        Terminal.moving = true;

        TerminalContainer.animate({"height": Terminal.size.initial.h }, function () {
            TerminalContainer.animate({"width": Terminal.size.initial.w }, function () {
                Terminal.active = false;
                Terminal.moving = false;
            });
        });
    });
});
