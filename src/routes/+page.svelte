<script lang="ts">
	import { onMount } from 'svelte';
	import us from '$lib/us.json';
	import clinics from '$lib/a-clinics.json';
	import * as d3 from 'd3';
	import { geoAlbersUsa } from 'd3-geo';
	import { feature } from 'topojson-client';
	import { geoDistance } from 'd3-geo';

	type Closest = {
		closestClinic: [number, number] | null;
		minDistance: number;
	};

	const width = 960;
	const height = 600;

	let chartElement: HTMLDivElement;
	let closest: Closest = { closestClinic: null, minDistance: Infinity };
	let showText = false;

	// Plot all of the states
	const projection: d3.GeoProjection = geoAlbersUsa();
	const path = d3.geoPath().projection(projection);
	const states = feature(us as any, (us as any).objects.states).features;
	const counties = feature(us as any, (us as any).objects.counties).features;
	let zoomLevel = 1;
	let g: d3.Selection<SVGGElement, unknown, null, undefined>;

	// Panning and zooming functionality
	const zoom = d3
		.zoom()
		.on('zoom', function (event) {
			g.attr('transform', event.transform);
			zoomLevel = event.transform.k;

			if (zoomLevel > 6) {
				d3.selectAll('.counties-group path').style('opacity', 1);
			} else {
				d3.selectAll('.counties-group path').style('opacity', 0);
			}
		})
		.on('start', function () {
			d3.select(this).classed('dragging', true);
		})
		.on('end', function () {
			d3.select(this).classed('dragging', false);
		});

	// D3 code needs to be only onMount so we don't have perf issues
	onMount(() => {
		// Load the abortion clinic data
		const clinicPoints: [number, number][] = clinics.features.map((clinic) => {
			return clinic.geometry.coordinates as [number, number];
		});

		// Set up the svg container
		const chart = d3
			.select(chartElement)
			.append('svg')
			.attr('viewBox', `0 0 ${width} ${height}`)
			.attr('preserveAspectRatio', 'xMidYMid meet')
			.attr('stroke', '#0A005F')
			.attr('fill', '#F9F9F9')
			.classed('svg-content', true);

		// Plot all of the states
		g = chart.append('g');
		const svg = d3.select('svg');
		g.selectAll('path').data(states).enter().append('path').attr('class', 'states').attr('d', path);

		// Draw the counties
		const countiesGroup = g.append('g').attr('class', 'counties-group');
		countiesGroup
			.selectAll('path')
			.data(counties)
			.enter()
			.append('path')
			.attr('d', path)
			.attr('fill', 'none')
			.attr('stroke', '#0A005F')
			.attr('stroke-width', 0.1)
			.style('opacity', 0)
			.style('pointer-events', 'none');

		const initialTransform = d3.zoomIdentity.translate(0, 90);
		svg.call(zoom).call(zoom.transform, initialTransform);

		// Add an onclick handler to the chart
		g.on('click', (event) => {
			// Get the latitude and longitude of the clicked point
			showText = true;
			const clickedCoordinates = projection.invert!(d3.pointer(event));
			closest = findShortestDistance(clinicPoints, clickedCoordinates);
			closest = { ...closest };
			g.selectAll('.highlight').remove();
			const lineBounds = [closest.closestClinic, clickedCoordinates];

			const drivePath = {
				type: 'LineString',
				coordinates: lineBounds
			};

			if (!closest.closestClinic || !clickedCoordinates) {
				showText = false;
				return;
			}

			// Zoom to the line
			const clinicCoords = projection(closest.closestClinic);
			const clickedCoords = projection(clickedCoordinates);

			if (!clinicCoords || !clickedCoords) {
				console.warn('Projection failed — skipping zoom.');
				return;
			}

			const x0 = clinicCoords![0];
			const y0 = clinicCoords![1];
			const x1 = clickedCoords![0];
			const y1 = clickedCoords![1];
			const dx = x1 - x0;
			const dy = y1 - y0;

			const scale = Math.min(8, 0.9 / Math.max(Math.abs(dx) / width, Math.abs(dy) / height));
			const tx = (x0 + x1) / 2;
			const ty = (y0 + y1) / 2;

			svg
				.transition()
				.duration(750)
				.call(
					zoom.transform,
					d3.zoomIdentity
						.translate(width / 2, height / 2)
						.scale(scale)
						.translate(-tx, -ty)
				);

			// Draw path between clicked point and clinic
			g.append('path')
				.datum(drivePath)
				.attr('d', d3.geoPath().projection(projection)) // projection must be set
				.attr('class', 'highlight')
				.attr('stroke', '#0A005F')
				.attr('stroke-width', 1)
				.attr('fill', 'none');

			g.append('circle')
				.datum(clickedCoordinates)
				.attr('class', 'highlight')
				.attr('r', 2)
				.attr('fill', '#0A005F')
				.attr('cx', (d) => {
					const projected = projection(d);
					return projected ? projected[0] : 0;
				})
				.attr('cy', (d) => {
					const projected = projection(d);
					return projected ? projected[1] : 0;
				});

			// Draw just the closest one
			g.append('circle')
				.datum(closest.closestClinic)
				.attr('class', 'highlight')
				.attr('r', 6)
				.attr('fill', '#FFBC1F')
				.attr('stroke', '#0A005F')
				.attr('cx', (d) => {
					const projected = projection(d);
					return projected ? projected[0] : 0;
				})
				.attr('cy', (d) => {
					const projected = projection(d);
					return projected ? projected[1] : 0;
				});
		});
	});

	/**
	 * Find the shortest distance from the clicked coordinates to the nearest clinic.
	 * @param clinicPoints
	 * @param clickedCoordinates
	 */
	function findShortestDistance(
		clinicPoints: [number, number][],
		clickedCoordinates: [number, number] | null
	): { closestClinic: [number, number] | null; minDistance: number } {
		// for length of array use d3.distance to calculate distance between click and a point. if it's shorter than min, replace value
		let minDistance = Infinity;
		let closestClinic: [number, number] | null = null;

		if (!clickedCoordinates) {
			return { closestClinic: null, minDistance: Infinity };
		}

		for (const point of clinicPoints) {
			const radians = geoDistance(point, clickedCoordinates);
			const distanceKm = radians * 6371; // times by earth's radius in km

			if (distanceKm < minDistance) {
				minDistance = Math.floor(distanceKm * 100) / 100;
				closestClinic = point;
			}
		}
		return { closestClinic, minDistance };
	}

	function resetZoom() {
		console.log('reset zoom');
		const svg = d3.select('svg');
		const initialTransform = d3.zoomIdentity.translate(0, 90);
		svg.transition().duration(750).call(zoom.transform, initialTransform);
		showText = false;
		closest = { closestClinic: null, minDistance: Infinity };
		d3.selectAll('.highlight').remove();
	}

	/**
	 * Format the time in hours/minutes into a more readable format.
	 * @param minutes
	 */
	function getFormattedTime(minutes: number): string {
		if (minutes < 60) {
			return `${minutes} minute${minutes === 1 ? '' : 's'}`;
		}
		const hours = Math.floor(minutes / 60);
		const remainingMinutes = Math.round(minutes % 60);
		return `${hours} hour${hours === 1 ? '' : 's'} ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}`;
	}
