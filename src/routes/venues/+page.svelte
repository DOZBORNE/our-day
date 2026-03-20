<script lang="ts">
	import { getVenues, createVenue, deleteVenue } from '$lib/stores/venues.svelte';
	import { getBudget } from '$lib/stores/budget.svelte';
	import { calculateGrandTotal, calculateVenueSubtotal } from '$lib/utils/calculations';
	import { formatCurrency, formatDateShort } from '$lib/utils/formatters';
	import type { Venue, VenueType } from '$lib/types';
	import StarRating from '$lib/components/ui/StarRating.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { goto } from '$app/navigation';
	import { Plus, MapPin, Heart, Users, DollarSign, LayoutGrid, List, Trash2, Eye } from 'lucide-svelte';
	import VenuePlaceholder from '$lib/components/ui/VenuePlaceholder.svelte';

	type SortField = 'name' | 'price' | 'capacity' | 'rating';
	type SortDir = 'asc' | 'desc';

	let sortField = $state<SortField>('name');
	let sortDir = $state<SortDir>('asc');
	let filterType = $state<VenueType | 'all'>('all');
	let viewMode = $state<'grid' | 'list'>('grid');

	let deleteTarget = $state<Venue | null>(null);
	let showDeleteModal = $state(false);

	const venues = $derived(getVenues());
	const budget = $derived(getBudget());

	function venueGrandTotal(venue: Venue): number {
		return calculateGrandTotal(venue.cost_categories ?? [], budget.guest_count);
	}

	function venueBaseTotal(venue: Venue): number {
		return calculateVenueSubtotal(venue.cost_categories ?? [], budget.guest_count);
	}

	const filteredVenues = $derived.by(() => {
		let result = venues;

		if (filterType !== 'all') {
			result = result.filter((v) => v.venue_type === filterType);
		}

		result = [...result].sort((a, b) => {
			let cmp = 0;
			switch (sortField) {
				case 'name':
					cmp = a.name.localeCompare(b.name);
					break;
				case 'price':
					cmp = venueGrandTotal(a) - venueGrandTotal(b);
					break;
				case 'capacity':
					cmp = a.capacity_seated - b.capacity_seated;
					break;
				case 'rating':
					cmp = a.rating - b.rating;
					break;
			}
			return sortDir === 'asc' ? cmp : -cmp;
		});

		return result;
	});

	function toggleSort(field: SortField) {
		if (sortField === field) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortField = field;
			sortDir = field === 'rating' || field === 'price' ? 'desc' : 'asc';
		}
	}

	async function handleAddVenue() {
		// createVenue adds to store array immediately (optimistic UI), then does DB calls
		// We await only to get the ID, but navigation happens near-instantly since
		// the store update is synchronous and DB calls happen in background try/catch
		const newVenue = await createVenue({ name: 'New Venue' });
		goto(`/venues/${newVenue.id}`);
	}

	function confirmDelete(venue: Venue, e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		deleteTarget = venue;
		showDeleteModal = true;
	}

	async function handleDelete() {
		if (deleteTarget) {
			await deleteVenue(deleteTarget.id);
			deleteTarget = null;
			showDeleteModal = false;
		}
	}

	function venueTypeLabel(type: VenueType): string {
		switch (type) {
			case 'all-inclusive':
				return 'All-Inclusive';
			case 'semi-inclusive':
				return 'Semi-Inclusive';
			case 'open-vendor':
				return 'Open Vendor';
			default:
				return type;
		}
	}

	function typeBadgeClasses(type: VenueType): string {
		switch (type) {
			case 'all-inclusive':
				return 'bg-primary-fixed text-on-primary-container';
			case 'semi-inclusive':
				return 'bg-secondary-container text-on-secondary-container';
			case 'open-vendor':
				return 'bg-surface-highest text-on-surface';
			default:
				return 'bg-surface-highest text-on-surface';
		}
	}

	function sortIcon(field: SortField): string {
		if (sortField !== field) return '';
		return sortDir === 'asc' ? ' \u2191' : ' \u2193';
	}
