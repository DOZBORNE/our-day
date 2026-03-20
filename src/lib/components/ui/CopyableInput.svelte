<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import { Copy, Check, ExternalLink } from 'lucide-svelte';

	interface Props {
		label?: string;
		value?: string;
		placeholder?: string;
		prefix?: string;
		type?: 'text' | 'email' | 'url';
		href?: string;
		onblur?: (e: FocusEvent & { currentTarget: HTMLInputElement }) => void;
	}

	let { label, value = '', placeholder, prefix, type = 'text', href, onblur }: Props = $props();

	let copied = $state(false);
	let copyTimeout: ReturnType<typeof setTimeout>;

	function handleCopy() {
		if (!value) return;
		navigator.clipboard.writeText(value);
		copied = true;
		clearTimeout(copyTimeout);
		copyTimeout = setTimeout(() => (copied = false), 1500);
	}

	const inputId = `input-${Math.random().toString(36).slice(2, 8)}`;
</script>

<div class="space-y-1.5">
	{#if label}
		<label for={inputId} class="block text-sm font-medium text-on-surface">{label}</label>
	{/if}
	<div class="group/copyable relative flex items-center">
		{#if prefix}
			<span class="absolute left-3 text-sm text-on-surface-variant/50 pointer-events-none select-none">{prefix}</span>
		{/if}
		<input
			id={inputId}
			{type}
			class={cn(
				'w-full rounded-lg border border-outline-variant/40 bg-surface-lowest py-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition',
				prefix ? 'pl-[4.2rem] pr-3' : 'pl-3 pr-3',
				value ? 'pr-[4.5rem]' : ''
			)}
			{value}
			{placeholder}
			{onblur}
		/>
		{#if value}
			<div class="absolute right-1.5 flex items-center gap-0.5 opacity-0 group-hover/copyable:opacity-100 focus-within:opacity-100 transition-opacity">
				<button
					type="button"
					class="p-1.5 rounded-md hover:bg-surface-high text-on-surface-variant hover:text-on-surface transition-colors"
					title={copied ? 'Copied!' : 'Copy'}
					onclick={handleCopy}
				>
					{#if copied}
						<Check size={14} class="text-green-500" />
					{:else}
						<Copy size={14} />
					{/if}
				</button>
				{#if href}
					<a
						{href}
						target="_blank"
						rel="noopener noreferrer"
						class="p-1.5 rounded-md hover:bg-surface-high text-on-surface-variant hover:text-on-surface transition-colors"
						title="Open link"
					>
						<ExternalLink size={14} />
					</a>
				{/if}
			</div>
		{/if}
	</div>
</div>
