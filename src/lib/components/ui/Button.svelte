<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	interface Props extends HTMLButtonAttributes {
		variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
		size?: 'sm' | 'md' | 'lg';
		children: Snippet;
	}

	let { variant = 'primary', size = 'md', class: className, children, ...rest }: Props = $props();

	const variants = {
		primary: 'bg-gradient-to-r from-primary to-primary-container text-on-primary shadow-sm hover:shadow-md active:scale-[0.98]',
		secondary: 'bg-secondary text-on-secondary hover:bg-secondary/90 shadow-sm',
		outline: 'border border-outline-variant text-on-surface hover:bg-surface-low',
		ghost: 'text-on-surface-variant hover:bg-surface-low hover:text-on-surface',
		danger: 'bg-error text-on-error hover:bg-error/90'
	};

	const sizes = {
		sm: 'px-3 py-1.5 text-xs',
		md: 'px-4 py-2 text-sm',
		lg: 'px-6 py-3 text-base'
	};
</script>

<button
	class={cn(
		'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
		variants[variant],
		sizes[size],
		className
	)}
	{...rest}
>
	{@render children()}
</button>
