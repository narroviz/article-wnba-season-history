require("babel-core/register");
require("babel-polyfill");

/* global d3 */
let NUM_GAMES, START_YEAR, END_YEAR, INTERVAL, GAME_TICK_INTERVAL, DEFAULT_TEAM, PADDING, CIRCLE_SIZE, STAR_SIZE, SEASON_HISTORY, YEAR_INTERVAL
const LEAGUE = 'WNBA'

function resize() {
	setConfig(LEAGUE)
	// drawSeasonPaths(LEAGUE)
}

function init() {
	setConfig(LEAGUE)
	drawSeasonHistory(LEAGUE)
	// drawSeasonPaths(LEAGUE)
}

const teamAccessor = d => d.team
const teamParentAccessor = d => d.parent
const dateAccessor = d => new Date(d.date * 1000) //convert to milliseconds
const yearAccessor = d => d.year
const colorAccessor = d => d.primary_color
const secondaryColorAccessor = d => d.secondary_color
const winAccessor = d => d.win
const winPctAccessor = d => d.win_pct
const lossAccessor = d => d.loss
const countAccessor = d => d.count


async function setConfig(league) {
		// 0. Update global variables
	if (league == 'WNBA') {
		START_YEAR = 1996
		END_YEAR = 2019
		NUM_GAMES = 34
		INTERVAL = 3
		GAME_TICK_INTERVAL = 5
		DEFAULT_TEAM = "Dallas Wings"
		PADDING = 1.5
		CIRCLE_SIZE = 5
		STAR_SIZE = 100
		YEAR_INTERVAL = 5
	} else if (league == 'NBA') {
		START_YEAR = 1946
		END_YEAR = 2020
		NUM_GAMES = 82
		INTERVAL = 10
		GAME_TICK_INTERVAL = 10
		DEFAULT_TEAM = "Atlanta Hawks"
		PADDING = 1
		CIRCLE_SIZE = 2
		STAR_SIZE = 65
		YEAR_INTERVAL = 10
	}
}

function getNumGames(year, league) {
	if (league === 'WNBA') {
		if (year === 1997) {
			return 28
		} else if (year === 1998) {
			return 30
		} else if (year <= 2002) {
			return 32
		} else if (year <= 2019) {
			return 34
		} else {
			return 36
		}
	} else if (league === 'NBA') {
		// Number of games varied over the first 20 years, stabilized at 82 except for lockouts/covid
		if (year === 1947) {
			return 61
		} else if (year === 1948) {
			return 48
		} else if (year === 1949) {
			return 60
		} else if (year === 1950) {
			return 68
		} else if (year === 1951) {
			return 69
		} else if (year === 1952) {
			return 66
		} else if (year === 1953) {
			return 71
		} else if (year <= 1959) {
			return 72
		} else if (year === 1960) {
			return 75
		} else if (year === 1961) {
			return 79
		} else if (year <= 1966) {
			return 80
		} else if (year === 1967) {
			return 81
		} else if (year === 1999) {
			return 50
		} else if (year === 2012) {
			return 66
		} else if (year === 2020) {
			return 67
		} else {
			return 82
		}
	}
}


async function drawSeasonHistory(league) {
	// 2. Define Dimensions
	const seasonWinLossData = await d3.json(`./../assets/data/${league}_season_win_loss.json`)
	const teamData = await d3.json(`./../assets/data/${league}_teams.json`)
	const wrapperWidth = d3.select("#season-history-wrapper").node().offsetWidth
	const width = wrapperWidth * 0.95
	let dimensions = {
		width: width,
		height: window.innerHeight * .75,
		margin: {
			top: 30,
			right: 0,
			bottom: 30,
			left: 30,
		},
		legendWidth: width * 0.6,
		legendHeight: 20,
	}
	dimensions.boundedWidth = dimensions.width - dimensions.margin.left - dimensions.margin.right
	dimensions.boundedHeight = dimensions.height - dimensions.margin.top - dimensions.margin.bottom

	// 3. Draw Canvas
	const wrapper = d3.select("#season-history-wrapper")
		.append("svg")
			.style("transform", `translate(${wrapperWidth / 2 - dimensions.width / 2}px, ${0}px)`)
			.attr("width", dimensions.width)
			.attr("height", dimensions.height)

	const bounds = wrapper.append("g")
		.style("transform", `translate(${dimensions.margin.left}px, ${dimensions.margin.top}px)`)

	let yAccessor = winPctAccessor
	drawSeasonHistoryByMetric(league, yAccessor, [0, 1], 0.1, teamData, seasonWinLossData, bounds, wrapper, dimensions)

	const numGamesButton = d3.select("#toggle-num-games")
	const winPctButton = d3.select("#toggle-win-pct")
	numGamesButton.on("click", onToggleClick)
	winPctButton.on("click", onToggleClick)

	function onToggleClick() {
		let yAccessor
		const clickedId = d3.select(this).nodes()[0].id
		const clickedButton = clickedId === "toggle-num-games" ? numGamesButton : winPctButton
		const unclickedButton = clickedButton === numGamesButton ? winPctButton : numGamesButton
		clickedButton.style("background-color", "#1b84c911")
		clickedButton.style("border",  "1px solid #1b84c9")
		clickedButton.style("color",  "#1b84c9")
		clickedButton.style("font-weight",  "bold")

		unclickedButton.style("background-color", "white")
		unclickedButton.style("color",  "#83838388")
		unclickedButton.style("font-weight",  "normal")
		unclickedButton.style("border-top",  "1px solid #83838344")
		unclickedButton.style("border-bottom",  "1px solid #83838344")
		if (clickedId === "toggle-num-games") {
			unclickedButton.style("border-left",  "1px solid #83838344")
			unclickedButton.style("border-right",  "0px")
		} else {
			unclickedButton.style("border-left",  "0px")
			unclickedButton.style("border-right",  "1px solid #83838344")
		}

		if (clickedId === "toggle-num-games" && yAccessor !== winAccessor) {
			console.log('num')
			yAccessor = winAccessor
			updateSeasonHistoryByMetric(yAccessor, [0, NUM_GAMES + 1], bounds, dimensions)
		}
		if (clickedId === "toggle-win-pct" && yAccessor !== winPctAccessor) {
			console.log("pct")
			yAccessor = winPctAccessor
			updateSeasonHistoryByMetric(yAccessor, [0, 1], bounds, dimensions)
		}
	}
}

