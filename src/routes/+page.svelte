<script lang="ts">
	import { onMount } from 'svelte';
	import us from '$lib/us.json';
	import clinics from '$lib/a-clinics.json';
	import * as d3 from 'd3';
	import { geoAlbersUsa } from 'd3-geo';
	import { feature } from 'topojson-client';
	import { geoDistance } from "d3-geo";

	let chartElement: HTMLDivElement;

	// Plot all of the states
	const projection: d3.GeoProjection = geoAlbersUsa();
	const path = d3.geoPath().projection(projection);
	const states = feature(us as any, (us as any).objects.states).features;

	// D3 code needs to be only onMount so we don't have perf issues
	onMount(() => {
		// Load the abortion clinic data
		const clinicPoints = clinics.features.map((clinic) => {
			return clinic.geometry.coordinates;
		});

		// Set up the svg container
		const chart = d3
			.select(chartElement)
			.append('svg')
			.attr('preserveAspectRatio', 'xMinYMin meet')
			.attr('viewBox', '0 0 960 600')
			.attr('stroke', '#0A005F')
			.attr('fill', '#F9F9F9')
			.on('click', (event) => {
				// Get the latitude and longitude of the clicked point
				const clickedCoordinates = projection.invert!(d3.pointer(event));
				console.log(clickedCoordinates);
				const closest = findShortestDistance(clinicPoints, clickedCoordinates);
				console.log("Distance (km):", closest.minDistance);
				console.log("Closest point:", closest.closestClinic)
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

		
		chart
			.selectAll('circle')
			.data(clinicPoints)
			.enter()
			.append('circle')
			.attr('r', 4)
			.attr('fill', '#FFBC1F')
			.attr('stroke', '#0A005F')
			.attr('cx', function (coordinate) {
				return projection(coordinate)[0]; // x coordinate / latitude
			})
			.attr('cy', function (coordinate) {
				return projection(coordinate)[1]; // y coordinate / longitude
			});
	});

	function findShortestDistance(clinicPoints, clickedCoordinates) {
		console.log("calculating");
		// for length of array use d3.distance to calculate distance between click and a point. if it's shorter than min, replace value
		let minDistance = Infinity;
		let closestClinic = null;

		for (const point of clinicPoints) {
		const radians = geoDistance(point, clickedCoordinates);
		const distanceKm = radians * 6371; // times by earth's radius in km

		if (distanceKm < minDistance) {
			minDistance = distanceKm;
			closestClinic = point;
		}
	}
	return { closestClinic, minDistance };
	}


</script>

 <!-- Display map, display title here too -->
<div bind:this={chartElement} class="chart"></div>


<style>
	div {
		background-color: #0A005F;
	}
</style>