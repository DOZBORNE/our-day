<script lang="ts">
	import { goto } from '$app/navigation';
	import { getVenues } from '$lib/stores/venues.svelte';
	import { formatCurrency } from '$lib/utils/formatters';
	import type { Venue, VenueDate } from '$lib/types';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Star, Info } from 'lucide-svelte';

	const venueColors = ['#D4A0A0', '#9CAF88', '#C9A96E', '#8BB0C9', '#B8A0D4', '#D4B896'];

	const tierLabels: Record<string, string> = {
		saturday: 'Saturday (Premium)',
		'friday-sunday': 'Friday / Sunday',
		weekday: 'Weekday'
	};

	const tierBadgeVariants: Record<string, 'saturday' | 'frisun' | 'weekday'> = {
		saturday: 'saturday',
		'friday-sunday': 'frisun',
		weekday: 'weekday'
	};

	const tierShortLabels: Record<string, string> = {
		saturday: 'PREMIUM',
		'friday-sunday': 'STANDARD',
		weekday: 'VALUE'
	};

	const seasonLabels: Record<number, string> = {
		0: 'Winter', 1: 'Winter', 2: 'Spring', 3: 'Spring', 4: 'Spring',
		5: 'Summer', 6: 'Summer', 7: 'Summer', 8: 'Fall', 9: 'Fall', 10: 'Fall', 11: 'Winter'
	};

	let venues = $derived(getVenues());

	// Default to October 2026
	let currentYear = $state(2026);
	let currentMonth = $state(9); // October (0-indexed)

	// Multi-month view — default to true per spec
	let multiMonth = $state(true);

	// Venue filter chips
	let visibleVenues = $state<Set<string>>(new Set());
	let venuesWithDates = $derived(venues.filter((v) => (v.venue_dates ?? []).length > 0));

	// Initialize visibleVenues when venues change
	$effect(() => {
		const ids = new Set(venuesWithDates.map((v) => v.id));
		visibleVenues = ids;
	});

	function toggleVenueFilter(venueId: string) {
		const next = new Set(visibleVenues);
		if (next.has(venueId)) next.delete(venueId);
		else next.add(venueId);
		visibleVenues = next;
	}

	// Month navigation
	let monthLabel = $derived(
		new Date(currentYear, currentMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
	);

	function prevMonth() {
		const step = multiMonth ? 3 : 1;
		let m = currentMonth - step;
		let y = currentYear;
		while (m < 0) { m += 12; y--; }
		currentMonth = m;
		currentYear = y;
	}

	function nextMonth() {
		const step = multiMonth ? 3 : 1;
		let m = currentMonth + step;
		let y = currentYear;
		while (m > 11) { m -= 12; y++; }
		currentMonth = m;
		currentYear = y;
	}

	function jumpToMonth(year: number, month: number) {
		currentYear = year;
		currentMonth = month;
	}

	// Generate month quick-jump bar (Mar 2026 - Dec 2027)
	let monthJumpOptions = $derived.by(() => {
		const opts: { year: number; month: number; label: string }[] = [];
		const shortMonths = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
		for (let y = 2026; y <= 2027; y++) {
			const startM = y === 2026 ? 2 : 0; // Mar 2026 start
			for (let m = startM; m <= 11; m++) {
				opts.push({ year: y, month: m, label: `${shortMonths[m]} ${y}` });
			}
		}
		return opts;
	});

	// Build calendar grid for a given month
	function buildCalendarDays(year: number, month: number): (number | null)[] {
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const startDow = firstDay.getDay();
		const daysInMonth = lastDay.getDate();
		const cells: (number | null)[] = [];
		for (let i = 0; i < startDow; i++) cells.push(null);
		for (let d = 1; d <= daysInMonth; d++) cells.push(d);
		while (cells.length % 7 !== 0) cells.push(null);
		return cells;
	}

	let calendarDays = $derived(buildCalendarDays(currentYear, currentMonth));

	// Index: dateStr -> array of { venue, venueIndex, venueDate } (filtered by visibleVenues)
	interface DayEntry {
		venue: Venue;
		venueIndex: number;
		venueDate: VenueDate;
	}

	let dateIndex = $derived.by(() => {
		const map = new Map<string, DayEntry[]>();
		venues.forEach((venue, vi) => {
			if (!visibleVenues.has(venue.id)) return;
			for (const vd of venue.venue_dates ?? []) {
				const key = vd.date;
				if (!map.has(key)) map.set(key, []);
				map.get(key)!.push({ venue, venueIndex: vi, venueDate: vd });
			}
		});
		return map;
	});

	function dateKey(year: number, month: number, day: number): string {
		const m = String(month + 1).padStart(2, '0');
		const d = String(day).padStart(2, '0');
		return `${year}-${m}-${d}`;
	}

	function entriesForDay(year: number, month: number, day: number): DayEntry[] {
		return dateIndex.get(dateKey(year, month, day)) ?? [];
	}

	function availableCount(year: number, month: number, day: number): number {
		return entriesForDay(year, month, day).filter((e) => e.venueDate.status === 'available').length;
	}

	let hasAnyDates = $derived(venues.some((v) => (v.venue_dates ?? []).length > 0));

	// Selected day detail (inline, below calendar)
	let selectedDay = $state<number | null>(null);
	let selectedMonthCtx = $state<{ year: number; month: number }>({ year: currentYear, month: currentMonth });
	let selectedEntries = $derived(selectedDay !== null ? entriesForDay(selectedMonthCtx.year, selectedMonthCtx.month, selectedDay) : []);
	let selectedDateLabel = $derived(
		selectedDay !== null
			? new Date(selectedMonthCtx.year, selectedMonthCtx.month, selectedDay).toLocaleDateString('en-US', {
					weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
				})
			: ''
	);
	let selectedDayOfWeek = $derived(
		selectedDay !== null
			? new Date(selectedMonthCtx.year, selectedMonthCtx.month, selectedDay).getDay()
			: -1
	);
	let selectedTierLabel = $derived(
		selectedDayOfWeek === 6 ? 'PREMIUM DATE' : selectedDayOfWeek === 0 || selectedDayOfWeek === 5 ? 'STANDARD DATE' : 'VALUE DATE'
	);

	// Modal state (keep for backward compat)
	let modalOpen = $state(false);

	function openDay(year: number, month: number, day: number) {
		const entries = entriesForDay(year, month, day);
		if (entries.length === 0) return;
		selectedDay = day;
		selectedMonthCtx = { year, month };
	}

	function closeModal() {
		modalOpen = false;
		selectedDay = null;
	}

	function statusIcon(status: string): string {
		switch (status) {
			case 'available': return '\u25CB';
			case 'held': return '\u25D1';
			case 'booked': return '\u25CF';
			default: return '\u25CB';
		}
	}

	function statusLabel(status: string): string {
		switch (status) {
			case 'available': return 'Available';
			case 'held': return 'Held';
			case 'booked': return 'Booked';
			default: return status;
		}
	}

	const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	// Months to render for multi-month view
	let monthsToRender = $derived.by(() => {
		if (!multiMonth) return [{ year: currentYear, month: currentMonth }];
		const result: { year: number; month: number }[] = [];
		for (let i = 0; i < 3; i++) {
			let m = currentMonth + i;
			let y = currentYear;
			while (m > 11) { m -= 12; y++; }
			result.push({ year: y, month: m });
		}
		return result;
	});

	// Jump-to-month popover
	let showJumpMenu = $state(false);

	// Multi-venue overlap count for the current range
	let overlapDayCount = $derived.by(() => {
		let count = 0;
		for (const mc of monthsToRender) {
			const days = buildCalendarDays(mc.year, mc.month);
			for (const cell of days) {
				if (cell !== null && availableCount(mc.year, mc.month, cell) >= 2) count++;
			}
		}
		return count;
	});
</script>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
	<!-- Header -->
	<div>
		<h1 class="text-4xl font-bold tracking-tight text-on-surface">Calendar Overview</h1>
		<p class="text-on-surface-variant text-sm mt-1">Compare availability and pricing across all venues in one view</p>
	</div>

	<!-- Date Range Navigation -->
	<div class="flex flex-wrap items-center gap-3">
		<button
			onclick={prevMonth}
			class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-low text-on-surface-variant text-sm font-medium hover:bg-surface transition-colors cursor-pointer"
		>
			<ChevronLeft class="w-4 h-4" />
			Previous
		</button>

		<div class="bg-surface-lowest rounded-lg shadow-sm px-5 py-2 font-semibold text-primary text-sm">
			{#if multiMonth}
				{@const last = monthsToRender[monthsToRender.length - 1]}
				{new Date(currentYear, currentMonth, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} &ndash; {new Date(last.year, last.month, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
			{:else}
				{monthLabel}
			{/if}
		</div>

		<button
			onclick={nextMonth}
			class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-low text-on-surface-variant text-sm font-medium hover:bg-surface transition-colors cursor-pointer"
		>
			Next
			<ChevronRight class="w-4 h-4" />
		</button>

		<div class="relative">
			<button
				onclick={() => showJumpMenu = !showJumpMenu}
				class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
			>
				<CalendarIcon class="w-4 h-4" />
				Jump to Month
			</button>
			{#if showJumpMenu}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="absolute top-full left-0 mt-2 z-40 bg-surface-lowest rounded-xl shadow-lg border border-outline-variant/20 p-3 w-64 grid grid-cols-3 gap-1"
					onmouseleave={() => showJumpMenu = false}
				>
					{#each monthJumpOptions as opt}
						{@const isActive = opt.year === currentYear && opt.month === currentMonth}
						<button
							onclick={() => { jumpToMonth(opt.year, opt.month); showJumpMenu = false; }}
							class="px-2 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer
								{isActive ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-surface-low'}"
						>
							{opt.label}
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<label class="flex items-center gap-2 cursor-pointer ml-auto">
			<input type="checkbox" bind:checked={multiMonth} class="rounded border-outline-variant text-primary focus:ring-primary/50" />
			<span class="text-sm text-on-surface-variant">3-month view</span>
		</label>
	</div>

	{#if !hasAnyDates}
		<div class="bg-surface-lowest rounded-2xl border border-outline-variant/10 p-12 text-center">
			<div class="text-on-surface-variant/30 mb-4">
				<CalendarIcon class="w-16 h-16 mx-auto" />
			</div>
			<h2 class="text-lg font-semibold text-on-surface mb-2">No dates added yet</h2>
			<p class="text-on-surface-variant text-sm max-w-md mx-auto">
				Add available dates to your venues to see them all here on one calendar. Go to a venue's detail page and add dates in the Dates tab.
			</p>
		</div>
	{:else}
		<!-- Legend & Filters Bar -->
		<div class="bg-surface-lowest rounded-2xl p-6 border-t border-tertiary-container/30 shadow-sm">
			<div class="flex flex-wrap items-start gap-8">
				<!-- Status Icons -->
				<div>
					<span class="font-mono text-[10px] uppercase tracking-widest text-zinc-400 block mb-2">Status</span>
					<div class="flex items-center gap-4">
						<div class="flex items-center gap-1.5">
							<span class="w-4 h-4 rounded-full border-2 border-primary inline-block"></span>
							<span class="text-xs text-on-surface-variant">Available</span>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="w-4 h-4 rounded-full border-2 border-primary inline-block bg-gradient-to-r from-primary from-50% to-transparent to-50%"></span>
							<span class="text-xs text-on-surface-variant">Held</span>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="w-4 h-4 rounded-full bg-primary inline-block"></span>
							<span class="text-xs text-on-surface-variant">Booked</span>
						</div>
					</div>
				</div>

				<!-- Venue Colors -->
				{#if venuesWithDates.length > 0}
					<div>
						<span class="font-mono text-[10px] uppercase tracking-widest text-zinc-400 block mb-2">Venues</span>
						<div class="flex flex-wrap items-center gap-3">
							{#each venuesWithDates as venue, i}
								{@const color = venueColors[venues.indexOf(venue) % venueColors.length]}
								{@const isVisible = visibleVenues.has(venue.id)}
								<button
									onclick={() => toggleVenueFilter(venue.id)}
									class="flex items-center gap-1.5 text-xs transition cursor-pointer {isVisible ? 'text-on-surface' : 'text-on-surface-variant/40'}"
								>
									<span
										class="w-3 h-3 rounded-full inline-block shrink-0 transition-opacity"
										style="background-color: {color}; {isVisible ? '' : 'opacity: 0.3;'}"
									></span>
									{venue.name}
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Pricing Tiers -->
				<div>
					<span class="font-mono text-[10px] uppercase tracking-widest text-zinc-400 block mb-2">Pricing Tiers</span>
					<div class="flex items-center gap-3">
						<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-tertiary-fixed text-tertiary text-[11px] font-semibold">
							<Star class="w-3 h-3" />
							PREMIUM
						</span>
						<span class="inline-flex items-center px-2.5 py-1 rounded-full bg-primary-fixed text-primary text-[11px] font-semibold">
							STANDARD
						</span>
						<span class="inline-flex items-center px-2.5 py-1 rounded-full bg-surface-highest text-on-surface-variant text-[11px] font-semibold">
							VALUE
						</span>
					</div>
				</div>

				<!-- Multi-Venue Availability -->
				{#if overlapDayCount > 0}
					<div class="ml-auto">
						<div class="flex items-center gap-2 bg-tertiary-fixed/30 rounded-xl px-4 py-2.5 ring-1 ring-tertiary-container/40">
							<Star class="w-4 h-4 text-tertiary" />
							<div>
								<span class="text-xs font-semibold text-tertiary">{overlapDayCount} overlap {overlapDayCount === 1 ? 'day' : 'days'}</span>
								<span class="text-[10px] text-tertiary/70 block">Multi-venue availability</span>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- 3-Month Calendar Grid -->
		<div class="grid {multiMonth ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1 max-w-lg mx-auto'} gap-5">
			{#each monthsToRender as mc}
				{@const days = buildCalendarDays(mc.year, mc.month)}
				{@const mLabel = new Date(mc.year, mc.month, 1).toLocaleDateString('en-US', { month: 'long' })}
				{@const season = seasonLabels[mc.month]}
				<div class="bg-surface-lowest rounded-3xl overflow-hidden shadow-sm border border-outline-variant/10">
					<!-- Month header -->
					<div class="bg-surface-low px-5 py-3 flex items-center justify-between">
						<h3 class="text-sm font-bold text-on-surface">{mLabel} {mc.year}</h3>
						<span class="font-mono text-[10px] uppercase tracking-widest text-zinc-400">{season}</span>
					</div>

					<div class="p-4">
						<div class="grid grid-cols-7 gap-0">
							<!-- Day headers -->
							{#each weekdays as wd}
								<div class="text-center font-mono text-[10px] uppercase tracking-widest text-zinc-400 py-2">{wd}</div>
							{/each}

							<!-- Day cells -->
							{#each days as cell}
								{#if cell === null}
									<div class="aspect-square"></div>
								{:else}
									{@const entries = entriesForDay(mc.year, mc.month, cell)}
									{@const overlap = availableCount(mc.year, mc.month, cell) >= 2}
									{@const isSelected = selectedDay === cell && selectedMonthCtx.year === mc.year && selectedMonthCtx.month === mc.month}
									<button
										class="aspect-square flex flex-col items-center justify-center gap-0.5 rounded-lg transition-all cursor-pointer relative
											{entries.length > 0 ? 'hover:bg-surface-low' : ''}
											{overlap ? 'bg-tertiary-fixed/30 ring-1 ring-inset ring-tertiary-container/50' : ''}
											{isSelected ? 'ring-2 ring-primary bg-primary-fixed/30' : ''}"
										onclick={() => openDay(mc.year, mc.month, cell)}
										disabled={entries.length === 0}
										type="button"
									>
										<span class="font-mono text-xs text-on-surface/70">{cell}</span>
										{#if entries.length > 0}
											<div class="flex gap-0.5">
												{#each entries as entry}
													<span
														class="w-1.5 h-1.5 rounded-full inline-block shrink-0"
														style="background-color: {venueColors[entry.venueIndex % venueColors.length]};
															{entry.venueDate.status === 'available' ? 'opacity: 1;' : ''}
															{entry.venueDate.status === 'held' ? 'opacity: 0.6; box-shadow: inset 1px 0 0 0 white;' : ''}
															{entry.venueDate.status === 'booked' ? 'opacity: 0.35;' : ''}"
														title="{entry.venue.name} - {statusLabel(entry.venueDate.status)}"
													></span>
												{/each}
											</div>
										{/if}
									</button>
								{/if}
							{/each}
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Day Detail Section (inline below calendar) -->
		{#if selectedDay !== null && selectedEntries.length > 0}
			<div class="space-y-4">
				<div class="flex items-center gap-3">
					<h2 class="text-lg font-semibold text-on-surface">Details for: {selectedDateLabel}</h2>
					<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide
						{selectedDayOfWeek === 6 ? 'bg-tertiary-fixed text-tertiary' : selectedDayOfWeek === 0 || selectedDayOfWeek === 5 ? 'bg-primary-fixed text-primary' : 'bg-surface-highest text-on-surface-variant'}">
						{#if selectedDayOfWeek === 6}<Star class="w-3 h-3" />{/if}
						{selectedTierLabel}
					</span>
					<button onclick={() => { selectedDay = null; }} class="ml-auto text-on-surface-variant hover:text-on-surface cursor-pointer text-sm">
						Close
					</button>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
					{#each selectedEntries as entry}
						{@const color = venueColors[entry.venueIndex % venueColors.length]}
						{@const tier = entry.venueDate.pricing_tier}
						{@const shortTier = tierShortLabels[tier] ?? 'STANDARD'}
						<div class="bg-surface-lowest rounded-xl border border-outline-variant/10 shadow-sm overflow-hidden" style="border-left: 4px solid {color};">
							<div class="p-4 space-y-3">
								<div class="flex items-center justify-between">
									<h4 class="font-semibold text-on-surface text-sm">{entry.venue.name}</h4>
									<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase
										{shortTier === 'PREMIUM' ? 'bg-tertiary-fixed text-tertiary' : shortTier === 'STANDARD' ? 'bg-primary-fixed text-primary' : 'bg-surface-highest text-on-surface-variant'}">
										{shortTier}
									</span>
								</div>

								<div class="flex items-center gap-2 text-sm text-on-surface-variant">
									<span>{statusIcon(entry.venueDate.status)}</span>
									<span>{statusLabel(entry.venueDate.status)}</span>
								</div>

								{#if entry.venueDate.tier_price_adjustment !== 0}
									<div class="text-xs text-on-surface-variant">
										<span class="font-mono">Base rental adjustment: {entry.venueDate.tier_price_adjustment > 0 ? '+' : ''}{formatCurrency(entry.venueDate.tier_price_adjustment)}</span>
									</div>
								{/if}

								{#if entry.venueDate.notes}
									<p class="text-xs text-on-surface-variant/70 flex items-start gap-1.5">
										<Info class="w-3.5 h-3.5 mt-0.5 shrink-0" />
										{entry.venueDate.notes}
									</p>
								{/if}

								<button
									onclick={() => goto(`/venues/${entry.venue.id}`)}
									class="w-full mt-1 px-3 py-1.5 rounded-lg bg-surface-low text-on-surface-variant text-xs font-medium hover:bg-surface transition-colors cursor-pointer"
								>
									View venue details
								</button>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Venue Comparison Insights -->
		{#if selectedDay !== null && selectedEntries.length >= 2}
			<div class="bg-surface-lowest rounded-2xl border border-outline-variant/10 p-6 shadow-sm">
				<h3 class="text-sm font-bold text-on-surface mb-4 flex items-center gap-2">
					<Info class="w-4 h-4 text-primary" />
					Venue Comparison Insights
				</h3>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<!-- Cost Efficiency -->
					<div class="bg-secondary-container/20 rounded-xl p-4">
						<span class="font-mono text-[10px] uppercase tracking-widest text-zinc-400 block mb-2">Cost Efficiency</span>
						{#if selectedEntries.filter(e => e.venueDate.status === 'available').length > 0}
							{@const sorted = [...selectedEntries.filter(e => e.venueDate.status === 'available')].sort((a, b) => a.venueDate.tier_price_adjustment - b.venueDate.tier_price_adjustment)}
							<p class="text-sm text-on-surface">
								<span class="font-semibold">{sorted[0].venue.name}</span> has the lowest price adjustment
								<span class="font-mono text-xs text-primary">({sorted[0].venueDate.tier_price_adjustment >= 0 ? '+' : ''}{formatCurrency(sorted[0].venueDate.tier_price_adjustment)})</span>
							</p>
						{:else}
							<p class="text-xs text-on-surface-variant">No available venues to compare.</p>
						{/if}
					</div>

					<!-- Demand Alert -->
					<div class="bg-tertiary-fixed/20 rounded-xl p-4">
						<span class="font-mono text-[10px] uppercase tracking-widest text-zinc-400 block mb-2">Demand Alert</span>
						{#if selectedEntries.filter(e => e.venueDate.status !== 'available').length > 0}
							{@const heldOrBooked = selectedEntries.filter(e => e.venueDate.status !== 'available')}
							<p class="text-sm text-on-surface">
								<span class="font-semibold text-tertiary">{heldOrBooked.length}</span> {heldOrBooked.length === 1 ? 'venue is' : 'venues are'} held or booked on this date. Consider acting quickly.
							</p>
						{:else}
							<p class="text-sm text-on-surface">All venues are available. Great flexibility for this date!</p>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	{/if}
</div>

<!-- Day detail modal (kept for programmatic/keyboard access) -->
<Modal open={modalOpen} onclose={closeModal} title={selectedDateLabel}>
	{#if selectedEntries.length > 0}
		<div class="space-y-4">
			{#each selectedEntries as entry}
				{@const color = venueColors[entry.venueIndex % venueColors.length]}
				<div class="rounded-xl border border-outline-variant/20 p-4" style="border-left: 4px solid {color};">
					<div class="flex items-center gap-2 mb-2">
						<span class="w-3 h-3 rounded-full inline-block shrink-0" style="background-color: {color}"></span>
						<h4 class="font-semibold text-on-surface text-sm">{entry.venue.name}</h4>
					</div>
					<div class="flex flex-wrap items-center gap-2 text-sm">
						<Badge variant={tierBadgeVariants[entry.venueDate.pricing_tier] ?? 'neutral'}>
							{tierLabels[entry.venueDate.pricing_tier] ?? entry.venueDate.pricing_tier}
						</Badge>
						<span class="text-on-surface-variant">
							{statusIcon(entry.venueDate.status)}
							{statusLabel(entry.venueDate.status)}
						</span>
						{#if entry.venueDate.tier_price_adjustment !== 0}
							<span class="text-on-surface-variant/60 text-xs">
								({entry.venueDate.tier_price_adjustment > 0 ? '+' : ''}{formatCurrency(entry.venueDate.tier_price_adjustment)})
							</span>
						{/if}
					</div>
					{#if entry.venueDate.notes}
						<p class="text-xs text-on-surface-variant/60 mt-2 flex items-start gap-1.5">
							<Info class="w-3.5 h-3.5 mt-0.5 shrink-0" />
							{entry.venueDate.notes}
						</p>
					{/if}
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-on-surface-variant text-sm">No venue dates for this day.</p>
	{/if}
</Modal>