function updateSeasonHistoryByMetric(yAccessor, yDomain, bounds, dimensions) {
	const xScale = d3.scaleLinear()
		.domain([START_YEAR + 1, END_YEAR])
		.range([0 + 20, dimensions.boundedWidth - 20])

	const yScale = d3.scaleLinear()
		.domain(yDomain)
		.range([dimensions.boundedHeight, 0])

	const areaGenerator = d3.area()
	    .x(function(d) { return xScale(d.year); })
	    .y0(dimensions.boundedHeight)
	    .y1(function(d) { return yScale(yAccessor(d)); })
	    .curve(d3.curveCatmullRom.alpha(0.5))

	const seasonLineGenerator = d3.line()
		.x(d => xScale(d.year))
		.y(d => yScale(yAccessor(d)))
		.curve(d3.curveCatmullRom.alpha(0.5))

	const numGamesLineGenerator = d3.line()
		.x(d => xScale(d.year))
		.y(d => yScale(d.num_games))
		.curve(d3.curveStep)

	console.log(yDomain, NUM_GAMES + 1)
	if (yDomain[1] === (NUM_GAMES + 1)) {
		console.log('here')
		bounds.selectAll(".num-games-gridlines")
			.attr("opacity", 1)
			.attr("y", d => yScale(d))
		bounds.selectAll(".num-games-label")
			.attr("opacity", 1)
			.attr("y", d => yScale(d))
		bounds.selectAll(".num-games-year-path")
			.attr("opacity", 1)
			.attr("d", d => numGamesLineGenerator(d))
		bounds.selectAll(".win-pct-gridlines")
			.attr("opacity", 0)
		bounds.selectAll(".win-pct-label")
			.attr("opacity", 0)
	} else {
		bounds.selectAll(".num-games-gridlines")
			.attr("opacity", 0)
		bounds.selectAll(".num-games-label")
			.attr("opacity", 0)
		bounds.selectAll(".num-games-year-path")
			.attr("opacity", 0)
		bounds.selectAll(".win-pct-gridlines")
			.attr("opacity", 1)
			.attr("y", d => yScale(d))
		bounds.selectAll(".win-pct-label")
			.attr("opacity", 1)
			.attr("y", d => yScale(d))
	}
	

	bounds.selectAll(".historical-circle")
	 	.attr("cy", (d) => yScale(yAccessor(d)))
	bounds.selectAll(".championship-star")
		.attr("transform", d => {
			const x = xScale(d.year)
			const y = yScale(yAccessor(d))
			return `translate(${x},${y})`
		})
	bounds.selectAll(".historical-path")
        .attr("d", d => seasonLineGenerator(d))
    bounds.selectAll(".historical-area")
        .attr("d", d => areaGenerator(d))
}

