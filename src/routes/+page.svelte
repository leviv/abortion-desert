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
	let closest = {};
	let showText = false;

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
				showText = true;
				const clickedCoordinates = projection.invert!(d3.pointer(event));
				console.log(clickedCoordinates);
				closest = findShortestDistance(clinicPoints, clickedCoordinates);
				console.log("Distance (km):", closest.minDistance);
				console.log("Closest point:", closest.closestClinic);
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
		// for length of array use d3.distance to calculate distance between click and a point. if it's shorter than min, replace value
		let minDistance = Infinity;
		let closestClinic = null;

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
<div class = "title">
How long does it take to drive to the nearest abortion clinic?
<div class = "caption"> CLICK ANYWHERE TO FIND OUT</div>
</div>
<div bind:this={chartElement} class="chart"></div>
<div class = "title"> {#if showText}
	<p>THE CLOSEST CLINIC OFFERING ABORTION CARE IS A {closest.minDistance} MINUTE DRIVE AWAY.</p>
	{/if}
</div>



<style>

:global body {
	width: 100%;
	height: 100%;
	background-color: #0A005F;
}

div {
	background-color: #0A005F;
	color: #fff;
}

p {
	width: 280px;
	font-family: "IBM Plex Mono";
	font-weight: 400;
	font-size: 10px;
	line-height: 14px;
	font-weight: 300;
	letter-spacing: -2%;
}

.title {
	padding: 20px;
	width: 280px;
	font-family: "Instrument Serif", serif;
  	font-style: normal;
	font-size: 36px;
	line-height: 40px;
	font-weight: 300;
	letter-spacing: -2%;
}

.caption {
	width: 280px;
	font-family: "IBM Plex Mono";
	font-weight: 400;
	font-size: 10px;
	line-height: 20px;
	font-weight: 300;
	letter-spacing: -2%;
	opacity: 80%;
}

</style>