require("babel-core/register");
require("babel-polyfill");

/* global d3 */
let NUM_GAMES, START_YEAR, END_YEAR, INTERVAL, GAME_TICK_INTERVAL, DEFAULT_TEAM, PADDING
const LEAGUE = 'WNBA'

function resize() {
	setConfig(LEAGUE)
	drawSeasonPaths(LEAGUE)
}

function init() {
	setConfig(LEAGUE)
	drawSeasonPaths(LEAGUE)
}

const teamAccessor = d => d.team
const teamParentAccessor = d => d.parent
const dateAccessor = d => new Date(d.date * 1000) //convert to milliseconds
const yearAccessor = d => d.year
const colorAccessor = d => d.primary_color
const secondaryColorAccessor = d => d.secondary_color
const winAccessor = d => d.win
const lossAccessor = d => d.loss
const countAccessor = d => d.count


async function setConfig(league) {
		// 0. Update global variables
	if (league == 'WNBA') {
		START_YEAR = 1997
		END_YEAR = 2019
		NUM_GAMES = 34
		INTERVAL = 10
		GAME_TICK_INTERVAL = 5
		DEFAULT_TEAM = "Dallas Wings"
		PADDING = 1.5
	} else if (league == 'NBA') {
		START_YEAR = 1946
		END_YEAR = 2020
		NUM_GAMES = 82
		INTERVAL = 10
		GAME_TICK_INTERVAL = 10
		DEFAULT_TEAM = "Atlanta Hawks"
		PADDING = 1
	}
}

function drawBaseTiles(league) {
	// 2. Define Dimensions
	const wrapperWidth = d3.select("#wrapper").node().offsetWidth
	const width = d3.min([
		wrapperWidth,
		window.innerHeight * 0.85,
		])
	let dimensions = {
		width: width,
		height: width,
		margin: {
			top: 60,
			right: 45,
			bottom: 60,
			left: 90,
		},
		legendWidth: width * 0.6,
		legendHeight: 20,
	}
	dimensions.boundedWidth = dimensions.width - dimensions.margin.left - dimensions.margin.right
	dimensions.boundedHeight = dimensions.height - dimensions.margin.top - dimensions.margin.bottom

	// 3. Draw Canvas
	const wrapper = d3.select("#wrapper")
		.append("svg")
			.style("transform", `translate(${wrapperWidth / 2 - dimensions.width / 2}px, ${0}px)`)
			.attr("width", dimensions.width)
			.attr("height", dimensions.height)

	const bounds = wrapper.append("g")
		.style("transform", `translate(${dimensions.margin.left}px, ${dimensions.margin.top}px)`)

	// const boundsBackground = bounds.append("rect")
	// 	.attr("class", "bounds-background")
	// 	.attr("x", 0)
	// 	.attr("width", dimensions.boundedWidth)
	// 	.attr("y", 0)
	// 	.attr("height", dimensions.boundedHeight)

	// 4. Create Scales
	const tileSize = dimensions.boundedWidth / NUM_GAMES - PADDING
	const xScale = d3.scaleLinear()
		.domain([0, NUM_GAMES])
		.range([0, dimensions.boundedWidth - tileSize])

	const yScale = d3.scaleLinear()
		.domain([0, NUM_GAMES])
		.range([dimensions.boundedHeight - tileSize, 0])

	const yearIntervals = getIntervalArray(START_YEAR, END_YEAR, INTERVAL)

	// 5. Draw Data
	const defaultTileData = getEmptyWinLossData()
	const tilesGroup = bounds.append("g")
	const tiles = tilesGroup.selectAll(".rect")
		.data(defaultTileData, d => d[0])
		.join("rect")
			.attr("class", "rect")
			.attr("height", tileSize)
  			.attr("width", tileSize)
			.attr("x", (d) => xScale(lossAccessor(d)) + PADDING / 2)
			.attr("y", (d) => yScale(winAccessor(d)) + PADDING / 2)
			.attr("id", (d,i) => `tile-${i}`)
			.style("fill", "#d8d8d8")

	const winLossGroup = bounds.append("g")
	const winsText = winLossGroup.append("text")
		.text("Wins")
		.attr("x", -12)
		.attr("y", -10)
		.attr("font-size", 10)
		.attr("text-anchor", "middle")
		.attr("fill", "#b5b5b5")
		// .attr("opacity", 0.5)
	const lossesText = winLossGroup.append("text")
		.text("Losses")
		.attr("x", dimensions.boundedWidth + 10)
		.attr("y", dimensions.boundedHeight + 12)
		.attr("font-size", 10)
		.attr("text-anchor", "start")
		.attr("alignment-baseline", "middle")
		.attr("fill", "#b5b5b5")
		// .attr("opacity", 0.5)

	const winLossIntervals = getIntervalArray(GAME_TICK_INTERVAL, NUM_GAMES, GAME_TICK_INTERVAL)
	const winLabels = winLossGroup.selectAll(".win-loss-label")
		.data(winLossIntervals)
		.enter()
		.append("text")
			.text(d => d)
			.attr("x", -12)
			.attr("y", win => yScale(win-0.5))
			.attr("font-size", 10)
			.attr("text-anchor", "middle")
			.attr("alignment-baseline", "middle")
			.attr("fill", "#b5b5b5")

	const lossLabels = winLossGroup.selectAll(".win-loss-label")
		.data(winLossIntervals)
		.enter()
		.append("text")
			.text(d => d)
			.attr("x", loss => xScale(loss + 0.5))
			.attr("y", dimensions.boundedHeight + 12)
			.attr("font-size", 10)
			.attr("text-anchor", "middle")
			.attr("alignment-baseline", "middle")
			.attr("fill", "#b5b5b5")

	const zeroLabel = bounds.append("text")
		.text("0")
		.attr("x", -12)
		.attr("y", dimensions.boundedHeight + 12)
		.attr("font-size", 10)
		.attr("text-anchor", "start")
		.attr("alignment-baseline", "middle")
		.attr("fill", "#b5b5b5")

	return [wrapper, bounds, dimensions, tiles, tilesGroup, yearIntervals, xScale, yScale]
}


