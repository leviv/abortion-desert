<script lang="ts">
	import { onMount } from 'svelte';
	import us from '$lib/us.json';
	import clinics from '$lib/a-clinics.json';
	import * as d3 from 'd3';
	import { geoAlbersUsa } from 'd3-geo';
	import { feature } from 'topojson-client';
	let el: HTMLDivElement;

	onMount(() => {
		// Set up the svg container
		const chart = d3
			.select(el)
			.append('svg')
			.attr('preserveAspectRatio', 'xMinYMin meet')
			.attr('viewBox', '0 0 960 600')
			.attr('stroke', '#fff')
			.attr('fill', '#264653')
			.classed('svg-content', true);

		// Plot all of the states
		const projection = geoAlbersUsa();
		const path = d3.geoPath().projection(projection);
		const states = feature(us as any, (us as any).objects.states).features;

		chart
			.selectAll('path')
			.data(states)
			.enter()
			.append('path')
			.attr('class', 'states')
			.attr('d', path);
	});
</script>

<div bind:this={el} class="chart"></div>
