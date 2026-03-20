<script lang="ts">
	import { getVenues } from '$lib/stores/venues.svelte';
	import { getBudget, updateBudget } from '$lib/stores/budget.svelte';
	import { calculateGrandTotal, calculateCategoryBreakdown } from '$lib/utils/calculations';
	import { formatCurrency } from '$lib/utils/formatters';
	import type { Venue } from '$lib/types';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import StarRating from '$lib/components/ui/StarRating.svelte';

	let venues = $derived(getVenues());
	let budget = $derived(getBudget());

	let hasVenues = $derived(venues.length > 0);

	// Budget settings local state
	let editingBudget = $state(false);
	let editBudgetValue = $state(0);
	let editGuestCount = $state(0);

	function startEditBudget() {
		editBudgetValue = budget.total_budget;
		editGuestCount = budget.guest_count;
		editingBudget = true;
	}

	function saveBudget() {
		updateBudget({
			total_budget: editBudgetValue,
			guest_count: editGuestCount
		});
		editingBudget = false;
	}

	function cancelEditBudget() {
		editingBudget = false;
	}

	// Summary calculations
	let totalVenues = $derived(venues.length);

	let venueTotals = $derived(
		venues.map((v) => ({
			venue: v,
			total: calculateGrandTotal(v.cost_categories ?? [], budget.guest_count)
		}))
	);

	let totalEstimatedCost = $derived(
		venueTotals.reduce((sum, vt) => sum + vt.total, 0)
	);

	let averageCost = $derived(
		totalVenues > 0 ? totalEstimatedCost / totalVenues : 0
	);

	let lowestCost = $derived(
		totalVenues > 0 ? Math.min(...venueTotals.map((vt) => vt.total)) : 0
	);

	let budgetRemaining = $derived(budget.total_budget - lowestCost);

	// Bar chart dimensions
	const chartWidth = 600;
	const chartHeight = 300;
	const chartPadding = { top: 20, right: 20, bottom: 80, left: 70 };
	let plotWidth = $derived(chartWidth - chartPadding.left - chartPadding.right);
	let plotHeight = $derived(chartHeight - chartPadding.top - chartPadding.bottom);

	let maxBarValue = $derived(
		Math.max(budget.total_budget, ...venueTotals.map((vt) => vt.total), 1) * 1.1
	);

	let barWidth = $derived(
		totalVenues > 0 ? Math.min(60, (plotWidth / totalVenues) * 0.6) : 60
	);

	let barGap = $derived(
		totalVenues > 0 ? plotWidth / totalVenues : plotWidth
	);

	// Category colors for stacked bars
	const categoryColors: Record<string, string> = {
		'venue-rental': '#D4A0A0',
		time: '#C9A96E',
		catering: '#9CAF88',
		bar: '#B8A0C8',
		cake: '#E8D9B0',
		staffing: '#A0C4D4',
		'rentals-included': '#C8D8B8',
		'rental-upgrades': '#D4B8A0',
		'decor-floral': '#E8A0B8',
		entertainment: '#A0D4C4',
		'photo-video': '#D4D4A0',
		planning: '#B8C8E8',
		'fees-taxes': '#C8A0A0',
		transportation: '#A0B8D4',
		miscellaneous: '#D4C8B8'
	};

	// Stacked bar data
	let stackedData = $derived(
		venues.map((v) => {
			const breakdown = calculateCategoryBreakdown(v.cost_categories ?? [], budget.guest_count);
			const total = calculateGrandTotal(v.cost_categories ?? [], budget.guest_count);
			return { venue: v, breakdown, total };
		})
	);

	// Collect all unique category types that appear across venues
	let allCategoryTypes = $derived(
		Array.from(new Set(stackedData.flatMap((d) => d.breakdown.map((b) => b.type))))
	);

	function scaleY(value: number): number {
		return plotHeight - (value / maxBarValue) * plotHeight;
	}

	function truncateLabel(text: string, maxLen: number = 12): string {
		return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
	}

	function getBarColor(total: number): string {
		if (total > budget.total_budget) return '#E8A0A0';
		if (total > budget.total_budget * 0.9) return '#E8D49A';
		return '#9CAF88';
	}
</script>

<svelte:head>
	<title>Wedding Planner - Dashboard</title>
</svelte:head>

