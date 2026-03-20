import type { CostCategory, LineItem, CostCategoryType, Venue, ContractInfo } from '$lib/types';

let counter = 0;
export function genId(): string {
	return `local_${Date.now()}_${counter++}_${Math.random().toString(36).slice(2, 8)}`;
}

function li(
	categoryId: string,
	name: string,
	cost: number = 0,
	opts: Partial<LineItem> = {}
): LineItem {
	return {
		id: genId(),
		category_id: categoryId,
		vendor_id: null,
		name,
		cost,
		quantity: 1,
		calculation_type: 'flat',
		included: true,
		notes: '',
		sort_order: 0,
		...opts
	};
}

interface CategoryDef {
	type: CostCategoryType;
	name: string;
	items: { name: string; calc?: LineItem['calculation_type'] }[];
}

const CATEGORY_DEFS: CategoryDef[] = [
	{
		type: 'venue-rental',
		name: 'Venue Rental',
		items: [
			{ name: 'Base Rental Fee' },
			{ name: 'Ceremony Site Fee' },
			{ name: 'Setup Fee' },
			{ name: 'Teardown Fee' }
		]
	},
	{
		type: 'time',
		name: 'Time',
		items: [{ name: 'Hours Included' }, { name: 'Overtime Rate (per hour)' }]
	},
	{
		type: 'catering',
		name: 'Catering',
		items: [
			{ name: 'Per-Plate Cost', calc: 'per-person' },
			{ name: 'F&B Minimum' },
			{ name: 'Tasting Fee' },
			{ name: 'Late-Night Snacks' }
		]
	},
	{
		type: 'bar',
		name: 'Bar & Drinks',
		items: [
			{ name: 'Bar Package (per person)', calc: 'per-person' },
			{ name: 'Bartender Fees' }
		]
	},
	{
		type: 'cake',
		name: 'Cake & Dessert',
		items: [
			{ name: 'Cake Cost' },
			{ name: 'Cutting Fee (per person)', calc: 'per-person' },
			{ name: 'Dessert Station' }
		]
	},
	{
		type: 'staffing',
		name: 'Staffing',
		items: [
			{ name: 'Day-of Coordinator' },
			{ name: 'Servers' },
			{ name: 'Bartenders' },
			{ name: 'Security' },
			{ name: 'Valet Attendants' },
			{ name: 'AV Technician' }
		]
	},
	{
		type: 'rentals-included',
		name: 'Rentals Included',
		items: [
			{ name: 'Tables (qty)' },
			{ name: 'Chairs (qty)' },
			{ name: 'Linens' },
			{ name: 'Tableware' },
			{ name: 'Dance Floor' },
			{ name: 'AV Equipment' }
		]
	},
	{
		type: 'rental-upgrades',
		name: 'Rental Upgrades',
		items: [
			{ name: 'Chair Upgrade' },
			{ name: 'Table Upgrade' },
			{ name: 'Linen Upgrade' },
			{ name: 'Lighting Upgrade' },
			{ name: 'Specialty Items' }
		]
	},
	{
		type: 'decor-floral',
		name: 'Decor & Floral',
		items: [
			{ name: 'Florals' },
			{ name: 'Centerpieces' },
			{ name: 'Arch / Altar' },
			{ name: 'Aisle Decor' },
			{ name: 'Uplighting' },
			{ name: 'Signage' }
		]
	},
	{
		type: 'entertainment',
		name: 'Entertainment',
		items: [{ name: 'DJ / Band' }, { name: 'Photo Booth' }, { name: 'AV Rental' }]
	},
	{
		type: 'photo-video',
		name: 'Photo & Video',
		items: [{ name: 'Photographer' }, { name: 'Videographer' }]
	},
	{
		type: 'planning',
		name: 'Planning',
		items: [{ name: 'Wedding Planner' }, { name: 'Day-of Coordinator' }]
	},
	{
		type: 'fees-taxes',
		name: 'Fees & Taxes',
		items: [
			{ name: 'Service Charge', calc: 'percentage' },
			{ name: 'Gratuity', calc: 'percentage' },
			{ name: 'Tax', calc: 'percentage' },
			{ name: 'Admin Fee' },
			{ name: 'Event Insurance' },
			{ name: 'Damage Deposit' }
		]
	},
	{
		type: 'transportation',
		name: 'Transportation',
		items: [{ name: 'Valet Service' }, { name: 'Shuttle Service' }, { name: 'Guest Parking' }]
	},
	{
		type: 'miscellaneous',
		name: 'Miscellaneous',
		items: [{ name: 'Custom Item 1' }, { name: 'Custom Item 2' }]
	}
];

export function createDefaultCategories(venueId: string): CostCategory[] {
	return CATEGORY_DEFS.map((def, i) => {
		const catId = genId();
		return {
			id: catId,
			venue_id: venueId,
			name: def.name,
			type: def.type,
			included_in_venue: false,
			required_through_venue: false,
			vendor_id: null,
			sort_order: i,
			line_items: def.items.map((item, j) =>
				li(catId, item.name, 0, {
					calculation_type: item.calc || 'flat',
					sort_order: j,
					included: true
				})
			)
		};
	});
}

export function createDefaultVenue(): Venue {
	const id = genId();
	return {
		id,
		name: '',
		location: '',
		description: '',
		contact_info: '',
		capacity_seated: 0,
		capacity_standing: 0,
		venue_type: 'all-inclusive',
		indoor: true,
		outdoor: false,
		weather_backup: '',
		parking_info: '',
		accessibility_notes: '',
		pros: [],
		cons: [],
		rating: 0,
		notes: '',
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		cost_categories: createDefaultCategories(id),
		venue_dates: [],
		contract: createDefaultContract(id)
	};
}

export function createDefaultContract(venueId: string): ContractInfo {
	return {
		id: genId(),
		venue_id: venueId,
		deposit_amount: 0,
		deposit_due_date: '',
		cancellation_policy: '',
		force_majeure: '',
		vendor_restrictions: '',
		noise_restrictions: '',
		time_restrictions: '',
		decor_restrictions: '',
		additional_notes: '',
		payment_milestones: []
	};
}
