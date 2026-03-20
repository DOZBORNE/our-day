<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends HTMLInputAttributes {
		label?: string;
	}

	let { label, class: className, id, ...rest }: Props = $props();
	const inputId = id || `input-${Math.random().toString(36).slice(2, 8)}`;
</script>

<div class="space-y-1.5">
	{#if label}
		<label for={inputId} class="block text-sm font-medium text-charcoal">{label}</label>
	{/if}
	<input
		id={inputId}
		class={cn(
			'w-full rounded-lg border border-rose-light/50 bg-warm-white px-3 py-2 text-sm text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-rose/50 focus:border-rose transition',
			className
		)}
		{...rest}
	/>
</div>