function substringMatcher(strs) {
	return function findMatches(q, cb) {
		// an array that will be populated with substring matches
		const matches = [];
		// regex used to determine if a string contains the substring `q`
		const substrRegex = new RegExp(q, 'i');
		// iterate through the pool of strings and for any string that
		// contains the substring `q`, add it to the `matches` array
		for (var i = 0; i < strs.length; i++) {
			const str = strs[i]
			if (substrRegex.test(str)) {
				matches.push(str);
			}
		}
		cb(matches);
	};
};


async function drawSeasonPaths(league) {
	const [wrapper, bounds, dimensions, tiles, tilesGroup, yearIntervals, xScale, yScale] = drawBaseTiles(league)
	const seasonData = await d3.json(`./../assets/data/${league}_season_paths.json`)
	const teamData = await d3.json(`./../assets/data/${league}_teams.json`)
	const teams = Object.keys(teamData)
	

	// bounds.on("mousemove", onMouseMove)

	// function onMouseMove(e) {
	// 	const [x, y] = d3.mouse(this)
	// 	const mouseLosses = Math.round(xScale.invert(x))
	// 	const mouseWins = Math.round(yScale.invert(y))
	// 	const mouseTotal = mouseLosses + mouseWins
	// 	let timer;
	//     let fadeInBuffer = false;
	// 	if (mouseLosses > 0 && mouseWins > 0 && mouseTotal <= NUM_GAMES) {
	// 		if (!fadeInBuffer && timer) {
	// 			clearTimeout(timer);
	// 			timer = 0;
	// 			d3.select('html').style("cursor", "none")
	// 		} else {
	// 			bounds.style("cursor", "default")
	// 			fadeInBuffer = false;
	// 		}
	// 		timer = setTimeout(function() {
	// 			bounds.style("cursor", "none")
	// 			fadeInBuffer = true;
	// 		}, 1000)
	// 	} else {
	// 		clearTimeout(timer);
	// 		timer = 0;
	// 		fadeInBuffer = false;
	// 		bounds.style("cursor", "default")
	// 	}
	// }

	$('.typeahead').on('focus', function() {
	    $(this).parent().siblings().addClass('active');
	}).on('blur', function() {
	    if (!$(this).val()) {
	        $(this).parent().siblings().removeClass('active');
	    }
	});

	$('#nba-team-input').typeahead({
		hint: true,
		highlight: true,
		minLength: 0
	},
	{
		name: 'teams',
		limit: 200,
		source: substringMatcher(teams)
	});

	drawSeasonPathsByTeam(league, DEFAULT_TEAM, seasonData, teamData, wrapper, bounds, dimensions, tiles, tilesGroup, yearIntervals, xScale, yScale)
	const nbaTeamInput = d3.select("#nba-team-input")
		.attr('value', DEFAULT_TEAM)
	
	const wrapperWidth = d3.select("#wrapper").node().offsetWidth
	$('#nba-autocomplete').css({"transform":`translate(${wrapperWidth / 2 - dimensions.width / 2 + 160}px, ${-dimensions.height - dimensions.margin.top / 4}px)`})

	$('#nba-team-input').on('typeahead:selected', function (e, team) {
		drawSeasonPathsByTeam(league, team, seasonData, teamData, wrapper, bounds, dimensions, tiles, tilesGroup, yearIntervals, xScale, yScale)
	});
}

