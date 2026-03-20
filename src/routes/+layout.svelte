<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/stores';
	import { loadVenues, getVenuesLoaded } from '$lib/stores/venues.svelte';
	import { loadVendors, getVendorsLoaded } from '$lib/stores/vendors.svelte';
	import { loadBudget, getBudgetLoaded } from '$lib/stores/budget.svelte';
	import PageLoader from '$lib/components/ui/PageLoader.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import { Heart, Bell, UserCircle } from 'lucide-svelte';

	let { children } = $props();

	loadVenues();
	loadVendors();
	loadBudget();

	let allLoaded = $derived(getVenuesLoaded() && getVendorsLoaded() && getBudgetLoaded());

	// Don't show nav chrome on login page
	let isLoginPage = $derived($page.url.pathname === '/login');

	const navItems = [
		{ href: '/', label: 'Dashboard' },
		{ href: '/venues', label: 'Venues' },
		{ href: '/vendors', label: 'Vendors' },
		{ href: '/dates', label: 'Dates' },
		{ href: '/compare', label: 'Compare' }
	];

	function isActive(href: string, pathname: string): boolean {
		if (href === '/') return pathname === '/';
		return pathname.startsWith(href);
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if isLoginPage}
	{@render children()}
{:else}
	<div class="min-h-screen bg-background">
		<!-- Navigation -->
		<nav class="fixed top-0 w-full z-50 bg-white/85 backdrop-blur-xl border-b border-outline-variant/10 shadow-sm">
			<div class="max-w-screen-2xl mx-auto px-6">
				<div class="flex items-center justify-between h-16">
					<a href="/" class="flex items-center gap-2.5 no-underline">
						<Heart class="w-5 h-5 text-primary" fill="currentColor" />
						<span class="text-xl font-semibold text-on-surface tracking-tight">Wedding Planner</span>
					</a>
					<div class="hidden md:flex items-center gap-8">
						{#each navItems as item}
							{@const active = isActive(item.href, $page.url.pathname)}
							<a
								href={item.href}
								class="transition-colors no-underline pb-1 text-sm tracking-tight
									{active
										? 'text-on-surface font-medium border-b-2 border-primary'
										: 'text-on-surface-variant hover:text-on-surface border-b-2 border-transparent'}"
							>
								{item.label}
							</a>
						{/each}
					</div>
					<div class="flex items-center gap-2">
						<button class="p-2 text-on-surface-variant hover:bg-surface-low rounded-lg transition-all cursor-pointer">
							<Bell class="w-5 h-5" />
						</button>
						<button class="p-2 text-on-surface-variant hover:bg-surface-low rounded-lg transition-all cursor-pointer">
							<UserCircle class="w-5 h-5" />
						</button>
					</div>
				</div>
			</div>
		</nav>

		<!-- Page Content -->
		<div class="pt-16">
			{#if allLoaded}
				{@render children()}
			{:else}
				<PageLoader />
			{/if}
		</div>
	</div>

	<Toast />
{/if}
