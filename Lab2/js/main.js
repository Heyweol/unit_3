(function() {

    let attrArray = ["NPOPCHG_2020","NPOPCHG_2021","NPOPCHG_2022","NPOPCHG_2023"]
    let expressed = attrArray[0];
    var chartWidth = window.innerWidth * 0.425,
        chartHeight = 473,
        leftPadding = 25,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

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

            createDropdown();



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


        var states = map.selectAll(".states")
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
            .on("mouseover", function (event, d) {
                highlight(d.properties);
            })
            .on("mouseout", function (event, d) {
                dehighlight(d.properties);
            })
            .on("mousemove", moveLabel)

        var desc = states.append("desc")
            .text('{"stroke": "#000", "stroke-width": "0.5px"}');

        console.log(states)
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
                return "bars " + d.NAME;
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
            .on("mouseover", function(event, d){
                highlight(d);
            })
            .on("mouseout", function(event, d){
                dehighlight(d);
            })
        var desc = bars.append("desc")
            .text('{"stroke": "none", "stroke-width": "0px"}');


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
                return Math.round(d[expressed]/1000) + "k";
            })

        var chartTitle = chart.append("text")
            .attr("x", 20)
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text("Number of Population Change in each State");




    }

    //function to create a dropdown menu for attribute selection
    function createDropdown(){
        //add select element
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function(){
                changeAttribute(this.value, csvData)
            });

        //add initial option
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Attribute");

        //add attribute name options
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function(d){ return d })
            .text(function(d){ return d });
    };

    //dropdown change event handler
    function changeAttribute(attribute, csvData) {
        //change the expressed attribute
        expressed = attribute;
        //recreate the color scale
        var colorScale = makeColorScale(csvData);

        //recolor enumeration units
        var states = d3.selectAll(".State")
            .transition()
            .duration(1000)
            .style("fill", function(d) {
                var value = d.properties[expressed];
                if (value) {
                    return colorScale(value);
                } else {
                    return "#ccc";
                }
            });

        const yScale = d3.scaleLinear()
            .range([0, chartHeight])
            .domain([d3.min(csvData, function(d){
                return parseFloat(d[expressed]);
            }),
                d3.max(csvData, function(d){
                    return parseFloat(d[expressed]);
                })])

        var bars = d3.selectAll(".bars")
            .sort(function(a, b) {
                return a[expressed] - b[expressed];
            })
            .transition()
            .duration(1000)
            .attr("y", function(d) {
                return chartHeight - yScale((parseFloat(d[expressed])))  ;
            })
            .text(function(d) {
                return Math.round(d[expressed] / 1000) + "k";
            });

        //update the numbers
        var numbers = d3.selectAll(".numbers")
            .sort(function(a, b) {
                return a[expressed] - b[expressed];
            })
            .transition()
            .duration(500)
            .attr("y", function(d) {
                return chartHeight - yScale(parseFloat(d[expressed])) + 15 + Math.random() * 10;
            })
            .text(function(d) {
                return Math.round(d[expressed] / 1000) + "k";
            });
    }

    function highlight(props){
        var selected = d3.selectAll("." + props.name)
            .style("stroke", "blue")
            .style("stroke-width", "3");

        setLabel(props);
    }

    function dehighlight(props){

        var selected = d3.selectAll("." + props.name)
            .style("stroke", function(){
                return getStyle(this, "stroke")
            })
            .style("stroke-width", function(){
                return getStyle(this, "stroke-width")
            })

        function getStyle(element, styleName){
            var styleText = d3.select(element)
                .select("desc")
                .text();

            var styleObject = JSON.parse(styleText);

            return styleObject[styleName];
        };

        d3.select(".infolabel")
            .remove();
    }

    function setLabel(props){
        //label content
        var labelAttribute = "<h1>" + props[expressed] +
            "</h1><b>" + expressed + "</b>";
        console.log(labelAttribute)
        //create info label div
        var infolabel = d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.name + "_label")
            .html(labelAttribute);

        var stateName = infolabel.append("div")
            .attr("class", "labelname")
            .html(props.name);
    };

    function moveLabel(){
        //use coordinates of mousemove event to set label coordinates
        var x = event.clientX + 10,
            y = event.clientY - 75;

        d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px");
    };


})();
