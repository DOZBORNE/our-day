<script lang="ts">
	import { enhance } from '$app/forms';
	import { Heart, Lock } from 'lucide-svelte';
	import '../../app.css';

	let { form } = $props();
</script>

<div class="min-h-screen bg-background flex items-center justify-center px-4">
	<div class="w-full max-w-sm">
		<div class="text-center mb-8">
			<div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center mx-auto mb-4">
				<Heart class="w-8 h-8 text-on-primary" fill="currentColor" />
			</div>
			<h1 class="text-2xl font-bold text-on-surface tracking-tight">Wedding Planner</h1>
			<p class="text-on-surface-variant text-sm mt-1">Enter access code to continue</p>
		</div>

		<form method="POST" use:enhance class="bg-surface-lowest rounded-2xl p-6 border border-outline-variant/20 shadow-sm space-y-4">
			<div class="relative">
				<Lock class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
				<input
					type="password"
					name="code"
					placeholder="Access code"
					class="w-full rounded-xl border {form?.incorrect ? 'border-error ring-2 ring-error/20' : 'border-outline-variant/40'} bg-surface-lowest pl-10 pr-4 py-3 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition"
					autofocus
				/>
			</div>

			{#if form?.incorrect}
				<p class="text-error text-xs font-medium">Incorrect access code. Please try again.</p>
			{/if}

			<button
				type="submit"
				class="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-primary-container text-on-primary font-medium text-sm shadow-sm hover:shadow-md transition-all cursor-pointer"
			>
				Enter
			</button>
		</form>
	</div>
</div>
