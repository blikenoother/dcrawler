exports.config = {
    collection: "products",
    interval: 3000,
    followUrl: true,
    url: "http://example.com/",
    parseUrl: function (error, response, $) {
	    var _url = [];
	    
	    // iterate on each a tag and return array of urls
	    $("a").each(function(){
	    	if ($(this).attr("href")) {
	    		// if url contains products key word then only crawl
	    		var href = $(this).attr("href");
	            if (href && href.indexOf("products") > -1) {
	                _url.push(href);
	            }
	    	}
	    )};

	    return _url;
	},
	parseData: function (error, response, $) {
	    var _data = null;
	    
	    // parse data using jQuery style selector and return key-value pair object
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
	    	_data = null; // returning null will not insert in collection
	    }
    
    	return _data;
	}
};