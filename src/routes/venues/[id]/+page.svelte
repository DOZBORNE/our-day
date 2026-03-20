<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import {
		getVenueById,
		updateVenue,
		updateCostCategory,
		updateLineItem,
		addLineItem,
		removeLineItem,
		addVenueDate,
		updateVenueDate,
		removeVenueDate,
		updateContract,
		addPaymentMilestone,
		updatePaymentMilestone,
		removePaymentMilestone,
		assignVendorToCategory,
		detachVendorFromCategory
	} from '$lib/stores/venues.svelte';
	import { getVendors, getVendorsByCategory } from '$lib/stores/vendors.svelte';
	import { getBudget } from '$lib/stores/budget.svelte';
	import {
		calculateLineItemTotal,
		calculateCategoryTotal,
		calculateVenueSubtotal,
		calculateFeesAndTaxes,
		calculateGrandTotal
	} from '$lib/utils/calculations';
	import {
		formatCurrency,
		formatDate,
		getDayOfWeek,
		detectPricingTier,
		tierLabel,
		tierColor
	} from '$lib/utils/formatters';
	import { genId } from '$lib/utils/defaults';
	import type {
		Venue,
		CostCategory,
		LineItem,
		VenueDate,
		VenueType,
		CostCategoryType,
		PricingTier,
		DateStatus
	} from '$lib/types';
	import { COST_CATEGORY_LABELS } from '$lib/types';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import StarRating from '$lib/components/ui/StarRating.svelte';

	// ── State ──
	let activeTab = $state<number>(0);
	let venue = $state<Venue | undefined>(undefined);

	const tabs = ['Basic Info', 'Pricing & Costs', 'Available Dates', 'Contract & Policies', 'Notes'];

	// ── Load venue reactively ──
	$effect(() => {
		const id = $page.params.id;
		if (id) venue = getVenueById(id);
	});

	// ── Budget ──
	let budget = $derived(getBudget());
	let guestCount = $derived(budget.guest_count);

	// ── Tab 2: Pricing state ──
	let expandedCategories = $state<Set<string>>(new Set());

	function toggleCategory(catId: string) {
		const next = new Set(expandedCategories);
		if (next.has(catId)) next.delete(catId);
		else next.add(catId);
		expandedCategories = next;
	}

	let categories = $derived(venue?.cost_categories ?? []);
	let subtotal = $derived(calculateVenueSubtotal(categories, guestCount));
	let fees = $derived(calculateFeesAndTaxes(categories, guestCount));
	let grandTotal = $derived(calculateGrandTotal(categories, guestCount));

	// ── Tab 3: Calendar state ──
	let calendarYear = $state(new Date().getFullYear());
	let calendarMonth = $state(new Date().getMonth());
	let dateModalOpen = $state(false);
	let editingDate = $state<VenueDate | null>(null);
	let editingDateStr = $state('');

	function prevMonth() {
		if (calendarMonth === 0) {
			calendarMonth = 11;
			calendarYear--;
		} else {
			calendarMonth--;
		}
	}

	function nextMonth() {
		if (calendarMonth === 11) {
			calendarMonth = 0;
			calendarYear++;
		} else {
			calendarMonth++;
		}
	}

	let calendarDays = $derived.by(() => {
		const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
		const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
		const days: (number | null)[] = [];
		for (let i = 0; i < firstDay; i++) days.push(null);
		for (let d = 1; d <= daysInMonth; d++) days.push(d);
		return days;
	});

	let venueDatesMap = $derived.by(() => {
		const map = new Map<string, VenueDate>();
		for (const vd of venue?.venue_dates ?? []) {
			map.set(vd.date, vd);
		}
		return map;
	});

	function dateStr(day: number): string {
		const m = String(calendarMonth + 1).padStart(2, '0');
		const d = String(day).padStart(2, '0');
		return `${calendarYear}-${m}-${d}`;
	}

	function dayTierColor(day: number): string {
		const ds = dateStr(day);
		const tier = detectPricingTier(ds);
		if (tier === 'saturday') return 'bg-tier-saturday/30';
		if (tier === 'friday-sunday') return 'bg-tier-frisun/30';
		return 'bg-tier-weekday/30';
	}

	function openDateModal(day: number) {
		if (!venue) return;
		const ds = dateStr(day);
		editingDateStr = ds;
		const existing = venueDatesMap.get(ds);
		if (existing) {
			editingDate = { ...existing };
		} else {
			const tier = detectPricingTier(ds);
			editingDate = {
				id: genId(),
				venue_id: venue.id,
				date: ds,
				day_of_week: getDayOfWeek(ds),
				pricing_tier: tier,
				tier_price_adjustment: 0,
				status: 'available' as DateStatus,
				notes: ''
			};
		}
		dateModalOpen = true;
	}

	function saveDateEntry() {
		if (!venue || !editingDate) return;
		const existing = venueDatesMap.get(editingDateStr);
		if (existing) {
			updateVenueDate(venue.id, existing.id, editingDate);
		} else {
			addVenueDate(venue.id, editingDate);
		}
		dateModalOpen = false;
		editingDate = null;
	}

	function deleteDateEntry() {
		if (!venue || !editingDate) return;
		const existing = venueDatesMap.get(editingDateStr);
		if (existing) {
			removeVenueDate(venue.id, existing.id);
		}
		dateModalOpen = false;
		editingDate = null;
	}

	// ── Helpers ──
	const monthNames = [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'
	];
	const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	function handleVenueBlur(field: string, value: unknown) {
		if (!venue) return;
		updateVenue(venue.id, { [field]: value });
	}

	function handleCategoryToggle(catId: string, field: 'included_in_venue' | 'required_through_venue', value: boolean) {
		if (!venue) return;
		updateCostCategory(venue.id, catId, { [field]: value });
	}

	function handleLineItemBlur(catId: string, itemId: string, field: string, value: unknown) {
		if (!venue) return;
		updateLineItem(venue.id, catId, itemId, { [field]: value });
	}

	function handleAddLineItem(catId: string) {
		if (!venue) return;
		const cat = categories.find((c) => c.id === catId);
		const sortOrder = cat?.line_items?.length ?? 0;
		const item: LineItem = {
			id: genId(),
			category_id: catId,
			vendor_id: null,
			name: 'New Item',
			cost: 0,
			quantity: 1,
			calculation_type: 'flat',
			included: true,
			notes: '',
			sort_order: sortOrder
		};
		addLineItem(venue.id, catId, item);
	}

	function handleRemoveLineItem(catId: string, itemId: string) {
		if (!venue) return;
		removeLineItem(venue.id, catId, itemId);
	}

	function handleAssignVendor(catId: string, vendorId: string) {
		if (!venue || !vendorId) return;
		const allVendors = getVendors();
		const vendor = allVendors.find((v) => v.id === vendorId);
		if (!vendor) return;
		assignVendorToCategory(venue.id, catId, vendorId, vendor.line_items ?? []);
	}

	function handleDetachVendor(catId: string) {
		if (!venue) return;
		detachVendorFromCategory(venue.id, catId);
	}

	// Tab 4: Contract helpers
	function handleContractBlur(field: string, value: unknown) {
		if (!venue) return;
		updateContract(venue.id, { [field]: value });
	}

	function handleAddMilestone() {
		if (!venue?.contract) return;
		const milestone = {
			id: genId(),
			contract_id: venue.contract.id,
			description: '',
			amount: 0,
			due_date: '',
			paid: false
		};
		addPaymentMilestone(venue.id, milestone);
	}

	function handleMilestoneBlur(msId: string, field: string, value: unknown) {
		if (!venue) return;
		updatePaymentMilestone(venue.id, msId, { [field]: value });
	}

	function handleRemoveMilestone(msId: string) {
		if (!venue) return;
		removePaymentMilestone(venue.id, msId);
	}

	// Tab 5: Notes helpers
	function addPro() {
		if (!venue) return;
		updateVenue(venue.id, { pros: [...venue.pros, ''] });
	}

	function updatePro(idx: number, val: string) {
		if (!venue) return;
		const pros = [...venue.pros];
		pros[idx] = val;
		updateVenue(venue.id, { pros });
	}

	function removePro(idx: number) {
		if (!venue) return;
		const pros = venue.pros.filter((_, i) => i !== idx);
		updateVenue(venue.id, { pros });
	}

	function addCon() {
		if (!venue) return;
		updateVenue(venue.id, { cons: [...venue.cons, ''] });
	}

	function updateCon(idx: number, val: string) {
		if (!venue) return;
		const cons = [...venue.cons];
		cons[idx] = val;
		updateVenue(venue.id, { cons });
	}

	function removeCon(idx: number) {
		if (!venue) return;
		const cons = venue.cons.filter((_, i) => i !== idx);
		updateVenue(venue.id, { cons });
	}

	// External links stored in notes as JSON array in a separate field
	// We'll store them in venue.notes as a secondary section
	let externalLinks = $state<string[]>([]);

	$effect(() => {
		if (venue) {
			// Try to parse links from a delimiter in notes
			// We'll use a simple approach: store links in a reactive local array
			// and sync on blur
			externalLinks = [];
		}
	});

	function addLink() {
		externalLinks = [...externalLinks, ''];
	}

	function updateLink(idx: number, val: string) {
		externalLinks[idx] = val;
	}

	function removeLink(idx: number) {
		externalLinks = externalLinks.filter((_, i) => i !== idx);
	}

	function getVendorName(vendorId: string | null): string {
		if (!vendorId) return '';
		const allVendors = getVendors();
		const vendor = allVendors.find((v) => v.id === vendorId);
		return vendor?.name ?? 'Unknown Vendor';
	}

	function statusDot(status: DateStatus): string {
		switch (status) {
			case 'available': return 'bg-sage';
			case 'held': return 'bg-gold';
			case 'booked': return 'bg-rose';
			default: return 'bg-charcoal/30';
		}
	}
