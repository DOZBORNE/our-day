<script lang="ts" module>
	interface ToastItem {
		id: number;
		message: string;
		type: 'success' | 'error' | 'info';
	}

	let toasts = $state<ToastItem[]>([]);
	let nextId = 0;

	export function showToast(message: string, type: 'success' | 'error' | 'info' = 'success') {
		const id = nextId++;
		toasts = [...toasts, { id, message, type }];
		setTimeout(() => {
			toasts = toasts.filter((t) => t.id !== id);
		}, 2500);
	}
</script>

{#if toasts.length > 0}
	<div class="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
		{#each toasts as toast (toast.id)}
			<div
				class="pointer-events-auto px-5 py-3 rounded-xl shadow-lg text-sm font-medium bg-surface-lowest border-l-4 text-on-surface flex items-center gap-3 animate-slide-in
					{toast.type === 'success' ? 'border-l-secondary' : ''}
					{toast.type === 'error' ? 'border-l-error' : ''}
					{toast.type === 'info' ? 'border-l-primary' : ''}"
			>
				{toast.message}
			</div>
		{/each}
	</div>
{/if}

<style>
	@keyframes slide-in {
		from {
			opacity: 0;
			transform: translateX(1rem);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}
	.animate-slide-in {
		animation: slide-in 0.2s ease-out;
	}
</style>