async function drawSeasonHistoryByMetric(league, yAccessor, yDomain, yInterval, teamData, seasonWinLossData, bounds, wrapper, dimensions) {	
	// Remove all previous items
	// bounds.selectAll(".gridlines").remove()
	// bounds.selectAll(".historical-circle").remove()
	// bounds.selectAll(".historical-area").remove()
	// bounds.selectAll(".historical-path").remove()
	// bounds.selectAll(".championship-star").remove()
	// bounds.selectAll(".championship-star-path").remove()

	const years = getIntervalArray(START_YEAR + 1, END_YEAR, 1)
	const numGames = years.map(year => {
		return {"num_games": getNumGames(year, league), "year": year}
	})
	const xScale = d3.scaleLinear()
		.domain([START_YEAR + 1, END_YEAR])
		.range([0 + 20, dimensions.boundedWidth - 20])
	const yScale = d3.scaleLinear()
		.domain(yDomain)
		.range([dimensions.boundedHeight, 0])

	const yearGridlines = bounds.selectAll(".year-gridline")
		.data(years)
		.enter()
		.append("rect")
			.attr("class", "year-gridline")
			.attr("x", d => xScale(d))
			.attr("y", d => 0)
			.attr("height", dimensions.boundedHeight)
			.attr("width", 0.5)
			.attr("fill", d => {return d % YEAR_INTERVAL === 0 ? "#838383" : "#e3e3e3"})
			.attr("opacity", 1)
	const yearLabels = bounds.selectAll(".year-label")
		.data(years)
		.enter()
		.append("text")
			.attr("class", "year-label")
			.attr("x", d => xScale(d))
			.attr("y", dimensions.boundedHeight + 20)
			.text((d,i) => {
				if (i === 0 || i === (years.length - 1) || d % YEAR_INTERVAL === 0) {
					return d
				}
			})
			.attr("font-size", 12)
			.attr("font-weight", "bold")
			.attr("text-anchor", "middle")
			.attr("fill", d => {return d % YEAR_INTERVAL === 0 ? "#838383" : "#b5b5b5"})
			.attr("opacity", 1)


	const numGamesLineBreaks = getIntervalArray(0, NUM_GAMES + 1, GAME_TICK_INTERVAL)
	const numGamesGridlines = bounds.selectAll(".num-games-gridlines")
		.data(numGamesLineBreaks)
		.enter()
		.append("rect")
			.attr("class", "num-games-gridlines")
			.attr("x", 0)
			.attr("y", d => yScale(d))
			.attr("height", 0.5)
			.attr("width", dimensions.boundedWidth)
			.attr("fill", d => "#e3e3e3")
			.attr("opacity", 0)
	const midPoint = league === 'WNBA' ? 17.5 : 40
	const numGamesMidline = bounds.append("rect")
			.datum(midPoint)
			.attr("class", "num-games-gridlines")
			.attr("x", 0)
			.attr("y", d => yScale(d))
			.attr("height", 0.5)
			.attr("width", dimensions.boundedWidth)
			.attr("fill", d => "#838383")
			.attr("opacity", 0)
	const numGamesLabels = bounds.selectAll(".num-games-label")
		.data(numGamesLineBreaks)
		.enter()
		.append("text")
			.attr("class", "num-games-label")
			.attr("x", -10)
			.attr("y", d => yScale(d))
			.text(d => d)
			.attr("font-size", 12)
			.attr("font-weight", "bold")
			.attr("text-anchor", "end")
			.attr("fill", "#b5b5b5")
			.attr("opacity", 0)
	const numGamesLineGenerator = d3.line()
		.x(d => xScale(d.year))
		.y(d => yScale(d.num_games))
		.curve(d3.curveStep)
	console.log("numGames")
	console.log(numGames)
	const numGamesByYear = bounds.append("path")
	  		.datum(numGames)
			.attr("class", "num-games-year-path")
			.attr("d", d => numGamesLineGenerator(d))
			.attr("fill", "none")
			.attr("stroke-dasharray", "5,5")
			.attr("stroke", "#a5a5a5")
			.attr("stroke-width", 1)
			.attr("opacity", 0)

	const winPctLineBreaks = getIntervalArray(0, 1, 0.1)
	const winPctGridlines = bounds.selectAll(".win-pct-gridlines")
		.data(winPctLineBreaks)
		.enter()
		.append("rect")
			.attr("class", "win-pct-gridlines")
			.attr("x", 0)
			.attr("y", d => yScale(d))
			.attr("height", 0.5)
			.attr("width", dimensions.boundedWidth)
			.attr("fill", d => {return d === 0.5 ? "#838383" : "#e3e3e3"})
	const winPctLabels = bounds.selectAll(".win-pct-label")
		.data(winPctLineBreaks)
		.enter()
		.append("text")
			.attr("class", "win-pct-label")
			.attr("x", -10)
			.attr("y", d => yScale(Math.round(d * 10) / 10))
			.text(d => {
				console.log(d)
				return Math.round(d * 10) / 10
			})
			.attr("font-size", 12)
			.attr("font-weight", "bold")
			.attr("text-anchor", "end")
			.attr("fill", "#b5b5b5")

	const seasonLineGenerator = d3.line()
		.x(d => xScale(d.year))
		.y(d => yScale(yAccessor(d)))
		.curve(d3.curveCatmullRom.alpha(0.5))

	const fadeColor = "#282828"
	const fadeGradient = bounds.append("linearGradient")
	      .attr("id", "fadeGradient")
	      .attr("gradientUnits", "userSpaceOnUse")
	      .attr("x1", 0).attr("y1", yScale(0.4))
	      .attr("x2", 0).attr("y2", yScale(0.75))
	    .selectAll("stop")
	      .data([
	        {offset: "0%", color: `${fadeColor}01`},
	        {offset: "25%", color: `${fadeColor}01`},
	        {offset: "50%", color: `${fadeColor}05`},
	        {offset: "75%", color: `${fadeColor}11`},
	        {offset: "100%", color: `${fadeColor}44`}
	      ])
	    .enter().append("stop")
	      .attr("offset", function(d) { return d.offset; })
	      .attr("stop-color", function(d) { return d.color; })

	if (league === "WNBA") {
		SEASON_HISTORY = [
			[],
			[{
				"team": "Houston Comets",
				"start": 1997,
				"end": 2000,
				"description": ''
			}],
			[{
				"team": "Los Angeles Sparks",
				"start": 2000,
				"end": 2005,
				"description": ''
			}],
			[{
				"team": "Detroit Shock",
				"start": 2002,
				"end": 2009,
				"description": ''
			}],
			[{
				"team": "Seattle Storm",
				"start": 2003,
				"end": 2011,
				"description": ''
			}],
			[{
				"team": "Sacramento Monarchs",
				"start": 2004,
				"end": 2008,
				"description": ''
			}],
			// [{
			// 	"team": "Connecticut Sun",
			// 	"start": 2004,
			// 	"end": 2007,
			// 	"description": ''
			// }],
			[{
				"team": "Phoenix Mercury",
				"start": 2006,
				"end": 2010,
				"description": ''
			}],
			// [{
			// 	"team": "San Antonio Silver Stars",
			// 	"start": 2007,
			// 	"end": 2009,
			// 	"description": ''
			// }],
			[{
				"team": "Minnesota Lynx",
				"start": 2010,
				"end": 2018,
				"description": ''
			}],
			[{
				"team": "Indiana Fever",
				"start": 2011,
				"end": 2013,
				"description": ''
			}],
			[{
				"team": "Phoenix Mercury",
				"start": 2013,
				"end": 2015,
				"description": ''
			}],		
			[{
				"team": "Los Angeles Sparks",
				"start": 2015,
				"end": 2018,
				"description": ''
			}],		
			[{
				"team": "Seattle Storm",
				"start": 2017,
				"end": 2019,
				"description": ''
			}],
			[{
				"team": "Washington Mystics",
				"start": 2017,
				"end": 2019,
				"description": ''
			}],
			[],	
		]

	} else if (league === "NBA") {
		SEASON_HISTORY = [
			[],
			// [{
			// 	"team": "Washington Capitols",
			// 	"start": 1947,
			// 	"end": 1950,
			// 	"description": "In the inaugural 1946-'47 season of the Basketball Association of America (BAA), the Washington Capitols steamrolled the 60-game regular season. Led by Hall of Fame coach Red Auerbach, in the postseason they suffered a surprising loss to the Chicago Packers."
			// }],
			[{
				"team": "Philadelphia Warriors",
				"start": 1947,
				"end": 1948,
				"description": "In 1947, the Philadelphia Warriors won the 1st championship of what was then called the Basketball Association of America (BAA). They'd also make the Finals in 1948, but lose 4 - 2 to a gritty Baltimore Bullets team.  A few years later, the league would rebrand as the NBA."
			}],
			[{
				"team": "Baltimore Bullets (Original)",
				"start": 1948,
				"end": 1949,
				"description": ''
			}],
			[{
				"team": "Rochester Royals",
				"start": 1949,
				"end": 1954,
				"description": ''
			}],
			[{
				"team": "Minneapolis Lakers",
				"start": 1949,
				"end": 1954,
				"description": ''
			}],
			[{
				"team": "Syracuse Nationals",
				"start": 1954,
				"end": 1956,
				"description": ''
			}],
			[{
				"team": "Philadelphia Warriors",
				"start": 1955,
				"end": 1957,
				"description": ''
			}],
			[{
				"team": "St. Louis Hawks",
				"start": 1957,
				"end": 1960,
				"description": ''
			}],
			[
				{
					"team": "Philadelphia Warriors",
					"start": 1960,
					"end": 1963,
					"player": "Wilt Chamberlain"
				},
				{
					"team": "San Francisco Warriors",
					"start": 1962,
					"end": 1965,
					"player": "Wilt Chamberlain"
				},
				{
					"team": "Philadelphia 76ers",
					"start": 1965,
					"end": 1969,
					"player": "Wilt Chamberlain"
				},
				// {
				// 	"team": "Los Angeles Lakers",
				// 	"start": 1969,
				// 	"end": 1973,
				// 	"player": "Wilt Chamberlain"
				// }
			],
			[{
				"team": "Boston Celtics",
				"start": 1957,
				"end": 1969,
				"description": ''
			}],
			[{
				"team": "New York Knicks",
				"start": 1969,
				"end": 1973,
				"description": ''
			}],
			[{
				"team": "Milwaukee Bucks",
				"start": 1970,
				"end": 1975,
				"description": ''
			}],
			[{
				"team": "Los Angeles Lakers",
				"start": 1970,
				"end": 1974,
				"description": ''
			}],
			[{
				"team": "Boston Celtics",
				"start": 1972,
				"end": 1976,
				"description": ''
			}],
			[{
				"team": "Golden State Warriors",
				"start": 1973,
				"end": 1976,
				"description": ''
			}],
			[{
				"team": "Philadelphia 76ers",
				"start": 1976,
				"end": 1983,
				"description": ''
			}],
			[{
				"team": "Portland Trail Blazers",
				"start": 1976,
				"end": 1979,
				"description": ''
			}],
			[{
				"team": "Washington Bullets",
				"start": 1976,
				"end": 1980,
				"description": ''
			}],
			[{
				"team": "Seattle Supersonics",
				"start": 1976,
				"end": 1980,
				"description": ''
			}],
			[{
				"team": "Boston Celtics",
				"start": 1980,
				"end": 1990,
				"description": ''
			}],
			[{
				"team": "Los Angeles Lakers",
				"start": 1980,
				"end": 1990,
				"description": ''
			}],
			[{
				"team": "Detroit Pistons",
				"start": 1988,
				"end": 1990,
				"description": ''
			}],
			[{
				"team": "Chicago Bulls",
				"start": 1990,
				"end": 2001,
				"description": ''
			}],
			[{
				"team": "Houston Rockets",
				"start": 1993,
				"end": 1995,
				"description": ''
			}],
			[{
				"team": "San Antonio Spurs",
				"start": 1998,
				"end": 2014,
				"description": ''
			}],
			[{
				"team": "Los Angeles Lakers",
				"start": 2000,
				"end": 2010,
				"description": ''
			}],
			[{
				"team": "Dallas Mavericks",
				"start": 2006,
				"end": 2011,
				"description": ''
			}],
			[{
				"team": "Detroit Pistons",
				"start": 2003,
				"end": 2005,
				"description": ''
			}],
			[{
				"team": "Miami Heat",
				"start": 2004,
				"end": 2007,
				"description": ''
			}],
			[{
				"team": "Boston Celtics",
				"start": 2007,
				"end": 2011,
				"description": ''
			}],
			[
				{
					"team": "Miami Heat",
					"start": 2011,
					"end": 2014,
					"player": "LeBron James"
				},
				{
					"team": "Cleveland Cavaliers",
					"start": 2014,
					"end": 2018,
					"player": "LeBron James"
				},
				{
					"team": "Los Angeles Lakers",
					"start": 2019,
					"end": 2020,
					"player": "LeBron James"
				}
			],
			[{
				"team": "Golden State Warriors",
				"start": 2014,
				"end": 2020,
				"description": ''
			}],
			[{
				"team": "Toronto Raptors",
				"start": 2017,
				"end": 2020,
				"description": ''
			}],
			// This will become the interactive section
			// [{
			// 	"team": "Los Angeles Clippers",
			// 	"start": 1946,
			// 	"end": 2020,
			// 	"description": ''
			// }],
		]
	}

	const container = d3.select('#scrolly-side');
	const stepSel = container.selectAll('.step');

	function updateChart(index, teamData, stage, league) {
		updateTopLabel(SEASON_HISTORY[index], teamData, league)
		if (index === 0) {
			if (stage == "exit") {
				hideEraPaths(SEASON_HISTORY[index + 1])
			}
		} else if (index === 130) {
			console.log("last", stage)
			if (stage === "enter") {
				for (var i = 0; i <= 12; i++) {
					highlightEraPaths(SEASON_HISTORY[i], teamData)
				}
			}
		} else {
			if (stage === "enter") {
				fadeEraPaths(SEASON_HISTORY[index - 1], teamData)
				drawEraPaths(SEASON_HISTORY[index], seasonWinLossData, teamData, bounds, xScale, yScale, yAccessor, dimensions, seasonLineGenerator)
			}
			if (stage === "exit") {
				if (index === 129) {
					for (var i = 0; i < 12; i++) {
						fadeEraPaths(SEASON_HISTORY[i], teamData)
					}
				}
				highlightEraPaths(SEASON_HISTORY[index], teamData)
				hideEraPaths(SEASON_HISTORY[index + 1])
			}
		}
	}

	enterView({
		selector: stepSel.nodes(),
		offset: 0.5,
		enter: el => {
			const index = +d3.select(el).attr('data-index');
			console.log(index)
			updateChart(index, teamData, "enter", league);
		},
		exit: el => {
			let index = +d3.select(el).attr('data-index');
			index = Math.max(0, index - 1);
			updateChart(index, teamData, "exit", league);
		}
	});

}

