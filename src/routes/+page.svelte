<script lang="ts">
	import { onMount } from 'svelte';
	import us from '$lib/us.json';
	import clinics from '$lib/a-clinics.json';
	import * as d3 from 'd3';
	import { geoAlbersUsa } from 'd3-geo';
	import { feature } from 'topojson-client';

	let chartElement: HTMLDivElement;

	// Plot all of the states
	const projection: d3.GeoProjection = geoAlbersUsa();
	const path = d3.geoPath().projection(projection);
	const states = feature(us as any, (us as any).objects.states).features;

	// D3 code needs to be only onMount so we don't have perf issues
	onMount(() => {
		// Set up the svg container
		const chart = d3
			.select(chartElement)
			.append('svg')
			.attr('preserveAspectRatio', 'xMinYMin meet')
			.attr('viewBox', '0 0 960 600')
			.attr('stroke', '#fff')
			.attr('fill', '#264653')
			.on('click', (event) => {
				// Get the latitude and longitude of the clicked point
				const clickedCoordinates = projection.invert!(d3.pointer(event));
				console.log(clickedCoordinates);
			})
			.classed('svg-content', true);

		// Load the map data
		chart
			.selectAll('path')
			.data(states)
			.enter()
			.append('path')
			.attr('class', 'states')
			.attr('d', path);

		// Load the abortion clinic data
		const clinicPoints = clinics.features.map((clinic) => {
			return clinic.geometry.coordinates;
		});
		chart
			.selectAll('circle')
			.data(clinicPoints)
			.enter()
			.append('circle')
			.attr('r', 5)
			.attr('fill', '#FED892')
			.attr('stroke', '#000')
			.attr('cx', function (coordinate) {
				return projection(coordinate)[0]; // x coordinate / latitude
			})
			.attr('cy', function (coordinate) {
				return projection(coordinate)[1]; // y coordinate / longitude
			});
	});
</script>

<div bind:this={chartElement} class="chart"></div>
