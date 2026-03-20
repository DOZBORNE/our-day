<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import type { Snippet } from 'svelte';
	import type { HTMLSelectAttributes } from 'svelte/elements';

	interface Props extends HTMLSelectAttributes {
		label?: string;
		children: Snippet;
	}

	let { label, class: className, id, children, ...rest }: Props = $props();
	const selectId = id || `select-${Math.random().toString(36).slice(2, 8)}`;
</script>

<div class="space-y-1.5">
	{#if label}
		<label for={selectId} class="block text-sm font-medium text-charcoal">{label}</label>
	{/if}
	<select
		id={selectId}
		class={cn(
			'w-full rounded-lg border border-rose-light/50 bg-warm-white px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-rose/50 focus:border-rose transition cursor-pointer',
			className
		)}
		{...rest}
	>
		{@render children()}
	</select>
</div>
