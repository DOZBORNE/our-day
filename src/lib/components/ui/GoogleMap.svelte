<script lang="ts">
	import { onMount } from 'svelte';
	import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
	import { MapPin } from 'lucide-svelte';

	interface Props {
		lat?: number | null;
		lng?: number | null;
		location?: string;
		apiKey?: string;
	}

	let { lat = null, lng = null, location = '', apiKey = '' }: Props = $props();

	let mapContainer = $state<HTMLDivElement>(undefined!);
	let map: google.maps.Map | undefined;
	let marker: google.maps.marker.AdvancedMarkerElement | undefined;
	let loaded = $state(false);
	let error = $state(false);
	let optionsSet = false;

	const MAP_ID = '4b5bd44b2fb36727d766b942';

	function createPinElement(): HTMLDivElement {
		const el = document.createElement('div');
		el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="#ffffff" stroke="#e0d0d0" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 2px 6px rgba(0,0,0,0.5))"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3" fill="#7e5354"/></svg>`;
		return el;
	}

	async function initMap() {
		if (!apiKey || !mapContainer) return;

		try {
			if (!optionsSet) {
				setOptions({ key: apiKey, v: 'weekly' });
				optionsSet = true;
			}

			const { Map } = await importLibrary('maps');
			const { AdvancedMarkerElement } = await importLibrary('marker');

			const center = lat && lng ? { lat, lng } : { lat: 40.7128, lng: -74.006 };

			const { ColorScheme } = await importLibrary('core');

			map = new Map(mapContainer, {
				center,
				zoom: lat && lng ? 15 : 3,
				mapId: MAP_ID,
				colorScheme: ColorScheme.DARK,
				disableDefaultUI: true,
				zoomControl: true,
				gestureHandling: 'cooperative'
			});

			if (lat && lng) {
				marker = new AdvancedMarkerElement({
					map,
					position: { lat, lng },
					content: createPinElement()
				});
			}

			loaded = true;
		} catch (e) {
			console.warn('Google Maps failed to load:', e);
			error = true;
		}
	}

	onMount(() => {
		if (apiKey) initMap();
	});

	// React to coordinate changes
	$effect(() => {
		if (!map || !lat || !lng) return;
		const pos = { lat, lng };
		map.panTo(pos);
		map.setZoom(15);

		if (marker) {
			marker.position = pos;
		} else {
			importLibrary('marker').then(({ AdvancedMarkerElement }) => {
				marker = new AdvancedMarkerElement({
					map,
					position: pos,
					content: createPinElement()
				});
			});
		}
	});
</script>

{#if !apiKey}
	<div class="rounded-xl border border-outline-variant/40 bg-surface-low overflow-hidden">
		<div class="flex flex-col items-center justify-center py-12 px-6 text-center">
			<div class="w-12 h-12 rounded-full bg-primary-fixed/40 flex items-center justify-center mb-3">
				<MapPin size={20} class="text-primary" />
			</div>
			<p class="text-sm text-on-surface-variant">
				{#if location}
					<span class="font-medium text-on-surface">{location}</span>
				{:else}
					Add a location to see it on the map
				{/if}
			</p>
			<p class="text-xs text-on-surface-variant/60 mt-1">
				Set <code class="font-mono bg-surface-highest px-1 rounded">PUBLIC_GOOGLE_MAPS_API_KEY</code> in .env to enable maps
			</p>
		</div>
	</div>
{:else if error}
	<div class="rounded-xl border border-error/20 bg-error-container/10 overflow-hidden">
		<div class="flex flex-col items-center justify-center py-12 px-6 text-center">
			<div class="w-12 h-12 rounded-full bg-error-container/40 flex items-center justify-center mb-3">
				<MapPin size={20} class="text-error" />
			</div>
			<p class="text-sm text-on-surface-variant">Unable to load map</p>
			<p class="text-xs text-on-surface-variant/60 mt-1">Check your API key and try again</p>
		</div>
	</div>
{:else}
	<div class="rounded-xl border border-outline-variant/40 overflow-hidden relative">
		{#if !loaded}
			<div class="absolute inset-0 bg-surface-low flex items-center justify-center z-10">
				<div class="flex flex-col items-center gap-2">
					<div class="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
					<span class="text-xs text-on-surface-variant">Loading map...</span>
				</div>
			</div>
		{/if}
		<div bind:this={mapContainer} class="w-full h-[240px]"></div>
		{#if location && loaded}
			<div class="px-4 py-2.5 bg-surface-lowest border-t border-outline-variant/30 flex items-center gap-2">
				<MapPin size={13} class="text-primary shrink-0" />
				<span class="text-xs text-on-surface-variant truncate">{location}</span>
			</div>
		{/if}
	</div>
{/if}