async function updateTopLabel(eraPaths, teamData, league) {
	const firstEraPath = eraPaths[0]
	const lastEraPath = eraPaths[eraPaths.length - 1]
	if (firstEraPath === undefined) {
		d3.select("#top-label")
			.text(`${league} League History`)
			.style("color", "black")
			.style("border-bottom", `2px solid gray`)

		d3.select("#bottom-text")
			.text(`${league} League History`)
			.style("box-shadow", "0 0 7px 7px rgba(0, 0, 0, .2)")
	} else {
		const team = firstEraPath['team']
		const player = Object.keys(firstEraPath).includes('player') ? firstEraPath['player'] : ''
		const label = player !== '' ? player : team
		const startYear = firstEraPath['start'].toString().substring(2,4)
		const endYear = lastEraPath['end'].toString().substring(2,4)
		let primaryColor = teamData[team]['primary_color']
		let secondaryColor = teamData[team]['secondary_color']
		if (player === "LeBron James") {
			primaryColor = teamData['Cleveland Cavaliers']['primary_color']
			secondaryColor = teamData['Cleveland Cavaliers']['secondary_color']
		}
		if (player === "Wilt Chamberlain") {
			primaryColor = teamData['Philadelphia 76ers']['primary_color']
			secondaryColor = teamData['Philadelphia 76ers']['secondary_color']
		}

		const labelText = `${label.replace("(Original)", "")} ('${startYear} - '${endYear})`
		const description = Object.keys(firstEraPath).includes('description') ? firstEraPath['description'] : ''
		d3.select("#top-label")
			.text(labelText)
			.style("color", primaryColor)
			.style("border-bottom", `2px solid ${secondaryColor}`)
		d3.select("#bottom-text")
			.text(description)
			.style("box-shadow", `0px 0px 5px 2px ${primaryColor}AA`)
	}
}	

