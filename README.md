node-distributed-crawler
========

Features
--------------
 * Configurable url parser and data parser
 * jQuery selector using [cheerio](httphttps://github.com/cheeriojs/cheerio)
 * Parsed data insertion in [Mongodb](https://github.com/mongodb/node-mongodb-native) collection
 * Domain wise interval configuration in distributed enviroment
 * node 0.8+ support


Feature suggestion & Forks welcomed!


Installation
--------------

    $ npm install git+https://github.com/blikenoother/dcrawler.git



Usage
------------

```javascript
var DCrawler = require("dcrawler");

var options = {
    mongodbUri:     "mongodb://localhost:27017/crawler",
    profilePath:    __dirname + "/" + "profile"
};
var logOptions = {
    dbUri:      "mongodb://localhost:27017/crawler",
	storeHost:  true
}
var dc = new DCrawler(options, logOptions);
dc.start();
```

The DCrawler takes options and log options construcotr:
1. __options__ with following porperties __*__:
  * __mongodbUri:__ Mongodb connection uri (Eg: 'mongodb://0.0.0.0:27017/crawler') __*__
  * __profilePath:__ Location of profile directory which contains config files. (Eg: /home/crawler/profile) __*__

2. __logOptions__ to store logs in centrelized location using [winston-mongodb](https://github.com/indexzero/winston-mongodb#usage) with following porperties:
  * __dbUri:__ Mongodb connection uri (Eg: 'mongodb://0.0.0.0:27017/crawler')
  * __storeHost:__ Boolean, true or false to store workers host name or not in log collection.

  __Note:__ logOptions is required when you want to store centralize logs in mongodb, if you don't want to store logs no need to pass logOptions variable in DCrawler constructor
  ```javascript
  var dc = new DCrawler(options);
  ```

Create __config file__ for each domain inside profilePath directory. Check example profile [example.com](https://github.com/blikenoother/dcrawler/blob/master/sample_profile/example.js), contains config with following porperties:
* __collection:__ Name on collection to store parsed data in mongodb. (Eg: 'products') __*__
* __url:__ Url to start crawling. String or Array of url. (Eg: 'http://example.com' or ['http://example.com']) __*__
* __interval:__ Interval between request in miliseconds. Default is `1000` (Eg: For 2 secods interval: `2000`)
* __followUrl:__ Boolean, true or false to fetch further url from the crawled page and crawl that url as well.
* __resume:__ Boolean, true or false to resume crawling from previous crawled data.
* __beforeStart:__ Function to execute before start crawling. Function has config param which contains perticular profile config object. Example function:
```javascript
beforeStart: function (config) {
    console.log("started crawling example.com");
}
```
* __parseUrl:__ Function to get further url from crawled page. Function has `error`, `response` object and `$` jQuery object param. Function returns Array of url string. Example function:
```javascript
parseUrl: function (error, response, $) {
    var _url = [];
    
    try {
        $("a").each(function(){
            var href = $(this).attr("href");
            if (href && href.indexOf("/products") > -1) {
                if (href.indexOf("http://example.com") === -1) {
                    href = "http://example.com/" + href;
                }
                _url.push(href);
            }
        )};
    } catch (e) {
        console.log(e);
    }
    
    return _url;
}
```
* __parseData:__ Function to exctract information from crawled page. Function has `error`, `response` object and `$` jQuery object param. Function returns data Object to insert in collection . Example function:
```javascript
parseData: function (error, response, $) {
    var _data = null;
    
    try {
        var _id = $("h1#productId").html();
        var name = $("span#productName").html();
        var price = $("label#productPrice").html();
        var url = response.uri;
        
        _data = {
            _id: _id,
            name: name,
            price: price,
            url: url
        }
    } catch (e) {
        console.log(e);
    }
    
    return _data;
}
```
* __onComplete:__ Function to execute on completing crawling. Function has `config` param which contains perticular profile config object. Example function:
```javascript
onComplete: function (config) {
    console.log("completed crawling example.com");
}
```

Chirag (blikenoother -[at]- gmail [dot] com)