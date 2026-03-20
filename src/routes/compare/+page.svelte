<script lang="ts">
	import { getVenues } from '$lib/stores/venues.svelte';
	import { getBudget } from '$lib/stores/budget.svelte';
	import {
		calculateGrandTotal,
		calculateCategoryTotal,
		calculateFeesAndTaxes
	} from '$lib/utils/calculations';
	import { formatCurrency } from '$lib/utils/formatters';
	import type { Venue, CostCategory } from '$lib/types';
	import { COST_CATEGORY_LABELS, ALL_CATEGORY_TYPES } from '$lib/types';
	import {
		ArrowLeftRight,
		Star,
		MapPin,
		Users as UsersIcon,
		Calendar,
		Check,
		AlertTriangle,
		Download
	} from 'lucide-svelte';

	const categoryColors: Record<string, string> = {
		'venue-rental': '#7e5354',
		time: '#C9A96E',
		catering: '#526442',
		bar: '#8BB0C9',
		cake: '#D4B896',
		staffing: '#B8A0D4',
		'rentals-included': '#A0C4D4',
		'rental-upgrades': '#D4C4A0',
		'decor-floral': '#C4D4A0',
		entertainment: '#D4A0C4',
		'photo-video': '#A0D4B8',
		planning: '#D4A0A0',
		'fees-taxes': '#745a27',
		transportation: '#D4D4A0',
		miscellaneous: '#C0C0C0'
	};

	const venueGradients: Record<string, string> = {
		'all-inclusive': 'from-primary-container to-primary-fixed',
		'semi-inclusive': 'from-tertiary-container to-tertiary-fixed',
		'open-vendor': 'from-secondary-container to-secondary-container/40'
	};

	const venues = $derived(getVenues());
	const budget = $derived(getBudget());

	let selectedIds = $state<Set<string>>(new Set());

	const selectedVenues = $derived(
		venues.filter((v) => selectedIds.has(v.id))
	);

	const canCompare = $derived(selectedVenues.length >= 2);

	// For the two-card selector layout, pick first two selected or placeholders
	const venue1 = $derived(selectedVenues[0] ?? null);
	const venue2 = $derived(selectedVenues[1] ?? null);

	function toggleVenue(id: string) {
		const next = new Set(selectedIds);
		if (next.has(id)) {
			next.delete(id);
		} else if (next.size < 4) {
			next.add(id);
		}
		selectedIds = next;
	}

	function getCategoryTotal(venue: Venue, categoryType: string): number {
		const cat = venue.cost_categories?.find((c) => c.type === categoryType);
		if (!cat) return 0;
		return calculateCategoryTotal(cat, budget.guest_count);
	}

	function getFeesTotalForVenue(venue: Venue): number {
		const fees = calculateFeesAndTaxes(venue.cost_categories ?? [], budget.guest_count);
		return fees.serviceCharge + fees.gratuity + fees.tax + fees.otherFees;
	}

	function getVenueTotal(venue: Venue): number {
		return calculateGrandTotal(venue.cost_categories ?? [], budget.guest_count);
	}

	function getPerPersonCost(venue: Venue): number {
		const total = getVenueTotal(venue);
		return budget.guest_count > 0 ? total / budget.guest_count : 0;
	}

	// Categories that have at least one non-zero value across selected venues
	const activeCategories = $derived.by(() => {
		if (!canCompare) return [];
		return ALL_CATEGORY_TYPES.filter((catType) => {
			if (catType === 'fees-taxes') {
				return selectedVenues.some((v) => getFeesTotalForVenue(v) > 0);
			}
			return selectedVenues.some((v) => getCategoryTotal(v, catType) > 0);
		});
	});

	// For a given category row, find min and max across selected venues
	function getCategoryMinMax(catType: string): { min: number; max: number } {
		const values = selectedVenues.map((v) =>
			catType === 'fees-taxes' ? getFeesTotalForVenue(v) : getCategoryTotal(v, catType)
		);
		const nonZero = values.filter((val) => val > 0);
		if (nonZero.length < 2) return { min: -1, max: -1 };
		return { min: Math.min(...nonZero), max: Math.max(...nonZero) };
	}

	function getGrandTotalMinMax(): { min: number; max: number } {
		const values = selectedVenues.map((v) => getVenueTotal(v));
		const nonZero = values.filter((val) => val > 0);
		if (nonZero.length < 2) return { min: -1, max: -1 };
		return { min: Math.min(...nonZero), max: Math.max(...nonZero) };
	}

	function getCapacityMinMax(): { min: number; max: number } {
		const values = selectedVenues.map((v) => v.capacity_seated || 0);
		const nonZero = values.filter((val) => val > 0);
		if (nonZero.length < 2) return { min: -1, max: -1 };
		return { min: Math.min(...nonZero), max: Math.max(...nonZero) };
	}

	// Cost distribution — break into Rental / F&B / Service buckets
	function getRentalCost(venue: Venue): number {
		return getCategoryTotal(venue, 'venue-rental') + getCategoryTotal(venue, 'rentals-included') + getCategoryTotal(venue, 'rental-upgrades');
	}
	function getFnBCost(venue: Venue): number {
		return getCategoryTotal(venue, 'catering') + getCategoryTotal(venue, 'bar') + getCategoryTotal(venue, 'cake');
	}
	function getServiceCost(venue: Venue): number {
		const total = getVenueTotal(venue);
		return total - getRentalCost(venue) - getFnBCost(venue);
	}

	// Stacked bar chart data
	const chartData = $derived.by(() => {
		if (!canCompare) return [];
		const maxTotal = Math.max(...selectedVenues.map((v) => getVenueTotal(v)), 1);
		return selectedVenues.map((venue) => {
			const segments: { type: string; label: string; value: number; color: string }[] = [];
			for (const catType of ALL_CATEGORY_TYPES) {
				let value: number;
				if (catType === 'fees-taxes') {
					value = getFeesTotalForVenue(venue);
				} else {
					value = getCategoryTotal(venue, catType);
				}
				if (value > 0) {
					segments.push({
						type: catType,
						label: COST_CATEGORY_LABELS[catType],
						value,
						color: categoryColors[catType] ?? '#C0C0C0'
					});
				}
			}
			return {
				venue,
				segments,
				total: getVenueTotal(venue),
				maxTotal
			};
		});
	});

	// Venue type label
	function venueTypeLabel(vt: string): string {
		if (vt === 'all-inclusive') return 'All-Inclusive';
		if (vt === 'semi-inclusive') return 'Semi-Inclusive';
		return 'Open Vendor';
	}

	// Stars rendering
	function filledStars(rating: number): number[] {
		return Array.from({ length: Math.round(rating) }, (_, i) => i);
	}
	function emptyStars(rating: number): number[] {
		return Array.from({ length: 5 - Math.round(rating) }, (_, i) => i);
	}

	// Comparison rows for the table section
	const comparisonRows = $derived.by(() => {
		if (!canCompare) return [];
		const { min: totalMin, max: totalMax } = getGrandTotalMinMax();
		const capMinMax = getCapacityMinMax();

		const rows: {
			label: string;
			values: { display: string; isBest: boolean; isWorst: boolean; bestLabel: string }[];
		}[] = [];

		// Total Estimated Cost
		rows.push({
			label: 'Total Estimated Cost',
			values: selectedVenues.map((v) => {
				const t = getVenueTotal(v);
				return {
					display: formatCurrency(t),
					isBest: t > 0 && t === totalMin && totalMin !== totalMax,
					isWorst: t > 0 && t === totalMax && totalMin !== totalMax,
					bestLabel: 'LOWEST'
				};
			})
		});

		// Per Person Cost
		const ppValues = selectedVenues.map((v) => getPerPersonCost(v));
		const ppNonZero = ppValues.filter((v) => v > 0);
		const ppMin = ppNonZero.length >= 2 ? Math.min(...ppNonZero) : -1;
		const ppMax = ppNonZero.length >= 2 ? Math.max(...ppNonZero) : -1;
		rows.push({
			label: 'Per Person Cost',
			values: selectedVenues.map((v) => {
				const pp = getPerPersonCost(v);
				return {
					display: formatCurrency(pp),
					isBest: pp > 0 && pp === ppMin && ppMin !== ppMax,
					isWorst: pp > 0 && pp === ppMax && ppMin !== ppMax,
					bestLabel: 'LOWEST'
				};
			})
		});

		// Maximum Capacity
		rows.push({
			label: 'Maximum Capacity',
			values: selectedVenues.map((v) => {
				const cap = v.capacity_seated || 0;
				return {
					display: cap > 0 ? `${cap} guests` : '--',
					isBest: cap > 0 && cap === capMinMax.max && capMinMax.min !== capMinMax.max,
					isWorst: cap > 0 && cap === capMinMax.min && capMinMax.min !== capMinMax.max,
					bestLabel: 'LARGEST'
				};
			})
		});

		// Venue Style
		rows.push({
			label: 'Venue Style',
			values: selectedVenues.map((v) => ({
				display: venueTypeLabel(v.venue_type),
				isBest: false,
				isWorst: false,
				bestLabel: ''
			}))
		});

		// Vendor Rating
		const ratings = selectedVenues.map((v) => v.rating || 0);
		const rNonZero = ratings.filter((r) => r > 0);
		const rMax = rNonZero.length >= 2 ? Math.max(...rNonZero) : -1;
		const rMin = rNonZero.length >= 2 ? Math.min(...rNonZero) : -1;
		rows.push({
			label: 'Vendor Rating',
			values: selectedVenues.map((v) => {
				const r = v.rating || 0;
				return {
					display: r > 0 ? `${r.toFixed(1)} / 5.0` : '--',
					isBest: r > 0 && r === rMax && rMin !== rMax,
					isWorst: r > 0 && r === rMin && rMin !== rMax,
					bestLabel: 'HIGHEST'
				};
			})
		});

		// Open Dates
		rows.push({
			label: 'Open Dates',
			values: selectedVenues.map((v) => {
				const available = v.venue_dates?.filter((d) => d.status === 'available').length ?? 0;
				return {
					display: available > 0 ? `${available} dates` : '--',
					isBest: false,
					isWorst: false,
					bestLabel: ''
				};
			})
		});

		return rows;
	});

	// Dropdown state for venue selectors
	let showDropdown1 = $state(false);
	let showDropdown2 = $state(false);

	function selectVenue1(id: string) {
		const next = new Set<string>();
		next.add(id);
		if (venue2) next.add(venue2.id);
		selectedIds = next;
		showDropdown1 = false;
	}
	function selectVenue2(id: string) {
		const next = new Set<string>();
		if (venue1) next.add(venue1.id);
		next.add(id);
		selectedIds = next;
		showDropdown2 = false;
	}