function hideEraPaths(eraPaths) {
	for (var i = 0; i < eraPaths.length; i++) {
		const eraPath = eraPaths[i]
		const filterTeam = eraPath["team"]
		const startYear = eraPath["start"]
		const endYear = eraPath["end"]
		const id = `${filterTeam.replace(/\s+/g, '-').replace(".", "").replace("(","").replace(")","").toLowerCase()}-${startYear}-${endYear}`
		const pathId = `path-${id}`
		const areaId = `area-${id}`

		d3.select(`#${areaId}`)
			.transition("hide-area")
			.duration(500)
			.style("fill-opacity",0)
		d3.select(`#${pathId}`)
			.transition("hide-line")
			.duration(500)
			.style("opacity", 0)
		d3.selectAll(`*[id^=${id}-circle-]`)
			.transition("hide-circle")
			.duration(500)
			.style("opacity", 0)
		d3.selectAll(`*[id^=${id}-star-]`)
			.transition("fade-star")
			.duration(500)
			.style("stroke-opacity", 0)
			.style("opacity", 0)
	}
}

function fadeEraPaths(eraPaths, teamData) {
	const fadeColor = "#d8d8d8"

	for (var i = 0; i < eraPaths.length; i++) {
		const eraPath = eraPaths[i]
		const filterTeam = eraPath["team"]
		const startYear = eraPath["start"]
		const endYear = eraPath["end"]
		const id = `${filterTeam.replace(/\s+/g, '-').replace(".", "").replace("(","").replace(")","").toLowerCase()}-${startYear}-${endYear}`
		const pathId = `path-${id}`
		const areaId = `area-${id}`

		d3.select(`#${areaId}`)
			.transition("fade-area")
			.duration(500)
			.style("fill", "url(#fadeGradient)")
		d3.select(`#${pathId}`)
			.transition("fade-line")
			.duration(500)
			.style("stroke", fadeColor)
		d3.selectAll(`*[id^=${id}-circle-]`)
			.transition("fade-circle")
			.duration(500)
			.style("fill", fadeColor)
		d3.selectAll(`*[id^=${id}-star-]`)
			.transition("fade-star")
			.duration(500)
			.style("fill", fadeColor)
			.style("stroke", "#484848")
			.style("stroke-opacity", 0.5)
			.style("opacity", 0.5)
	}
}

