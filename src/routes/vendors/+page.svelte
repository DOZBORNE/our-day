<script lang="ts">
	import { getVendors, createVendor, updateVendor, updateVendorLineItems, deleteVendor } from '$lib/stores/vendors.svelte';
	import { getVenues } from '$lib/stores/venues.svelte';
	import { formatCurrency } from '$lib/utils/formatters';
	import { genId } from '$lib/utils/defaults';
	import type { Vendor, LineItem, CostCategoryType } from '$lib/types';
	import { COST_CATEGORY_LABELS, ALL_CATEGORY_TYPES } from '$lib/types';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';

	// --- State ---
	let showAddModal = $state(false);
	let showDeleteModal = $state(false);
	let expandedVendorId = $state<string | null>(null);
	let vendorToDelete = $state<Vendor | null>(null);
	let groupByCategory = $state(true);

	// Form state for add/edit modal
	let formName = $state('');
	let formCategory = $state<CostCategoryType>('miscellaneous');
	let formContactInfo = $state('');
	let formNotes = $state('');
	let formLineItems = $state<LineItem[]>([]);
	let editingVendorId = $state<string | null>(null);

	// --- Derived ---
	let vendors = $derived(getVendors());
	let venues = $derived(getVenues());

	let vendorTotalCosts = $derived(
		new Map(
			vendors.map((v) => [
				v.id,
				(v.line_items ?? []).reduce((sum, li) => sum + li.cost * li.quantity, 0)
			])
		)
	);

	let vendorVenueMap = $derived(() => {
		const map = new Map<string, string[]>();
		for (const venue of venues) {
			for (const cat of venue.cost_categories ?? []) {
				if (cat.vendor_id) {
					const existing = map.get(cat.vendor_id) ?? [];
					if (!existing.includes(venue.name)) {
						existing.push(venue.name);
					}
					map.set(cat.vendor_id, existing);
				}
			}
		}
		return map;
	});

	let groupedVendors = $derived(() => {
		if (!groupByCategory) return null;
		const groups = new Map<CostCategoryType, Vendor[]>();
		for (const v of vendors) {
			const list = groups.get(v.category) ?? [];
			list.push(v);
			groups.set(v.category, list);
		}
		return groups;
	});

	// --- Badge variant helper ---
	function categoryBadgeVariant(category: CostCategoryType): 'sage' | 'gold' | 'rose' | 'neutral' {
		const sageCats: CostCategoryType[] = ['catering', 'bar', 'cake', 'staffing'];
		const goldCats: CostCategoryType[] = ['entertainment', 'decor-floral', 'photo-video', 'rental-upgrades', 'rentals-included'];
		const roseCats: CostCategoryType[] = ['planning', 'fees-taxes', 'venue-rental', 'time'];
		if (sageCats.includes(category)) return 'sage';
		if (goldCats.includes(category)) return 'gold';
		if (roseCats.includes(category)) return 'rose';
		return 'neutral';
	}

	// --- Form helpers ---
	function resetForm() {
		formName = '';
		formCategory = 'miscellaneous';
		formContactInfo = '';
		formNotes = '';
		formLineItems = [];
		editingVendorId = null;
	}

	function openAddModal() {
		resetForm();
		showAddModal = true;
	}

	function openEditModal(vendor: Vendor) {
		editingVendorId = vendor.id;
		formName = vendor.name;
		formCategory = vendor.category;
		formContactInfo = vendor.contact_info;
		formNotes = vendor.notes;
		formLineItems = (vendor.line_items ?? []).map((li) => ({ ...li }));
		showAddModal = true;
	}

	function addLineItem() {
		formLineItems = [
			...formLineItems,
			{
				id: genId(),
				category_id: null,
				vendor_id: null,
				name: '',
				cost: 0,
				quantity: 1,
				calculation_type: 'flat',
				included: true,
				notes: '',
				sort_order: formLineItems.length
			}
		];
	}

	function removeLineItem(id: string) {
		formLineItems = formLineItems.filter((li) => li.id !== id);
	}

	async function handleSave() {
		if (!formName.trim()) return;

		if (editingVendorId) {
			await updateVendor(editingVendorId, {
				name: formName,
				category: formCategory,
				contact_info: formContactInfo,
				notes: formNotes
			});
			await updateVendorLineItems(editingVendorId, formLineItems);
		} else {
			await createVendor({
				name: formName,
				category: formCategory,
				contact_info: formContactInfo,
				notes: formNotes,
				line_items: formLineItems
			});
		}
		showAddModal = false;
		resetForm();
	}

	function confirmDelete(vendor: Vendor) {
		vendorToDelete = vendor;
		showDeleteModal = true;
	}

	async function handleDelete() {
		if (!vendorToDelete) return;
		await deleteVendor(vendorToDelete.id);
		if (expandedVendorId === vendorToDelete.id) expandedVendorId = null;
		vendorToDelete = null;
		showDeleteModal = false;
	}

	function toggleExpand(vendorId: string) {
		expandedVendorId = expandedVendorId === vendorId ? null : vendorId;
	}
