node-distributed-crawler
========

Features:
 * Configurable url parser and data parser
 * jQuery selector using [cheerio](https://github.com/cheeriojs/cheerio)
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

var dc = new DCrawler({
    mongodbUri:     "mongodb://localhost:27017/crawler",
    profilePath:     __dirname + "/" + "sample_profile"
});
// start crawling
dc.start();
```

Chirag (blikenoother -[at]- gmail [dot] com)