function highlightEraPaths(eraPaths, teamData) {
	for (var i = 0; i < eraPaths.length; i++) {
		const eraPath = eraPaths[i]
		const filterTeam = eraPath["team"]
		const startYear = eraPath["start"]
		const endYear = eraPath["end"]
		const id = `${filterTeam.replace(/\s+/g, '-').replace(".", "").replace("(","").replace(")","").toLowerCase()}-${startYear}-${endYear}`
		const pathId = `path-${id}`
		const areaId = `area-${id}`

		const primaryColor = teamData[filterTeam]['primary_color']
		const secondaryColor = teamData[filterTeam]['secondary_color']
		const teamGradientId = `team-gradient-${filterTeam.replace(/\s+/g, '-').replace(".", "").replace("(","").replace(")","").toLowerCase()}-${startYear}-${endYear}`
		d3.select(`#${areaId}`)
			.transition("highlight-area")
			.duration(500)
			.style("fill", `url(#${teamGradientId})`)
		d3.select(`#${pathId}`)
			.transition("highlight-line")
			.duration(500)
			.style("stroke", primaryColor)
		d3.selectAll(`*[id^=${id}-circle-]`)
			.transition("highlight-circle")
			.duration(500)
			.style("fill", primaryColor)
		d3.selectAll(`*[id^=${id}-star-]`)
			.transition("highlight-star")
			.duration(0)
			.style("fill", primaryColor)
			.style("stroke", secondaryColor)
			.style("stroke-opacity", 1)
			.style("opacity", 1)
	}	
}