async function drawSeasonPathsByTeam(league, team, seasonData, teamData, wrapper, bounds, dimensions, tiles, tilesGroup, yearIntervals, xScale, yScale) {
	bounds.selectAll(".season-path").remove()
	bounds.selectAll(".season-label").remove()
	bounds.selectAll(".legend-tile").remove()
	bounds.selectAll(".legend-value").remove()
	bounds.selectAll(".bookend-legend-tile").remove()
	bounds.selectAll(".championship-star").remove()
	bounds.selectAll(".record-label").remove()
	wrapper.selectAll(".team-logo").remove()
	wrapper.selectAll(".team-logo-label").remove()

	// 5. Draw Data
	// Plotting Season Paths
	const filterTeam = team
	const filteredCumulativeSeasons = seasonData[filterTeam]['cumulative_seasons']
	const seasonsData = seasonData[filterTeam]['seasons']
	const seasons = Object.keys(seasonsData)
	const seasonIntervals = getIntervalArray(seasons[0], seasons[seasons.length - 1], INTERVAL)
	const seasonLineGenerator = d3.line()
		.x(d => xScale(lossAccessor(d)) + (dimensions.boundedWidth / NUM_GAMES) / 2)
		.y(d => yScale(winAccessor(d)) + (dimensions.boundedWidth / NUM_GAMES) / 2)

	const primaryColor = teamData[filterTeam]['primary_color']
	const secondaryColor = teamData[filterTeam]['secondary_color']
	d3.select("#nba-team-input")
		.style("border-bottom", `3px solid ${secondaryColor}`)
		.style("color", primaryColor)
	d3.select("#nba-autocomplete")
		.style("display", "block")

	const numTeamColors = yearIntervals.length
	const primaryTeamColors = makeColors(primaryColor, 0, numTeamColors, 0.8)
	const secondaryTeamColors = makeColors(secondaryColor, 0, numTeamColors, 0.8)
	const primaryTeamColorScale = d3.scaleThreshold()
  		.domain(yearIntervals)
  		.range(primaryTeamColors);
	const secondaryTeamColorScale = d3.scaleThreshold()
  		.domain(yearIntervals)
  		.range(secondaryTeamColors);

  	const seasonPaths = bounds.selectAll(".path")
		.data(seasons)
		.enter()
		.append("path")
			.attr("class", "season-path")
			.attr("d", d => seasonLineGenerator(formatSeasonToDrawPath(seasonsData[d], xScale))) // season
			.attr("fill", "none")
			.attr("stroke", d => primaryTeamColorScale(d)) // year
			.attr("stroke-width", dimensions.boundedWidth / NUM_GAMES - PADDING)
			.attr("id", d => Math.round(d))

	const championshipSeasons = seasonData[filterTeam]['championship_seasons']
	const seasonLabels = bounds.selectAll(".season-label")
		.data(seasons)
		.enter()
		.append("text")
			.attr("class", "season-label")
			.attr("x", d => {
				const seasonArray = formatSeasonToDrawPath(seasonsData[d], xScale)
				const finalRecordLosses = lossAccessor(seasonArray[seasonArray.length - 1])
				return xScale(finalRecordLosses + 0.5) + 25
			})
			.attr("y", d => {
				const seasonArray = formatSeasonToDrawPath(seasonsData[d], xScale)
				const finalRecordWins = winAccessor(seasonArray[seasonArray.length - 1])
				return yScale(finalRecordWins) - 5
			})			
			.text(d => `${d}`)
			.style("opacity", 0)
			.style("fill", d => secondaryTeamColorScale(d))
			.attr("text-anchor", "end")
			.style("alignment-baseline", "middle")
			.style("font-size", 9)	
			// .attr("stroke-opacity", )

	const championshipLabels = seasonLabels.filter(d => championshipSeasons.includes(parseInt(d)))
	championshipLabels.style("opacity", 1)
	
	const championshipStarSize = 40
	const championshipStars = bounds.selectAll(".championship-star")
		.data(championshipSeasons)
  		.enter()
		.append("g")
			.attr("class", "championship-star")
			.attr("transform", season => {
				const seasonArray = formatSeasonToDrawPath(seasonsData[season], xScale)
				const finalRecordLosses = lossAccessor(seasonArray[seasonArray.length - 1])
				const finalRecordWins = winAccessor(seasonArray[seasonArray.length - 1])
				const x = xScale(finalRecordLosses + 0.5) + 35
				const y = yScale(finalRecordWins) - 7
				return `translate(${x},${y})`
			})
			.attr("fill", "black")
			.attr("stroke-width", 1)
		.append("path")
			.attr("d", function(d) {return d3.symbol().type(d3.symbolStar).size(championshipStarSize)()})
			.attr("stroke", d => secondaryTeamColorScale(d))
			.style("fill", d => primaryTeamColorScale(d))
			.style("opacity", 1)

	// 6. Draw Peripherals
	// Define legend
	const fillerLegendGroup = bounds.append("g")
	const legendGroup = bounds.append("g")
	const legendTileWidth = Math.min(dimensions.legendWidth / yearIntervals.length, dimensions.legendWidth / 9)
	const legendY = dimensions.boundedHeight + 25
	const legendX = 0
	const legendXPadding = 5
	const legendXRange = Array.from({length: yearIntervals.length}, (_, n) => legendX + (n)*(legendTileWidth+legendXPadding))
	const legendXScale = d3.scaleLinear()
		.domain(d3.extent(yearIntervals))
		.range(d3.extent(legendXRange))

	const grayColors = makeColors("#d8d8d8")
	const grayContinuousScale  = d3.scaleLinear()
 		.domain(yearIntervals)
		.range(grayColors)
		.interpolate(d3.interpolateRgb);

	const firstYear = parseInt(seasons[0])
	const lastYear = parseInt(seasons[seasons.length - 1])

	const fillerIntervals = yearIntervals.filter(d => !seasonIntervals.includes(d))
	const fillerTiles = fillerLegendGroup.selectAll(".rect")
	  .data(fillerIntervals)
	  .enter()
	  .append("rect")
	    .attr("class", "legend-tile")
	    .attr("x", d => legendXScale(d))
	    .attr("y", legendY) // 100 is where the first dot appears. 25 is the distance between dots
	    .attr("width", legendTileWidth)
	    .attr("height", dimensions.legendHeight)
	    .style("fill", d => "#d8d8d8")
	    .style("opacity", 0.5)

	const fillerLabels = fillerLegendGroup.selectAll(".text")
	  .data(fillerIntervals)
	  .enter()
	  .append("text")
	  	.attr("class", "legend-value")
	    .attr("x", d => legendXScale(d) + legendTileWidth / 2)
	    .attr("y", legendY + dimensions.legendHeight + 10)
	    .style("fill", d => "#d8d8d8")
	    .text(d => `${d}s`)
	    .attr("text-anchor", "middle")
	    .style("alignment-baseline", "middle")
	    .style("font-size", 10)	

	const legendTiles = legendGroup.selectAll(".legend-tile")
	  .data(seasonIntervals)
	  .enter()
	  .append("rect")
	    .attr("class", "legend-tile")
	    // .attr("x", d => legendXScale(d))
	    .attr("x", d => {
	    	if (firstYear >= d && firstYear <= (d + INTERVAL - 1)) {
	    		return legendXScale(d) + legendTileWidth * ((firstYear - d) / INTERVAL)
	    	}
	    	return legendXScale(d)
	    })
	    .attr("y", legendY) // 100 is where the first dot appears. 25 is the distance between dots
	    // .attr("width", legendTileWidth)
	    .attr("width", (d) => {
	    	if (firstYear >= d && firstYear <= (d + INTERVAL - 1)) {
	    		let multiplier = 1 - (firstYear - d) / INTERVAL
	    		if (lastYear >= d && lastYear <= (d + INTERVAL - 1)) {
	    			multiplier = (lastYear - firstYear + 1) / INTERVAL
	    		}
	    		return legendTileWidth * multiplier
	    	}
	    	if (lastYear >= d && lastYear <= (d + INTERVAL - 1)) {
	    		const multiplier = (lastYear - d + 1) / INTERVAL
	    		return legendTileWidth * multiplier
	    	}
	    	return legendTileWidth
	    })
	    .attr("height", dimensions.legendHeight)
	    .style("fill", d => primaryTeamColorScale(d))
	    .style("opacity", 1)

	const bookendYears = [seasonIntervals[0], seasonIntervals[seasonIntervals.length - 1]]
	const bookendTiles = legendGroup.selectAll(".bookend-legend-tile")
		.data(bookendYears)
		.enter()
		.append("rect")
			.attr("class", "bookend-legend-tile")
			.attr("x", (d,i) => {
		    	if (i === 1 && lastYear >= d && lastYear <= (d + INTERVAL - 1)) {
		    		return legendXScale(d) + legendTileWidth * ((lastYear + 1 - d) / INTERVAL)
		    	}
		    	return legendXScale(d)
		    })
		    .attr("y", legendY)
		    .attr("width", (d, i) => {
	    		if (firstYear >= d && firstYear <= (d + INTERVAL - 1)) {
	    			let multiplier = 1 - (firstYear - d) / INTERVAL
		    		if (i === 1 && lastYear >= d && lastYear <= (d + INTERVAL - 1)) {
		    			multiplier = (lastYear - d + 1) / INTERVAL
		    		}
		    		return legendTileWidth - legendTileWidth * multiplier
		    	}
		    	if (i === 1 && lastYear >= d && lastYear <= (d + INTERVAL - 1)) {
		    		const multiplier = (lastYear - d + 1) / INTERVAL
		    		return legendTileWidth - legendTileWidth * multiplier
		    	}
	    		return legendTileWidth
	    })
	    .attr("height", dimensions.legendHeight)
	    .style("fill", "#d8d8d8")
	    .style("opacity", 0.5)

	const legendLabels = legendGroup.selectAll(".legend-value")
	  .data(seasonIntervals)
	  .enter()
	  .append("text")
	  	.attr("class", "legend-value")
	    .attr("x", d => legendXScale(d) + legendTileWidth / 2)
	    .attr("y", legendY + dimensions.legendHeight + 10)
	    .style("fill", d => primaryTeamColorScale(d))
	    .text(d => {
	    	// let labelYear = d
	    	// if (firstYear >= d && firstYear <= (d + INTERVAL - 1)) {
	    	// 	if (lastYear >= d && lastYear <= (d + INTERVAL - 1)) {
	    	// 		if (firstYear == lastYear) {
	    	// 			return `${firstYear}`
	    	// 		}
	    	// 		return `${firstYear} - ${lastYear}`
	    	// 	}
	    	// 	return `${firstYear}`
	    	// } else if (lastYear >= d && lastYear <= (d + INTERVAL - 1)) {
	    	// 	return `${lastYear}`
	    	// }
	    	return `${d}s`
	    })
	    .attr("text-anchor", "middle")
	    .style("alignment-baseline", "middle")
	    .style("font-size", 10)	

	let orderedTeamHistory = teamData[filterTeam]['history'] === 0 ? [filterTeam] : JSON.parse(teamData[filterTeam]['history'])
	const teamParent = teamData[filterTeam]['parent']
	if (![0, 'deprecated'].includes(teamParent)) {
		orderedTeamHistory =  JSON.parse(teamData[teamParent]['history'])
	}

	const logoShift = 20
	const logoSize = 55
	const logoPadding = 25
	const logoFade = 0.4
	const logoY = -15
	const logo = bounds.selectAll(".team-logo")
		.data(orderedTeamHistory)
		.enter()
		.append("svg:image")
			.attr("class", "team-logo")
			.attr("xlink:href", team => `./../assets/images/logos/${league}/${team}.png`)
			.attr("width", logoSize)
			.attr("height", logoSize)
			.attr("x", -dimensions.margin.left + logoShift / 2 - 10)
			.attr("y", (d,i) => logoY + (i) * (logoSize + logoPadding))
			.attr("opacity", d => {
				if (d === filterTeam) {
					return 1
				} else {
					return logoFade
				}

			})
			.style('filter', d => {
				if (d !== filterTeam) {
					return 'url(#grayscale)'
				}
				return
			})

	const logoLabel = bounds.selectAll(".team-logo-label")
		.data(orderedTeamHistory)
		.enter()
		.append("text")
			.text(d => {
				const logoSeasons = Object.keys(seasonData[d]['seasons'])
				const logoStartYear = logoSeasons[0]
				const logoEndYear = parseInt(logoSeasons[logoSeasons.length - 1]) === END_YEAR ? "Now" : logoSeasons[logoSeasons.length - 1]
				if (logoStartYear === logoEndYear) {
					return logoStartYear
				}
				return `${logoStartYear} - ${logoEndYear}`
			})
			.attr("class", "team-logo-label")
			.attr("x", -dimensions.margin.left + logoShift / 2 + logoSize / 2 - 10)
			.attr("y", (d,i) =>  logoY + (i + 1) * (logoSize + logoPadding) - logoPadding * .6)
			.attr("text-anchor", "middle")
			.style("font-size", 10)	
			.attr("opacity", d => {
				if (d === filterTeam) {
					return 1
				} else {
					return logoFade
				}
			})
			.attr("fill", d => {
				if (d === filterTeam) {
					return teamData[d]['primary_color']
				} else {
					return "d8d8d8"
				}
			})

	const hoverSquare = bounds.append("rect")
		.attr("class", "rect")
		.attr("height", dimensions.boundedWidth / NUM_GAMES - PADDING)
		.attr("width", dimensions.boundedWidth / NUM_GAMES - PADDING)
		.attr("fill", "transparent")
		.attr("x", 0)
		.attr("y", 0)
		.style("opacity", 0)
		.style("stroke", "white")
		.style("stroke-width", "1.5px")
	const hoverWin = bounds.append("text")
		.text('0')
		.attr("class", "record-label")
		.attr("x", dimensions.boundedWidth * .75)
		.attr("y", 40)
		.attr("text-anchor", "end")
		.style("font-size", 20)
		.style("fill", primaryColor)
		.style("opacity", 0)
	const hoverHyphen = bounds.append("text")
		.text('-')
		.attr("class", "record-label")
		.attr("x", dimensions.boundedWidth * .75 + 14.5)
		.attr("y", 40)
		.attr("text-anchor", "middle")
		.style("font-size", 20)
		.style("fill", primaryColor)
		.style("opacity", 0)
	const hoverLoss = bounds.append("text")
		.text('0')
		.attr("class", "record-label")
		.attr("x", dimensions.boundedWidth * .75 + 29)
		.attr("y", 40)
		.attr("text-anchor", "start")
		.style("font-size", 20)
		.style("fill", primaryColor)
		.style("opacity", 0)

	// // 7. Create Interactions
	const legendFade = 0.25
	let seasonFade = 0.05
	let seasonSemiFade = 0.25

	if (seasons.length < 15) {
		seasonFade = 0.1
		seasonSemiFade = 0.35
	}

	let intervalStart, intervalEnd

	let filteredSeasons = {'_groups': [[]]}
	let filteredSeasonLabels = {'_groups': [[]]}
	let filteredChampionshipStars = {'_groups': [[]]}

	let matchingSeasons = {'_groups': [[]]}
	let matchingSeasonLabels = {'_groups': [[]]}
	let matchingChampionshipStars = {'_groups': [[]]}

	logo.on("click", onLogoMouseClick)
	function onLogoMouseClick(clickedTeam) {
		if (clickedTeam !== filterTeam) {
			const nbaInput = d3.select("#nba-team-input")
			nbaInput.property("value", clickedTeam);
			drawSeasonPathsByTeam(league, clickedTeam, seasonData, teamData, wrapper, bounds, dimensions, tiles, tilesGroup, yearIntervals, xScale, yScale)
		}
	}

	legendGroup.on("click", onLegendMouseClick)
	drawVoronoi(seasons, seasonsData, xScale, yScale, dimensions, bounds, onSeasonPathMouseEnter, onSeasonPathMouseLeave, onSeasonPathMouseMove)

	function onSeasonPathMouseMove(datum) {
		const [x, y] = d3.mouse(this)
		const mouseLosses = Math.round(xScale.invert(x))
		const mouseWins = Math.round(yScale.invert(y))
		const mouseTotal = mouseLosses + mouseWins
		if (mouseTotal > 1.15 * NUM_GAMES) {
			if (filteredSeasons._groups[0].length > 0) {
				filteredSeasons.style("opacity", 1)
				filteredSeasonLabels.style("opacity", 1)
				filteredChampionshipStars.style("opacity", 1)
			} else {
				seasonPaths.style("opacity", 1)
				seasonLabels.style("opacity", 0)
				championshipStars.style("opacity", 1)
				championshipLabels.style("opacity", 1)
			}
			hoverSquare.style("opacity", 0)
			hoverWin.text(mouseWins).style("opacity", 0)
			hoverHyphen.style("opacity", 0)
			hoverLoss.text(mouseLosses).style("opacity", 0)

		} else if (mouseTotal <= 1.15 * NUM_GAMES && mouseTotal > NUM_GAMES) {
			if (matchingSeasons._groups[0].length > 0) {
				hoverSquare.style("opacity", 1)
				if (filteredSeasons._groups[0].length > 0) {
					filteredSeasons.style("opacity", seasonSemiFade)
					filteredSeasonLabels.style("opacity", seasonSemiFade)
					filteredChampionshipStars.style("opacity", seasonSemiFade)
					matchingSeasons.style("opacity", 1)
					matchingSeasonLabels.style("opacity", 1)
					matchingChampionshipStars.style("opacity", 1)
				} else {
					seasonPaths.style("opacity", seasonFade)
					championshipStars.style("opacity", seasonFade)
					championshipLabels.style("opacity", seasonFade)
					matchingSeasons.style("opacity", 1)
					matchingSeasonLabels.style("opacity", 1)
					matchingChampionshipStars.style("opacity", 1)
				}
			}
		}
	}

	function onSeasonPathMouseEnter(datum) {
		const losses = Math.round(xScale.invert(datum[0]))
		const wins = Math.round(yScale.invert(datum[1]))
		const matchingYears = getMatchingYearsFromWinsAndLosses(wins, losses, seasons, seasonsData)

		hoverSquare
			.attr("transform", `translate(${xScale(losses) + PADDING / 2}, ${yScale(wins) + PADDING / 2})`)
			.style("opacity", 1)

		hoverWin.text(wins).style("opacity", 1)
		hoverHyphen.style("opacity", 1)
		hoverLoss.text(losses).style("opacity", 1)

		if (filteredSeasons._groups[0].length > 0) {
			matchingSeasons = filteredSeasons.filter(d => matchingYears.includes(parseInt(d)))
			matchingSeasonLabels = filteredSeasonLabels.filter(d => matchingYears.includes(parseInt(d)))
			matchingChampionshipStars = filteredChampionshipStars.filter(d => matchingYears.includes(parseInt(d)))
			if(matchingSeasons._groups[0].length > 0) {
				filteredSeasons.style("opacity", seasonSemiFade)
				filteredSeasonLabels.style("opacity", seasonSemiFade)
				filteredChampionshipStars.style("opacity", seasonSemiFade)
				matchingSeasons.style("opacity", 1)
				matchingSeasonLabels.style("opacity", 1)
				matchingChampionshipStars.style("opacity", 1)
			}
		} else {
			matchingSeasons = seasonPaths.filter(d => matchingYears.includes(parseInt(d)))
			matchingSeasonLabels = seasonLabels.filter(d => matchingYears.includes(parseInt(d)))
			matchingChampionshipStars = championshipStars.filter(d => matchingYears.includes(parseInt(d)))
			seasonPaths.style("opacity", seasonFade)
			championshipStars.style("opacity", seasonFade)
			championshipLabels.style("opacity", seasonFade)
			matchingSeasons.style("opacity", 1)
			matchingSeasonLabels.style("opacity", 1)
			matchingChampionshipStars.style("opacity", 1)
		}
	}

	function onSeasonPathMouseLeave(datum) {
		if (filteredSeasons._groups[0].length > 0) {
			filteredSeasons.style("opacity", 1)
			filteredSeasonLabels.style("opacity", 1)
			filteredChampionshipStars.style("opacity", 1)
		} else {
			seasonPaths.style("opacity", 1)
			seasonLabels.style("opacity", 0)
			championshipStars.style("opacity", 1)
			championshipLabels.style("opacity", 1)
		}
		hoverSquare.style("opacity", 0)
		hoverWin.style("opacity", 0)
		hoverHyphen.style("opacity", 0)
		hoverLoss.style("opacity", 0)
	}

	let allLegendsSelected = true
	let newLegendSelected = false
	let oldLegendTile, currentLegendTile

	function onLegendMouseClick(e) {
		const [x] = d3.mouse(this)
		const clickedYear = legendXScale.invert(x)
		intervalStart = Math.floor(clickedYear / INTERVAL) * INTERVAL
		intervalEnd = intervalStart + (INTERVAL - 1)
		const intervalYears = range(intervalStart, intervalEnd)

		filteredSeasons = seasonPaths.filter(d => d >= intervalStart && d <= intervalEnd)
		filteredSeasonLabels = seasonLabels.filter(d => d >= intervalStart && d <= intervalEnd)
		filteredChampionshipStars = championshipStars.filter(d => d >= intervalStart && d <= intervalEnd)
		const filteredLegendTiles = legendTiles.filter(d => d >= intervalStart && d <= intervalEnd)
		const otherLegendTiles = legendTiles.filter(d => d < intervalStart || d > intervalEnd)
		const filteredLegendLabels = legendLabels.filter(d => d >= intervalStart && d <= intervalEnd)
		const otherLegendLabels = legendLabels.filter(d => d < intervalStart || d > intervalEnd)
		
		currentLegendTile = filteredLegendTiles.data()[0]
		newLegendSelected = currentLegendTile !== oldLegendTile

		if (currentLegendTile != null) {
			if (!allLegendsSelected && !newLegendSelected) {
				drawVoronoi(seasons, seasonsData, xScale, yScale, dimensions, bounds, onSeasonPathMouseEnter, onSeasonPathMouseLeave, onSeasonPathMouseMove)
				seasonPaths.style("opacity", 1)
				seasonLabels.style("opacity", 0)
				legendTiles.style("opacity", 1).style("stroke-opacity", 0)
				legendLabels.style("opacity", 1).style("stroke", d => primaryTeamColorScale(d))
				championshipStars.style("opacity", 1)
				championshipLabels.style("opacity", 1)
				filteredSeasons = {'_groups': [[]]}
				filteredSeasonLabels = {'_groups': [[]]}
				filteredChampionshipStars = {'_groups': [[]]}
				allLegendsSelected = true
			} else {
				drawVoronoi(intervalYears, seasonsData, xScale, yScale, dimensions, bounds, onSeasonPathMouseEnter, onSeasonPathMouseLeave, onSeasonPathMouseMove)
				seasonPaths.style("opacity", seasonFade)
				seasonLabels.style("opacity", 0)
				championshipStars.style("opacity", seasonFade)
				otherLegendTiles.style("opacity", legendFade)
				otherLegendLabels.style("opacity", legendFade).style("stroke", d => primaryTeamColorScale(d))
				filteredSeasons.style("opacity", 1)
				filteredLegendTiles.style("opacity", 1) //.style("stroke-opacity", 1).style("stroke", d => secondaryTeamColorScale(d))
				filteredLegendLabels.style("opacity", 1).style("stroke", d => secondaryTeamColorScale(d))
				filteredSeasonLabels.style("opacity", 1)
				filteredChampionshipStars.style("opacity", 1)
				allLegendsSelected = false
			}
		}
		oldLegendTile = currentLegendTile
	}
}

