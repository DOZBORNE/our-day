<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		children: Snippet;
		hover?: boolean;
	}

	let { class: className, children, hover = false, ...rest }: Props = $props();
</script>

<div
	class={cn(
		'rounded-xl bg-cream border border-rose-light/30 shadow-sm',
		hover && 'hover:shadow-md hover:border-rose/30 transition-shadow cursor-pointer',
		className
	)}
	{...rest}
>
	{@render children()}
</div>