function drawEraPaths(eraPaths, seasonWinLossData, teamData, bounds, xScale, yScale, yAccessor, dimensions, seasonLineGenerator) {
	const pathIds = []
	for (var i = 0; i < eraPaths.length; i++) {
		const eraPath = eraPaths[i]
		const filterTeam = eraPath["team"]
		const startYear = eraPath["start"]
		const endYear = eraPath["end"]
		const id = `${filterTeam.replace(/\s+/g, '-').replace(".", "").replace("(","").replace(")","").toLowerCase()}-${startYear}-${endYear}`
		const pathId = `path-${id}`
		const teamWinLossData = seasonWinLossData.filter(d => d.team === filterTeam && d.year >= startYear && d.year <= endYear)
		drawHistoricalPath(id, pathId, filterTeam, teamWinLossData, teamData, bounds, xScale, yScale, yAccessor, seasonLineGenerator)
		drawHistoricalArea(filterTeam, startYear, endYear, teamWinLossData, teamData, bounds, xScale, yScale, yAccessor, dimensions)
		drawChampionships(id, pathId, filterTeam, teamWinLossData, teamData, bounds, xScale, yScale, yAccessor, seasonLineGenerator)
		pathIds.push(pathId)
	}	
	
	for (var i = 0; i < pathIds.length; i++) {
		const pathId = pathIds[i]
		animateLine(pathId)
	}
	
}

function drawHistoricalArea(team, startYear, endYear, teamWinLossData, teamData, bounds, xScale, yScale, yAccessor, dimensions) {
	const areaId = `area-${team.replace(/\s+/g, '-').replace(".", "").replace("(","").replace(")","").toLowerCase()}-${startYear}-${endYear}`
	const primaryColor = teamData[team]['primary_color']
	const areaExists = d3.select(`#${areaId}`).nodes().length > 0

	if (team === 'San Francisco Warriors') {
		console.log(teamWinLossData)
		const glueSeason = [{"win": 49, "loss": 31, "team": "San Francisco Warriors", "win_pct": 0.613, "year": 1962}]
		teamWinLossData = glueSeason.concat(teamWinLossData)
		teamWinLossData[3] = {"win": 40, "loss": 40, "team": "San Francisco Warriors", "win_pct": 0.5, "year": 1965}
		console.log(teamWinLossData)
	}

	if (team === 'Cleveland Cavaliers' || team === 'Los Angeles Lakers') {
		if (teamWinLossData[0]['year'] === 2019) {
			const glueSeason = [{"win": 50, "loss": 32, "team": "Los Angeles Lakers", "win_pct": 0.61, "year": 2018}]
			teamWinLossData = glueSeason.concat(teamWinLossData)
		} else if (team === 'Cleveland Cavaliers') {
			teamWinLossData[0] = {"win": 54, "loss": 28, "team": "Cleveland Cavaliers", "win_pct": 0.659, "year": 2014}
		}
	}

	if (!areaExists) {	
		const teamGradientId = `team-gradient-${team.replace(/\s+/g, '-').replace(".", "").replace("(","").replace(")","").toLowerCase()}-${startYear}-${endYear}`
		const teamGradientFill = bounds.append("linearGradient")
		      .attr("id", teamGradientId)
		      .attr("gradientUnits", "userSpaceOnUse")
		      .attr("x1", 0).attr("y1", yScale(0))
		      .attr("x2", 0).attr("y2", yScale(0.8))
		    .selectAll("stop")
		      .data([
		        {offset: "0%", color: `${primaryColor}01`},
		        {offset: "25%", color: `${primaryColor}01`},
		        {offset: "50%", color: `${primaryColor}88`},
		        {offset: "75%", color: `${primaryColor}AA`},
		        {offset: "100%", color: `${primaryColor}FF`}
		      ])
		    .enter().append("stop")
		      .attr("offset", function(d) { return d.offset; })
		      .attr("stop-color", function(d) { return d.color; })

		const area = d3.area()
		    .x(function(d) { return xScale(d.year); })
		    .y0(dimensions.boundedHeight)
		    .y1(function(d) { return yScale(yAccessor(d)); })
		    .curve(d3.curveCatmullRom.alpha(0.5))
		
		bounds.append("path")
	        .datum(teamWinLossData)
	        .attr("class", "historical-area")
	        .style("fill", `url(#${teamGradientId})`)
	        .style("fill-opacity", 0)
	        .attr("id", areaId)
	        .attr("d", area)

	    animateLine(areaId)
	} else {
		animateLine(areaId)
	}
}