function drawVoronoi(years, seasonsData, xScale, yScale, dimensions, bounds, onMouseEnter, onMouseLeave, onMouseMove) {
	bounds.selectAll(".voronoi").remove()
	const voronoiPoints = getVoronoiPoints(years, seasonsData, xScale, yScale)
	const voronoi = getVoronoi(voronoiPoints, dimensions)
	const voronoiDiagram = bounds.selectAll(".voronoi")
		.data(voronoiPoints)
		.enter()
		.append("path")
			.attr("class", "voronoi")
			.attr("d", (d,i) => voronoi.renderCell(i))
			// .attr("stroke", "salmon")
			.on("mousemove", onMouseMove)
			.on("mouseenter", onMouseEnter)
			.on("mouseleave", onMouseLeave)
			
}

function getVoronoi(points, dimensions) {
	const delaunay = d3.Delaunay.from(points)
	const voronoi = delaunay.voronoi()
	voronoi.xmax = dimensions.boundedWidth + dimensions.boundedWidth / NUM_GAMES
	voronoi.ymax = dimensions.boundedHeight + dimensions.boundedWidth / NUM_GAMES
	return voronoi
}

function getVoronoiPoints(seasons, seasonsData, xScale, yScale) {
	const gamesSeen = {}
	const points = []
	for (var i = 0; i < seasons.length; i++) {
		const year = seasons[i].toString()
		if (year in seasonsData) {
			const seasonXValues = formatSeasonToDrawPath(seasonsData[seasons[i]], xScale).map(game => {return xScale(game.loss)})
			const seasonYValues = formatSeasonToDrawPath(seasonsData[seasons[i]], yScale).map(game => {return yScale(game.win)})
			for (var j = 0; j < seasonXValues.length; j++) {
				const gameX = seasonXValues[j]
				const gameY = seasonYValues[j]
				const gameKey = `${gameX}_${gameY}`
				if (!(gameKey in gamesSeen)) {
					gamesSeen[gameKey] = 1
					points.push([gameX, gameY])
				} else {
					gamesSeen[gameKey] += 1
				}
			}
		}
	}
	return points
}

