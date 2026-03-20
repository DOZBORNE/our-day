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
	import { MapPin, Users, Timer, UserCheck, Heart, Plus, DollarSign, TrendingUp, Calendar, Building2 } from 'lucide-svelte';

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

	// Budget progress
	let budgetSpent = $derived(lowestCost);
	let budgetPercent = $derived(
		budget.total_budget > 0 ? Math.min((budgetSpent / budget.total_budget) * 100, 100) : 0
	);

	// Days left calculation (placeholder wedding date)
	let daysLeft = $derived((() => {
		const weddingDate = new Date('2026-10-17');
		const today = new Date();
		const diff = weddingDate.getTime() - today.getTime();
		return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
	})());

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

	// Category allocation table data
	let categoryAllocations = $derived((() => {
		if (stackedData.length === 0) return [];
		const catMap = new Map<string, { budgeted: number; actual: number; label: string }>();
		for (const { breakdown } of stackedData) {
			for (const cat of breakdown) {
				const existing = catMap.get(cat.type);
				if (existing) {
					existing.actual += cat.total;
				} else {
					catMap.set(cat.type, { budgeted: cat.total * 1.1, actual: cat.total, label: cat.label });
				}
			}
		}
		return Array.from(catMap.entries()).map(([type, data]) => ({
			type,
			...data,
			status: data.actual > data.budgeted ? 'OVER BUDGET' : data.actual >= data.budgeted * 0.9 ? 'PENDING' : 'CONFIRMED'
		}));
	})());

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

