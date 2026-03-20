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
		primary: 'bg-rose text-white hover:bg-rose/90 shadow-sm',
		secondary: 'bg-sage text-white hover:bg-sage/90 shadow-sm',
		outline: 'border-2 border-rose text-rose hover:bg-rose-light',
		ghost: 'text-charcoal hover:bg-cream',
		danger: 'bg-red-500 text-white hover:bg-red-600'
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