function drawChampionships(id, pathId, filterTeam, teamWinLossData, teamData, bounds, xScale, yScale, yAccessor, seasonLineGenerator) {
	let teamChampionshipStars
	const teamChampionshipWinLossData = teamWinLossData.filter(d => d.is_championship)
	const starsExist = d3.selectAll(`*[id=${id}-star-]`).nodes().length > 0
	const championshipsExist = teamChampionshipWinLossData.length > 0
	const primaryColor = teamData[filterTeam]['primary_color']
	const secondaryColor = teamData[filterTeam]['secondary_color']

	if (championshipsExist) {
		if (!starsExist) {	
			console.log(teamChampionshipWinLossData)
			teamChampionshipStars = bounds.selectAll(`*[id=${id}-star-]`)
				.data(teamChampionshipWinLossData)
		  		.enter()
				.append("g")
					.attr("class", "championship-star")
					.attr("id", (d,i) => `${id}-star-${i}`)
					.attr("transform", d => {
						const x = xScale(d.year)
						const y = yScale(yAccessor(d))
						return `translate(${x},${y})`
					})
					.attr("fill", "black")
					.attr("stroke-width", 1)
				.append("path")
					.attr("id", (d,i) => `${id}-star-${i}`)
					.attr("d", d => {return d3.symbol().type(d3.symbolStar).size(STAR_SIZE)()})
					.attr("stroke", secondaryColor)
					.style("fill", primaryColor)
					.attr("stroke-width", 1.5)
					.style("opacity", 0)
			teamChampionshipStars.transition()
				.duration(1000)
				.style("opacity", 1)
			console.log(teamChampionshipStars)
		} else {
			teamChampionshipStars = d3.selectAll(`*[id=${id}-star-]`)
			teamChampionshipStars.transition()
				.duration(1000)
				.style("fill", primaryColor)
		}
	}
	

}

function drawHistoricalPath(id, pathId, filterTeam, teamWinLossData, teamData, bounds, xScale, yScale, yAccessor, seasonLineGenerator) {
	let historicalPathCircles, teamChampionshipStars
	const pathExists = d3.select(`#${pathId}`).nodes().length > 0
	const primaryColor = teamData[filterTeam]['primary_color']

	if (filterTeam === 'San Francisco Warriors') {
		const glueSeason = [{"win": 49, "loss": 31, "team": "San Francisco Warriors", "win_pct": 0.613, "year": 1962}]
		teamWinLossData = glueSeason.concat(teamWinLossData)
		teamWinLossData[3] = {"win": 40, "loss": 40, "team": "San Francisco Warriors", "win_pct": 0.5, "year": 1965}
	}
	if (filterTeam === 'Cleveland Cavaliers' || filterTeam === 'Los Angeles Lakers') {
		if (teamWinLossData[0]['year'] === 2019) {
			const glueSeason = [{"win": 50, "loss": 32, "team": "Los Angeles Lakers", "win_pct": 0.61, "year": 2018}]
			teamWinLossData = glueSeason.concat(teamWinLossData)
		} else if (filterTeam === 'Cleveland Cavaliers') {
			teamWinLossData[0] = {"win": 54, "loss": 28, "team": "Cleveland Cavaliers", "win_pct": 0.659, "year": 2014}
		}
	}
	if (!pathExists) {	
		const secondaryColor = teamData[filterTeam]['secondary_color']
	  	const historicalPaths = bounds.append("path")
	  		.datum(teamWinLossData)
			.attr("class", "historical-path")
			.attr("d", d => seasonLineGenerator(d))
			.attr("fill", "none")
			.attr("stroke", d => primaryColor)
			.attr("stroke-width", 2)
			.attr("opacity", 1)
			.attr("id", pathId)

	//   	historicalPathCircles = bounds.selectAll("historical-circle")
	// 		.data(teamWinLossData)
	// 		.enter()
	// 		.append("circle")
	// 			.attr("class", "historical-circle")
	// 			.attr("id", (d,i) => `${id}-circle-${i}`)
	// 			.attr("r", CIRCLE_SIZE)
	// 			.attr("cx", (d) => xScale(d.year))
	// 			.attr("cy", (d) => yScale(yAccessor(d)))
	// 			.style("fill", primaryColor)
	// 			.style("opacity", 0)
	// 	historicalPathCircles.transition()
	// 		.duration(1000)
	// 		.style("opacity", 1)
	// } else {
		// historicalPathCircles = d3.selectAll(`*[id=${id}-circle-]`)
		// historicalPathCircles.transition()
		// 	.duration(1000)
		// 	.style("fill", primaryColor)
	}


}

function animateLine(lineId) {
	const lineIdString = `#${lineId}`
	const totalLength = d3.select(lineIdString).node().getTotalLength();
	d3.select(lineIdString)
		.style("opacity", 1)
		.style("stroke-width", 2);

	console.log(d3.selectAll(lineIdString))
	d3.selectAll(lineIdString)
		// Set the line pattern to be an long line followed by an equally long gap
		.attr("stroke-dasharray", totalLength + " " + totalLength)
		// Set the intial starting position so that only the gap is shown by offesetting by the total length of the line
		.attr("stroke-dashoffset", totalLength)
		// Then the following lines transition the line so that the gap is hidden...
		.transition("draw-line")
		.duration(1000)
		.style("fill-opacity", 1)
		.attr("stroke-dashoffset", 0)
		.end()

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
