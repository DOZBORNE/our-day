<script lang="ts">
	import { getVenues } from '$lib/stores/venues.svelte';
	import { getBudget } from '$lib/stores/budget.svelte';
	import {
		calculateGrandTotal,
		calculateCategoryTotal,
		calculateVenueSubtotal,
		calculateFeesAndTaxes
	} from '$lib/utils/calculations';
	import { formatCurrency } from '$lib/utils/formatters';
	import type { Venue, CostCategory } from '$lib/types';
	import { COST_CATEGORY_LABELS, ALL_CATEGORY_TYPES } from '$lib/types';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';

	const categoryColors: Record<string, string> = {
		'venue-rental': '#D4A0A0',
		time: '#C9A96E',
		catering: '#9CAF88',
		bar: '#8BB0C9',
		cake: '#D4B896',
		staffing: '#B8A0D4',
		'rentals-included': '#A0C4D4',
		'rental-upgrades': '#D4C4A0',
		'decor-floral': '#C4D4A0',
		entertainment: '#D4A0C4',
		'photo-video': '#A0D4B8',
		planning: '#D4A0A0',
		'fees-taxes': '#A0A0D4',
		transportation: '#D4D4A0',
		miscellaneous: '#C0C0C0'
	};

	const venues = $derived(getVenues());
	const budget = $derived(getBudget());

	let selectedIds = $state<Set<string>>(new Set());

	const selectedVenues = $derived(
		venues.filter((v) => selectedIds.has(v.id))
	);

	const canCompare = $derived(selectedVenues.length >= 2);

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

	const chartBarHeight = 48;
	const chartGap = 16;
	const chartLabelWidth = 140;
	const chartTotalWidth = 90;
	const chartPaddingY = 12;
	const chartHeight = $derived(
		chartData.length * (chartBarHeight + chartGap) - chartGap + chartPaddingY * 2
	);