<div class="min-h-screen bg-background">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
		<!-- Header -->
		<div class="mb-10">
			<h1 class="text-4xl font-bold tracking-tight text-on-surface">Planning Overview</h1>
			<p class="text-on-surface-variant mt-2">Curating your special day with precision and elegance</p>
		</div>

		{#if !hasVenues}
			<!-- Empty State -->
			<div class="flex flex-col items-center justify-center py-24">
				<div class="w-24 h-24 rounded-full bg-primary-fixed flex items-center justify-center mb-6">
					<Heart class="w-12 h-12 text-primary" strokeWidth={1.5} />
				</div>
				<h2 class="text-2xl font-semibold text-on-surface mb-2">Welcome to Your Wedding Planner</h2>
				<p class="text-on-surface-variant text-center max-w-md mb-8">
					Start by adding your first venue to compare costs, track budgets, and plan every detail of your special day.
				</p>
				<a href="/venues">
					<Button variant="primary" size="lg">
						Add Your First Venue
					</Button>
				</a>
			</div>
		{:else}
			<!-- Quick Stats Grid -->
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
				<!-- Venues -->
				<div class="bg-surface-low rounded-xl p-5 border border-outline-variant/10">
					<div class="flex items-start justify-between">
						<div>
							<p class="font-mono text-[10px] uppercase tracking-widest text-secondary">Venues</p>
							<p class="text-2xl font-bold text-on-surface mt-1">{totalVenues}</p>
						</div>
						<div class="w-10 h-10 rounded-lg bg-primary-fixed/50 flex items-center justify-center shrink-0">
							<MapPin class="w-5 h-5 text-primary" />
						</div>
					</div>
				</div>

				<!-- Vendors -->
				<div class="bg-surface-low rounded-xl p-5 border border-outline-variant/10">
					<div class="flex items-start justify-between">
						<div>
							<p class="font-mono text-[10px] uppercase tracking-widest text-secondary">Vendors</p>
							<p class="text-2xl font-bold text-on-surface mt-1">{totalVenues}</p>
						</div>
						<div class="w-10 h-10 rounded-lg bg-secondary-container/50 flex items-center justify-center shrink-0">
							<Users class="w-5 h-5 text-secondary" />
						</div>
					</div>
				</div>

				<!-- Days Left -->
				<div class="bg-surface-low rounded-xl p-5 border border-outline-variant/10">
					<div class="flex items-start justify-between">
						<div>
							<p class="font-mono text-[10px] uppercase tracking-widest text-secondary">Days Left</p>
							<p class="text-2xl font-bold text-on-surface mt-1">{daysLeft}</p>
						</div>
						<div class="w-10 h-10 rounded-lg bg-tertiary-fixed/50 flex items-center justify-center shrink-0">
							<Timer class="w-5 h-5 text-tertiary" />
						</div>
					</div>
				</div>

				<!-- Guest Count -->
				<div class="bg-surface-low rounded-xl p-5 border border-outline-variant/10">
					<div class="flex items-start justify-between">
						<div>
							<p class="font-mono text-[10px] uppercase tracking-widest text-secondary">Guests</p>
							<p class="text-2xl font-bold text-on-surface mt-1">{budget.guest_count}</p>
						</div>
						<div class="w-10 h-10 rounded-lg bg-primary-fixed/50 flex items-center justify-center shrink-0">
							<UserCheck class="w-5 h-5 text-primary" />
						</div>
					</div>
				</div>
			</div>

			<!-- Master Budget + Venue Cost Comparison -->
			<div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
				<!-- Master Budget Card -->
				<div class="bg-surface-lowest rounded-xl p-8 border border-outline-variant/10 shadow-sm">
					<div class="flex items-center justify-between mb-6">
						<div>
							<h2 class="text-lg font-semibold text-on-surface">Master Budget</h2>
							<p class="text-sm text-on-surface-variant mt-0.5">Track your overall wedding spend</p>
						</div>
						<div class="w-10 h-10 rounded-lg bg-primary-fixed/50 flex items-center justify-center">
							<DollarSign class="w-5 h-5 text-primary" />
						</div>
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
						<!-- Budget totals -->
						<div class="flex items-baseline justify-between mb-2">
							<span class="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">Spent</span>
							<span class="font-mono text-sm text-on-surface-variant">
								{formatCurrency(budgetSpent)} / {formatCurrency(budget.total_budget)}
							</span>
						</div>

						<!-- Progress bar -->
						<div class="w-full h-3 rounded-full bg-surface overflow-hidden mb-4">
							<div
								class="h-full rounded-full bg-gradient-to-r from-primary to-primary-container transition-all duration-500"
								style="width: {budgetPercent}%"
							></div>
						</div>

						<!-- Remaining funds -->
						<div class="flex items-center justify-between mb-6">
							<div>
								<p class="text-sm text-on-surface-variant">Remaining Funds</p>
								<p class="text-2xl font-bold {budgetRemaining >= 0 ? 'text-secondary' : 'text-error'}">
									{formatCurrency(Math.abs(budgetRemaining))}
									{#if budgetRemaining < 0}
										<span class="text-sm font-normal text-error">over budget</span>
									{/if}
								</p>
							</div>
							<div class="text-right">
								<p class="text-sm text-on-surface-variant">Average per Venue</p>
								<p class="text-lg font-semibold text-on-surface">{formatCurrency(averageCost)}</p>
							</div>
						</div>

						<Button variant="primary" size="md" onclick={startEditBudget}>
							Adjust Budget
						</Button>
					{/if}
				</div>

				<!-- Venue Cost Comparison -->
				<div class="bg-surface-lowest rounded-xl p-8 border border-outline-variant/10 shadow-sm">
					<div class="flex items-center justify-between mb-6">
						<div>
							<h2 class="text-lg font-semibold text-on-surface">Venue Cost Comparison</h2>
							<p class="text-sm text-on-surface-variant mt-0.5">Side-by-side venue pricing</p>
						</div>
						<div class="w-10 h-10 rounded-lg bg-tertiary-fixed/50 flex items-center justify-center">
							<Building2 class="w-5 h-5 text-tertiary" />
						</div>
					</div>

					<div class="space-y-3">
						{#each venueTotals as { venue, total }}
							<a href="/venues/{venue.id}" class="block group">
								<div class="flex items-center justify-between p-4 rounded-lg bg-surface-low hover:bg-surface transition-colors border border-outline-variant/5">
									<div class="flex-1 min-w-0">
										<h3 class="font-medium text-on-surface group-hover:text-primary transition-colors truncate text-sm">
											{venue.name}
										</h3>
										{#if venue.location}
											<p class="text-xs text-on-surface-variant mt-0.5 truncate flex items-center gap-1">
												<MapPin class="w-3 h-3 shrink-0" />
												{venue.location}
											</p>
										{/if}
									</div>
									<div class="text-right ml-4">
										<p class="font-mono text-sm font-bold {total > budget.total_budget ? 'text-error' : 'text-on-surface'}">
											{formatCurrency(total)}
										</p>
										{#if venue.rating > 0}
											<div class="mt-1">
												<StarRating value={venue.rating} readonly size="sm" />
											</div>
										{/if}
									</div>
								</div>
							</a>
						{/each}

						{#if venueTotals.length === 0}
							<p class="text-sm text-on-surface-variant text-center py-6">No venues added yet</p>
						{/if}
					</div>
				</div>
			</div>

			<!-- Category Allocation Table -->
			{#if categoryAllocations.length > 0}
				<div class="bg-surface-lowest rounded-xl p-8 border border-outline-variant/10 shadow-sm mb-8">
					<div class="flex items-center justify-between mb-6">
						<div>
							<h2 class="text-lg font-semibold text-on-surface">Category Allocation</h2>
							<p class="text-sm text-on-surface-variant mt-0.5">Budget breakdown by category</p>
						</div>
						<div class="w-10 h-10 rounded-lg bg-secondary-container/50 flex items-center justify-center">
							<TrendingUp class="w-5 h-5 text-secondary" />
						</div>
					</div>

					<div class="overflow-x-auto">
						<table class="w-full text-sm">
							<thead>
								<tr class="border-b border-outline-variant/20">
									<th class="text-left py-3 pr-4 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">Category</th>
									<th class="text-right py-3 px-4 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">Budgeted</th>
									<th class="text-right py-3 px-4 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">Actual</th>
									<th class="text-right py-3 pl-4 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">Status</th>
								</tr>
							</thead>
							<tbody>
								{#each categoryAllocations as cat}
									<tr class="border-b border-outline-variant/10 last:border-0">
										<td class="py-3 pr-4">
											<div class="flex items-center gap-2">
												<div class="w-3 h-3 rounded-sm shrink-0" style="background-color: {categoryColors[cat.type] ?? '#D4C8B8'};"></div>
												<span class="text-on-surface capitalize">{cat.label}</span>
											</div>
										</td>
										<td class="text-right py-3 px-4 font-mono text-on-surface-variant">{formatCurrency(cat.budgeted)}</td>
										<td class="text-right py-3 px-4 font-mono text-on-surface font-medium">{formatCurrency(cat.actual)}</td>
										<td class="text-right py-3 pl-4">
											{#if cat.status === 'CONFIRMED'}
												<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-secondary-container/40 text-secondary font-medium">
													Confirmed
												</span>
											{:else if cat.status === 'PENDING'}
												<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-tertiary-fixed/40 text-tertiary font-medium">
													Pending
												</span>
											{:else}
												<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-error-container/40 text-error font-medium">
													Over Budget
												</span>
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{/if}

			<!-- Charts Section -->
			<div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
				<!-- Bar Chart: Total Cost per Venue -->
				<div class="bg-surface-lowest rounded-xl p-6 border border-outline-variant/10 shadow-sm">
					<h2 class="text-lg font-semibold text-on-surface mb-4">Cost per Venue</h2>
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
									stroke="var(--color-outline-variant)"
									stroke-width="1"
									opacity="0.3"
								/>
								<text
									x={chartPadding.left - 8}
									y={yPos + 4}
									text-anchor="end"
									class="text-[10px]"
									fill="var(--color-on-surface-variant)"
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
									stroke="var(--color-primary)"
									stroke-width="2"
									stroke-dasharray="6,4"
								/>
								<text
									x={chartWidth - chartPadding.right}
									y={budgetY - 6}
									class="text-[10px] font-medium"
									fill="var(--color-primary)"
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
									class="text-[9px] font-medium"
									fill="var(--color-on-surface-variant)"
								>
									{formatCurrency(total)}
								</text>

								<!-- Venue name below bar -->
								<text
									x={barX + barWidth / 2}
									y={chartPadding.top + plotHeight + 14}
									text-anchor="middle"
									class="text-[10px]"
									fill="var(--color-on-surface-variant)"
									transform="rotate(-25, {barX + barWidth / 2}, {chartPadding.top + plotHeight + 14})"
								>
									{truncateLabel(venue.name, 14)}
								</text>
							{/each}
						</svg>
					</div>
				</div>

				<!-- Stacked Bar Chart: Cost Breakdown by Category -->
				<div class="bg-surface-lowest rounded-xl p-6 border border-outline-variant/10 shadow-sm">
					<h2 class="text-lg font-semibold text-on-surface mb-4">Cost Breakdown by Category</h2>
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
									stroke="var(--color-outline-variant)"
									stroke-width="1"
									opacity="0.3"
								/>
								<text
									x={chartPadding.left - 8}
									y={yPos + 4}
									text-anchor="end"
									class="text-[10px]"
									fill="var(--color-on-surface-variant)"
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
									stroke="var(--color-primary)"
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
									class="text-[10px]"
									fill="var(--color-on-surface-variant)"
									transform="rotate(-25, {barX + barWidth / 2}, {chartPadding.top + plotHeight + 14})"
								>
									{truncateLabel(venue.name, 14)}
								</text>
							{/each}
						</svg>
					</div>

					<!-- Legend -->
					{#if allCategoryTypes.length > 0}
						<div class="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 pt-3 border-t border-outline-variant/20">
							{#each allCategoryTypes as catType}
								<div class="flex items-center gap-1.5">
									<div
										class="w-3 h-3 rounded-sm shrink-0"
										style="background-color: {categoryColors[catType] ?? '#D4C8B8'};"
									></div>
									<span class="text-[11px] text-on-surface-variant capitalize">{catType.replace(/-/g, ' ')}</span>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<!-- Upcoming Dates + Vendor Network -->
			<div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
				<!-- Upcoming Dates -->
				<div class="bg-surface-lowest rounded-xl p-8 border border-outline-variant/10 shadow-sm">
					<div class="flex items-center justify-between mb-6">
						<div>
							<h2 class="text-lg font-semibold text-on-surface">Upcoming Dates</h2>
							<p class="text-sm text-on-surface-variant mt-0.5">Key milestones ahead</p>
						</div>
						<div class="w-10 h-10 rounded-lg bg-tertiary-fixed/50 flex items-center justify-center">
							<Calendar class="w-5 h-5 text-tertiary" />
						</div>
					</div>

					<div class="space-y-3">
						<div class="flex items-center gap-4 p-4 rounded-lg bg-surface-low border border-outline-variant/5">
							<div class="w-12 h-12 rounded-lg bg-primary-fixed/60 flex flex-col items-center justify-center shrink-0">
								<span class="text-[10px] font-mono uppercase text-primary">Oct</span>
								<span class="text-sm font-bold text-primary">17</span>
							</div>
							<div>
								<p class="font-medium text-on-surface text-sm">Wedding Day</p>
								<p class="text-xs text-on-surface-variant">{daysLeft} days remaining</p>
							</div>
						</div>

						{#each venues.slice(0, 3) as venue}
							<div class="flex items-center gap-4 p-4 rounded-lg bg-surface-low border border-outline-variant/5">
								<div class="w-12 h-12 rounded-lg bg-secondary-container/40 flex flex-col items-center justify-center shrink-0">
									<MapPin class="w-4 h-4 text-secondary" />
								</div>
								<div class="flex-1 min-w-0">
									<p class="font-medium text-on-surface text-sm truncate">{venue.name} Tour</p>
									<p class="text-xs text-on-surface-variant">Venue visit scheduled</p>
								</div>
								<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-tertiary-fixed/40 text-tertiary font-medium shrink-0">
									Pending
								</span>
							</div>
						{/each}
					</div>
				</div>

				<!-- Vendor Network Performance -->
				<div class="bg-surface-lowest rounded-xl p-8 border border-outline-variant/10 shadow-sm">
					<div class="flex items-center justify-between mb-6">
						<div>
							<h2 class="text-lg font-semibold text-on-surface">Vendor Network</h2>
							<p class="text-sm text-on-surface-variant mt-0.5">Performance overview</p>
						</div>
						<div class="w-10 h-10 rounded-lg bg-secondary-container/50 flex items-center justify-center">
							<Users class="w-5 h-5 text-secondary" />
						</div>
					</div>

					<div class="space-y-4">
						{#each allCategoryTypes.slice(0, 5) as catType}
							{@const catData = categoryAllocations.find(c => c.type === catType)}
							<div>
								<div class="flex items-center justify-between mb-1">
									<span class="text-sm text-on-surface capitalize">{catType.replace(/-/g, ' ')}</span>
									<span class="font-mono text-xs text-on-surface-variant">
										{catData ? formatCurrency(catData.actual) : '--'}
									</span>
								</div>
								<div class="w-full h-2 rounded-full bg-surface overflow-hidden">
									<div
										class="h-full rounded-full transition-all duration-500"
										style="width: {catData && budget.total_budget > 0 ? Math.min((catData.actual / budget.total_budget) * 100 * totalVenues, 100) : 0}%; background-color: {categoryColors[catType] ?? '#D4C8B8'};"
									></div>
								</div>
							</div>
						{/each}

						{#if allCategoryTypes.length === 0}
							<p class="text-sm text-on-surface-variant text-center py-6">Add venues to see vendor breakdown</p>
						{/if}
					</div>
				</div>
			</div>

			<!-- Your Venues -->
			<div class="mb-4">
				<h2 class="text-lg font-semibold text-on-surface">Your Venues</h2>
			</div>
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{#each venues as venue}
					{@const venueTotal = calculateGrandTotal(venue.cost_categories ?? [], budget.guest_count)}
					<a href="/venues/{venue.id}" class="block group">
						<div class="bg-surface-lowest rounded-xl border border-outline-variant/10 shadow-sm hover:shadow-md hover:border-outline-variant/20 transition-all cursor-pointer p-5 h-full flex flex-col">
							<div class="flex items-start justify-between mb-3">
								<div class="flex-1 min-w-0">
									<h3 class="font-semibold text-on-surface group-hover:text-primary transition-colors truncate">
										{venue.name}
									</h3>
									{#if venue.location}
										<p class="text-sm text-on-surface-variant mt-0.5 truncate flex items-center gap-1">
											<MapPin class="w-3 h-3 shrink-0" />
											{venue.location}
										</p>
									{/if}
								</div>
								<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-primary-fixed/50 text-on-surface-variant ml-2 whitespace-nowrap capitalize">
									{venue.venue_type.replace(/-/g, ' ')}
								</span>
							</div>

							<div class="flex items-end justify-between mt-auto pt-2">
								<div>
									<p class="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">Estimated Total</p>
									<p class="text-lg font-bold font-mono {venueTotal > budget.total_budget ? 'text-error' : 'text-on-surface'}">
										{formatCurrency(venueTotal)}
									</p>
								</div>
								{#if venue.rating > 0}
									<StarRating value={venue.rating} readonly size="sm" />
								{/if}
							</div>

							{#if venue.capacity_seated > 0}
								<p class="text-xs text-on-surface-variant/60 mt-2 flex items-center gap-1">
									<UserCheck class="w-3 h-3" />
									Seats {venue.capacity_seated} guests
								</p>
							{/if}
						</div>
					</a>
				{/each}

				<!-- Add venue card -->
				<a href="/venues" class="block group">
					<div class="bg-surface-lowest rounded-xl border border-outline-variant/10 shadow-sm hover:shadow-md hover:border-outline-variant/20 transition-all cursor-pointer p-5 h-full flex flex-col items-center justify-center min-h-[160px]">
						<div class="w-12 h-12 rounded-full bg-primary-fixed/30 flex items-center justify-center mb-3 group-hover:bg-primary-fixed transition-colors">
							<Plus class="w-6 h-6 text-primary" />
						</div>
						<p class="text-sm font-medium text-on-surface-variant group-hover:text-primary transition-colors">Add Another Venue</p>
					</div>
				</a>
			</div>
		{/if}
	</div>
</div>
