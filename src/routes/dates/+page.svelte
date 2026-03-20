<script lang="ts">
	import { getVenues } from '$lib/stores/venues.svelte';
	import { formatCurrency } from '$lib/utils/formatters';
	import type { Venue, VenueDate } from '$lib/types';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';

	const venueColors = ['#D4A0A0', '#9CAF88', '#C9A96E', '#8BB0C9', '#B8A0D4', '#D4B896'];

	const tierColors: Record<string, string> = {
		saturday: '#E8A0A0',
		'friday-sunday': '#E8D49A',
		weekday: '#A8C89A'
	};

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

	let venues = $derived(getVenues());

	// Current month navigation
	const now = new Date();
	let currentYear = $state(now.getFullYear());
	let currentMonth = $state(now.getMonth());

	let monthLabel = $derived(
		new Date(currentYear, currentMonth, 1).toLocaleDateString('en-US', {
			month: 'long',
			year: 'numeric'
		})
	);

	function prevMonth() {
		if (currentMonth === 0) {
			currentMonth = 11;
			currentYear--;
		} else {
			currentMonth--;
		}
	}

	function nextMonth() {
		if (currentMonth === 11) {
			currentMonth = 0;
			currentYear++;
		} else {
			currentMonth++;
		}
	}

	// Build calendar grid
	let calendarDays = $derived.by(() => {
		const firstDay = new Date(currentYear, currentMonth, 1);
		const lastDay = new Date(currentYear, currentMonth + 1, 0);
		const startDow = firstDay.getDay(); // 0=Sun
		const daysInMonth = lastDay.getDate();

		const cells: (number | null)[] = [];
		// Leading blanks
		for (let i = 0; i < startDow; i++) cells.push(null);
		// Day numbers
		for (let d = 1; d <= daysInMonth; d++) cells.push(d);
		// Trailing blanks to fill last row
		while (cells.length % 7 !== 0) cells.push(null);

		return cells;
	});

	// Index: dateStr -> array of { venue, venueIndex, venueDate }
	interface DayEntry {
		venue: Venue;
		venueIndex: number;
		venueDate: VenueDate;
	}

	let dateIndex = $derived.by(() => {
		const map = new Map<string, DayEntry[]>();
		venues.forEach((venue, vi) => {
			for (const vd of venue.venue_dates ?? []) {
				const key = vd.date; // expected YYYY-MM-DD
				if (!map.has(key)) map.set(key, []);
				map.get(key)!.push({ venue, venueIndex: vi, venueDate: vd });
			}
		});
		return map;
	});

	function dateKey(day: number): string {
		const m = String(currentMonth + 1).padStart(2, '0');
		const d = String(day).padStart(2, '0');
		return `${currentYear}-${m}-${d}`;
	}

	function entriesForDay(day: number): DayEntry[] {
		return dateIndex.get(dateKey(day)) ?? [];
	}

	function availableCount(day: number): number {
		return entriesForDay(day).filter((e) => e.venueDate.status === 'available').length;
	}

	// Has any venue dates at all
	let hasAnyDates = $derived(venues.some((v) => (v.venue_dates ?? []).length > 0));

	// Modal state
	let modalOpen = $state(false);
	let selectedDay = $state<number | null>(null);
	let selectedEntries = $derived(selectedDay !== null ? entriesForDay(selectedDay) : []);
	let selectedDateLabel = $derived(
		selectedDay !== null
			? new Date(currentYear, currentMonth, selectedDay).toLocaleDateString('en-US', {
					weekday: 'long',
					month: 'long',
					day: 'numeric',
					year: 'numeric'
				})
			: ''
	);

	function openDay(day: number) {
		const entries = entriesForDay(day);
		if (entries.length === 0) return;
		selectedDay = day;
		modalOpen = true;
	}

	function closeModal() {
		modalOpen = false;
		selectedDay = null;
	}

	function statusIcon(status: string): string {
		switch (status) {
			case 'available':
				return '\u25CB'; // open circle
			case 'held':
				return '\u25D1'; // half-filled
			case 'booked':
				return '\u25CF'; // filled circle
			default:
				return '\u25CB';
		}
	}

	function statusLabel(status: string): string {
		switch (status) {
			case 'available':
				return 'Available';
			case 'held':
				return 'Held';
			case 'booked':
				return 'Booked';
			default:
				return status;
		}
	}

	const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