<div class="min-h-screen bg-warm-white">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-charcoal tracking-tight">Wedding Dashboard</h1>
			<p class="text-charcoal/60 mt-1">Plan your perfect day, one detail at a time.</p>
		</div>

		{#if !hasVenues}
			<!-- Empty State -->
			<div class="flex flex-col items-center justify-center py-24">
				<div class="w-24 h-24 rounded-full bg-rose-light flex items-center justify-center mb-6">
					<svg class="w-12 h-12 text-rose" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
					</svg>
				</div>
				<h2 class="text-2xl font-semibold text-charcoal mb-2">Welcome to Your Wedding Planner</h2>
				<p class="text-charcoal/60 text-center max-w-md mb-8">
					Start by adding your first venue to compare costs, track budgets, and plan every detail of your special day.
				</p>
				<a href="/venues">
					<Button variant="primary" size="lg">
						Add Your First Venue
					</Button>
				</a>
			</div>
		{:else}
			<!-- Summary Cards -->
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
				{#snippet summaryCard(iconSvg: string, label: string, value: string, accent: string)}
					<Card class="p-5">
						<div class="flex items-start justify-between">
							<div>
								<p class="text-sm font-medium text-charcoal/60">{label}</p>
								<p class="text-2xl font-bold mt-1 {accent}">{value}</p>
							</div>
							<div class="w-10 h-10 rounded-lg bg-rose-light/50 flex items-center justify-center shrink-0">
								{@html iconSvg}
							</div>
						</div>
					</Card>
				{/snippet}

				{@render summaryCard(
					'<svg class="w-5 h-5 text-rose" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" /></svg>',
					'Total Venues',
					String(totalVenues),
					'text-charcoal'
				)}
				{@render summaryCard(
					'<svg class="w-5 h-5 text-rose" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>',
					'Average Cost',
					formatCurrency(averageCost),
					'text-charcoal'
				)}
				{@render summaryCard(
					'<svg class="w-5 h-5 text-rose" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
					'Budget Remaining',
					formatCurrency(budgetRemaining),
					budgetRemaining >= 0 ? 'text-sage' : 'text-red-500'
				)}
				{@render summaryCard(
					'<svg class="w-5 h-5 text-rose" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>',
					'Guest Count',
					String(budget.guest_count),
					'text-charcoal'
				)}
			</div>

			<!-- Budget Settings -->
			<Card class="p-6 mb-8">
				<div class="flex items-center justify-between mb-4">
					<h2 class="text-lg font-semibold text-charcoal">Budget Settings</h2>
					{#if !editingBudget}
						<Button variant="outline" size="sm" onclick={startEditBudget}>
							Edit
						</Button>
					{/if}
				</div>

				{#if editingBudget}
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<Input
							label="Total Budget"
							type="number"
							value={editBudgetValue}
							oninput={(e) => { editBudgetValue = Number((e.target as HTMLInputElement).value); }}
							min="0"
							step="1000"
						/>
						<Input
							label="Guest Count"
							type="number"
							value={editGuestCount}
							oninput={(e) => { editGuestCount = Number((e.target as HTMLInputElement).value); }}
							min="0"
							step="1"
						/>
					</div>
					<div class="flex gap-2 mt-4">
						<Button variant="primary" size="sm" onclick={saveBudget}>
							Save
						</Button>
						<Button variant="ghost" size="sm" onclick={cancelEditBudget}>
							Cancel
						</Button>
					</div>
				{:else}
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
						<div class="flex items-center gap-3">
							<div class="w-10 h-10 rounded-lg bg-sage/10 flex items-center justify-center">
								<svg class="w-5 h-5 text-sage" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
									<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
								</svg>
							</div>
							<div>
								<p class="text-sm text-charcoal/60">Total Budget</p>
								<p class="text-xl font-semibold text-charcoal">{formatCurrency(budget.total_budget)}</p>
							</div>
						</div>
						<div class="flex items-center gap-3">
							<div class="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
								<svg class="w-5 h-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
									<path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
								</svg>
							</div>
							<div>
								<p class="text-sm text-charcoal/60">Guest Count</p>
								<p class="text-xl font-semibold text-charcoal">{budget.guest_count} guests</p>
							</div>
						</div>
					</div>
				{/if}
			</Card>

			<!-- Charts Section -->
			<div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
				<!-- Bar Chart: Total Cost per Venue -->
				<Card class="p-6">
					<h2 class="text-lg font-semibold text-charcoal mb-4">Cost per Venue</h2>
					<div class="overflow-x-auto">
						<svg
							viewBox="0 0 {chartWidth} {chartHeight}"
							class="w-full"
							style="min-width: {Math.max(400, totalVenues * 80)}px;"
						>
							<!-- Y-axis gridlines and labels -->
							{#each [0, 0.25, 0.5, 0.75, 1] as tick}
								{@const yVal = maxBarValue * tick}
								{@const yPos = chartPadding.top + scaleY(yVal)}
								<line
									x1={chartPadding.left}
									y1={yPos}
									x2={chartWidth - chartPadding.right}
									y2={yPos}
									stroke="#E5E0D8"
									stroke-width="1"
								/>
								<text
									x={chartPadding.left - 8}
									y={yPos + 4}
									text-anchor="end"
									class="text-[10px] fill-charcoal/50"
								>
									{formatCurrency(yVal)}
								</text>
							{/each}

							<!-- Budget dashed line -->
							{#if budget.total_budget > 0}
								{@const budgetY = chartPadding.top + scaleY(budget.total_budget)}
								<line
									x1={chartPadding.left}
									y1={budgetY}
									x2={chartWidth - chartPadding.right}
									y2={budgetY}
									stroke="#D4A0A0"
									stroke-width="2"
									stroke-dasharray="6,4"
								/>
								<text
									x={chartWidth - chartPadding.right}
									y={budgetY - 6}
									class="text-[10px] fill-rose font-medium"
									text-anchor="end"
								>
									Budget: {formatCurrency(budget.total_budget)}
								</text>
							{/if}

							<!-- Bars -->
							{#each venueTotals as { venue, total }, i}
								{@const barX = chartPadding.left + i * barGap + (barGap - barWidth) / 2}
								{@const barH = (total / maxBarValue) * plotHeight}
								{@const barY = chartPadding.top + plotHeight - barH}

								<rect
									x={barX}
									y={barY}
									width={barWidth}
									height={barH}
									rx="4"
									ry="4"
									fill={getBarColor(total)}
								>
									<title>{venue.name}: {formatCurrency(total)}</title>
								</rect>

								<!-- Value on top of bar -->
								<text
									x={barX + barWidth / 2}
									y={barY - 6}
									text-anchor="middle"
									class="text-[9px] fill-charcoal/70 font-medium"
								>
									{formatCurrency(total)}
								</text>

								<!-- Venue name below bar -->
								<text
									x={barX + barWidth / 2}
									y={chartPadding.top + plotHeight + 14}
									text-anchor="middle"
									class="text-[10px] fill-charcoal/70"
									transform="rotate(-25, {barX + barWidth / 2}, {chartPadding.top + plotHeight + 14})"
								>
									{truncateLabel(venue.name, 14)}
								</text>
							{/each}
						</svg>
					</div>
				</Card>

				<!-- Stacked Bar Chart: Cost Breakdown by Category -->
				<Card class="p-6">
					<h2 class="text-lg font-semibold text-charcoal mb-4">Cost Breakdown by Category</h2>
					<div class="overflow-x-auto">
						<svg
							viewBox="0 0 {chartWidth} {chartHeight}"
							class="w-full"
							style="min-width: {Math.max(400, totalVenues * 80)}px;"
						>
							<!-- Y-axis gridlines and labels -->
							{#each [0, 0.25, 0.5, 0.75, 1] as tick}
								{@const yVal = maxBarValue * tick}
								{@const yPos = chartPadding.top + scaleY(yVal)}
								<line
									x1={chartPadding.left}
									y1={yPos}
									x2={chartWidth - chartPadding.right}
									y2={yPos}
									stroke="#E5E0D8"
									stroke-width="1"
								/>
								<text
									x={chartPadding.left - 8}
									y={yPos + 4}
									text-anchor="end"
									class="text-[10px] fill-charcoal/50"
								>
									{formatCurrency(yVal)}
								</text>
							{/each}

							<!-- Budget dashed line -->
							{#if budget.total_budget > 0}
								{@const budgetYStacked = chartPadding.top + scaleY(budget.total_budget)}
								<line
									x1={chartPadding.left}
									y1={budgetYStacked}
									x2={chartWidth - chartPadding.right}
									y2={budgetYStacked}
									stroke="#D4A0A0"
									stroke-width="2"
									stroke-dasharray="6,4"
								/>
							{/if}

							<!-- Stacked Bars -->
							{#each stackedData as { venue, breakdown, total }, i}
								{@const barX = chartPadding.left + i * barGap + (barGap - barWidth) / 2}
								<!-- Build segments bottom-up -->
								{@const segments = (() => {
									let currentBottom = chartPadding.top + plotHeight;
									return breakdown.map((cat) => {
										const segH = (cat.total / maxBarValue) * plotHeight;
										currentBottom -= segH;
										return {
											y: currentBottom,
											height: segH,
											color: categoryColors[cat.type] ?? '#D4C8B8',
											label: cat.label,
											total: cat.total
										};
									});
								})()}
								{#each segments as seg}
									<rect
										x={barX}
										y={seg.y}
										width={barWidth}
										height={Math.max(seg.height, 0)}
										fill={seg.color}
									>
										<title>{seg.label}: {formatCurrency(seg.total)}</title>
									</rect>
								{/each}

								<!-- Venue name below bar -->
								<text
									x={barX + barWidth / 2}
									y={chartPadding.top + plotHeight + 14}
									text-anchor="middle"
									class="text-[10px] fill-charcoal/70"
									transform="rotate(-25, {barX + barWidth / 2}, {chartPadding.top + plotHeight + 14})"
								>
									{truncateLabel(venue.name, 14)}
								</text>
							{/each}
						</svg>
					</div>

					<!-- Legend -->
					{#if allCategoryTypes.length > 0}
						<div class="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 pt-3 border-t border-rose-light/30">
							{#each allCategoryTypes as catType}
								<div class="flex items-center gap-1.5">
									<div
										class="w-3 h-3 rounded-sm shrink-0"
										style="background-color: {categoryColors[catType] ?? '#D4C8B8'};"
									></div>
									<span class="text-[11px] text-charcoal/60 capitalize">{catType.replace(/-/g, ' ')}</span>
								</div>
							{/each}
						</div>
					{/if}
				</Card>
			</div>

			<!-- Quick Venue Cards -->
			<div class="mb-4">
				<h2 class="text-lg font-semibold text-charcoal">Your Venues</h2>
			</div>
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each venues as venue}
					{@const venueTotal = calculateGrandTotal(venue.cost_categories ?? [], budget.guest_count)}
					<a href="/venues/{venue.id}" class="block group">
						<Card hover class="p-5 h-full flex flex-col">
							<div class="flex items-start justify-between mb-3">
								<div class="flex-1 min-w-0">
									<h3 class="font-semibold text-charcoal group-hover:text-rose transition-colors truncate">
										{venue.name}
									</h3>
									{#if venue.location}
										<p class="text-sm text-charcoal/50 mt-0.5 truncate">{venue.location}</p>
									{/if}
								</div>
								<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-light/50 text-charcoal/70 ml-2 whitespace-nowrap capitalize">
									{venue.venue_type.replace(/-/g, ' ')}
								</span>
							</div>

							<div class="flex items-end justify-between mt-auto pt-2">
								<div>
									<p class="text-xs text-charcoal/50">Estimated Total</p>
									<p class="text-lg font-bold {venueTotal > budget.total_budget ? 'text-red-500' : 'text-charcoal'}">
										{formatCurrency(venueTotal)}
									</p>
								</div>
								{#if venue.rating > 0}
									<StarRating value={venue.rating} readonly size="sm" />
								{/if}
							</div>

							{#if venue.capacity_seated > 0}
								<p class="text-xs text-charcoal/40 mt-2">Seats {venue.capacity_seated} guests</p>
							{/if}
						</Card>
					</a>
				{/each}

				<!-- Add venue card -->
				<a href="/venues" class="block group">
					<Card hover class="p-5 h-full flex flex-col items-center justify-center min-h-[160px]">
						<div class="w-12 h-12 rounded-full bg-rose-light/30 flex items-center justify-center mb-3 group-hover:bg-rose-light transition-colors">
							<svg class="w-6 h-6 text-rose" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
							</svg>
						</div>
						<p class="text-sm font-medium text-charcoal/60 group-hover:text-rose transition-colors">Add Another Venue</p>
					</Card>
				</a>
			</div>
		{/if}
	</div>
</div>