</script>

<!-- Header -->
<div class="max-w-6xl mx-auto px-4 py-8">
	<div class="flex items-center justify-between mb-8">
		<div>
			<h1 class="text-3xl font-bold text-charcoal">Vendor Library</h1>
			<p class="text-charcoal/60 mt-1">{vendors.length} vendor{vendors.length !== 1 ? 's' : ''} saved</p>
		</div>
		<div class="flex items-center gap-3">
			<label class="flex items-center gap-2 text-sm text-charcoal/70 cursor-pointer">
				<input type="checkbox" bind:checked={groupByCategory} class="rounded border-rose-light/50 text-rose focus:ring-rose/50" />
				Group by category
			</label>
			<Button onclick={openAddModal}>
				<svg viewBox="0 0 24 24" class="w-4 h-4 fill-current"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
				Add Vendor
			</Button>
		</div>
	</div>

	<!-- Vendor Grid -->
	{#if vendors.length === 0}
		<Card class="p-12 text-center">
			<div class="text-charcoal/40 mb-4">
				<svg viewBox="0 0 24 24" class="w-16 h-16 mx-auto fill-current"><path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/></svg>
			</div>
			<p class="text-charcoal/60 text-lg mb-4">No vendors yet</p>
			<Button onclick={openAddModal}>Add Your First Vendor</Button>
		</Card>
	{:else if groupByCategory}
		{@const groups = groupedVendors()}
		{#each ALL_CATEGORY_TYPES as categoryType}
			{@const categoryVendors = groups.get(categoryType)}
			{#if categoryVendors && categoryVendors.length > 0}
				<div class="mb-8">
					<div class="flex items-center gap-2 mb-4">
						<Badge variant={categoryBadgeVariant(categoryType)}>{COST_CATEGORY_LABELS[categoryType]}</Badge>
						<span class="text-sm text-charcoal/50">{categoryVendors.length}</span>
					</div>
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{#each categoryVendors as vendor (vendor.id)}
							{@render vendorCard(vendor)}
						{/each}
					</div>
				</div>
			{/if}
		{/each}
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each vendors as vendor (vendor.id)}
				{@render vendorCard(vendor)}
			{/each}
		</div>
	{/if}
</div>

<!-- Vendor Card Snippet -->
{#snippet vendorCard(vendor: Vendor)}
	{@const totalCost = vendorTotalCosts.get(vendor.id) ?? 0}
	{@const venueNames = vendorVenueMap().get(vendor.id) ?? []}
	<Card hover class="flex flex-col" onclick={() => toggleExpand(vendor.id)}>
		<div class="p-4">
			<div class="flex items-start justify-between mb-2">
				<h3 class="font-semibold text-charcoal text-base">{vendor.name}</h3>
				<Badge variant={categoryBadgeVariant(vendor.category)}>{COST_CATEGORY_LABELS[vendor.category]}</Badge>
			</div>

			<p class="text-lg font-bold text-rose mb-1">{formatCurrency(totalCost)}</p>

			{#if vendor.notes}
				<p class="text-sm text-charcoal/60 line-clamp-2 mb-2">{vendor.notes}</p>
			{/if}

			{#if venueNames.length > 0}
				<div class="flex flex-wrap gap-1 mt-2">
					{#each venueNames as venueName}
						<span class="text-xs bg-sage-light text-sage px-2 py-0.5 rounded-full">{venueName}</span>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Expanded Details -->
		{#if expandedVendorId === vendor.id}
			<div class="border-t border-rose-light/30 px-4 py-4 space-y-4" onclick={(e) => e.stopPropagation()}>
				{#if vendor.contact_info}
					<div>
						<span class="text-xs font-medium text-charcoal/50 uppercase tracking-wider">Contact</span>
						<p class="text-sm text-charcoal mt-0.5">{vendor.contact_info}</p>
					</div>
				{/if}

				{#if (vendor.line_items ?? []).length > 0}
					<div>
						<span class="text-xs font-medium text-charcoal/50 uppercase tracking-wider">Line Items</span>
						<div class="mt-2 space-y-1.5">
							{#each vendor.line_items ?? [] as item}
								<div class="flex items-center justify-between text-sm">
									<div class="flex items-center gap-2">
										<span class="text-charcoal">{item.name || 'Unnamed item'}</span>
										{#if !item.included}
											<span class="text-xs text-charcoal/40 italic">excluded</span>
										{/if}
									</div>
									<div class="flex items-center gap-2 text-charcoal/70">
										{#if item.quantity > 1}
											<span class="text-xs">{item.quantity}x</span>
										{/if}
										<span>{formatCurrency(item.cost * item.quantity)}</span>
										{#if item.calculation_type !== 'flat'}
											<span class="text-xs text-charcoal/40">({item.calculation_type})</span>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				{#if venueNames.length > 0}
					<div>
						<span class="text-xs font-medium text-charcoal/50 uppercase tracking-wider">Used in Venues</span>
						<p class="text-sm text-charcoal mt-0.5">{venueNames.join(', ')}</p>
					</div>
				{/if}

				<div class="flex gap-2 pt-2">
					<Button size="sm" variant="outline" onclick={() => openEditModal(vendor)}>Edit</Button>
					<Button size="sm" variant="danger" onclick={() => confirmDelete(vendor)}>Delete</Button>
				</div>
			</div>
		{/if}
	</Card>
{/snippet}

<!-- Add/Edit Vendor Modal -->
<Modal open={showAddModal} onclose={() => { showAddModal = false; resetForm(); }} title={editingVendorId ? 'Edit Vendor' : 'Add Vendor'}>
	<div class="space-y-4">
		<Input label="Name" placeholder="Vendor name" bind:value={formName} />

		<Select label="Category" bind:value={formCategory}>
			{#each ALL_CATEGORY_TYPES as cat}
				<option value={cat}>{COST_CATEGORY_LABELS[cat]}</option>
			{/each}
		</Select>

		<Input label="Contact Info" placeholder="Phone, email, or website" bind:value={formContactInfo} />

		<Textarea label="Notes" placeholder="Additional notes about this vendor..." bind:value={formNotes} />

		<!-- Line Items -->
		<div>
			<div class="flex items-center justify-between mb-2">
				<span class="block text-sm font-medium text-charcoal">Line Items</span>
				<Button size="sm" variant="ghost" onclick={addLineItem}>
					<svg viewBox="0 0 24 24" class="w-3.5 h-3.5 fill-current"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
					Add Item
				</Button>
			</div>

			{#if formLineItems.length === 0}
				<p class="text-sm text-charcoal/40 text-center py-4">No line items yet</p>
			{:else}
				<div class="space-y-3">
					{#each formLineItems as item, idx}
						<div class="rounded-lg border border-rose-light/30 bg-cream/50 p-3 space-y-2">
							<div class="flex items-center justify-between">
								<span class="text-xs text-charcoal/50 font-medium">Item {idx + 1}</span>
								<button onclick={() => removeLineItem(item.id)} class="p-1 rounded hover:bg-rose-light text-charcoal/40 hover:text-rose transition-colors cursor-pointer" aria-label="Remove line item">
									<svg viewBox="0 0 24 24" class="w-4 h-4 fill-current"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
								</button>
							</div>
							<Input placeholder="Item name" bind:value={formLineItems[idx].name} />
							<div class="grid grid-cols-3 gap-2">
								<Input type="number" placeholder="Cost" bind:value={formLineItems[idx].cost} />
								<Input type="number" placeholder="Qty" bind:value={formLineItems[idx].quantity} />
								<Select bind:value={formLineItems[idx].calculation_type}>
									<option value="flat">Flat</option>
									<option value="per-person">Per Person</option>
									<option value="percentage">Percentage</option>
								</Select>
							</div>
							<label class="flex items-center gap-2 text-sm text-charcoal/70 cursor-pointer">
								<input type="checkbox" bind:checked={formLineItems[idx].included} class="rounded border-rose-light/50 text-rose focus:ring-rose/50" />
								Included in total
							</label>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	{#snippet footer()}
		<Button variant="ghost" onclick={() => { showAddModal = false; resetForm(); }}>Cancel</Button>
		<Button onclick={handleSave} disabled={!formName.trim()}>{editingVendorId ? 'Save Changes' : 'Add Vendor'}</Button>
	{/snippet}
</Modal>

<!-- Delete Confirmation Modal -->
<Modal open={showDeleteModal} onclose={() => { showDeleteModal = false; vendorToDelete = null; }} title="Delete Vendor">
	{#if vendorToDelete}
		<p class="text-charcoal">
			Are you sure you want to delete <strong>{vendorToDelete.name}</strong>? This action cannot be undone.
		</p>
		{@const linkedVenues = vendorVenueMap().get(vendorToDelete.id) ?? []}
		{#if linkedVenues.length > 0}
			<div class="mt-3 p-3 bg-rose-light/30 rounded-lg">
				<p class="text-sm text-rose font-medium">This vendor is currently used in:</p>
				<ul class="text-sm text-charcoal/70 mt-1 list-disc list-inside">
					{#each linkedVenues as vName}
						<li>{vName}</li>
					{/each}
				</ul>
			</div>
		{/if}
	{/if}

	{#snippet footer()}
		<Button variant="ghost" onclick={() => { showDeleteModal = false; vendorToDelete = null; }}>Cancel</Button>
		<Button variant="danger" onclick={handleDelete}>Delete</Button>
	{/snippet}
</Modal>
