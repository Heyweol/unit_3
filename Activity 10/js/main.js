(function() {

    let attrArray = ["POPESTIMATE2020", "POPESTIMATE2021", "POPESTIMATE2022", "POPESTIMATE2023"]
    let expressed = attrArray[0];

    window.onload = function () {
        //map frame dimensions
        let width = window.innerWidth * 0.5,
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

        function callback(data) {
            csvData = data[0];
            csvData = csvData.filter(function (d) {
                return d.NAME !== "United States";
            })
            countriesData = data[1];
            statesData = data[2];

            console.log(csvData);
            console.log(countriesData);
            console.log(statesData);
            var countriesGeojson = topojson.feature(countriesData, countriesData.objects.countries);
            var statesGeojson = topojson.feature(statesData, statesData.objects.states).features;
            console.log(statesGeojson);

            setGraticule(map, path,countriesGeojson);

            statesGeojson = joinData(statesGeojson, csvData);

            var colorScale = makeColorScale(csvData);

            setEnumerationUnits(statesGeojson, map, path,colorScale);

            setChart(csvData, colorScale);




        };
    }

    function setGraticule(map, path,countriesGeojson) {
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
    }

    function joinData(statesGeojson, csvData) {
        for (var i = 0; i < csvData.length; i++) {
            var csvState = csvData[i];
            var stateFIPS = csvState.STATE;
            for (var a = 0; a < attrArray.length; a++) {
                var attr = attrArray[a];
                var val = parseFloat(csvState[attr]);
                for (var j = 0; j < statesGeojson.length; j++) {
                    if (statesGeojson[j].properties.state === stateFIPS.toString()) {
                        statesGeojson[j].properties[attr] = val;
                        break;
                    }
                }
            }
        }
        return statesGeojson;
    }

    function setEnumerationUnits(statesGeojson, map, path,colorScale) {


        var states = map.selectAll(".countries")
            .data(statesGeojson)
            .enter()
            .append("path")
            .attr("class", function (d) {
                return "State " + d.properties.name;
            })
            .attr("d", path)
            .attr("fill", "white")
            .attr("stroke", "black")
            .style("fill", function(d){
                let value = d.properties[expressed]
                if(value){
                    return colorScale(value);
                } else {
                    return "#ccc";
                }
            })
    }

    function makeColorScale(data){
        var colorClasses = [
            "#D4B9DA",
            "#C994C7",
            "#DF65B0",
            "#DD1C77",
            "#980043"
        ];

        //create color scale generator
        var colorScale = d3.scaleQuantile()
            .range(colorClasses);

        //build array of all values of the expressed attribute
        var domainArray = [];
        for (var i=0; i<data.length; i++){
            var val = parseFloat(data[i][expressed]);
            domainArray.push(val);
        };

        //assign array of expressed values as scale domain
        colorScale.domain(domainArray);

        return colorScale;
    }

    function setChart(csvData, colorScale){
        let chartWidth = window.innerWidth * 0.425,
            chartHeight = 460;
        //chart frame dimensions

        //create a second svg element to hold the bar chart
        const chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");

        const yScale = d3.scaleLinear()
            .range([0, chartHeight])
            .domain([d3.min(csvData, function(d){
                return parseFloat(d[expressed]);
            }),
                d3.max(csvData, function(d){
                return parseFloat(d[expressed]);
            })])

        //set bars for each province
        const bars = chart.selectAll(".bars")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function(a, b){
                return a[expressed]-b[expressed]
            })
            .attr("class", function(d){
                return "bars " + d.STATE;
            })
            .attr("width", chartWidth / csvData.length - 1)
            .attr("x", function(d, i){
                return i * (chartWidth / csvData.length);
            })
            .attr("height", function(d){
                return yScale(parseFloat(d[expressed]));
            })
            .attr("y", function(d){
                return chartHeight - yScale(parseFloat(d[expressed]));
            })
            .style("fill", function(d){
                return colorScale(d[expressed]);
            })


        const numbers = chart.selectAll(".numbers")
            .data(csvData)
            .enter()
            .append("text")
            .sort(function (a, b) {
                return a[expressed] - b[expressed]
            })
            .attr("class", function (d) {
                return "numbers " + d.STATE;
            })
            .attr("text-anchor", "right")
            .attr("x", function (d, i) {
                var fraction = chartWidth / csvData.length;
                return i * fraction + (fraction - 1) / 2;
            })
            .attr("y", function (d) {
                return chartHeight - yScale(parseFloat(d[expressed])) + 15+Math.random()*10;
            })
            .text(function (d) {
                return Math.round(d[expressed]/1000000) + "M";
            })

        var chartTitle = chart.append("text")
            .attr("x", 20)
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text("Number of Population Change in each State");




    }



})();
