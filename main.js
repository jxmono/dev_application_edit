module.exports = function (config) {

    var self = this;

    // first, scan the url
    var search = window.location.search;
    var mongoId = search.substring(9);
    
    initialize(self, mongoId, function (err, data) {
        $(".result").text(data);            
        stopLoading();
    });
};

function initialize (self, mongoId, callback) {
    // initialize
    self.link("initialize", { data: mongoId }, callback);
}

function stopLoading () {
    $(".loading").fadeOut(function () {
        $(this).remove();
    });
}