</script>

<!-- Display map, display title here too -->
<div class="title">
	How long does it take to drive to the nearest abortion clinic?
	{#if !showText}
		<p>CLICK ANYWHERE TO FIND OUT</p>
	{/if}
	{#if showText}
		<p class="distance">
			THE CLOSEST CLINIC OFFERING ABORTION CARE IS A {getFormattedTime(closest.minDistance)} DRIVE AWAY.
		</p>
	{/if}
</div>

<button class="reset" on:click={resetZoom}>
	<p>Reset zoom</p>
</button>

<footer>
	<p><a href="https://www.ansirh.org/abortion-facility-database" target="_blank">source</a></p>
	<p>
		<a href="https://leviv.cool/">Levi</a> & <a href="https://www.queeniwu.com/">Queenie</a> @
		<a href="https://itp.nyu.edu/lowres/">IMA Low-Res</a>
	</p>
</footer>
<div bind:this={chartElement} class="chart"></div>

<style>
	:global body {
		width: 100%;
		height: 100%;
		background-color: #0a005f;
		color: #fff;
		margin: 0;
		padding: 0;
	}

	:global(.dragging) {
		cursor: all-scroll;
	}

	.chart {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: 1;
	}

	:global(svg.svg-content) {
		width: 100%;
		height: 100%;
		display: block;
	}

	p {
		width: 350px;
		font-family: 'IBM Plex Mono';
		font-weight: 400;
		font-size: 12px;
		line-height: 14px;
		font-weight: 300;
		letter-spacing: -2%;
		text-transform: uppercase;
	}

	.title {
		padding: 20px;
		margin: 10px;
		width: 350px;
		font-family: 'Instrument Serif', serif;
		font-style: normal;
		font-size: 42px;
		line-height: 40px;
		font-weight: 300;
		letter-spacing: -2%;
		display: block;
		position: relative;
		z-index: 2;
		background-color: #0a005f;
		color: #fff;
	}

	.reset {
		position: absolute;
		bottom: 0;
		right: 0;
		background-color: #0a005f;
		color: #fff;
		border: none;
		margin: 10px;
		padding: 10px 20px;
		width: fit-content;
		z-index: 2;

		&:hover {
			cursor: pointer;
			font-style: italic;
		}

		p {
			padding: 0;
			margin: 0;
			width: fit-content;
		}
	}

	footer {
		position: absolute;
		z-index: 2;
		bottom: 0;
		left: 0;
		color: #fff;
		margin: 10px;
		display: flex;
		gap: 20px;

		p {
			width: fit-content;
			background-color: #0a005f;
			padding: 10px 20px;
			margin: 0;

			a {
				color: #fff;

				&:hover {
					font-style: italic;
				}
			}
		}
	}
</style>
