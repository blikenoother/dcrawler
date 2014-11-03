var winston = require('winston'),
    MongoDB = require('winston-mongodb').MongoDB,
    os = require("os"),
    path = require('path'),
    fs = require('fs'),
    async = require('async'),
    MongoClient = require('mongodb').MongoClient,
    crc32 = require('buffer-crc32'),
    request = require('request'),
    cheerio = require('cheerio'),
    url = require('url'),
    _ = require('lodash');

DCrawler.prototype.init = function (options, log) {
    var self = this;

    var logger = null;
    if (log) {
        logger = new (winston.Logger)({
            transports: [
                new (winston.transports.Console)(),
                new (winston.transports.MongoDB)(log)
            ],
            exceptionHandlers: [
                new winston.transports.Console()
            ],
            exitOnError: false
        });
    } else {
        logger = new (winston.Logger)({
            transports: [
                new (winston.transports.Console)()
            ],
            exceptionHandlers: [
                new winston.transports.Console()
            ],
            exitOnError: false
        });
    }
    self.logger = logger;

    var hostname = os.hostname();
    self.hostname = hostname;
    
    var CONSTANTS = {
        START: 0,
        COMPLETE: 1,
        INTERRUPT: 3,
        QUEUE_NEW:      0,
        QUEUE_PROCESS:  1,
        QUEUE_COMPLETE: 2,
    };
    self.CONSTANTS = CONSTANTS;

    var configDefaultOptions = {
        interval:           1000,
        finishInterval:     60000,
        followUrl:          false,
        resume:             false,
        beforeStart:        function (config) {
            self.logger.info("started", {name: config.name, status: self.CONSTANTS.START});
        },
        parseUrl:           function (error, response, $) {
            var _url = [];
            try {
                $("a").each(function() {
                    if (!$(this).attr("href"))
                        return;

                    var href = url.parse($(this).attr("href"), true);
                    if (!href.host) {
                        href = href.href.charAt(0) === "/" ? href.href : "/" + href.href;
                        href = response.uri.protocol + "//" + response.uri.host + href;
                    } else if (href.host != response.uri.host) {
                        return;
                    }
                    _url.push(href);
                });
            } catch (e) {}

            return _url;
        },
        parseData:          function (error, response, $) {
            var _data = null;
            try {
                var href = response.uri.href;
                _data = {
                    _id: crc32.unsigned(href),
                    url: href,
                    html: $("html").html()
                };
            } catch(e) {}

            return _data;
        },
        onComplete:         function (config) {
            self.logger.info("completed", {name: config.name, status: self.CONSTANTS.COMPLETE});
        }
    };
    self.configDefaultOptions = configDefaultOptions;

    self.configInterval = {};
    self.options = options;

    async.series([
        function(callback) {
            if (!options.hasOwnProperty("mongodbUri") || !_.isString(options.mongodbUri))
                callback({"mongodbUri not found in options": options});

            if (!options.hasOwnProperty("profilePath") || !_.isString(options.profilePath))
                callback({"profilePath not found in options": options});

            self._loadProfile(function(err, data) {
                if (err)
                    callback(err);
                else if (!data || !_.isArray(data) || data.length === 0)
                    callback("Config not found");

                options.configs = data;
                callback();
            });
        },
        function(callback) {
            var err = [];
            options.configs.forEach(function(config){
                if (!config.hasOwnProperty("collection"))
                    err.push({"collection not found in config": config.profilePath});

                if (!config.hasOwnProperty("url"))
                    err.push({"url not found in config": config.profilePath});
                else {
                    var validUrl = false;
                    if (_.isString(config.url))
                        validUrl = true;
                    if (_.isArray(config.url))
                        validUrl = true;
                    if (!validUrl)
                        err.push({"url must be string or array in config": config.profilePath});
                }

                if (!_.isFunction(config.beforeStart))
                    err.push({"beforeStart must be function in config": config.profilePath});

                if (!_.isFunction(config.parseUrl))
                    err.push({"parseUrl must be function in config": config.profilePath});

                if (!_.isFunction(config.parseData))
                    err.push({"parseData must be function in config": config.profilePath});

                if (!_.isFunction(config.onComplete))
                    err.push({"onComplete must be function in config": config.profilePath});
            });

            if (err.length > 0)
                callback(err);
            else
                callback();
        }
    ], function(err) {
        if (err) {
            self.logger.error("could not initiated", err);
            throw (JSON.stringify(err));
        }
        self.logger.info("initiated");
    });
};

DCrawler.prototype.start = function () {
    var self = this;

    async.series([
        function(callback) {
            var _collections = [];
            self.options.configs.forEach(function(config){
                if (!config.resume)
                    _collections.push(config.queueCollection);
            });
            if (_collections.length === 0)
                callback();
            else
                self._removeCollection(_collections, function(){
                    callback();
                });
        },
        function(callback) {
            self._ensureIndex(function(err){
                if (err)
                    callback(err);
                else
                    callback();
            });
        },
        function(callback) {
            self.options.configs.forEach(function(config){
                config.beforeStart(config);

                self._addToQueue(config, config.url);
                self.configInterval[config.queueCollection] = setInterval(function(){
                    self._executeTask(config);
                }, config.interval);
            });
            callback();
        }
    ], function(err){
        if (err)
            throw (err);
    });
};

