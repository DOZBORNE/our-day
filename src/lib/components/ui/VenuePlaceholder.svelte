<script lang="ts">
	import { Building2 } from 'lucide-svelte';

	interface Props {
		class?: string;
	}

	let { class: className = '' }: Props = $props();
</script>

<div class="w-full h-full bg-surface-low flex flex-col items-center justify-center gap-2 {className}">
	<div class="w-12 h-12 rounded-full bg-surface flex items-center justify-center">
		<Building2 size={24} class="text-outline-variant" />
	</div>
	<span class="text-xs text-outline-variant font-mono">No photo</span>
</div>
