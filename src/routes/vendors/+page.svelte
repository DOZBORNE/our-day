<script lang="ts">
	import { getVendors, createVendor, updateVendor, updateVendorLineItems, deleteVendor } from '$lib/stores/vendors.svelte';
	import { getVenues } from '$lib/stores/venues.svelte';
	import { formatCurrency } from '$lib/utils/formatters';
	import { genId } from '$lib/utils/defaults';
	import type { Vendor, LineItem, CostCategoryType } from '$lib/types';
	import { COST_CATEGORY_LABELS, ALL_CATEGORY_TYPES } from '$lib/types';
	import { showToast } from '$lib/components/ui/Toast.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { Plus, Search, Mail, Phone, X, Trash2, Edit, ChevronDown } from 'lucide-svelte';

	// --- State ---
	let showAddModal = $state(false);
	let showDeleteModal = $state(false);
	let expandedVendorId = $state<string | null>(null);
	let vendorToDelete = $state<Vendor | null>(null);
	let searchQuery = $state('');
	let activeCategory = $state<CostCategoryType | 'all'>('all');

	// Form state for add/edit modal
	let formName = $state('');
	let formCategory = $state<CostCategoryType>('miscellaneous');
	let formContactInfo = $state('');
	let formNotes = $state('');
	let formLineItems = $state<LineItem[]>([]);
	let editingVendorId = $state<string | null>(null);
	let saving = $state(false);

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

	let vendorVenueMap = $derived.by(() => {
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

	let filteredVendors = $derived.by(() => {
		let result = vendors;
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			result = result.filter(
				(v) =>
					v.name.toLowerCase().includes(q) ||
					v.contact_info.toLowerCase().includes(q) ||
					v.notes.toLowerCase().includes(q)
			);
		}
		if (activeCategory !== 'all') {
			result = result.filter((v) => v.category === activeCategory);
		}
		return result;
	});

	let groupedVendors = $derived.by(() => {
		const groups = new Map<CostCategoryType, Vendor[]>();
		for (const v of filteredVendors) {
			const list = groups.get(v.category) ?? [];
			list.push(v);
			groups.set(v.category, list);
		}
		return groups;
	});

	// Unique categories that have vendors (for filter pills)
	let usedCategories = $derived.by(() => {
		const cats = new Set<CostCategoryType>();
		for (const v of vendors) {
			cats.add(v.category);
		}
		return ALL_CATEGORY_TYPES.filter((c) => cats.has(c));
	});

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
				group_size: 1,
				percentage_target: null,
				included: true,
				applicable: true,
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
		saving = true;
		try {
			if (editingVendorId) {
				await updateVendor(editingVendorId, {
					name: formName,
					category: formCategory,
					contact_info: formContactInfo,
					notes: formNotes
				});
				await updateVendorLineItems(editingVendorId, formLineItems);
				showToast('Vendor updated');
			} else {
				await createVendor({
					name: formName,
					category: formCategory,
					contact_info: formContactInfo,
					notes: formNotes,
					line_items: formLineItems
				});
				showToast('Vendor added');
			}
			showAddModal = false;
			resetForm();
		} catch {
			showToast('Failed to save vendor', 'error');
		} finally {
			saving = false;
		}
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

	function parseContact(info: string): { emails: string[]; phones: string[]; other: string[] } {
		const parts = info.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean);
		const emails: string[] = [];
		const phones: string[] = [];
		const other: string[] = [];
		for (const p of parts) {
			if (p.includes('@')) emails.push(p);
			else if (/[\d\-().+]{7,}/.test(p)) phones.push(p);
			else other.push(p);
		}
		return { emails, phones, other };
	}
</script>