function getMatchingYearsFromWinsAndLosses(wins, losses, seasons, seasonsData) {
	const matchingYears = []
	const winString = (wins > 9) ? wins.toString() : `0${wins.toString()}`
	const lossString = (losses > 9) ? losses.toString() : `0${losses.toString()}`
	const winLossKey = `${winString}${lossString}`
	for (var i = 0; i < seasons.length; i++) {
		const year = seasons[i]
		const seasonData = seasonsData[year]
		if (winLossKey in seasonData) {
			matchingYears.push(parseInt(year))
		}
	}
	return matchingYears
}


function range(start, end) {
	const range = Array(end - start + 1).fill().map((_, idx) => start + idx)
  	return range
}

function formatSeasonToDrawPath(seasonData, xScale) {
	const sortedKeys = Object.keys(seasonData).sort()
	const winLossData = []
	for (var i = 0; i < sortedKeys.length; i++) {
		winLossData.push(seasonData[sortedKeys[i]])
	}
	const season = [
		[{"win": 0, "loss": -0.5 + xScale.invert(PADDING / 2)}],
		winLossData,
		[{
			"win": winLossData[winLossData.length - 1]["win"],
			"loss": winLossData[winLossData.length - 1]["loss"] + 0.5 - xScale.invert(PADDING / 2)
		}],
	].flat(1)
	return season
}

