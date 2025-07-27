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

	let chartElement: HTMLDivElement;
	let closest: Closest = { closestClinic: null, minDistance: Infinity };
	let showText = false;

	// Plot all of the states
	const projection: d3.GeoProjection = geoAlbersUsa();
	const path = d3.geoPath().projection(projection);
	const states = feature(us as any, (us as any).objects.states).features;

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
			.attr('viewBox', '0 0 960 600')
			.attr('preserveAspectRatio', 'xMidYMid meet')
			.attr('stroke', '#0A005F')
			.attr('fill', '#F9F9F9')
			.classed('svg-content', true);

		// Plot all of the states
		const g = chart.append('g');
		const svg = d3.select('svg');
		g.selectAll('path').data(states).enter().append('path').attr('class', 'states').attr('d', path);

		// Panning and zooming functionality
		const zoom = d3
			.zoom()
			.on('zoom', function (event) {
				g.attr('transform', event.transform);
			})
			.on('start', function () {
				d3.select(this).classed('dragging', true);
			})
			.on('end', function () {
				d3.select(this).classed('dragging', false);
			});

		svg.call(zoom);

		// Add an onclick handler to the chart
		chart.on('click', (event) => {
			// Get the latitude and longitude of the clicked point
			showText = true;
			const clickedCoordinates = projection.invert!(d3.pointer(event));
			console.log(clickedCoordinates);
			closest = findShortestDistance(clinicPoints, clickedCoordinates);
			closest = { ...closest };
			console.log('Distance (km):', closest.minDistance);
			console.log('Closest point:', closest.closestClinic);
			console.log(showText);
			chart.selectAll('.highlight').remove();

			// Draw just the closest one
			chart
				.append('circle')
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

	//  $: closest = findShortestDistance(clinicPoints, clickedCoordinates).toFixed(1);
</script>

<!-- Display map, display title here too -->
<div class="title">
	How long does it take to drive to the nearest abortion clinic?
	<p>CLICK ANYWHERE TO FIND OUT</p>
	{#if showText}
		<p>THE CLOSEST CLINIC OFFERING ABORTION CARE IS A {closest.minDistance} MINUTE DRIVE AWAY.</p>
	{/if}
</div>
<div bind:this={chartElement} class="chart"></div>

<style>
	:global body {
		width: 100%;
		height: 100%;
		background-color: #0a005f;
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
		z-index: -1;
	}

	:global(svg.svg-content) {
		width: 100%;
		height: 100%;
		display: block;
	}

	div {
		background-color: #0a005f;
		color: #fff;
	}

	p {
		width: 280px;
		font-family: 'IBM Plex Mono';
		font-weight: 400;
		font-size: 10px;
		line-height: 14px;
		font-weight: 300;
		letter-spacing: -2%;
		opacity: 80%;
	}

	.title {
		padding: 20px;
		width: 280px;
		font-family: 'Instrument Serif', serif;
		font-style: normal;
		font-size: 36px;
		line-height: 40px;
		font-weight: 300;
		letter-spacing: -2%;
	}
</style>
