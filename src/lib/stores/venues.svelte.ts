import { supabase } from '$lib/supabase';
import type {
	Venue,
	CostCategory,
	LineItem,
	VenueDate,
	ContractInfo,
	PaymentMilestone
} from '$lib/types';
import { genId, createDefaultCategories, createDefaultContract } from '$lib/utils/defaults';

let venues = $state<Venue[]>([]);
let loaded = $state(false);

export function getVenues() {
	return venues;
}

export function getVenuesLoaded() {
	return loaded;
}

export function getVenueById(id: string): Venue | undefined {
	return venues.find((v) => v.id === id);
}

export async function loadVenues() {
	try {
		const { data, error } = await supabase
			.from('venues')
			.select(
				`
				*,
				cost_categories(*, line_items(*)),
				venue_dates(*),
				contracts(*, payment_milestones(*))
			`
			)
			.order('created_at', { ascending: false });

		if (error) {
			console.error('Error loading venues:', error);
		} else if (data) {
			venues = data.map((v: Record<string, unknown>) => ({
				...v,
				pros: (v.pros as string[]) || [],
				cons: (v.cons as string[]) || [],
				cost_categories: ((v.cost_categories as CostCategory[]) || []).sort(
					(a: CostCategory, b: CostCategory) => a.sort_order - b.sort_order
				),
				venue_dates: (v.venue_dates as VenueDate[]) || [],
				contract: Array.isArray(v.contracts)
					? (v.contracts as ContractInfo[])[0] || null
					: v.contracts || null
			})) as Venue[];
		}
	} catch {
		console.warn('Supabase not configured, using local venues');
	}
	loaded = true;
}

export async function createVenue(venueData: Partial<Venue> = {}): Promise<Venue> {
	const id = genId();
	const now = new Date().toISOString();

	const venue: Venue = {
		id,
		name: venueData.name || 'New Venue',
		location: venueData.location || '',
		description: '',
		contact_info: '',
		capacity_seated: 0,
		capacity_standing: 0,
		venue_type: venueData.venue_type || 'all-inclusive',
		indoor: true,
		outdoor: false,
		weather_backup: '',
		parking_info: '',
		accessibility_notes: '',
		pros: [],
		cons: [],
		rating: 0,
		notes: '',
		created_at: now,
		updated_at: now,
		cost_categories: createDefaultCategories(id),
		venue_dates: [],
		contract: createDefaultContract(id),
		...venueData
	};

	try {
		const {
			cost_categories,
			venue_dates,
			contract,
			...dbVenue
		} = venue;

		const { data, error } = await supabase.from('venues').insert(dbVenue).select().single();
		if (error) console.error('Error creating venue:', error);
		else if (data) venue.id = data.id;

		// Insert categories and their line items
		if (cost_categories) {
			for (const cat of cost_categories) {
				cat.venue_id = venue.id;
				const { line_items, ...catData } = cat;
				await supabase.from('cost_categories').insert(catData);
				if (line_items && line_items.length > 0) {
					await supabase.from('line_items').insert(
						line_items.map((li) => ({ ...li, category_id: cat.id }))
					);
				}
			}
		}

		// Insert contract
		if (contract) {
			contract.venue_id = venue.id;
			const { payment_milestones, ...contractData } = contract;
			await supabase.from('contracts').insert(contractData);
		}
	} catch {
		// Local-only mode
	}

	venues = [venue, ...venues];
	return venue;
}

export async function updateVenue(id: string, updates: Partial<Venue>) {
	const idx = venues.findIndex((v) => v.id === id);
	if (idx === -1) return;

	venues[idx] = {
		...venues[idx],
		...updates,
		updated_at: new Date().toISOString()
	};

	try {
		const { cost_categories, venue_dates, contract, ...dbUpdates } = updates;
		dbUpdates.updated_at = new Date().toISOString();
		await supabase.from('venues').update(dbUpdates).eq('id', id);
	} catch {
		// Local-only mode
	}
}

export async function deleteVenue(id: string) {
	venues = venues.filter((v) => v.id !== id);

	try {
		await supabase.from('venues').delete().eq('id', id);
	} catch {
		// Local-only mode
	}
}

// ── Cost Category Operations ──

export async function updateCostCategory(
	venueId: string,
	categoryId: string,
	updates: Partial<CostCategory>
) {
	const venue = venues.find((v) => v.id === venueId);
	if (!venue?.cost_categories) return;

	const catIdx = venue.cost_categories.findIndex((c) => c.id === categoryId);
	if (catIdx === -1) return;

	venue.cost_categories[catIdx] = { ...venue.cost_categories[catIdx], ...updates };

	try {
		const { line_items, ...catData } = updates;
		if (Object.keys(catData).length > 0) {
			await supabase.from('cost_categories').update(catData).eq('id', categoryId);
		}
	} catch {
		// Local-only
	}
}

export async function updateLineItem(
	venueId: string,
	categoryId: string,
	itemId: string,
	updates: Partial<LineItem>
) {
	const venue = venues.find((v) => v.id === venueId);
	if (!venue?.cost_categories) return;

	const cat = venue.cost_categories.find((c) => c.id === categoryId);
	if (!cat?.line_items) return;

	const itemIdx = cat.line_items.findIndex((li) => li.id === itemId);
	if (itemIdx === -1) return;

	cat.line_items[itemIdx] = { ...cat.line_items[itemIdx], ...updates };

	try {
		await supabase.from('line_items').update(updates).eq('id', itemId);
	} catch {
		// Local-only
	}
}

