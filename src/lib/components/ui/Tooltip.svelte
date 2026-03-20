<script lang="ts">
	import { Tooltip } from 'bits-ui';
	import type { Snippet } from 'svelte';

	interface Props {
		text: string;
		children: Snippet;
		side?: 'top' | 'bottom' | 'left' | 'right';
	}

	let { text, children, side = 'top' }: Props = $props();
</script>

<Tooltip.Root openDelay={200}>
	<Tooltip.Trigger
		class="inline-flex cursor-default"
		onclick={(e: MouseEvent) => e.preventDefault()}
	>
		{@render children()}
	</Tooltip.Trigger>
	<Tooltip.Portal>
		<Tooltip.Content
			{side}
			sideOffset={4}
			class="z-50 max-w-xs rounded-lg border border-outline-variant/30 bg-surface-lowest px-3 py-2 text-xs text-on-surface shadow-lg animate-in fade-in-0 zoom-in-95"
		>
			{text}
			<Tooltip.Arrow class="border-outline-variant/30 fill-surface-lowest" />
		</Tooltip.Content>
	</Tooltip.Portal>
</Tooltip.Root>
