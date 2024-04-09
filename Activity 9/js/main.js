//begin script when window loads
window.onload = function(){
    //map frame dimensions
    var width = 960,
        height = 460;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on France
    var projection = d3.geoAlbers()
        .parallels([29.5, 45.5])
        .scale(800)
        .translate([480, 250])
        .rotate([96, 0])
        .center([-0.6, 38.7]);

    var path = d3.geoPath()
        .projection(projection);

    //use Promise.all to parallelize asynchronous data loading
    var promises = [d3.csv("data/NST-EST2023-POPCHG2020_2023.csv"),
        d3.json("data/ne_countries.topojson"),
        d3.json("data/states-10m.topojson")
    ];
    Promise.all(promises).then(callback);

    function callback(data){
        csvData = data[0];
        countriesData = data[1];
        statesData = data[2];

        console.log(csvData);
        console.log(countriesData);
        console.log(statesData);
        var countriesGeojson = topojson.feature(countriesData, countriesData.objects.countries);
        var statesGeojson = topojson.feature(statesData, statesData.objects.states).features;
        console.log(statesGeojson);

        var graticule = d3.geoGraticule()
            .step([10, 10]); //place graticule lines every 5 degrees of longitude and latitude

        //create graticule background
        var gratBackground = map.append("path")
            .datum(graticule.outline()) //bind graticule background
            .attr("class", "gratBackground") //assign class for styling
            .attr("d", path) //project graticule

        //Example 2.6 line 5...create graticule lines
        var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
            .data(graticule.lines()) //bind graticule lines to each element to be created
            .enter() //create an element for each datum
            .append("path") //append each element to the svg as a path element
            .attr("class", "gratLines") //assign class for styling
            .attr("d", path); //project graticule lines

        var countries = map.append("path")
            .datum(countriesGeojson)
            .attr("class", "countries")
            .attr("d", path)

        var states = map.selectAll(".countries")
            .data(statesGeojson)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "State " + d.properties.name;
            })
            .attr("d", path)
            .attr("fill", "white")
            .attr("stroke", "black")


    };
};
