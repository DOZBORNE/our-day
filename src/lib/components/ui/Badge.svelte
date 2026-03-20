<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'rose' | 'sage' | 'gold' | 'neutral' | 'saturday' | 'frisun' | 'weekday';
		class?: string;
		children: Snippet;
	}

	let { variant = 'rose', class: className, children }: Props = $props();

	const variants = {
		rose: 'bg-primary-fixed text-primary border-primary/20',
		sage: 'bg-secondary-container text-on-secondary-container border-secondary/20',
		gold: 'bg-tertiary-fixed text-tertiary border-tertiary/20',
		neutral: 'bg-surface text-on-surface-variant border-outline-variant/20',
		saturday: 'bg-tier-saturday/30 text-on-surface border-tier-saturday/30',
		frisun: 'bg-tier-frisun/30 text-on-surface border-tier-frisun/30',
		weekday: 'bg-tier-weekday/30 text-on-surface border-tier-weekday/30'
	};
</script>

<span
	class={cn(
		'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
		variants[variant],
		className
	)}
>
	{@render children()}
</span>