export async function addLineItem(venueId: string, categoryId: string, item: LineItem) {
	const venue = venues.find((v) => v.id === venueId);
	if (!venue?.cost_categories) return;

	const cat = venue.cost_categories.find((c) => c.id === categoryId);
	if (!cat) return;

	if (!cat.line_items) cat.line_items = [];
	cat.line_items = [...cat.line_items, item];

	try {
		await supabase.from('line_items').insert(item);
	} catch {
		// Local-only
	}
}

export async function removeLineItem(venueId: string, categoryId: string, itemId: string) {
	const venue = venues.find((v) => v.id === venueId);
	if (!venue?.cost_categories) return;

	const cat = venue.cost_categories.find((c) => c.id === categoryId);
	if (!cat?.line_items) return;

	cat.line_items = cat.line_items.filter((li) => li.id !== itemId);

	try {
		await supabase.from('line_items').delete().eq('id', itemId);
	} catch {
		// Local-only
	}
}

// ── Venue Date Operations ──

export async function addVenueDate(venueId: string, dateData: VenueDate) {
	const venue = venues.find((v) => v.id === venueId);
	if (!venue) return;

	if (!venue.venue_dates) venue.venue_dates = [];
	venue.venue_dates = [...venue.venue_dates, dateData];

	try {
		await supabase.from('venue_dates').insert(dateData);
	} catch {
		// Local-only
	}
}

export async function updateVenueDate(venueId: string, dateId: string, updates: Partial<VenueDate>) {
	const venue = venues.find((v) => v.id === venueId);
	if (!venue?.venue_dates) return;

	const idx = venue.venue_dates.findIndex((d) => d.id === dateId);
	if (idx === -1) return;

	venue.venue_dates[idx] = { ...venue.venue_dates[idx], ...updates };

	try {
		await supabase.from('venue_dates').update(updates).eq('id', dateId);
	} catch {
		// Local-only
	}
}

export async function removeVenueDate(venueId: string, dateId: string) {
	const venue = venues.find((v) => v.id === venueId);
	if (!venue?.venue_dates) return;

	venue.venue_dates = venue.venue_dates.filter((d) => d.id !== dateId);

	try {
		await supabase.from('venue_dates').delete().eq('id', dateId);
	} catch {
		// Local-only
	}
}

// ── Contract Operations ──

export async function updateContract(venueId: string, updates: Partial<ContractInfo>) {
	const venue = venues.find((v) => v.id === venueId);
	if (!venue) return;

	if (venue.contract) {
		venue.contract = { ...venue.contract, ...updates };
	}

	try {
		const { payment_milestones, ...contractData } = updates;
		if (Object.keys(contractData).length > 0 && venue.contract) {
			await supabase.from('contracts').update(contractData).eq('id', venue.contract.id);
		}
	} catch {
		// Local-only
	}
}

export async function addPaymentMilestone(venueId: string, milestone: PaymentMilestone) {
	const venue = venues.find((v) => v.id === venueId);
	if (!venue?.contract) return;

	if (!venue.contract.payment_milestones) venue.contract.payment_milestones = [];
	venue.contract.payment_milestones = [...venue.contract.payment_milestones, milestone];

	try {
		await supabase.from('payment_milestones').insert(milestone);
	} catch {
		// Local-only
	}
}

export async function updatePaymentMilestone(
	venueId: string,
	milestoneId: string,
	updates: Partial<PaymentMilestone>
) {
	const venue = venues.find((v) => v.id === venueId);
	if (!venue?.contract?.payment_milestones) return;

	const idx = venue.contract.payment_milestones.findIndex((m) => m.id === milestoneId);
	if (idx === -1) return;

	venue.contract.payment_milestones[idx] = {
		...venue.contract.payment_milestones[idx],
		...updates
	};

	try {
		await supabase.from('payment_milestones').update(updates).eq('id', milestoneId);
	} catch {
		// Local-only
	}
}

export async function removePaymentMilestone(venueId: string, milestoneId: string) {
	const venue = venues.find((v) => v.id === venueId);
	if (!venue?.contract?.payment_milestones) return;

	venue.contract.payment_milestones = venue.contract.payment_milestones.filter(
		(m) => m.id !== milestoneId
	);

	try {
		await supabase.from('payment_milestones').delete().eq('id', milestoneId);
	} catch {
		// Local-only
	}
}

// ── Vendor Assignment ──

export async function assignVendorToCategory(
	venueId: string,
	categoryId: string,
	vendorId: string,
	vendorLineItems: LineItem[]
) {
	const venue = venues.find((v) => v.id === venueId);
	if (!venue?.cost_categories) return;

	const cat = venue.cost_categories.find((c) => c.id === categoryId);
	if (!cat) return;

	cat.vendor_id = vendorId;

	// Copy vendor line items to category
	const newItems: LineItem[] = vendorLineItems.map((li) => ({
		...li,
		id: genId(),
		category_id: categoryId,
		vendor_id: null
	}));

	cat.line_items = newItems;

	try {
		await supabase.from('cost_categories').update({ vendor_id: vendorId }).eq('id', categoryId);
		// Remove old line items and insert copies
		await supabase.from('line_items').delete().eq('category_id', categoryId);
		if (newItems.length > 0) {
			await supabase.from('line_items').insert(newItems);
		}
	} catch {
		// Local-only
	}
}

export async function detachVendorFromCategory(venueId: string, categoryId: string) {
	const venue = venues.find((v) => v.id === venueId);
	if (!venue?.cost_categories) return;

	const cat = venue.cost_categories.find((c) => c.id === categoryId);
	if (!cat) return;

	cat.vendor_id = null;

	try {
		await supabase.from('cost_categories').update({ vendor_id: null }).eq('id', categoryId);
	} catch {
		// Local-only
	}
}
