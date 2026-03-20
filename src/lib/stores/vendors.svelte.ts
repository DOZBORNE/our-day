import { supabase } from '$lib/supabase';
import type { Vendor, LineItem } from '$lib/types';
import { genId } from '$lib/utils/defaults';

let vendors = $state<Vendor[]>([]);
let loaded = $state(false);

export function getVendors() {
	return vendors;
}

export function getVendorsLoaded() {
	return loaded;
}

export function getVendorById(id: string): Vendor | undefined {
	return vendors.find((v) => v.id === id);
}

export function getVendorsByCategory(category: string): Vendor[] {
	return vendors.filter((v) => v.category === category);
}

export async function loadVendors() {
	try {
		const { data, error } = await supabase
			.from('vendors')
			.select('*, line_items(*)')
			.order('created_at', { ascending: false });

		if (error) {
			console.error('Error loading vendors:', error);
		} else if (data) {
			vendors = data as Vendor[];
		}
	} catch {
		console.warn('Supabase not configured, using local vendors');
	}
	loaded = true;
}

export async function createVendor(vendor: Omit<Vendor, 'id' | 'created_at'>): Promise<Vendor> {
	const newVendor: Vendor = {
		...vendor,
		id: genId(),
		created_at: new Date().toISOString(),
		line_items: vendor.line_items || []
	};

	try {
		const { line_items, ...vendorData } = newVendor;
		const { data, error } = await supabase.from('vendors').insert(vendorData).select().single();

		if (error) {
			console.error('Error creating vendor:', error);
		} else if (data) {
			newVendor.id = data.id;
		}

		// Insert line items
		if (line_items && line_items.length > 0) {
			const items = line_items.map((li) => ({
				...li,
				id: genId(),
				vendor_id: newVendor.id,
				category_id: null
			}));
			await supabase.from('line_items').insert(items);
			newVendor.line_items = items;
		}
	} catch {
		// Local-only mode
	}

	vendors = [newVendor, ...vendors];
	return newVendor;
}

export async function updateVendor(id: string, updates: Partial<Vendor>) {
	const idx = vendors.findIndex((v) => v.id === id);
	if (idx === -1) return;

	vendors[idx] = { ...vendors[idx], ...updates };

	try {
		const { line_items, ...vendorData } = updates;
		if (Object.keys(vendorData).length > 0) {
			await supabase.from('vendors').update(vendorData).eq('id', id);
		}
	} catch {
		// Local-only mode
	}
}

export async function updateVendorLineItems(vendorId: string, items: LineItem[]) {
	const idx = vendors.findIndex((v) => v.id === vendorId);
	if (idx === -1) return;

	vendors[idx] = { ...vendors[idx], line_items: items };

	try {
		// Delete old items and insert new
		await supabase.from('line_items').delete().eq('vendor_id', vendorId);
		if (items.length > 0) {
			const dbItems = items.map((item) => ({
				...item,
				vendor_id: vendorId,
				category_id: null
			}));
			await supabase.from('line_items').insert(dbItems);
		}
	} catch {
		// Local-only mode
	}
}

export async function deleteVendor(id: string) {
	vendors = vendors.filter((v) => v.id !== id);

	try {
		await supabase.from('vendors').delete().eq('id', id);
	} catch {
		// Local-only mode
	}
}
