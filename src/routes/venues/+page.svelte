<script lang="ts">
	import { getVenues, createVenue, deleteVenue } from '$lib/stores/venues.svelte';
	import { getBudget } from '$lib/stores/budget.svelte';
	import { calculateGrandTotal, calculateVenueSubtotal } from '$lib/utils/calculations';
	import { formatCurrency, formatDateShort } from '$lib/utils/formatters';
	import type { Venue, VenueType } from '$lib/types';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import StarRating from '$lib/components/ui/StarRating.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { goto } from '$app/navigation';

	type SortField = 'name' | 'price' | 'capacity' | 'rating';
	type SortDir = 'asc' | 'desc';

	let sortField = $state<SortField>('name');
	let sortDir = $state<SortDir>('asc');
	let filterType = $state<VenueType | 'all'>('all');

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

	function venueTypeBadgeVariant(type: VenueType): 'rose' | 'sage' | 'gold' | 'neutral' {
		switch (type) {
			case 'all-inclusive':
				return 'sage';
			case 'semi-inclusive':
				return 'gold';
			case 'open-vendor':
				return 'rose';
			default:
				return 'neutral';
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

	function sortIcon(field: SortField): string {
		if (sortField !== field) return '';
		return sortDir === 'asc' ? ' \u2191' : ' \u2193';
	}
</script>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
	<!-- Header -->
	<div class="flex items-center justify-between mb-8">
		<div>
			<h1 class="text-3xl font-bold text-charcoal">Venues</h1>
			<p class="mt-1 text-sm text-charcoal/60">
				Compare and manage your wedding venue options
			</p>
		</div>
		<Button onclick={handleAddVenue}>
			<svg viewBox="0 0 24 24" class="w-4 h-4 fill-current">
				<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
			</svg>
			Add Venue
		</Button>
	</div>

	<!-- Sort & Filter Controls -->
	{#if venues.length > 0}
		<div class="flex flex-wrap items-end gap-4 mb-6">
			<div class="flex items-center gap-2">
				<span class="text-sm font-medium text-charcoal/70">Sort by:</span>
				{#each (['name', 'price', 'capacity', 'rating'] as const) as field}
					<button
						class="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer
							{sortField === field
								? 'bg-rose text-white'
								: 'bg-cream text-charcoal hover:bg-rose-light'}"
						onclick={() => toggleSort(field)}
					>
						{field.charAt(0).toUpperCase() + field.slice(1)}{sortIcon(field)}
					</button>
				{/each}
			</div>
			<div class="w-48">
				<Select
					label="Venue Type"
					value={filterType}
					onchange={(e) => {
						filterType = (e.currentTarget as HTMLSelectElement).value as VenueType | 'all';
					}}
				>
					<option value="all">All Types</option>
					<option value="all-inclusive">All-Inclusive</option>
					<option value="semi-inclusive">Semi-Inclusive</option>
					<option value="open-vendor">Open Vendor</option>
				</Select>
			</div>
		</div>
	{/if}

	<!-- Venue Cards Grid -->
	{#if filteredVenues.length > 0}
		<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
			{#each filteredVenues as venue (venue.id)}
				<a href="/venues/{venue.id}" class="block no-underline">
					<Card hover class="h-full flex flex-col">
						<div class="p-5 flex flex-col gap-3 flex-1">
							<!-- Top row: name + badge -->
							<div class="flex items-start justify-between gap-2">
								<h2 class="text-lg font-semibold text-charcoal leading-tight truncate">
									{venue.name}
								</h2>
								<Badge variant={venueTypeBadgeVariant(venue.venue_type)}>
									{venueTypeLabel(venue.venue_type)}
								</Badge>
							</div>

							<!-- Location -->
							{#if venue.location}
								<div class="flex items-center gap-1.5 text-sm text-charcoal/60">
									<svg viewBox="0 0 24 24" class="w-4 h-4 fill-current shrink-0">
										<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
									</svg>
									<span class="truncate">{venue.location}</span>
								</div>
							{/if}

							<!-- Rating -->
							{#if venue.rating > 0}
								<StarRating value={venue.rating} readonly size="sm" />
							{/if}

							<!-- Capacity -->
							<div class="flex items-center gap-3 text-sm text-charcoal/70">
								<svg viewBox="0 0 24 24" class="w-4 h-4 fill-current shrink-0">
									<path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
								</svg>
								<span>
									{#if venue.capacity_seated > 0}
										{venue.capacity_seated} seated
									{/if}
									{#if venue.capacity_seated > 0 && venue.capacity_standing > 0}
										&middot;
									{/if}
									{#if venue.capacity_standing > 0}
										{venue.capacity_standing} standing
									{/if}
									{#if venue.capacity_seated === 0 && venue.capacity_standing === 0}
										No capacity set
									{/if}
								</span>
							</div>

							<!-- Pricing -->
							<div class="mt-1 p-3 rounded-lg bg-warm-white border border-rose-light/20">
								<div class="flex justify-between items-baseline text-sm">
									<span class="text-charcoal/60">Base</span>
									<span class="font-medium text-charcoal">
										{formatCurrency(venueBaseTotal(venue))}
									</span>
								</div>
								<div class="flex justify-between items-baseline text-sm mt-1">
									<span class="text-charcoal/60">Grand Total</span>
									<span class="font-semibold text-rose text-base">
										{formatCurrency(venueGrandTotal(venue))}
									</span>
								</div>
							</div>

							<!-- Top 3 Dates -->
							{#if venue.venue_dates && venue.venue_dates.length > 0}
								<div class="flex flex-wrap gap-1.5 mt-1">
									{#each venue.venue_dates.slice(0, 3) as vd}
										<span
											class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-cream text-charcoal/70 border border-rose-light/20"
										>
											{formatDateShort(vd.date)}
											{#if vd.status === 'held'}
												<span class="ml-1 w-1.5 h-1.5 rounded-full bg-gold inline-block"></span>
											{:else if vd.status === 'booked'}
												<span class="ml-1 w-1.5 h-1.5 rounded-full bg-sage inline-block"></span>
											{/if}
										</span>
									{/each}
									{#if venue.venue_dates.length > 3}
										<span class="text-xs text-charcoal/40 self-center">
											+{venue.venue_dates.length - 3} more
										</span>
									{/if}
								</div>
							{/if}
						</div>

						<!-- Card footer with delete -->
						<div class="px-5 py-3 border-t border-rose-light/20 flex justify-end">
							<button
								class="p-1.5 rounded-lg text-charcoal/30 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
								title="Delete venue"
								onclick={(e) => confirmDelete(venue, e)}
							>
								<svg viewBox="0 0 24 24" class="w-4 h-4 fill-current">
									<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
								</svg>
							</button>
						</div>
					</Card>
				</a>
			{/each}
		</div>
	{:else if venues.length > 0}
		<!-- Filtered results empty -->
		<div class="text-center py-16">
			<div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cream mb-4">
				<svg viewBox="0 0 24 24" class="w-8 h-8 fill-charcoal/30">
					<path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
				</svg>
			</div>
			<h3 class="text-lg font-medium text-charcoal mb-1">No matching venues</h3>
			<p class="text-sm text-charcoal/60">
				Try adjusting your filter to see more results.
			</p>
		</div>
	{:else}
		<!-- Empty state -->
		<div class="text-center py-20">
			<div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-rose-light/50 mb-6">
				<svg viewBox="0 0 24 24" class="w-10 h-10 fill-rose/60">
					<path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
				</svg>
			</div>
			<h3 class="text-xl font-semibold text-charcoal mb-2">No venues yet</h3>
			<p class="text-charcoal/60 mb-6 max-w-sm mx-auto">
				Start comparing wedding venues by adding your first one. Track pricing, dates, and details all in one place.
			</p>
			<Button onclick={handleAddVenue}>
				<svg viewBox="0 0 24 24" class="w-4 h-4 fill-current">
					<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
				</svg>
				Add Your First Venue
			</Button>
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
	<p class="text-charcoal/80">
		Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This will remove all associated costs, dates, and contract information. This action cannot be undone.
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