DCrawler.prototype._loadProfile = function (callback) {
    var self = this;

    var configs = [];
    if (fs.existsSync(self.options.profilePath)) {
        fs.readdirSync(self.options.profilePath).forEach(function(file) {
            try {
                var _profilePath = path.join(self.options.profilePath, file);
                var config = _.clone(_.extend(self.configDefaultOptions, require(_profilePath).config));
                config.mongodbUri = self.options.mongodbUri;
                config.profilePath = _profilePath;
                config.name = file;
                config.queueCollection = file.replace(/[^a-zA-Z0-9]/g,'_') + "_queue";
                configs.push(config);
            } catch (e) {
                e = file + ":" + e;
                callback(e, null);
            }
        });
        callback(null, configs);
    } else {
        callback(self.options.profilePath + " not exists");
    }
};

DCrawler.prototype._removeCollection = function (collections, callback) {
    var self = this;

    MongoClient.connect(self.options.mongodbUri, function(err, db) {
        if (err)
            throw (err);

        async.eachSeries(collections, function(collection, callback) {
            db.collection(collection).drop(function() {
                callback();
            });
        }, function(){
            callback();
        });
    });
};

DCrawler.prototype._ensureIndex = function (callback) {
    var self = this;

    MongoClient.connect(self.options.mongodbUri, function(err, db) {
        if (err)
            throw (err);

        async.eachSeries(self.options.configs, function(config, callback) {
            db.collection(config.queueCollection).ensureIndex("status", function(err) {
                if (err)
                    callback(err);
                else
                    callback();
            });
        }, function(err){
            callback(err);
        });
    });
};

DCrawler.prototype._addToQueue = function (config, url) {
    var self = this;

    if (_.isString(url))
        url = [url];
    if (!_.isArray(url) || url.length === 0)
        return;

    MongoClient.connect(config.mongodbUri, function(err, db) {
        if (err)
            throw ({"Could not connect to mongodb": err});
        else {
            try {
                url.forEach(function(u){
                    db.collection(config.queueCollection).insert({
                        _id: crc32.unsigned(u),
                        url: u,
                        status: self.CONSTANTS.QUEUE_NEW,
                        timestamp: new Date(),
                        hostname: self.hostname
                    }, function(err){
                        if (err && err.code != 11000)
                            throw (err);
                    });
                });
            } catch (e) {}
        }
    });
};

DCrawler.prototype._releaseCheck = function (db, config, callback) {
    var self = this;

    setTimeout(function(){
        db.collection(config.queueCollection).count(
            {status: self.CONSTANTS.QUEUE_NEW},
            {},
            function(err, count){
                callback(count);
            }
        );
    }, config.finishInterval);
};

DCrawler.prototype._release = function (config) {
    var self = this;

    if (!self.configInterval[config.queueCollection])
        return;

    clearInterval(self.configInterval[config.queueCollection]);
    delete self.configInterval[config.queueCollection];
    config.onComplete(config);
};

DCrawler.prototype._makeRequest = function (config, uri, callback) {
    if (config.cookie)
        request.cookie(config.cookie);

    request({
        uri: uri,
        method: "GET"
    }, function(error, response, html) {
        uri = url.parse(uri);

        var $ = null;
        if (response && response.hasOwnProperty("statusCode") && response.statusCode === 200) {
            $ = cheerio.load(html);
            response.uri = uri;
        } else {
            response  = {uri: uri};
        }
        callback(error, response, $);
    });
};

DCrawler.prototype._updateQueue = function (db, collection, data) {
    db.collection(collection).update(
        {_id: data._id},
        {$set: {status: data.status}},
        function(err){
            if (err)
                throw (err);
        }
    );
};

DCrawler.prototype._addData = function (db, collection, data) {
    if (data == null)
        return;

    var self = this;

    data.hostname = self.hostname;
    data.timestamp = new Date();
    db.collection(collection).update(
        {_id: data._id},
        data,
        {upsert: true},
        function(err){
            if (err)
                throw (err);
        }
    );
};

DCrawler.prototype._executeTask = function (config) {
    var self = this;

    var fq = {status: self.CONSTANTS.QUEUE_NEW};
    var uq = {$set: {status: self.CONSTANTS.QUEUE_PROCESS} };
    MongoClient.connect(config.mongodbUri, function(err, db) {
        if (err)
            throw ({"Could not connect to mongodb": err});
        else {
            db.collection(config.queueCollection).findAndModify(fq, [], uq, {new: true}, function(err, doc){
                    if (!doc) {
                        self._releaseCheck(db, config, function(count){
                            if (count === 0)
                                self._release(config);
                        });
                    } else {
                        self._makeRequest(config, doc.url,function(error, response, $){
                            // update queue status
                            doc.status = self.CONSTANTS.QUEUE_COMPLETE;
                            self._updateQueue(db, config.queueCollection, doc);

                            // parse next url to crawl and add in to queue
                            var url = [];
                            try {
                                url = config.followUrl ? config.parseUrl(error, response, $) : [];
                            } catch (e) {}
                            self._addToQueue(config, url);

                            // parse data and add in to mongodb
                            var data = null;
                            try {
                                data = config.parseData(error, response, $);
                            } catch (e) {}
                            self._addData(db, config.collection, data);
                        });
                    }
                }
            );
        }
    });
};

function DCrawler(options, log) {
    var self = this;
    self.init(options, log);
}

module.exports = DCrawler;
module.exports.VERSION = '0.0.1';