</script>

<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
	<!-- Header -->
	<div class="mb-10">
		<h1 class="text-4xl font-extrabold tracking-tight text-on-surface">Venue Comparison</h1>
		<p class="mt-2 text-base text-on-surface-variant">
			Compare venues side-by-side to find the best fit for your celebration
		</p>
	</div>

	{#if venues.length < 2}
		<!-- Empty state: not enough venues -->
		<div class="text-center py-20">
			<div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-surface mb-6">
				<UsersIcon class="w-10 h-10 text-outline" />
			</div>
			<h3 class="text-xl font-semibold text-on-surface mb-2">Not enough venues to compare</h3>
			<p class="text-on-surface-variant mb-6 max-w-sm mx-auto">
				You need at least 2 venues to use the comparison tool. Head to the Venues page to add more.
			</p>
			<a
				href="/venues"
				class="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-on-primary font-semibold text-sm hover:bg-primary/90 transition-colors"
			>
				Go to Venues
			</a>
		</div>
	{:else}
		<!-- Venue Selectors — 2-col grid -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
			<!-- Selector 01 -->
			<div class="bg-surface-lowest rounded-xl p-6 border-t-2 border-tertiary-container/30 relative">
				<span class="font-mono text-[10px] uppercase tracking-widest text-secondary mb-3 block">Selection 01</span>
				{#if venue1}
					<div class="flex items-start gap-5">
						<!-- Venue gradient placeholder -->
						<div class="w-32 h-32 rounded-lg bg-gradient-to-br {venueGradients[venue1.venue_type] ?? 'from-surface to-surface-high'} shrink-0 flex items-center justify-center">
							<MapPin class="w-8 h-8 text-on-surface/20" />
						</div>
						<div class="flex-1 min-w-0">
							<h3 class="text-2xl font-bold text-on-surface truncate">{venue1.name}</h3>
							<div class="flex items-center gap-2 mt-1.5">
								<div class="flex items-center gap-0.5">
									{#each filledStars(venue1.rating) as _}
										<Star class="w-3.5 h-3.5 fill-tertiary-container text-tertiary-container" />
									{/each}
									{#each emptyStars(venue1.rating) as _}
										<Star class="w-3.5 h-3.5 text-outline-variant" />
									{/each}
								</div>
								<span class="text-xs text-on-surface-variant">{venue1.rating?.toFixed(1) ?? '--'}</span>
							</div>
							{#if venue1.location}
								<div class="flex items-center gap-1 mt-1.5 text-xs text-on-surface-variant">
									<MapPin class="w-3 h-3 shrink-0" />
									<span class="truncate">{venue1.location}</span>
								</div>
							{/if}
							<div class="flex items-center gap-2 mt-3">
								<span class="inline-flex px-2 py-0.5 rounded-full bg-primary-fixed/50 text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">
									{venueTypeLabel(venue1.venue_type)}
								</span>
								{#if venue1.indoor && venue1.outdoor}
									<span class="inline-flex px-2 py-0.5 rounded-full bg-secondary-container/30 text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">Indoor/Outdoor</span>
								{:else if venue1.indoor}
									<span class="inline-flex px-2 py-0.5 rounded-full bg-secondary-container/30 text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">Indoor</span>
								{:else if venue1.outdoor}
									<span class="inline-flex px-2 py-0.5 rounded-full bg-secondary-container/30 text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">Outdoor</span>
								{/if}
							</div>
						</div>
					</div>
				{:else}
					<div class="flex items-center gap-5">
						<div class="w-32 h-32 rounded-lg bg-surface flex items-center justify-center">
							<MapPin class="w-8 h-8 text-outline-variant" />
						</div>
						<div>
							<p class="text-on-surface-variant text-sm">No venue selected</p>
						</div>
					</div>
				{/if}
				<!-- Change Venue button -->
				<div class="mt-4 relative">
					<button
						class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-outline-variant text-xs font-medium text-on-surface-variant hover:bg-surface-low transition-colors cursor-pointer"
						onclick={() => showDropdown1 = !showDropdown1}
					>
						<ArrowLeftRight class="w-3.5 h-3.5" />
						Change Venue
					</button>
					{#if showDropdown1}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div class="absolute top-full left-0 mt-1 w-64 bg-surface-lowest rounded-lg shadow-lg border border-outline-variant/30 z-20 py-1 max-h-60 overflow-y-auto">
							{#each venues as v (v.id)}
								{#if v.id !== venue2?.id}
									<button
										class="w-full text-left px-3 py-2 text-sm hover:bg-surface-low transition-colors cursor-pointer {v.id === venue1?.id ? 'bg-primary-fixed/30 font-medium' : ''}"
										onclick={(e) => { e.stopPropagation(); selectVenue1(v.id); }}
									>
										<span class="text-on-surface">{v.name}</span>
										<span class="block text-[10px] font-mono text-on-surface-variant">{formatCurrency(getVenueTotal(v))}</span>
									</button>
								{/if}
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<!-- Selector 02 -->
			<div class="bg-surface-lowest rounded-xl p-6 border-t-2 border-tertiary-container/30 relative">
				<span class="font-mono text-[10px] uppercase tracking-widest text-secondary mb-3 block">Selection 02</span>
				{#if venue2}
					<div class="flex items-start gap-5">
						<div class="w-32 h-32 rounded-lg bg-gradient-to-br {venueGradients[venue2.venue_type] ?? 'from-surface to-surface-high'} shrink-0 flex items-center justify-center">
							<MapPin class="w-8 h-8 text-on-surface/20" />
						</div>
						<div class="flex-1 min-w-0">
							<h3 class="text-2xl font-bold text-on-surface truncate">{venue2.name}</h3>
							<div class="flex items-center gap-2 mt-1.5">
								<div class="flex items-center gap-0.5">
									{#each filledStars(venue2.rating) as _}
										<Star class="w-3.5 h-3.5 fill-tertiary-container text-tertiary-container" />
									{/each}
									{#each emptyStars(venue2.rating) as _}
										<Star class="w-3.5 h-3.5 text-outline-variant" />
									{/each}
								</div>
								<span class="text-xs text-on-surface-variant">{venue2.rating?.toFixed(1) ?? '--'}</span>
							</div>
							{#if venue2.location}
								<div class="flex items-center gap-1 mt-1.5 text-xs text-on-surface-variant">
									<MapPin class="w-3 h-3 shrink-0" />
									<span class="truncate">{venue2.location}</span>
								</div>
							{/if}
							<div class="flex items-center gap-2 mt-3">
								<span class="inline-flex px-2 py-0.5 rounded-full bg-primary-fixed/50 text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">
									{venueTypeLabel(venue2.venue_type)}
								</span>
								{#if venue2.indoor && venue2.outdoor}
									<span class="inline-flex px-2 py-0.5 rounded-full bg-secondary-container/30 text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">Indoor/Outdoor</span>
								{:else if venue2.indoor}
									<span class="inline-flex px-2 py-0.5 rounded-full bg-secondary-container/30 text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">Indoor</span>
								{:else if venue2.outdoor}
									<span class="inline-flex px-2 py-0.5 rounded-full bg-secondary-container/30 text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">Outdoor</span>
								{/if}
							</div>
						</div>
					</div>
				{:else}
					<div class="flex items-center gap-5">
						<div class="w-32 h-32 rounded-lg bg-surface flex items-center justify-center">
							<MapPin class="w-8 h-8 text-outline-variant" />
						</div>
						<div>
							<p class="text-on-surface-variant text-sm">No venue selected</p>
						</div>
					</div>
				{/if}
				<div class="mt-4 relative">
					<button
						class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-outline-variant text-xs font-medium text-on-surface-variant hover:bg-surface-low transition-colors cursor-pointer"
						onclick={() => showDropdown2 = !showDropdown2}
					>
						<ArrowLeftRight class="w-3.5 h-3.5" />
						Change Venue
					</button>
					{#if showDropdown2}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div class="absolute top-full left-0 mt-1 w-64 bg-surface-lowest rounded-lg shadow-lg border border-outline-variant/30 z-20 py-1 max-h-60 overflow-y-auto">
							{#each venues as v (v.id)}
								{#if v.id !== venue1?.id}
									<button
										class="w-full text-left px-3 py-2 text-sm hover:bg-surface-low transition-colors cursor-pointer {v.id === venue2?.id ? 'bg-primary-fixed/30 font-medium' : ''}"
										onclick={(e) => { e.stopPropagation(); selectVenue2(v.id); }}
									>
										<span class="text-on-surface">{v.name}</span>
										<span class="block text-[10px] font-mono text-on-surface-variant">{formatCurrency(getVenueTotal(v))}</span>
									</button>
								{/if}
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>

		{#if canCompare}
			<!-- Cost Distribution -->
			<div class="mb-10">
				<h2 class="text-xl font-bold text-on-surface mb-6">Cost Distribution</h2>
				<div class="space-y-6">
					{#each chartData as bar, i}
						<div>
							<div class="flex items-center justify-between mb-2">
								<span class="text-sm font-semibold text-on-surface">{bar.venue.name}</span>
								<span class="font-mono text-sm font-semibold tabular-nums text-on-surface">{formatCurrency(bar.total)}</span>
							</div>
							<!-- Stacked bar -->
							<div class="h-12 rounded-full bg-surface overflow-hidden flex">
								{#each bar.segments as segment, j}
									{@const pct = (segment.value / bar.maxTotal) * 100}
									<div
										class="h-full transition-all"
										style="width: {pct}%; background-color: {segment.color};"
										title="{segment.label}: {formatCurrency(segment.value)}"
									></div>
								{/each}
							</div>
							<!-- Legend chips -->
							<div class="flex flex-wrap gap-x-3 gap-y-1.5 mt-3">
								{#each bar.segments as segment}
									<div class="flex items-center gap-1.5">
										<span class="w-2 h-2 rounded-full shrink-0" style="background-color: {segment.color}"></span>
										<span class="font-mono text-[10px] text-on-surface-variant">{segment.label}</span>
									</div>
								{/each}
							</div>
							<!-- 3-col breakdown: Rental / F&B / Service -->
							<div class="grid grid-cols-3 gap-4 mt-4">
								<div class="text-center">
									<p class="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Rental</p>
									<p class="font-mono text-sm font-semibold tabular-nums text-on-surface">{formatCurrency(getRentalCost(bar.venue))}</p>
								</div>
								<div class="text-center">
									<p class="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">F&B</p>
									<p class="font-mono text-sm font-semibold tabular-nums text-on-surface">{formatCurrency(getFnBCost(bar.venue))}</p>
								</div>
								<div class="text-center">
									<p class="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">Service</p>
									<p class="font-mono text-sm font-semibold tabular-nums text-on-surface">{formatCurrency(getServiceCost(bar.venue))}</p>
								</div>
							</div>
						</div>
						{#if i < chartData.length - 1}
							<div class="border-t border-outline-variant/30"></div>
						{/if}
					{/each}
				</div>
			</div>

			<!-- Comparison Table -->
			<div class="mb-10">
				<h2 class="text-xl font-bold text-on-surface mb-6">Side-by-Side Comparison</h2>
				<div class="bg-surface-lowest rounded-xl overflow-hidden border border-outline-variant/20">
					<div class="overflow-x-auto">
						<table class="w-full text-sm">
							<thead>
								<tr class="border-b border-outline-variant/30">
									<th class="px-6 py-4 text-left font-mono text-[10px] uppercase tracking-widest text-on-surface-variant min-w-[180px]">
										Metric
									</th>
									{#each selectedVenues as venue}
										<th class="px-6 py-4 text-right font-semibold text-on-surface min-w-[160px]">
											{venue.name}
										</th>
									{/each}
								</tr>
							</thead>
							<tbody>
								{#each comparisonRows as row, rowIdx}
									<tr class="border-b border-outline-variant/15 {rowIdx % 2 === 0 ? 'bg-surface-lowest' : 'bg-surface-low/30'}">
										<td class="px-6 py-4 font-medium text-on-surface">
											{row.label}
										</td>
										{#each row.values as cell}
											<td
												class="px-6 py-4 text-right font-mono tabular-nums
													{cell.isBest
														? 'bg-secondary-container/20'
														: cell.isWorst
															? 'bg-error/5'
															: ''}"
											>
												<span class="text-on-surface">{cell.display}</span>
												{#if cell.isBest}
													<span class="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-secondary-container/40 text-secondary">
														<Check class="w-2.5 h-2.5" />
														{cell.bestLabel}
													</span>
												{/if}
												{#if cell.isWorst}
													<span class="ml-2 inline-flex items-center gap-0.5 text-error/60">
														<AlertTriangle class="w-3 h-3" />
													</span>
												{/if}
											</td>
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			</div>

			<!-- Detailed Category Breakdown -->
			<div class="mb-10">
				<h2 class="text-xl font-bold text-on-surface mb-6">Detailed Category Breakdown</h2>
				<div class="bg-surface-lowest rounded-xl overflow-hidden border border-outline-variant/20">
					<div class="overflow-x-auto">
						<table class="w-full text-sm">
							<thead>
								<tr class="border-b border-outline-variant/30">
									<th class="px-6 py-4 text-left font-mono text-[10px] uppercase tracking-widest text-on-surface-variant min-w-[180px]">
										Category
									</th>
									{#each selectedVenues as venue}
										<th class="px-6 py-4 text-right font-semibold text-on-surface min-w-[140px]">
											{venue.name}
										</th>
									{/each}
								</tr>
							</thead>
							<tbody>
								{#each activeCategories as catType, rowIdx}
									{@const { min, max } = getCategoryMinMax(catType)}
									<tr class="border-b border-outline-variant/15 {rowIdx % 2 === 0 ? 'bg-surface-lowest' : 'bg-surface-low/30'}">
										<td class="px-6 py-3.5 font-medium text-on-surface">
											<div class="flex items-center gap-2">
												<span
													class="w-2.5 h-2.5 rounded-full shrink-0"
													style="background-color: {categoryColors[catType]}"
												></span>
												{COST_CATEGORY_LABELS[catType]}
											</div>
										</td>
										{#each selectedVenues as venue}
											{@const value = catType === 'fees-taxes'
												? getFeesTotalForVenue(venue)
												: getCategoryTotal(venue, catType)}
											<td
												class="px-6 py-3.5 text-right font-mono tabular-nums
													{value > 0 && value === min && min !== max
														? 'bg-secondary-container/20 text-secondary'
														: value > 0 && value === max && min !== max
															? 'bg-error/5 text-error'
															: 'text-on-surface/70'}"
											>
												{value > 0 ? formatCurrency(value) : '--'}
											</td>
										{/each}
									</tr>
								{/each}

								<!-- Grand Total Row -->
								{#if true}
								{@const { min: totalMin, max: totalMax } = getGrandTotalMinMax()}
								<tr class="border-t-2 border-outline-variant/30 bg-surface-low/50">
									<td class="px-6 py-4 font-bold text-on-surface">
										Grand Total
									</td>
									{#each selectedVenues as venue}
										{@const total = getVenueTotal(venue)}
										<td
											class="px-6 py-4 text-right font-mono font-bold text-base tabular-nums
												{total > 0 && total === totalMin && totalMin !== totalMax
													? 'text-secondary'
													: total > 0 && total === totalMax && totalMin !== totalMax
														? 'text-error'
														: 'text-on-surface'}"
										>
											{formatCurrency(total)}
										</td>
									{/each}
								</tr>
								{/if}
							</tbody>
						</table>
					</div>
				</div>
			</div>

			<!-- Footer Actions -->
			<div class="flex flex-col sm:flex-row items-center justify-end gap-4 pt-2 pb-8">
				<button
					class="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-outline-variant text-sm font-semibold text-on-surface-variant hover:bg-surface-low transition-colors cursor-pointer"
				>
					<Download class="w-4 h-4" />
					Download PDF Report
				</button>
				{#if venue1}
					<a
						href="/venues"
						class="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-primary to-primary/80 text-on-primary text-sm font-semibold shadow-md hover:shadow-lg transition-all"
					>
						Book {venue1.name}
					</a>
				{/if}
			</div>
		{:else if selectedVenues.length === 0}
			<!-- No venues selected yet -->
			<div class="text-center py-16">
				<div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface mb-4">
					<ArrowLeftRight class="w-8 h-8 text-outline" />
				</div>
				<h3 class="text-lg font-semibold text-on-surface mb-1">Select venues above</h3>
				<p class="text-sm text-on-surface-variant">
					Pick venues using the selectors above to see a side-by-side comparison.
				</p>
			</div>
		{:else}
			<div class="text-center py-16">
				<div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface mb-4">
					<ArrowLeftRight class="w-8 h-8 text-outline" />
				</div>
				<h3 class="text-lg font-semibold text-on-surface mb-1">Select one more venue</h3>
				<p class="text-sm text-on-surface-variant">
					Choose a second venue to begin comparing.
				</p>
			</div>
		{/if}
	{/if}
</div>
