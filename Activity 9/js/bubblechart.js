// Add all scripts to the JS folder
window.onload = function() {
    const w = 900
    const h = 500

    let container = d3.select("body")
        .append("svg") //put a new svg in the body
        .attr("width", w) //assign the width
        .attr("height", h) //assign the height
        .attr("class", "container") //assign a class name
        .style("background-color", "rgba(0,0,0,0.2)"); //svg background color

    let innerRect = container.append("rect") //put a new rect in the svg
        .datum(400) //a single value is a DATUM
        .attr("width", function(d){ //rectangle width
            return d * 2; //400 * 2 = 800
        })
        .attr("height", function(d){ //rectangle height
            return d; //400
        })
        .attr("class", "innerRect") //class name
        .attr("x", 50) //position from left on the x (horizontal) axis
        .attr("y", 50) //position from top on the y (vertical) axis
        .style("fill", "#FFFFFF"); //fill color


    const cityPop = [
        {
            city: 'Madison',
            population: 233209
        },
        {
            city: 'Milwaukee',
            population: 594833
        },
        {
            city: 'Green Bay',
            population: 104057
        },
        {
            city: 'Superior',
            population: 27244
        }
    ];

    const x = d3.scaleLinear() //create the scale
        .range([90, 750]) //output min and max
        .domain([0, 3]); //input min and max


    const minPop = d3.min(cityPop, function(d){
        return d.population;
    });

    //find the maximum value of the array
    const maxPop = d3.max(cityPop, function (d) {
        return d.population;
    });

    //scale for circles center y coordinate
    const y = d3.scaleLinear()
        .range([450, 50])
        .domain([0, 700000]);
    const color = d3.scaleLinear()
        .range([
            "#fad762",
            "#f17761"
        ])
        .domain([
            minPop,
            maxPop
        ]);

    const circles = container.selectAll(".circles") //create an empty selection
        .data(cityPop) //here we feed in an array
        .enter() //one of the great mysteries of the universe
        .append("circle") //inspect the HTML--holy crap, there's some circles there
        .attr("class", "circles")
        .attr("id", function(d){
            return d.city;
        })
        .attr("r", function(d){
            //calculate the radius based on population value as circle area
            var area = d.population * 0.01;
            return Math.sqrt(area/Math.PI);
        })
        .attr("cx", function(d, i){
            return x(i);
        })
        .attr("cy", function(d){
            return y(d.population)
        })
        .style("fill", function(d, i){
            return color(d.population);
        })
        .style("stroke", "#000");


    const yAxis = d3.axisLeft(y);




    //create axis g element and add axis
    const axis = container.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(50, 0)")
        .call(yAxis);


    const title = container.append("text")
        .attr("class", "title")
        .attr("text-anchor", "middle")
        .attr("x", 450)
        .attr("y", 30)
        .text("City Populations");

    const labels = container.selectAll(".labels")
        .data(cityPop)
        .enter()
        .append("text")
        .attr("class", "labels")
        .attr("text-anchor", "left")
        .attr("y", function (d) {
            //vertical position centered on each circle
            return y(d.population) + 5;
        });

    //first line of label
    const nameLine = labels.append("tspan")
        .attr("class", "nameLine")
        .attr("x", function (d, i) {
            //horizontal position to the right of each circle
            return x(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5;
        })
        .text(function (d) {
            return d.city;
        });

    //second line of label
    const popLine = labels.append("tspan")
        .attr("class", "popLine")
        .attr("x", function(d,i){
            return x(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5;
        })
        .attr("dy", "15") //vertical offset
        .text(function(d){
            return "Pop. " + d3.format(",")(d.population);
        });


}