</script>

{#if !venue}
	<div class="max-w-4xl mx-auto p-8">
		<Card class="p-8 text-center">
			<h2 class="text-xl font-semibold text-charcoal mb-4">Venue not found</h2>
			<p class="text-charcoal/60 mb-6">The venue you're looking for doesn't exist or has been removed.</p>
			<Button onclick={() => goto('/venues')}>Back to Venues</Button>
		</Card>
	</div>
{:else}
	<div class="max-w-6xl mx-auto px-4 py-6 pb-28">
		<!-- Header -->
		<div class="flex items-center gap-4 mb-6">
			<button
				onclick={() => goto('/venues')}
				class="p-2 rounded-lg hover:bg-cream text-charcoal/60 transition cursor-pointer"
			>
				<svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
					<path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
				</svg>
			</button>
			<div class="flex-1">
				<h1 class="text-2xl font-bold text-charcoal">{venue.name || 'Untitled Venue'}</h1>
				{#if venue.location}
					<p class="text-sm text-charcoal/60">{venue.location}</p>
				{/if}
			</div>
			<Badge variant={venue.venue_type === 'all-inclusive' ? 'rose' : venue.venue_type === 'semi-inclusive' ? 'gold' : 'sage'}>
				{venue.venue_type === 'all-inclusive' ? 'All-Inclusive' : venue.venue_type === 'semi-inclusive' ? 'Semi-Inclusive' : 'Open Vendor'}
			</Badge>
		</div>

		<!-- Tab Navigation -->
		<div class="flex border-b border-rose-light/30 mb-6 overflow-x-auto">
			{#each tabs as tab, i}
				<button
					onclick={() => activeTab = i}
					class="px-5 py-3 text-sm font-medium whitespace-nowrap transition cursor-pointer
						{activeTab === i
							? 'text-rose border-b-2 border-rose'
							: 'text-charcoal/60 hover:text-charcoal hover:bg-cream/50 border-b-2 border-transparent'}"
				>
					{tab}
				</button>
			{/each}
		</div>

		<!-- Tab Content -->

		<!-- ═══════════════════════════════════════════ -->
		<!-- TAB 1: BASIC INFO                          -->
		<!-- ═══════════════════════════════════════════ -->
		{#if activeTab === 0}
			<div class="space-y-6">
				<Card class="p-6">
					<h3 class="text-lg font-semibold text-charcoal mb-4">General Information</h3>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Input
							label="Venue Name"
							value={venue.name}
							onblur={(e) => handleVenueBlur('name', e.currentTarget.value)}
						/>
						<Input
							label="Location"
							value={venue.location}
							onblur={(e) => handleVenueBlur('location', e.currentTarget.value)}
						/>
						<div class="md:col-span-2">
							<Textarea
								label="Description"
								value={venue.description}
								onblur={(e) => handleVenueBlur('description', e.currentTarget.value)}
							/>
						</div>
						<div class="md:col-span-2">
							<Textarea
								label="Contact Info"
								value={venue.contact_info}
								rows={2}
								onblur={(e) => handleVenueBlur('contact_info', e.currentTarget.value)}
							/>
						</div>
					</div>
				</Card>

				<Card class="p-6">
					<h3 class="text-lg font-semibold text-charcoal mb-4">Capacity & Type</h3>
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
						<Input
							label="Seated Capacity"
							type="number"
							value={venue.capacity_seated}
							onblur={(e) => handleVenueBlur('capacity_seated', Number(e.currentTarget.value))}
						/>
						<Input
							label="Standing Capacity"
							type="number"
							value={venue.capacity_standing}
							onblur={(e) => handleVenueBlur('capacity_standing', Number(e.currentTarget.value))}
						/>
						<Select
							label="Venue Type"
							value={venue.venue_type}
							onchange={(e) => handleVenueBlur('venue_type', e.currentTarget.value)}
						>
							<option value="all-inclusive">All-Inclusive</option>
							<option value="semi-inclusive">Semi-Inclusive</option>
							<option value="open-vendor">Open Vendor</option>
						</Select>
					</div>
					<div class="flex gap-6 mt-4">
						<label class="flex items-center gap-2 cursor-pointer">
							<input
								type="checkbox"
								checked={venue.indoor}
								onchange={(e) => handleVenueBlur('indoor', e.currentTarget.checked)}
								class="w-4 h-4 rounded border-rose-light/50 text-rose focus:ring-rose/50 cursor-pointer"
							/>
							<span class="text-sm text-charcoal">Indoor</span>
						</label>
						<label class="flex items-center gap-2 cursor-pointer">
							<input
								type="checkbox"
								checked={venue.outdoor}
								onchange={(e) => handleVenueBlur('outdoor', e.currentTarget.checked)}
								class="w-4 h-4 rounded border-rose-light/50 text-rose focus:ring-rose/50 cursor-pointer"
							/>
							<span class="text-sm text-charcoal">Outdoor</span>
						</label>
					</div>
				</Card>

				<Card class="p-6">
					<h3 class="text-lg font-semibold text-charcoal mb-4">Additional Details</h3>
					<div class="space-y-4">
						<Textarea
							label="Weather Backup"
							value={venue.weather_backup}
							onblur={(e) => handleVenueBlur('weather_backup', e.currentTarget.value)}
						/>
						<Textarea
							label="Parking Info"
							value={venue.parking_info}
							onblur={(e) => handleVenueBlur('parking_info', e.currentTarget.value)}
						/>
						<Textarea
							label="Accessibility Notes"
							value={venue.accessibility_notes}
							onblur={(e) => handleVenueBlur('accessibility_notes', e.currentTarget.value)}
						/>
					</div>
				</Card>
			</div>

		<!-- ═══════════════════════════════════════════ -->
		<!-- TAB 2: PRICING & COSTS                     -->
		<!-- ═══════════════════════════════════════════ -->
		{:else if activeTab === 1}
			<div class="space-y-3">
				{#each categories as category (category.id)}
					{@const catTotal = calculateCategoryTotal(category, guestCount)}
					{@const isExpanded = expandedCategories.has(category.id)}
					{@const canAssignVendor = venue.venue_type !== 'all-inclusive' && !category.required_through_venue}
					{@const matchingVendors = getVendorsByCategory(category.type)}

					<Card class="overflow-hidden">
						<!-- Category Header -->
						<button
							onclick={() => toggleCategory(category.id)}
							class="w-full flex items-center justify-between px-5 py-3.5 hover:bg-cream/50 transition cursor-pointer"
						>
							<div class="flex items-center gap-3">
								<svg
									viewBox="0 0 24 24"
									class="w-4 h-4 fill-charcoal/50 transition-transform {isExpanded ? 'rotate-90' : ''}"
								>
									<path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
								</svg>
								<span class="font-medium text-charcoal">{category.name}</span>
								{#if category.vendor_id}
									<Badge variant="sage">{getVendorName(category.vendor_id)}</Badge>
								{/if}
								{#if category.included_in_venue}
									<Badge variant="gold">Included</Badge>
								{/if}
							</div>
							<span class="font-semibold text-charcoal tabular-nums">
								{formatCurrency(catTotal)}
							</span>
						</button>

						<!-- Expanded Content -->
						{#if isExpanded}
							<div class="border-t border-rose-light/30 px-5 py-4 space-y-4">
								<!-- Category toggles -->
								<div class="flex flex-wrap gap-4 pb-3 border-b border-rose-light/20">
									<label class="flex items-center gap-2 cursor-pointer">
										<input
											type="checkbox"
											checked={category.included_in_venue}
											onchange={(e) => handleCategoryToggle(category.id, 'included_in_venue', e.currentTarget.checked)}
											class="w-4 h-4 rounded border-rose-light/50 text-rose focus:ring-rose/50 cursor-pointer"
										/>
										<span class="text-sm text-charcoal">Included in Venue</span>
									</label>
									<label class="flex items-center gap-2 cursor-pointer">
										<input
											type="checkbox"
											checked={category.required_through_venue}
											onchange={(e) => handleCategoryToggle(category.id, 'required_through_venue', e.currentTarget.checked)}
											class="w-4 h-4 rounded border-rose-light/50 text-rose focus:ring-rose/50 cursor-pointer"
										/>
										<span class="text-sm text-charcoal">Required Through Venue</span>
									</label>

									<!-- Vendor assignment -->
									{#if canAssignVendor}
										<div class="flex items-center gap-2 ml-auto">
											{#if category.vendor_id}
												<Button variant="ghost" size="sm" onclick={() => handleDetachVendor(category.id)}>
													Detach Vendor
												</Button>
											{:else if matchingVendors.length > 0}
												<select
													class="text-xs rounded-lg border border-rose-light/50 bg-warm-white px-2 py-1.5 text-charcoal focus:outline-none focus:ring-2 focus:ring-rose/50 cursor-pointer"
													onchange={(e) => {
														handleAssignVendor(category.id, e.currentTarget.value);
														e.currentTarget.value = '';
													}}
													value=""
												>
													<option value="">Assign Vendor...</option>
													{#each matchingVendors as v}
														<option value={v.id}>{v.name}</option>
													{/each}
												</select>
											{/if}
										</div>
									{/if}
								</div>

								<!-- Line items table -->
								{#if category.line_items && category.line_items.length > 0}
									<div class="overflow-x-auto">
										<table class="w-full text-sm">
											<thead>
												<tr class="text-left text-charcoal/60 border-b border-rose-light/20">
													<th class="pb-2 pr-2 font-medium">Item</th>
													<th class="pb-2 px-2 font-medium w-28">Cost ($)</th>
													<th class="pb-2 px-2 font-medium w-20">Qty</th>
													<th class="pb-2 px-2 font-medium w-32">Type</th>
													<th class="pb-2 px-2 font-medium w-16 text-center">Incl.</th>
													<th class="pb-2 px-2 font-medium w-32">Notes</th>
													<th class="pb-2 pl-2 font-medium w-20 text-right">Total</th>
													<th class="pb-2 w-8"></th>
												</tr>
											</thead>
											<tbody>
												{#each category.line_items as item (item.id)}
													{@const itemTotal = calculateLineItemTotal(item, guestCount, subtotal)}
													<tr class="border-b border-rose-light/10 last:border-0">
														<td class="py-1.5 pr-2">
															<input
																type="text"
																value={item.name}
																class="w-full bg-transparent text-sm text-charcoal border-0 border-b border-transparent hover:border-rose-light/50 focus:border-rose focus:outline-none px-0 py-0.5 transition"
																onblur={(e) => handleLineItemBlur(category.id, item.id, 'name', e.currentTarget.value)}
															/>
														</td>
														<td class="py-1.5 px-2">
															<input
																type="number"
																value={item.cost}
																step="0.01"
																min="0"
																class="w-full bg-transparent text-sm text-charcoal border-0 border-b border-transparent hover:border-rose-light/50 focus:border-rose focus:outline-none px-0 py-0.5 transition tabular-nums"
																onblur={(e) => handleLineItemBlur(category.id, item.id, 'cost', Number(e.currentTarget.value))}
															/>
														</td>
														<td class="py-1.5 px-2">
															<input
																type="number"
																value={item.quantity}
																min="0"
																class="w-full bg-transparent text-sm text-charcoal border-0 border-b border-transparent hover:border-rose-light/50 focus:border-rose focus:outline-none px-0 py-0.5 transition tabular-nums"
																onblur={(e) => handleLineItemBlur(category.id, item.id, 'quantity', Number(e.currentTarget.value))}
															/>
														</td>
														<td class="py-1.5 px-2">
															<select
																value={item.calculation_type}
																class="w-full bg-transparent text-xs text-charcoal border-0 border-b border-transparent hover:border-rose-light/50 focus:border-rose focus:outline-none px-0 py-0.5 cursor-pointer transition"
																onchange={(e) => handleLineItemBlur(category.id, item.id, 'calculation_type', e.currentTarget.value)}
															>
																<option value="flat">Flat</option>
																<option value="per-person">Per Person</option>
																<option value="percentage">Percentage</option>
															</select>
														</td>
														<td class="py-1.5 px-2 text-center">
															<input
																type="checkbox"
																checked={item.included}
																onchange={(e) => handleLineItemBlur(category.id, item.id, 'included', e.currentTarget.checked)}
																class="w-4 h-4 rounded border-rose-light/50 text-rose focus:ring-rose/50 cursor-pointer"
															/>
														</td>
														<td class="py-1.5 px-2">
															<input
																type="text"
																value={item.notes}
																placeholder="..."
																class="w-full bg-transparent text-xs text-charcoal/70 border-0 border-b border-transparent hover:border-rose-light/50 focus:border-rose focus:outline-none px-0 py-0.5 transition"
																onblur={(e) => handleLineItemBlur(category.id, item.id, 'notes', e.currentTarget.value)}
															/>
														</td>
														<td class="py-1.5 pl-2 text-right tabular-nums text-charcoal/80">
															{formatCurrency(itemTotal)}
														</td>
														<td class="py-1.5 pl-1">
															<button
																onclick={() => handleRemoveLineItem(category.id, item.id)}
																class="p-1 rounded hover:bg-red-50 text-charcoal/30 hover:text-red-500 transition cursor-pointer"
																title="Remove item"
															>
																<svg viewBox="0 0 24 24" class="w-3.5 h-3.5 fill-current">
																	<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
																</svg>
															</button>
														</td>
													</tr>
												{/each}
											</tbody>
										</table>
									</div>
								{/if}

								<Button variant="ghost" size="sm" onclick={() => handleAddLineItem(category.id)}>
									<svg viewBox="0 0 24 24" class="w-4 h-4 fill-current">
										<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
									</svg>
									Add Line Item
								</Button>
							</div>
						{/if}
					</Card>
				{/each}
			</div>

			<!-- Sticky Grand Total Bar -->
			<div class="fixed bottom-0 left-0 right-0 bg-warm-white border-t-2 border-rose/30 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-40">
				<div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
					<div class="flex items-center gap-6 text-sm text-charcoal/70">
						<span>Subtotal: <strong class="text-charcoal tabular-nums">{formatCurrency(subtotal)}</strong></span>
						{#if fees.serviceCharge > 0}
							<span>Service: <strong class="tabular-nums">{formatCurrency(fees.serviceCharge)}</strong></span>
						{/if}
						{#if fees.gratuity > 0}
							<span>Gratuity: <strong class="tabular-nums">{formatCurrency(fees.gratuity)}</strong></span>
						{/if}
						{#if fees.tax > 0}
							<span>Tax: <strong class="tabular-nums">{formatCurrency(fees.tax)}</strong></span>
						{/if}
						{#if fees.otherFees > 0}
							<span>Other: <strong class="tabular-nums">{formatCurrency(fees.otherFees)}</strong></span>
						{/if}
					</div>
					<div class="text-lg font-bold text-rose tabular-nums">
						Grand Total: {formatCurrency(grandTotal)}
					</div>
				</div>
			</div>

		<!-- ═══════════════════════════════════════════ -->
		<!-- TAB 3: AVAILABLE DATES                     -->
		<!-- ═══════════════════════════════════════════ -->
		{:else if activeTab === 2}
			<Card class="p-6">
				<!-- Month navigation -->
				<div class="flex items-center justify-between mb-6">
					<Button variant="ghost" size="sm" onclick={prevMonth}>
						<svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
							<path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
						</svg>
					</Button>
					<h3 class="text-lg font-semibold text-charcoal">
						{monthNames[calendarMonth]} {calendarYear}
					</h3>
					<Button variant="ghost" size="sm" onclick={nextMonth}>
						<svg viewBox="0 0 24 24" class="w-5 h-5 fill-current">
							<path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
						</svg>
					</Button>
				</div>

				<!-- Calendar grid -->
				<div class="grid grid-cols-7 gap-1">
					<!-- Day headers -->
					{#each dayHeaders as dh}
						<div class="text-center text-xs font-medium text-charcoal/50 py-2">{dh}</div>
					{/each}

					<!-- Day cells -->
					{#each calendarDays as day}
						{#if day === null}
							<div></div>
						{:else}
							{@const ds = dateStr(day)}
							{@const existingDate = venueDatesMap.get(ds)}
							<button
								onclick={() => openDateModal(day)}
								class="relative aspect-square rounded-lg p-1 text-sm transition cursor-pointer
									hover:ring-2 hover:ring-rose/50
									{dayTierColor(day)}"
							>
								<span class="font-medium">{day}</span>
								{#if existingDate}
									<div class="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
										<span class="w-2 h-2 rounded-full {statusDot(existingDate.status)}"></span>
									</div>
								{/if}
							</button>
						{/if}
					{/each}
				</div>

				<!-- Legend -->
				<div class="flex flex-wrap gap-4 mt-6 pt-4 border-t border-rose-light/30">
					<div class="flex items-center gap-2 text-xs text-charcoal/70">
						<span class="w-4 h-4 rounded bg-tier-saturday/30"></span>
						Saturday (Premium)
					</div>
					<div class="flex items-center gap-2 text-xs text-charcoal/70">
						<span class="w-4 h-4 rounded bg-tier-frisun/30"></span>
						Friday / Sunday
					</div>
					<div class="flex items-center gap-2 text-xs text-charcoal/70">
						<span class="w-4 h-4 rounded bg-tier-weekday/30"></span>
						Weekday
					</div>
					<div class="w-px bg-rose-light/30"></div>
					<div class="flex items-center gap-2 text-xs text-charcoal/70">
						<span class="w-2.5 h-2.5 rounded-full bg-sage"></span>
						Available
					</div>
					<div class="flex items-center gap-2 text-xs text-charcoal/70">
						<span class="w-2.5 h-2.5 rounded-full bg-gold"></span>
						Held
					</div>
					<div class="flex items-center gap-2 text-xs text-charcoal/70">
						<span class="w-2.5 h-2.5 rounded-full bg-rose"></span>
						Booked
					</div>
				</div>
			</Card>

			<!-- Date Modal -->
			<Modal open={dateModalOpen} onclose={() => { dateModalOpen = false; editingDate = null; }} title="Date Details">
				{#if editingDate}
					<div class="space-y-4">
						<div>
							<p class="text-sm font-medium text-charcoal mb-1">
								{formatDate(editingDate.date)} ({editingDate.day_of_week})
							</p>
							<Badge variant={editingDate.pricing_tier === 'saturday' ? 'saturday' : editingDate.pricing_tier === 'friday-sunday' ? 'frisun' : 'weekday'}>
								{tierLabel(editingDate.pricing_tier)}
							</Badge>
						</div>

						<Select
							label="Status"
							value={editingDate.status}
							onchange={(e) => { if (editingDate) editingDate.status = e.currentTarget.value as DateStatus; }}
						>
							<option value="available">Available</option>
							<option value="held">Held</option>
							<option value="booked">Booked</option>
						</Select>

						<Select
							label="Pricing Tier"
							value={editingDate.pricing_tier}
							onchange={(e) => { if (editingDate) editingDate.pricing_tier = e.currentTarget.value as PricingTier; }}
						>
							<option value="saturday">Saturday (Premium)</option>
							<option value="friday-sunday">Friday / Sunday</option>
							<option value="weekday">Weekday</option>
						</Select>

						<Input
							label="Tier Price Adjustment ($)"
							type="number"
							step="0.01"
							value={editingDate.tier_price_adjustment}
							onchange={(e) => { if (editingDate) editingDate.tier_price_adjustment = Number(e.currentTarget.value); }}
						/>

						<Textarea
							label="Notes"
							value={editingDate.notes}
							onchange={(e) => { if (editingDate) editingDate.notes = e.currentTarget.value; }}
						/>

						<div class="flex gap-3 justify-between pt-2">
							{#if venueDatesMap.has(editingDateStr)}
								<Button variant="danger" size="sm" onclick={deleteDateEntry}>
									Remove Date
								</Button>
							{:else}
								<div></div>
							{/if}
							<div class="flex gap-2">
								<Button variant="ghost" size="sm" onclick={() => { dateModalOpen = false; editingDate = null; }}>
									Cancel
								</Button>
								<Button size="sm" onclick={saveDateEntry}>
									Save
								</Button>
							</div>
						</div>
					</div>
				{/if}
			</Modal>

		<!-- ═══════════════════════════════════════════ -->
		<!-- TAB 4: CONTRACT & POLICIES                 -->
		<!-- ═══════════════════════════════════════════ -->
		{:else if activeTab === 3}
			{#if venue.contract}
				<div class="space-y-6">
					<Card class="p-6">
						<h3 class="text-lg font-semibold text-charcoal mb-4">Deposit</h3>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<Input
								label="Deposit Amount ($)"
								type="number"
								step="0.01"
								value={venue.contract.deposit_amount}
								onblur={(e) => handleContractBlur('deposit_amount', Number(e.currentTarget.value))}
							/>
							<Input
								label="Deposit Due Date"
								type="date"
								value={venue.contract.deposit_due_date}
								onblur={(e) => handleContractBlur('deposit_due_date', e.currentTarget.value)}
							/>
						</div>
					</Card>

					<Card class="p-6">
						<div class="flex items-center justify-between mb-4">
							<h3 class="text-lg font-semibold text-charcoal">Payment Milestones</h3>
							<Button variant="ghost" size="sm" onclick={handleAddMilestone}>
								<svg viewBox="0 0 24 24" class="w-4 h-4 fill-current">
									<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
								</svg>
								Add Milestone
							</Button>
						</div>

						{#if venue.contract.payment_milestones && venue.contract.payment_milestones.length > 0}
							<div class="space-y-3">
								{#each venue.contract.payment_milestones as ms (ms.id)}
									<div class="flex items-start gap-3 p-3 rounded-lg bg-cream/50 border border-rose-light/20">
										<input
											type="checkbox"
											checked={ms.paid}
											onchange={(e) => handleMilestoneBlur(ms.id, 'paid', e.currentTarget.checked)}
											class="w-4 h-4 mt-2 rounded border-rose-light/50 text-sage focus:ring-sage/50 cursor-pointer"
										/>
										<div class="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
											<Input
												label="Description"
												value={ms.description}
												onblur={(e) => handleMilestoneBlur(ms.id, 'description', e.currentTarget.value)}
											/>
											<Input
												label="Amount ($)"
												type="number"
												step="0.01"
												value={ms.amount}
												onblur={(e) => handleMilestoneBlur(ms.id, 'amount', Number(e.currentTarget.value))}
											/>
											<Input
												label="Due Date"
												type="date"
												value={ms.due_date}
												onblur={(e) => handleMilestoneBlur(ms.id, 'due_date', e.currentTarget.value)}
											/>
										</div>
										<button
											onclick={() => handleRemoveMilestone(ms.id)}
											class="p-1.5 rounded hover:bg-red-50 text-charcoal/30 hover:text-red-500 transition mt-6 cursor-pointer"
											title="Remove milestone"
										>
											<svg viewBox="0 0 24 24" class="w-4 h-4 fill-current">
												<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
											</svg>
										</button>
									</div>
								{/each}
							</div>
						{:else}
							<p class="text-sm text-charcoal/50 italic">No payment milestones added yet.</p>
						{/if}
					</Card>

					<Card class="p-6">
						<h3 class="text-lg font-semibold text-charcoal mb-4">Policies & Restrictions</h3>
						<div class="space-y-4">
							<Textarea
								label="Cancellation Policy"
								value={venue.contract.cancellation_policy}
								onblur={(e) => handleContractBlur('cancellation_policy', e.currentTarget.value)}
							/>
							<Textarea
								label="Force Majeure"
								value={venue.contract.force_majeure}
								onblur={(e) => handleContractBlur('force_majeure', e.currentTarget.value)}
							/>
							<Textarea
								label="Vendor Restrictions"
								value={venue.contract.vendor_restrictions}
								onblur={(e) => handleContractBlur('vendor_restrictions', e.currentTarget.value)}
							/>
							<Textarea
								label="Noise Restrictions"
								value={venue.contract.noise_restrictions}
								onblur={(e) => handleContractBlur('noise_restrictions', e.currentTarget.value)}
							/>
							<Textarea
								label="Time Restrictions"
								value={venue.contract.time_restrictions}
								onblur={(e) => handleContractBlur('time_restrictions', e.currentTarget.value)}
							/>
							<Textarea
								label="Decor Restrictions"
								value={venue.contract.decor_restrictions}
								onblur={(e) => handleContractBlur('decor_restrictions', e.currentTarget.value)}
							/>
							<Textarea
								label="Additional Notes"
								value={venue.contract.additional_notes}
								onblur={(e) => handleContractBlur('additional_notes', e.currentTarget.value)}
							/>
						</div>
					</Card>
				</div>
			{:else}
				<Card class="p-8 text-center">
					<p class="text-charcoal/60">No contract information available for this venue.</p>
				</Card>
			{/if}

		<!-- ═══════════════════════════════════════════ -->
		<!-- TAB 5: NOTES                               -->
		<!-- ═══════════════════════════════════════════ -->
		{:else if activeTab === 4}
			<div class="space-y-6">
				<!-- Rating -->
				<Card class="p-6">
					<h3 class="text-lg font-semibold text-charcoal mb-3">Rating</h3>
					<StarRating
						value={venue.rating}
						size="lg"
						onchange={(val) => handleVenueBlur('rating', val)}
					/>
				</Card>

				<!-- Pros -->
				<Card class="p-6">
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-lg font-semibold text-sage">Pros</h3>
						<Button variant="ghost" size="sm" onclick={addPro}>
							<svg viewBox="0 0 24 24" class="w-4 h-4 fill-current">
								<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
							</svg>
							Add
						</Button>
					</div>
					{#if venue.pros.length > 0}
						<div class="space-y-2">
							{#each venue.pros as pro, i}
								<div class="flex items-center gap-2">
									<svg viewBox="0 0 24 24" class="w-4 h-4 fill-sage flex-shrink-0">
										<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
									</svg>
									<input
										type="text"
										value={pro}
										class="flex-1 bg-transparent text-sm text-charcoal border-0 border-b border-transparent hover:border-sage-light focus:border-sage focus:outline-none px-0 py-1 transition"
										onblur={(e) => updatePro(i, e.currentTarget.value)}
									/>
									<button
										onclick={() => removePro(i)}
										class="p-1 rounded hover:bg-red-50 text-charcoal/30 hover:text-red-500 transition cursor-pointer"
									>
										<svg viewBox="0 0 24 24" class="w-3.5 h-3.5 fill-current">
											<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
										</svg>
									</button>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-sm text-charcoal/50 italic">No pros added yet.</p>
					{/if}
				</Card>

				<!-- Cons -->
				<Card class="p-6">
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-lg font-semibold text-rose">Cons</h3>
						<Button variant="ghost" size="sm" onclick={addCon}>
							<svg viewBox="0 0 24 24" class="w-4 h-4 fill-current">
								<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
							</svg>
							Add
						</Button>
					</div>
					{#if venue.cons.length > 0}
						<div class="space-y-2">
							{#each venue.cons as con, i}
								<div class="flex items-center gap-2">
									<svg viewBox="0 0 24 24" class="w-4 h-4 fill-rose flex-shrink-0">
										<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
									</svg>
									<input
										type="text"
										value={con}
										class="flex-1 bg-transparent text-sm text-charcoal border-0 border-b border-transparent hover:border-rose-light focus:border-rose focus:outline-none px-0 py-1 transition"
										onblur={(e) => updateCon(i, e.currentTarget.value)}
									/>
									<button
										onclick={() => removeCon(i)}
										class="p-1 rounded hover:bg-red-50 text-charcoal/30 hover:text-red-500 transition cursor-pointer"
									>
										<svg viewBox="0 0 24 24" class="w-3.5 h-3.5 fill-current">
											<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
										</svg>
									</button>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-sm text-charcoal/50 italic">No cons added yet.</p>
					{/if}
				</Card>

				<!-- Free-form notes -->
				<Card class="p-6">
					<h3 class="text-lg font-semibold text-charcoal mb-4">Notes</h3>
					<Textarea
						value={venue.notes}
						rows={6}
						placeholder="Add your notes about this venue..."
						onblur={(e) => handleVenueBlur('notes', e.currentTarget.value)}
					/>
				</Card>

				<!-- External links -->
				<Card class="p-6">
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-lg font-semibold text-charcoal">External Links</h3>
						<Button variant="ghost" size="sm" onclick={addLink}>
							<svg viewBox="0 0 24 24" class="w-4 h-4 fill-current">
								<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
							</svg>
							Add Link
						</Button>
					</div>
					{#if externalLinks.length > 0}
						<div class="space-y-2">
							{#each externalLinks as link, i}
								<div class="flex items-center gap-2">
									<svg viewBox="0 0 24 24" class="w-4 h-4 fill-charcoal/40 flex-shrink-0">
										<path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
									</svg>
									<input
										type="url"
										value={link}
										placeholder="https://..."
										class="flex-1 bg-transparent text-sm text-charcoal border-0 border-b border-transparent hover:border-rose-light/50 focus:border-rose focus:outline-none px-0 py-1 transition"
										onblur={(e) => updateLink(i, e.currentTarget.value)}
									/>
									{#if link}
										<a
											href={link}
											target="_blank"
											rel="noopener noreferrer"
											class="p-1 rounded hover:bg-cream text-charcoal/40 hover:text-rose transition"
										>
											<svg viewBox="0 0 24 24" class="w-3.5 h-3.5 fill-current">
												<path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
											</svg>
										</a>
									{/if}
									<button
										onclick={() => removeLink(i)}
										class="p-1 rounded hover:bg-red-50 text-charcoal/30 hover:text-red-500 transition cursor-pointer"
									>
										<svg viewBox="0 0 24 24" class="w-3.5 h-3.5 fill-current">
											<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
										</svg>
									</button>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-sm text-charcoal/50 italic">No external links added yet.</p>
					{/if}
				</Card>
			</div>
		{/if}
	</div>
{/if}
