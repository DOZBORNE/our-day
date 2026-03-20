<script lang="ts">
	import { onMount } from 'svelte';
	import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
	import { cn } from '$lib/utils/cn';

	interface Props {
		label?: string;
		value?: string;
		apiKey?: string;
		onplace?: (place: { address: string; lat: number; lng: number }) => void;
		onblur?: (e: FocusEvent & { currentTarget: HTMLInputElement }) => void;
		class?: string;
	}

	let {
		label,
		value = $bindable(''),
		apiKey = '',
		onplace,
		onblur,
		class: className
	}: Props = $props();

	let inputEl: HTMLInputElement;
	let autocomplete: google.maps.places.Autocomplete | undefined;
	const inputId = `input-${Math.random().toString(36).slice(2, 8)}`;

	async function initAutocomplete() {
		if (!apiKey || !inputEl) return;

		try {
			setOptions({ key: apiKey, v: 'weekly' });
			const { Autocomplete } = await importLibrary('places');

			autocomplete = new Autocomplete(inputEl, {
				types: ['establishment', 'geocode'],
				fields: ['formatted_address', 'geometry', 'name']
			});

			autocomplete.addListener('place_changed', () => {
				const place = autocomplete!.getPlace();
				if (place.geometry?.location) {
					const address = place.formatted_address || place.name || '';
					value = address;
					onplace?.({
						address,
						lat: place.geometry.location.lat(),
						lng: place.geometry.location.lng()
					});
				}
			});
		} catch (e) {
			console.warn('Google Places autocomplete failed to load:', e);
		}
	}

	onMount(() => {
		if (apiKey) initAutocomplete();
	});
</script>

<div class="space-y-1.5">
	{#if label}
		<label for={inputId} class="block text-sm font-medium text-on-surface">{label}</label>
	{/if}
	<input
		id={inputId}
		bind:this={inputEl}
		bind:value
		{onblur}
		class={cn(
			'w-full rounded-lg border border-outline-variant/40 bg-surface-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition',
			className
		)}
		placeholder="Search for a venue or address..."
	/>
</div>

<style>
	/* Style the Google Places autocomplete dropdown to match the app theme */
	:global(.pac-container) {
		border: 1px solid var(--color-outline-variant);
		border-radius: 0.75rem;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
		margin-top: 4px;
		font-family: var(--font-sans);
		background: var(--color-surface-lowest);
		overflow: hidden;
	}

	:global(.pac-item) {
		padding: 8px 12px;
		border-top: 1px solid var(--color-outline-variant, #d5c2c2);
		color: var(--color-on-surface);
		font-size: 0.875rem;
		cursor: pointer;
		transition: background-color 0.15s;
	}

	:global(.pac-item:first-child) {
		border-top: none;
	}

	:global(.pac-item:hover) {
		background-color: var(--color-primary-fixed, #ffdad9);
	}

	:global(.pac-item-selected) {
		background-color: var(--color-primary-fixed, #ffdad9);
	}

	:global(.pac-item-query) {
		color: var(--color-on-surface);
		font-weight: 500;
	}

	:global(.pac-matched) {
		color: var(--color-primary);
		font-weight: 600;
	}

	:global(.pac-icon) {
		display: none;
	}

	:global(.pac-item::before) {
		content: '';
		display: inline-block;
		width: 16px;
		height: 16px;
		margin-right: 8px;
		vertical-align: middle;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%237e5354' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0'/%3E%3Ccircle cx='12' cy='10' r='3'/%3E%3C/svg%3E");
		background-size: contain;
		background-repeat: no-repeat;
	}
</style>
