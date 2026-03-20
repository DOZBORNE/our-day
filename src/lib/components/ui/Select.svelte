<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import type { Snippet } from 'svelte';
	import type { HTMLSelectAttributes } from 'svelte/elements';

	interface Props extends HTMLSelectAttributes {
		label?: string;
		children: Snippet;
		value?: string | number | null;
	}

	let { label, class: className, id, children, value = $bindable(), ...rest }: Props = $props();
	const selectId = id || `select-${Math.random().toString(36).slice(2, 8)}`;
</script>

<div class="space-y-1.5">
	{#if label}
		<label for={selectId} class="block text-sm font-medium text-on-surface">{label}</label>
	{/if}
	<select
		id={selectId}
		class={cn(
			'w-full rounded-lg border border-outline-variant/40 bg-surface-lowest px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition cursor-pointer',
			className
		)}
		bind:value
		{...rest}
	>
		{@render children()}
	</select>
</div>