</script>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-charcoal">Dates Overview</h1>
			<p class="text-charcoal/60 text-sm mt-1">
				Compare availability across all venues
			</p>
		</div>
	</div>

	{#if !hasAnyDates}
		<!-- Empty state -->
		<Card class="p-12 text-center">
			<div class="text-charcoal/30 mb-4">
				<svg viewBox="0 0 24 24" class="w-16 h-16 mx-auto fill-current">
					<path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 002 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM5 8V6h14v2H5zm2 4h5v5H7v-5z" />
				</svg>
			</div>
			<h2 class="text-lg font-semibold text-charcoal mb-2">No dates added yet</h2>
			<p class="text-charcoal/60 text-sm max-w-md mx-auto">
				Add available dates to your venues to see them all here on one calendar. Go to a venue's detail page and add dates in the Dates tab.
			</p>
		</Card>
	{:else}
		<!-- Month navigation -->
		<Card class="p-4">
			<div class="flex items-center justify-between">
				<Button variant="ghost" size="sm" onclick={prevMonth}>
					<svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
						<path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
					</svg>
					Prev
				</Button>
				<h2 class="text-lg font-semibold text-charcoal">{monthLabel}</h2>
				<Button variant="ghost" size="sm" onclick={nextMonth}>
					Next
					<svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
						<path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
					</svg>
				</Button>
			</div>
		</Card>

		<!-- Calendar grid -->
		<Card class="p-4 overflow-x-auto">
			<div class="grid grid-cols-7 gap-0 min-w-[560px]">
				<!-- Weekday headers -->
				{#each weekdays as wd}
					<div class="text-center text-xs font-medium text-charcoal/50 py-2 border-b border-rose-light/20">
						{wd}
					</div>
				{/each}

				<!-- Day cells -->
				{#each calendarDays as cell}
					{#if cell === null}
						<div class="min-h-[72px] border-b border-r border-rose-light/10"></div>
					{:else}
						{@const entries = entriesForDay(cell)}
						{@const overlap = availableCount(cell) >= 2}
						<button
							class="min-h-[72px] border-b border-r border-rose-light/10 p-1 text-left transition-colors cursor-pointer
								{entries.length > 0 ? 'hover:bg-rose-light/20' : ''}
								{overlap ? 'ring-2 ring-inset ring-gold/50 bg-gold-light/20' : ''}"
							onclick={() => openDay(cell)}
							disabled={entries.length === 0}
							type="button"
						>
							<span class="text-xs font-medium text-charcoal/70 block mb-1">{cell}</span>
							{#if entries.length > 0}
								<div class="flex flex-wrap gap-1">
									{#each entries as entry}
										<span
											class="w-2.5 h-2.5 rounded-full inline-block shrink-0"
											style="background-color: {venueColors[entry.venueIndex % venueColors.length]};
												{entry.venueDate.status === 'available' ? 'opacity: 1;' : ''}
												{entry.venueDate.status === 'held' ? 'opacity: 0.6; box-shadow: inset 2px 0 0 0 white;' : ''}
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
		</Card>

		<!-- Legend -->
		<Card class="p-4">
			<h3 class="text-sm font-semibold text-charcoal mb-3">Venue Legend</h3>
			<div class="flex flex-wrap gap-4">
				{#each venues as venue, i}
					{#if (venue.venue_dates ?? []).length > 0}
						<div class="flex items-center gap-2">
							<span
								class="w-3 h-3 rounded-full inline-block"
								style="background-color: {venueColors[i % venueColors.length]}"
							></span>
							<span class="text-xs text-charcoal/80">{venue.name}</span>
						</div>
					{/if}
				{/each}
			</div>
			<div class="flex flex-wrap gap-4 mt-3 pt-3 border-t border-rose-light/20">
				<div class="flex items-center gap-2">
					<span class="text-sm text-charcoal/60">{statusIcon('available')}</span>
					<span class="text-xs text-charcoal/60">Available</span>
				</div>
				<div class="flex items-center gap-2">
					<span class="text-sm text-charcoal/60">{statusIcon('held')}</span>
					<span class="text-xs text-charcoal/60">Held</span>
				</div>
				<div class="flex items-center gap-2">
					<span class="text-sm text-charcoal/60">{statusIcon('booked')}</span>
					<span class="text-xs text-charcoal/60">Booked</span>
				</div>
				<div class="flex items-center gap-2">
					<span class="w-4 h-4 rounded border-2 border-gold/50 bg-gold-light/20 inline-block"></span>
					<span class="text-xs text-charcoal/60">2+ venues available (overlap)</span>
				</div>
			</div>
		</Card>
	{/if}
</div>

<!-- Day detail modal -->
<Modal open={modalOpen} onclose={closeModal} title={selectedDateLabel}>
	{#if selectedEntries.length > 0}
		<div class="space-y-4">
			{#each selectedEntries as entry}
				{@const color = venueColors[entry.venueIndex % venueColors.length]}
				<div class="rounded-lg border border-rose-light/30 p-4">
					<div class="flex items-center gap-2 mb-2">
						<span
							class="w-3 h-3 rounded-full inline-block shrink-0"
							style="background-color: {color}"
						></span>
						<h4 class="font-semibold text-charcoal text-sm">{entry.venue.name}</h4>
					</div>
					<div class="flex flex-wrap items-center gap-2 text-sm">
						<Badge variant={tierBadgeVariants[entry.venueDate.pricing_tier] ?? 'neutral'}>
							{tierLabels[entry.venueDate.pricing_tier] ?? entry.venueDate.pricing_tier}
						</Badge>
						<span class="text-charcoal/60">
							{statusIcon(entry.venueDate.status)}
							{statusLabel(entry.venueDate.status)}
						</span>
						{#if entry.venueDate.tier_price_adjustment !== 0}
							<span class="text-charcoal/50 text-xs">
								({entry.venueDate.tier_price_adjustment > 0 ? '+' : ''}{formatCurrency(entry.venueDate.tier_price_adjustment)})
							</span>
						{/if}
					</div>
					{#if entry.venueDate.notes}
						<p class="text-xs text-charcoal/50 mt-2">{entry.venueDate.notes}</p>
					{/if}
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-charcoal/60 text-sm">No venue dates for this day.</p>
	{/if}
</Modal>