function makeColors(primaryColor, numDarker=4, numLighter=4, pctDarker=0.64, pctLighter=0.64) {
	primaryColor = d3.rgb(primaryColor)
	const primaryRed = primaryColor.r
	const primaryGreen = primaryColor.g
	const primaryBlue = primaryColor.b

	const darkScale = [primaryColor]
	const darkRedStep = primaryRed * pctDarker / numDarker
	const darkGreenStep = primaryGreen * pctDarker / numDarker
	const darkBlueStep = primaryBlue * pctDarker / numDarker
	for (var i = 0; i < numDarker; i++) {
		const darkerColor = d3.rgb(
			darkScale[i].r - darkRedStep,
			darkScale[i].g - darkGreenStep,
			darkScale[i].b - darkBlueStep,
		)
		darkScale.push(darkerColor)
	}

	const lightScale = [primaryColor]
	const lightRedStep = (255 - primaryRed) * pctLighter / numLighter
	const lightGreenStep = (255 - primaryGreen) * pctLighter / numLighter
	const lightBlueStep = (255 - primaryBlue) * pctLighter / numLighter
	for (var i = 0; i < numLighter; i++) {
		const lighterColor = d3.rgb(
			lightScale[i].r + lightRedStep,
			lightScale[i].g + lightGreenStep,
			lightScale[i].b + lightBlueStep,
		)
		lightScale.push(lighterColor)
	}

	// Remove 1st element to avoid double inclusion
	darkScale.shift()
	const colorScale = [lightScale.reverse(), darkScale].flat(1);
	return colorScale
}

