<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends HTMLInputAttributes {
		label?: string;
		value?: string | number | null;
	}

	let { label, class: className, id, value = $bindable(), ...rest }: Props = $props();
	const inputId = id || `input-${Math.random().toString(36).slice(2, 8)}`;
</script>

<div class="space-y-1.5">
	{#if label}
		<label for={inputId} class="block text-sm font-medium text-on-surface">{label}</label>
	{/if}
	<input
		id={inputId}
		class={cn(
			'w-full rounded-lg border border-outline-variant/40 bg-surface-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition',
			className
		)}
		bind:value
		{...rest}
	/>
</div>
