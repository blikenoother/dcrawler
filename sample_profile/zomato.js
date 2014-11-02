exports.config = {
    interval: 5000,
    collection: "place",
    cookie: "zl=en",
    followUrl: true,
    parseUrl: function(error, response, $) {
        var url = [];
        try {
            $("a.result-title").each(function() {
                url.push($(this).attr("href"));
            });
            $("ul.pagination-control li a").each(function() {
                url.push("https://www.zomato.com" + $(this).attr("href"));
            });
        } catch (e) {}

        return url;
    },
    parseData: function(error, response, $) {
        var _id = "";
        try {
            var _shareUrl = $("meta[name='twitter:app:url:googleplay']").attr("content").toString().split("/");
            _id = _shareUrl[_shareUrl.length-1];
        } catch(e) {}
        if (_id === "") return null;

        var url = response.uri.href;

        var name = null;
        try {
            name = $('h1.res-name').html().replace(/<\/?[^>]+(>|$)/g, '').trim();
        } catch(e) {}

        var address = null;
        try {
            address = $('h2.res-main-address-text').html().replace(/<\/?[^>]+(>|$)/g, ' ').replace(/ ,/g, ',').trim();
        } catch(e) {}

        var location = null;
        try {
            var latitude = $("meta[property='place:location:latitude']").attr('content');
            var longitude = $("meta[property='place:location:longitude']").attr('content');
            location = {latitude: latitude, longitude: longitude};
        } catch(e) {
            location = null;
        }

        var image = null;
        try{
            image = $("meta[property='og:image:url']").attr('content');
        } catch(e) {}

        var phone = null;
        try {
            phone = $('div#phoneNoString').html().replace(/<\/?[^>]+(>|$)/g, '').replace(/ /g, '').trim();
            phone = phone.replace(/[^+0-9,]/g, '');
            phone = phone.split(',');
        } catch(e) {}

        var openHours = null;
        var daysName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        try {
            openHours = [];
            var d = 0;
            $('span.res-info-timings div.clearfix').each(function(){
                var day = "";
                var time = "";
                $(this).children().each(function(){
                    if ($(this).get(0).tagName === "DIV" && $(this).children().length === 0) {
                        day = $(this).html().replace(/<\/?[^>]+(>|$)/g, '').toLowerCase();
                    } else if ($(this).children().length > 0) {
                        $(this).html().replace(/<\/?[^>]+(>|$)/g, "").toLowerCase().replace("open now", "").split(" ").forEach(function(s){
                            if (s !== "") time += s +" ";
                        });
                        time = time.trim();
                    }
                });
                openHours.push({day: daysName[d], time: time});
                d++;
            });
        } catch(e) {
            openHours = null;
        }

        var cuisines = null;
        try {
            cuisines = [];
            $('.res-info-cuisines a').each(function () {
                cuisines.push($(this).text());
            });
        } catch(e) {
            cuisines = null;
        }

        var facilities = {wifi: true};

        if (!name || !address || !location) return null;

        var data = {
            _id: _id,
            url: url,
            name: name,
            address: address,
            location: location,
            facilities: facilities
        };
        if (image) data.image = image;
        if (phone) data.phone = phone;
        if (openHours) data.openHours = openHours;
        if (cuisines) data.cuisines = cuisines;

        return data;
    },
    url: [
        "https://www.zomato.com/ncr/restaurants?category=1&wifi=1&page=1",
        "https://www.zomato.com/ncr/restaurants?category=1&wifi=1&page=2",
        "https://www.zomato.com/ncr/restaurants?category=1&wifi=1&page=3",
        "https://www.zomato.com/ncr/restaurants?category=1&wifi=1&page=4",
        "https://www.zomato.com/ncr/restaurants?category=1&wifi=1&page=5",
        "https://www.zomato.com/ncr/restaurants?category=1&wifi=1&page=6",
        "https://www.zomato.com/ncr/restaurants?category=1&wifi=1&page=7",
        "https://www.zomato.com/ncr/restaurants?category=1&wifi=1&page=8",
        "https://www.zomato.com/ncr/restaurants?category=1&wifi=1&page=9",
        "https://www.zomato.com/ncr/restaurants?category=1&wifi=1&page=10",
        "https://www.zomato.com/ncr/restaurants?category=1&wifi=1&page=11",
        "https://www.zomato.com/ncr/restaurants?category=1&wifi=1&page=12",
        "https://www.zomato.com/ncr/restaurants?category=1&wifi=1&page=13",
        "https://www.zomato.com/ncr/restaurants?category=1&wifi=1&page=14"
    ]
};