<!-- Header -->
<div class="max-w-5xl mx-auto px-4 py-10">
	<div class="flex items-end justify-between mb-10">
		<div>
			<h1 class="text-4xl font-bold tracking-tight text-on-surface">Vendors Portfolio</h1>
			<p class="text-on-surface-variant mt-1.5">{vendors.length} vendor{vendors.length !== 1 ? 's' : ''} in your portfolio</p>
		</div>
		<button
			onclick={openAddModal}
			class="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-primary-container text-on-primary px-5 py-2.5 rounded-xl font-medium text-sm shadow-sm hover:shadow-md transition-shadow cursor-pointer"
		>
			<Plus size={16} />
			Add Vendor
		</button>
	</div>

	<!-- Search & Filter Bar -->
	<div class="mb-8 space-y-4">
		<div class="relative">
			<Search size={18} class="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
			<input
				type="text"
				placeholder="Search vendors..."
				bind:value={searchQuery}
				class="w-full bg-surface-highest border-none rounded-xl pl-11 pr-4 py-3 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/30"
			/>
		</div>

		{#if usedCategories.length > 0}
			<div class="flex flex-wrap gap-2">
				<button
					onclick={() => (activeCategory = 'all')}
					class="px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer {activeCategory === 'all'
						? 'bg-secondary-container text-on-secondary-container'
						: 'bg-surface-low text-on-surface-variant hover:bg-surface'}"
				>
					All
				</button>
				{#each usedCategories as cat}
					<button
						onclick={() => (activeCategory = activeCategory === cat ? 'all' : cat)}
						class="px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer {activeCategory === cat
							? 'bg-secondary-container text-on-secondary-container'
							: 'bg-surface-low text-on-surface-variant hover:bg-surface'}"
					>
						{COST_CATEGORY_LABELS[cat]}
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Vendor Content -->
	{#if vendors.length === 0}
		<div class="bg-surface-lowest rounded-xl p-16 text-center">
			<p class="text-outline text-lg mb-4">No vendors yet</p>
			<button
				onclick={openAddModal}
				class="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-primary-container text-on-primary px-5 py-2.5 rounded-xl font-medium text-sm cursor-pointer"
			>
				<Plus size={16} />
				Add Your First Vendor
			</button>
		</div>
	{:else if filteredVendors.length === 0}
		<div class="bg-surface-lowest rounded-xl p-16 text-center">
			<p class="text-outline text-lg">No vendors match your search</p>
		</div>
	{:else}
		{#each ALL_CATEGORY_TYPES as categoryType}
			{@const categoryVendors = groupedVendors.get(categoryType)}
			{#if categoryVendors && categoryVendors.length > 0}
				<div class="mb-10">
					<!-- Category heading with divider -->
					<div class="flex items-center gap-4 mb-5">
						<h2 class="text-xl font-bold text-on-surface whitespace-nowrap">{COST_CATEGORY_LABELS[categoryType]}</h2>
						<div class="flex-1 h-px bg-outline-variant"></div>
						<span class="font-mono text-xs text-outline whitespace-nowrap">{categoryVendors.length} vendor{categoryVendors.length !== 1 ? 's' : ''}</span>
					</div>

					<!-- 2-col grid -->
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						{#each categoryVendors as vendor (vendor.id)}
							{@render vendorCard(vendor)}
						{/each}
					</div>
				</div>
			{:else if activeCategory === categoryType || activeCategory === 'all'}
				{#if activeCategory === categoryType}
					<div class="mb-10">
						<div class="flex items-center gap-4 mb-5">
							<h2 class="text-xl font-bold text-on-surface whitespace-nowrap">{COST_CATEGORY_LABELS[categoryType]}</h2>
							<div class="flex-1 h-px bg-outline-variant"></div>
							<span class="font-mono text-xs text-outline">0</span>
						</div>
						<div class="bg-surface-lowest rounded-xl p-8 text-center">
							<p class="text-outline text-sm mb-2">No vendors assigned to this category yet</p>
							<button
								onclick={openAddModal}
								class="text-xs font-mono uppercase tracking-wider text-primary hover:text-primary-container transition-colors cursor-pointer"
							>
								+ Add {COST_CATEGORY_LABELS[categoryType]} Vendor
							</button>
						</div>
					</div>
				{/if}
			{/if}
		{/each}
	{/if}
</div>

<!-- Vendor Card Snippet -->
{#snippet vendorCard(vendor: Vendor)}
	{@const totalCost = vendorTotalCosts.get(vendor.id) ?? 0}
	{@const venueNames = vendorVenueMap.get(vendor.id) ?? []}
	{@const contact = parseContact(vendor.contact_info)}
	{@const lineItems = vendor.line_items ?? []}
	<div
		class="bg-surface-lowest rounded-xl p-6 border border-transparent hover:border-outline-variant/20 hover:shadow-sm transition-all cursor-pointer"
		onclick={() => toggleExpand(vendor.id)}
		role="button"
		tabindex="0"
		onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleExpand(vendor.id); }}
	>
		<!-- Name + category badge -->
		<div class="flex items-start justify-between mb-2">
			<h3 class="font-semibold text-on-surface text-base">{vendor.name}</h3>
			<span class="bg-secondary-container font-mono text-[10px] uppercase tracking-wider text-on-secondary-container px-2 py-0.5 rounded-md">
				{COST_CATEGORY_LABELS[vendor.category]}
			</span>
		</div>

		<!-- Notes/description -->
		{#if vendor.notes}
			<p class="text-sm text-on-surface-variant italic line-clamp-2 mb-3">{vendor.notes}</p>
		{/if}

		<!-- Contact info -->
		{#if vendor.contact_info}
			<div class="space-y-1 mb-3">
				{#each contact.emails as email}
					<div class="flex items-center gap-2 text-sm text-tertiary">
						<Mail size={14} />
						<span>{email}</span>
					</div>
				{/each}
				{#each contact.phones as phone}
					<div class="flex items-center gap-2 text-sm text-tertiary">
						<Phone size={14} />
						<span>{phone}</span>
					</div>
				{/each}
				{#each contact.other as info}
					<div class="flex items-center gap-2 text-sm text-tertiary">
						<span class="ml-5">{info}</span>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Line items section -->
		{#if lineItems.length > 0}
			<div class="bg-surface-low rounded-lg p-4 mt-2">
				<span class="font-mono text-[10px] uppercase tracking-wider text-outline mb-2 block">Line Items</span>
				<div class="space-y-1">
					{#each lineItems as item}
						<div class="flex items-center justify-between text-sm">
							<span class="text-on-surface">{item.name || 'Unnamed item'}</span>
							<span class="font-mono text-on-surface-variant">
								{#if item.quantity > 1}<span class="text-xs text-outline mr-1">{item.quantity}x</span>{/if}
								{formatCurrency(item.cost * item.quantity)}
							</span>
						</div>
					{/each}
				</div>
				<div class="border-t border-outline-variant/40 mt-2 pt-2 flex justify-between">
					<span class="text-sm font-bold text-primary">Estimated Total</span>
					<span class="text-sm font-bold text-primary font-mono">{formatCurrency(totalCost)}</span>
				</div>
			</div>
		{/if}

		<!-- Linked venues -->
		{#if venueNames.length > 0}
			<div class="flex flex-wrap gap-1 mt-3">
				{#each venueNames as venueName}
					<span class="text-xs bg-surface-low text-on-surface-variant px-2 py-0.5 rounded-full">{venueName}</span>
				{/each}
			</div>
		{/if}

		<!-- Expanded actions -->
		{#if expandedVendorId === vendor.id}
			<div class="border-t border-outline-variant/30 mt-4 pt-4 flex gap-2" onclick={(e) => e.stopPropagation()}>
				<button
					onclick={() => openEditModal(vendor)}
					class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-surface-low text-on-surface-variant hover:bg-surface transition-colors cursor-pointer"
				>
					<Edit size={14} />
					Edit
				</button>
				<button
					onclick={() => confirmDelete(vendor)}
					class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-error/10 text-error hover:bg-error/20 transition-colors cursor-pointer"
				>
					<Trash2 size={14} />
					Delete
				</button>
			</div>
		{/if}
	</div>
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
			<div class="flex items-center justify-between mb-3">
				<div>
					<span class="block text-sm font-medium text-on-surface">Line Items</span>
					<span class="text-xs text-on-surface-variant">Add individual costs for this vendor</span>
				</div>
				<button
					onclick={addLineItem}
					class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary-fixed/30 hover:bg-primary-fixed/50 rounded-lg transition-colors cursor-pointer"
				>
					<Plus size={14} />
					Add Item
				</button>
			</div>

			{#if formLineItems.length === 0}
				<div class="rounded-xl border border-dashed border-outline-variant/40 bg-surface-low p-8 text-center">
					<p class="text-sm text-outline mb-1">No line items yet</p>
					<p class="text-xs text-outline-variant">Click "Add Item" to add costs like catering per plate, setup fees, etc.</p>
				</div>
			{:else}
				<div class="space-y-3">
					{#each formLineItems as item, idx}
						<div class="rounded-xl border border-outline-variant/30 bg-surface-low p-4 space-y-3">
							<div class="flex items-center justify-between">
								<span class="text-xs text-on-surface-variant font-mono uppercase tracking-wider">Item {idx + 1}</span>
								<button onclick={() => removeLineItem(item.id)} class="p-1 rounded-lg hover:bg-error/10 text-outline hover:text-error transition-colors cursor-pointer" aria-label="Remove line item">
									<X size={14} />
								</button>
							</div>

							<Input label="Item Name" placeholder="e.g. Plated dinner, Setup fee, DJ package" bind:value={formLineItems[idx].name} />

							<div class="grid grid-cols-2 gap-3">
								<Input label="Unit Cost ($)" type="number" step="0.01" min="0" placeholder="0.00" bind:value={formLineItems[idx].cost} />
								<Input label="Quantity" type="number" min="1" placeholder="1" bind:value={formLineItems[idx].quantity} />
							</div>

							<Select label="Pricing Type" bind:value={formLineItems[idx].calculation_type}>
								<option value="flat">Flat Rate — fixed cost regardless of guest count</option>
								<option value="per-person">Per Person — multiplied by guest count</option>
								<option value="percentage">Percentage — calculated as % of subtotal</option>
							</Select>

							<label class="flex items-center gap-2.5 text-sm text-on-surface-variant cursor-pointer pt-1">
								<input type="checkbox" bind:checked={formLineItems[idx].included} class="rounded border-outline-variant text-primary focus:ring-primary/50" />
								<span>Include in cost estimate</span>
							</label>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	{#snippet footer()}
		<Button variant="ghost" onclick={() => { showAddModal = false; resetForm(); }}>Cancel</Button>
		<Button onclick={handleSave} disabled={!formName.trim() || saving}>{saving ? 'Saving...' : editingVendorId ? 'Save Changes' : 'Add Vendor'}</Button>
	{/snippet}
</Modal>

<!-- Delete Confirmation Modal -->
<Modal open={showDeleteModal} onclose={() => { showDeleteModal = false; vendorToDelete = null; }} title="Delete Vendor">
	{#if vendorToDelete}
		<p class="text-on-surface">
			Are you sure you want to delete <strong>{vendorToDelete.name}</strong>? This action cannot be undone.
		</p>
		{@const linkedVenues = vendorVenueMap.get(vendorToDelete.id) ?? []}
		{#if linkedVenues.length > 0}
			<div class="mt-3 p-3 bg-error-container rounded-lg">
				<p class="text-sm text-error font-medium">This vendor is currently used in:</p>
				<ul class="text-sm text-on-surface-variant mt-1 list-disc list-inside">
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
