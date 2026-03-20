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
		rose: 'bg-rose-light text-rose border-rose/20',
		sage: 'bg-sage-light text-sage border-sage/20',
		gold: 'bg-gold-light text-gold border-gold/20',
		neutral: 'bg-cream text-charcoal border-charcoal/10',
		saturday: 'bg-tier-saturday/30 text-charcoal border-tier-saturday/30',
		frisun: 'bg-tier-frisun/30 text-charcoal border-tier-frisun/30',
		weekday: 'bg-tier-weekday/30 text-charcoal border-tier-weekday/30'
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