</script>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
	<!-- Header Section -->
	<div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10">
		<div>
			<span class="font-mono text-[10px] uppercase tracking-widest text-secondary font-medium">
				Curation & Selection
			</span>
			<h1 class="text-4xl font-bold tracking-tight text-on-surface mt-1">Dream Venues</h1>
			<p class="mt-2 text-on-surface-variant text-sm max-w-md">
				Compare and manage your wedding venue options. Track pricing, dates, and details all in one place.
			</p>
		</div>
		<button
			onclick={handleAddVenue}
			class="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-shadow cursor-pointer whitespace-nowrap"
		>
			<Plus class="w-4 h-4" />
			Add Venue
		</button>
	</div>

	<!-- Filter Bar -->
	{#if venues.length > 0}
		<div class="bg-surface-low rounded-xl p-4 mb-8 flex flex-wrap items-center justify-between gap-4">
			<div class="flex items-center gap-2 flex-wrap">
				<!-- Type filter chips -->
				{#each (['all', 'all-inclusive', 'semi-inclusive', 'open-vendor'] as const) as type}
					<button
						class="px-4 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer border
							{filterType === type
								? 'bg-primary text-on-primary border-primary'
								: 'bg-surface-lowest text-on-surface-variant border-outline-variant hover:bg-surface-high'}"
						onclick={() => (filterType = type)}
					>
						{type === 'all' ? 'All Types' : venueTypeLabel(type)}
					</button>
				{/each}

				<!-- Sort chips -->
				<div class="w-px h-5 bg-outline-variant mx-1 hidden sm:block"></div>
				{#each (['capacity', 'price'] as const) as field}
					<button
						class="px-4 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer border
							{sortField === field
								? 'bg-tertiary text-on-tertiary border-tertiary'
								: 'bg-surface-lowest text-on-surface-variant border-outline-variant hover:bg-surface-high'}"
						onclick={() => toggleSort(field)}
					>
						{field === 'capacity' ? 'Capacity' : 'Budget Range'}{sortIcon(field)}
					</button>
				{/each}
			</div>

			<div class="flex items-center gap-3">
				<!-- Grid/List toggle -->
				<div class="flex items-center bg-surface rounded-lg p-0.5">
					<button
						class="p-1.5 rounded-md transition-colors cursor-pointer {viewMode === 'grid' ? 'bg-surface-lowest shadow-sm text-on-surface' : 'text-outline hover:text-on-surface-variant'}"
						onclick={() => (viewMode = 'grid')}
						title="Grid view"
					>
						<LayoutGrid class="w-4 h-4" />
					</button>
					<button
						class="p-1.5 rounded-md transition-colors cursor-pointer {viewMode === 'list' ? 'bg-surface-lowest shadow-sm text-on-surface' : 'text-outline hover:text-on-surface-variant'}"
						onclick={() => (viewMode = 'list')}
						title="List view"
					>
						<List class="w-4 h-4" />
					</button>
				</div>

				<!-- Venue count -->
				<span class="font-mono text-[11px] text-outline">
					{filteredVenues.length} venue{filteredVenues.length !== 1 ? 's' : ''}
				</span>
			</div>
		</div>
	{/if}

	<!-- Venue Cards Grid -->
	{#if filteredVenues.length > 0}
		<div class="{viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6' : 'flex flex-col gap-4'}">
			{#each filteredVenues as venue (venue.id)}
				<a href="/venues/{venue.id}" class="group block no-underline">
					<div class="bg-surface-lowest rounded-2xl overflow-hidden border border-outline-variant/20 shadow-sm hover:shadow-md transition-shadow h-full {viewMode === 'list' ? 'flex flex-row' : 'flex flex-col'}">
						<!-- Venue image or placeholder -->
						<div class="relative {viewMode === 'list' ? 'w-48 shrink-0' : 'aspect-[4/3]'} overflow-hidden">
							{#if venue.image_url}
								<img src={venue.image_url} alt={venue.name} class="w-full h-full object-cover" />
							{:else}
								<VenuePlaceholder />
							{/if}
							<!-- Type badge top-left -->
							<span class="absolute top-3 left-3 {typeBadgeClasses(venue.venue_type)} rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-wider font-medium">
								{venueTypeLabel(venue.venue_type)}
							</span>

							<!-- Heart icon top-right -->
							<button
								class="absolute top-3 right-3 p-2 rounded-full bg-black/10 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/20 transition-colors cursor-pointer"
								onclick={(e) => { e.preventDefault(); e.stopPropagation(); }}
								title="Favorite"
							>
								<Heart class="w-4 h-4" />
							</button>

							<!-- Delete button bottom-right -->
							<button
								class="absolute bottom-3 right-3 p-2 rounded-full bg-black/10 backdrop-blur-sm text-white/80 hover:text-red-300 hover:bg-black/20 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
								onclick={(e) => confirmDelete(venue, e)}
								title="Delete venue"
							>
								<Trash2 class="w-4 h-4" />
							</button>
						</div>

						<!-- Card content -->
						<div class="p-5 flex flex-col gap-3 flex-1">
							<!-- Name -->
							<h2 class="text-xl font-bold text-on-surface leading-tight truncate">
								{venue.name}
							</h2>

							<!-- Location -->
							{#if venue.location}
								<div class="flex items-center gap-1.5 text-sm text-on-surface-variant">
									<MapPin class="w-3.5 h-3.5 shrink-0" />
									<span class="truncate">{venue.location}</span>
								</div>
							{/if}

							<!-- Rating -->
							{#if venue.rating > 0}
								<StarRating value={venue.rating} readonly size="sm" />
							{/if}

							<!-- Divider -->
							<div class="border-t border-outline-variant/30"></div>

							<!-- Capacity & Cost grid -->
							<div class="grid grid-cols-2 gap-4">
								<div>
									<div class="flex items-center gap-1.5 text-xs text-outline mb-1">
										<Users class="w-3 h-3" />
										<span>Capacity</span>
									</div>
									<p class="font-mono text-sm font-semibold text-on-surface">
										{#if venue.capacity_seated > 0}
											{venue.capacity_seated}
										{:else}
											--
										{/if}
									</p>
								</div>
								<div>
									<div class="flex items-center gap-1.5 text-xs text-outline mb-1">
										<DollarSign class="w-3 h-3" />
										<span>Estimated Cost</span>
									</div>
									<p class="font-mono text-sm font-semibold text-on-surface">
										{formatCurrency(venueGrandTotal(venue))}
									</p>
								</div>
							</div>

							<!-- Dates preview -->
							{#if venue.venue_dates && venue.venue_dates.length > 0}
								<div class="flex flex-wrap gap-1.5">
									{#each venue.venue_dates.slice(0, 3) as vd}
										<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-surface-low text-on-surface-variant border border-outline-variant/20">
											{formatDateShort(vd.date)}
											{#if vd.status === 'held'}
												<span class="ml-1 w-1.5 h-1.5 rounded-full bg-tertiary-container inline-block"></span>
											{:else if vd.status === 'booked'}
												<span class="ml-1 w-1.5 h-1.5 rounded-full bg-secondary inline-block"></span>
											{/if}
										</span>
									{/each}
									{#if venue.venue_dates.length > 3}
										<span class="text-[10px] font-mono text-outline self-center">
											+{venue.venue_dates.length - 3} more
										</span>
									{/if}
								</div>
							{/if}

							<!-- Spacer -->
							<div class="flex-1"></div>

							<!-- View Availability button -->
							<button
								class="w-full mt-1 px-4 py-2 border border-outline-variant text-primary rounded-xl text-sm font-medium hover:bg-primary-fixed/30 transition-colors cursor-pointer flex items-center justify-center gap-2"
								onclick={(e) => { e.preventDefault(); goto(`/venues/${venue.id}`); }}
							>
								<Eye class="w-4 h-4" />
								View Availability
							</button>
						</div>
					</div>
				</a>
			{/each}

			<!-- Add Venue placeholder card -->
			<button
				onclick={handleAddVenue}
				class="group rounded-2xl border-2 border-dashed border-outline-variant/30 hover:border-outline-variant/60 transition-colors cursor-pointer flex {viewMode === 'list' ? 'flex-row gap-4 p-6' : 'flex-col'} items-center justify-center {viewMode === 'list' ? 'min-h-[80px]' : 'min-h-[400px]'} bg-transparent"
			>
				<div class="w-14 h-14 rounded-full border-2 border-outline-variant/30 group-hover:border-primary/40 flex items-center justify-center transition-colors mb-4">
					<Plus class="w-6 h-6 text-outline group-hover:text-primary transition-colors" />
				</div>
				<span class="text-sm font-medium text-outline group-hover:text-on-surface-variant transition-colors">Add a venue</span>
			</button>
		</div>
	{:else if venues.length > 0}
		<!-- Filtered results empty -->
		<div class="text-center py-16">
			<div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-low mb-4">
				<Eye class="w-8 h-8 text-outline" />
			</div>
			<h3 class="text-lg font-medium text-on-surface mb-1">No matching venues</h3>
			<p class="text-sm text-on-surface-variant">
				Try adjusting your filter to see more results.
			</p>
		</div>
	{:else}
		<!-- Empty state -->
		<div class="text-center py-20">
			<div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary-fixed/50 mb-6">
				<MapPin class="w-10 h-10 text-primary/60" />
			</div>
			<h3 class="text-xl font-semibold text-on-surface mb-2">No venues yet</h3>
			<p class="text-on-surface-variant mb-6 max-w-sm mx-auto">
				Start comparing wedding venues by adding your first one. Track pricing, dates, and details all in one place.
			</p>
			<button
				onclick={handleAddVenue}
				class="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-shadow cursor-pointer"
			>
				<Plus class="w-4 h-4" />
				Add Your First Venue
			</button>
		</div>
	{/if}
</div>

<!-- Delete Confirmation Modal -->
<Modal
	open={showDeleteModal}
	onclose={() => {
		showDeleteModal = false;
		deleteTarget = null;
	}}
	title="Delete Venue"
>
	<p class="text-on-surface-variant">
		Are you sure you want to delete <strong class="text-on-surface">{deleteTarget?.name}</strong>? This will remove all associated costs, dates, and contract information. This action cannot be undone.
	</p>

	{#snippet footer()}
		<Button
			variant="ghost"
			onclick={() => {
				showDeleteModal = false;
				deleteTarget = null;
			}}
		>
			Cancel
		</Button>
		<Button variant="danger" onclick={handleDelete}>
			Delete Venue
		</Button>
	{/snippet}
</Modal>
