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
		'rounded-xl bg-surface-lowest border border-outline-variant/10 shadow-sm',
		hover && 'hover:shadow-md hover:border-outline-variant/20 transition-all cursor-pointer',
		className
	)}
	{...rest}
>
	{@render children()}
</div>