function getIntervalArray(start, end, intervalLength) {
	const startInterval = Math.floor(start / intervalLength) * intervalLength
	const endInterval = Math.floor(end / intervalLength) * intervalLength
	const numIntervals = Math.ceil((endInterval - startInterval) / intervalLength)
	const intervals = [startInterval]
	for (var i = 0; i < numIntervals; i++) {
		const currentInterval = intervals[i] + intervalLength
		intervals.push(currentInterval)
	}
	return intervals
}


function getEmptyWinLossData(n=NUM_GAMES) {
	const emptyWinLossData = []
	for (var i = 0; i <= n; i++) {
		for (var j = 0; j <= n; j++) {
			if (i + j <= n) {
				emptyWinLossData.push({win: i, loss: j})
			}
		}
	}
	return emptyWinLossData
}

// To find the win-loss index, we act like it's an (n+1) x (n+1) square-tiled board (n = NUM_GAMES).
// Imagine for the square-tiled board that we've constructed this representation by looping through
// wins first, then looping through losses resulting in a flat array of ordered (wins, losses) items.
//		[	(0,0), (0,1) ... (0,n)
//			(1,0), (1,1) ... (1,n)
//			...
//			(n,0), (n,1) ... (n,n)	]
//
// The above has the following index structure derived from wins and losses. Note that there are n+1
// items in a given row/column due to the 0-indexed wins/losses. Assume n=82 (n^2 = 6889).
//
//				   			Row         Col 	Index
//		(0,0) -> index = (n+1)(0) 	    + 0      = 0 
//		(x,y) -> index = (n+1)(x) 	    + y 
//		(n,n) -> index = (n+1)(n)       + n 	 = 6888
//
// In our chart, we use the same construction process, but we only allow max(wins + losses) = n.
// This reduces the board to a tiled triangle that has the square's full diagonal:
//
//		(# of triangle tiles) = .5(square-tiles) + .5(diagonal-tiles) = (n^2)/2 + n/2 = 3486
//
// This complicates the index structure only a little. Given wins (x) and losses (y), we act like
// we have a square-tiled board. Then we make an adjustment:
// 
// 		For each row we go up (i.e. each win increment), we have fewer and fewer squares per row. They 
// 		get shorter. If n=82, the sequence goes 82, 81, 80, ... 2, 1. As we move up the rows beyond row 
// 		0, we cumulatively lose tiles. Rows [1, 2, 3, 4, ... n] lose [0, 1, 1+2, 1+2+3, ... n-1(n)/2].
//
//				   			Row         Col 	Adjustment			Index
//		(0,0) -> index = (n+1)(0) 	    + 0         - 0				 = 0
//		(x,y) -> index = (n+1)(x)       + y         - (x-1)(x)/2
//		(n,n) -> index = (n+1)(n)       + n         - (n-1)(n)/2	 = 3485
//
function getTriangleIndex(x, y, n=NUM_GAMES) {
	square_index = (n+1) * x + y
	adjustment = (x-1) * (x) / 2
	index = square_index - adjustment
	return index
}

export default { init, resize };
