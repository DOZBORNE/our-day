<script lang="ts">
	interface Props {
		value: number;
		onchange?: (val: number) => void;
		readonly?: boolean;
		size?: 'sm' | 'md' | 'lg';
	}

	let { value, onchange, readonly = false, size = 'md' }: Props = $props();

	const sizeClasses = {
		sm: 'w-4 h-4',
		md: 'w-5 h-5',
		lg: 'w-6 h-6'
	};

	function handleClick(star: number) {
		if (!readonly && onchange) {
			onchange(star === value ? 0 : star);
		}
	}
</script>

<div class="flex gap-0.5">
	{#each [1, 2, 3, 4, 5] as star}
		<button
			type="button"
			onclick={() => handleClick(star)}
			class="focus:outline-none {readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform"
			disabled={readonly}
		>
			<svg viewBox="0 0 24 24" class="{sizeClasses[size]} {star <= value ? 'text-gold fill-gold' : 'text-charcoal/20 fill-charcoal/20'}">
				<path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
			</svg>
		</button>
	{/each}
</div>