</script>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
	<!-- Header -->
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-charcoal">Compare Venues</h1>
		<p class="mt-1 text-sm text-charcoal/60">
			Select 2-4 venues to compare costs side by side
		</p>
	</div>

	{#if venues.length < 2}
		<!-- Empty state: not enough venues -->
		<div class="text-center py-20">
			<div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-rose-light/50 mb-6">
				<svg viewBox="0 0 24 24" class="w-10 h-10 fill-rose/60">
					<path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
				</svg>
			</div>
			<h3 class="text-xl font-semibold text-charcoal mb-2">Not enough venues to compare</h3>
			<p class="text-charcoal/60 mb-6 max-w-sm mx-auto">
				You need at least 2 venues to use the comparison tool. Head to the Venues page to add more.
			</p>
			<a href="/venues">
				<Button>
					Go to Venues
				</Button>
			</a>
		</div>
	{:else}
		<!-- Venue Picker -->
		<Card class="p-5 mb-8">
			<div class="flex items-center gap-3 mb-4">
				<h2 class="text-lg font-semibold text-charcoal">Select Venues</h2>
				{#if selectedVenues.length > 0}
					<Badge variant={canCompare ? 'sage' : 'gold'}>
						{selectedVenues.length} selected
					</Badge>
				{/if}
			</div>
			<div class="flex flex-wrap gap-3">
				{#each venues as venue (venue.id)}
					{@const isSelected = selectedIds.has(venue.id)}
					{@const isDisabled = !isSelected && selectedIds.size >= 4}
					<button
						class="px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all cursor-pointer
							{isSelected
								? 'border-rose bg-rose-light text-charcoal shadow-sm'
								: isDisabled
									? 'border-charcoal/10 bg-cream/50 text-charcoal/30 cursor-not-allowed'
									: 'border-charcoal/15 bg-warm-white text-charcoal hover:border-rose/40 hover:bg-rose-light/30'}"
						disabled={isDisabled}
						onclick={() => toggleVenue(venue.id)}
					>
						<span class="inline-flex items-center gap-2">
							{#if isSelected}
								<svg viewBox="0 0 24 24" class="w-4 h-4 fill-rose shrink-0">
									<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
								</svg>
							{:else}
								<svg viewBox="0 0 24 24" class="w-4 h-4 fill-charcoal/30 shrink-0">
									<path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
								</svg>
							{/if}
							{venue.name}
						</span>
						<span class="block text-xs mt-0.5 {isSelected ? 'text-charcoal/60' : 'text-charcoal/40'}">
							{formatCurrency(getVenueTotal(venue))}
						</span>
					</button>
				{/each}
			</div>
			{#if !canCompare && selectedVenues.length > 0}
				<p class="mt-3 text-xs text-gold">Select at least one more venue to compare.</p>
			{/if}
		</Card>

		{#if canCompare}
			<!-- Stacked Bar Chart -->
			<Card class="p-5 mb-8">
				<h2 class="text-lg font-semibold text-charcoal mb-4">Cost Breakdown</h2>
				<div class="overflow-x-auto">
					<svg
						width="100%"
						viewBox="0 0 800 {chartHeight}"
						class="min-w-[600px]"
						role="img"
						aria-label="Stacked bar chart comparing venue costs by category"
					>
						{#each chartData as bar, i}
							{@const y = chartPaddingY + i * (chartBarHeight + chartGap)}
							{@const barAreaWidth = 800 - chartLabelWidth - chartTotalWidth}

							<!-- Venue name label -->
							<text
								x={chartLabelWidth - 8}
								y={y + chartBarHeight / 2}
								text-anchor="end"
								dominant-baseline="central"
								class="text-[11px] font-medium"
								fill="#4A4A4A"
							>
								{bar.venue.name.length > 16 ? bar.venue.name.slice(0, 16) + '...' : bar.venue.name}
							</text>

							<!-- Background track -->
							<rect
								x={chartLabelWidth}
								{y}
								width={barAreaWidth}
								height={chartBarHeight}
								rx="6"
								fill="#F5F0E8"
							/>

							<!-- Stacked segments -->
							{@const totalBarWidth = (bar.total / bar.maxTotal) * barAreaWidth}
							{#each bar.segments as segment, j}
								{@const segStart = bar.segments.slice(0, j).reduce((s, seg) => s + seg.value, 0)}
								{@const segX = chartLabelWidth + (segStart / bar.maxTotal) * barAreaWidth}
								{@const segW = (segment.value / bar.maxTotal) * barAreaWidth}
								<rect
									x={segX}
									{y}
									width={Math.max(segW, 1)}
									height={chartBarHeight}
									fill={segment.color}
									rx={j === 0 && j === bar.segments.length - 1
										? 6
										: j === 0
											? 0
											: j === bar.segments.length - 1
												? 0
												: 0}
								>
									<title>{segment.label}: {formatCurrency(segment.value)}</title>
								</rect>
							{/each}

							<!-- Rounded clip for the stacked bar group -->
							<!-- We overlay a clip-path rounded rect -->
							<clipPath id="bar-clip-{i}">
								<rect
									x={chartLabelWidth}
									{y}
									width={totalBarWidth}
									height={chartBarHeight}
									rx="6"
								/>
							</clipPath>
							<g clip-path="url(#bar-clip-{i})">
								{#each bar.segments as segment, j}
									{@const segStart = bar.segments.slice(0, j).reduce((s, seg) => s + seg.value, 0)}
									{@const segX = chartLabelWidth + (segStart / bar.maxTotal) * barAreaWidth}
									{@const segW = (segment.value / bar.maxTotal) * barAreaWidth}
									<rect
										x={segX}
										{y}
										width={Math.max(segW, 1)}
										height={chartBarHeight}
										fill={segment.color}
									>
										<title>{segment.label}: {formatCurrency(segment.value)}</title>
									</rect>
								{/each}
							</g>

							<!-- Total label -->
							<text
								x={800 - 4}
								y={y + chartBarHeight / 2}
								text-anchor="end"
								dominant-baseline="central"
								class="text-[12px] font-semibold"
								fill="#4A4A4A"
							>
								{formatCurrency(bar.total)}
							</text>
						{/each}
					</svg>
				</div>

				<!-- Legend -->
				<div class="flex flex-wrap gap-x-4 gap-y-2 mt-4 pt-4 border-t border-rose-light/20">
					{#each activeCategories as catType}
						<div class="flex items-center gap-1.5">
							<span
								class="w-3 h-3 rounded-sm shrink-0"
								style="background-color: {categoryColors[catType]}"
							></span>
							<span class="text-xs text-charcoal/70">{COST_CATEGORY_LABELS[catType]}</span>
						</div>
					{/each}
				</div>
			</Card>

			<!-- Comparison Table -->
			<Card class="mb-8 overflow-hidden">
				<div class="overflow-x-auto">
					<table class="w-full text-sm border-collapse">
						<thead>
							<tr class="border-b-2 border-rose-light/30">
								<th
									class="sticky left-0 z-10 bg-cream px-5 py-3 text-left font-semibold text-charcoal min-w-[180px]"
								>
									Category
								</th>
								{#each selectedVenues as venue}
									<th class="px-5 py-3 text-right font-semibold text-charcoal min-w-[140px]">
										{venue.name}
									</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each activeCategories as catType, rowIdx}
								{@const { min, max } = getCategoryMinMax(catType)}
								<tr class="border-b border-rose-light/15 {rowIdx % 2 === 0 ? 'bg-warm-white' : 'bg-cream/50'}">
									<td
										class="sticky left-0 z-10 px-5 py-3 font-medium text-charcoal/80
											{rowIdx % 2 === 0 ? 'bg-warm-white' : 'bg-cream/50'}"
									>
										<div class="flex items-center gap-2">
											<span
												class="w-2.5 h-2.5 rounded-sm shrink-0"
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
											class="px-5 py-3 text-right font-medium tabular-nums
												{value > 0 && value === min && min !== max
													? 'bg-sage/15 text-sage'
													: value > 0 && value === max && min !== max
														? 'bg-rose/10 text-rose'
														: 'text-charcoal/70'}"
										>
											{value > 0 ? formatCurrency(value) : '--'}
										</td>
									{/each}
								</tr>
							{/each}

							<!-- Grand Total Row -->
							{#if true}
							{@const { min: totalMin, max: totalMax } = getGrandTotalMinMax()}
							<tr class="border-t-2 border-rose-light/30 bg-cream">
								<td class="sticky left-0 z-10 bg-cream px-5 py-4 font-bold text-charcoal">
									Grand Total
								</td>
								{#each selectedVenues as venue}
									{@const total = getVenueTotal(venue)}
									<td
										class="px-5 py-4 text-right font-bold text-base tabular-nums
											{total > 0 && total === totalMin && totalMin !== totalMax
												? 'text-sage'
												: total > 0 && total === totalMax && totalMin !== totalMax
													? 'text-rose'
													: 'text-charcoal'}"
									>
										{formatCurrency(total)}
									</td>
								{/each}
							</tr>
							{/if}
						</tbody>
					</table>
				</div>
			</Card>
		{:else if selectedVenues.length === 0}
			<!-- No venues selected yet -->
			<div class="text-center py-16">
				<div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cream mb-4">
					<svg viewBox="0 0 24 24" class="w-8 h-8 fill-charcoal/30">
						<path d="M10 3H4a1 1 0 00-1 1v6a1 1 0 001 1h6a1 1 0 001-1V4a1 1 0 00-1-1zm10 0h-6a1 1 0 00-1 1v6a1 1 0 001 1h6a1 1 0 001-1V4a1 1 0 00-1-1zM10 13H4a1 1 0 00-1 1v6a1 1 0 001 1h6a1 1 0 001-1v-6a1 1 0 00-1-1zm7 0c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm2.5 5.5h-2v2h-1v-2h-2v-1h2v-2h1v2h2v1z" />
					</svg>
				</div>
				<h3 class="text-lg font-medium text-charcoal mb-1">Select venues above</h3>
				<p class="text-sm text-charcoal/60">
					Pick 2-4 venues to see a side-by-side cost comparison.
				</p>
			</div>
		{/if}
	{/if}
</div>
