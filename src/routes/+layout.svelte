<script lang="ts">
    import "../app.css";
    import favicon from "$lib/assets/favicon.svg";
    import { page } from "$app/stores";
    import { loadVenues, getVenuesLoaded } from "$lib/stores/venues.svelte";
    import { loadVendors, getVendorsLoaded } from "$lib/stores/vendors.svelte";
    import { loadBudget, getBudgetLoaded } from "$lib/stores/budget.svelte";
    import PageLoader from "$lib/components/ui/PageLoader.svelte";
    import Toast from "$lib/components/ui/Toast.svelte";
    import { Tooltip } from "bits-ui";
    import {
        Heart,
        Bell,
        UserCircle,
        Home,
        Building2,
        Users,
        Calendar,
        BarChart3,
    } from "lucide-svelte";

    let { children } = $props();

    loadVenues();
    loadVendors();
    loadBudget();

    let allLoaded = $derived(
        getVenuesLoaded() && getVendorsLoaded() && getBudgetLoaded(),
    );

    // Don't show nav chrome on login page
    let isLoginPage = $derived($page.url.pathname === "/login");

    const navItems = [
        { href: "/", label: "Dashboard", icon: Home },
        { href: "/venues", label: "Venues", icon: Building2 },
        { href: "/vendors", label: "Vendors", icon: Users },
        { href: "/dates", label: "Dates", icon: Calendar },
        { href: "/compare", label: "Compare", icon: BarChart3 },
    ];

    function isActive(href: string, pathname: string): boolean {
        if (href === "/") return pathname === "/";
        return pathname.startsWith(href);
    }
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
</svelte:head>

<Tooltip.Provider>
    {#if isLoginPage}
        {@render children()}
    {:else}
        <div class="min-h-screen bg-background pb-16 md:pb-0">
            <!-- Top Navigation -->
            <nav
                class="fixed top-0 w-full z-50 bg-white/85 backdrop-blur-xl border-b border-outline-variant/10 shadow-sm"
            >
                <div class="max-w-screen-2xl mx-auto px-4 sm:px-6">
                    <div class="flex items-center justify-between h-14 sm:h-16">
                        <a
                            href="/"
                            class="flex items-center gap-2 no-underline shrink-0"
                        >
                            <Heart
                                class="w-5 h-5 text-primary"
                                fill="currentColor"
                            />
                            <span
                                class="text-lg sm:text-xl font-semibold text-on-surface tracking-tight"
                                >Our Day</span
                            >
                        </a>

                        <!-- Desktop nav links -->
                        <div class="hidden md:flex items-center gap-8">
                            {#each navItems as item}
                                {@const active = isActive(
                                    item.href,
                                    $page.url.pathname,
                                )}
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

                        <div class="flex items-center gap-1 sm:gap-2">
                            <button
                                class="p-2 text-on-surface-variant hover:bg-surface-low rounded-lg transition-all cursor-pointer"
                            >
                                <Bell class="w-5 h-5" />
                            </button>
                            <button
                                class="hidden sm:block p-2 text-on-surface-variant hover:bg-surface-low rounded-lg transition-all cursor-pointer"
                            >
                                <UserCircle class="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <!-- Page Content -->
            <div class="pt-14 sm:pt-16">
                {#if allLoaded}
                    {@render children()}
                {:else}
                    <PageLoader />
                {/if}
            </div>
        </div>

        <!-- Mobile bottom tab bar -->
        <nav
            class="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-outline-variant/20 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]"
        >
            <div class="flex items-center justify-around h-14 px-1">
                {#each navItems as item}
                    {@const active = isActive(item.href, $page.url.pathname)}
                    <a
                        href={item.href}
                        class="flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-lg no-underline transition-colors
						{active ? 'text-primary' : 'text-on-surface-variant'}"
                    >
                        <item.icon class="w-5 h-5" />
                        <span class="text-[10px] font-medium leading-tight"
                            >{item.label}</span
                        >
                    </a>
                {/each}
            </div>
        </nav>

        <Toast />
    {/if}
</Tooltip.Provider>
