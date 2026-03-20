<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		open: boolean;
		onclose: () => void;
		title?: string;
		children: Snippet;
		footer?: Snippet;
	}

	let { open, onclose, title, children, footer }: Props = $props();

	function handleBackdrop(e: MouseEvent) {
		if (e.target === e.currentTarget) onclose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
		onclick={handleBackdrop}
		onkeydown={handleKeydown}
	>
		<div
			class="bg-warm-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col"
			role="dialog"
			aria-modal="true"
			aria-label={title}
		>
			{#if title}
				<div class="flex items-center justify-between px-6 py-4 border-b border-rose-light/30">
					<h2 class="text-lg font-semibold text-charcoal">{title}</h2>
					<button onclick={onclose} class="p-1 rounded-lg hover:bg-cream text-charcoal/60 cursor-pointer">
						<svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
							<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
						</svg>
					</button>
				</div>
			{/if}
			<div class="px-6 py-4 overflow-y-auto flex-1">
				{@render children()}
			</div>
			{#if footer}
				<div class="px-6 py-4 border-t border-rose-light/30 flex justify-end gap-3">
					{@render footer()}
				</div>
			{/if}
		</div>
	</div>
{/if}
