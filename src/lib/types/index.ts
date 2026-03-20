export type CostCategoryType =
	| 'venue-rental'
	| 'time'
	| 'catering'
	| 'bar'
	| 'cake'
	| 'staffing'
	| 'rentals-included'
	| 'rental-upgrades'
	| 'decor-floral'
	| 'entertainment'
	| 'photo-video'
	| 'planning'
	| 'fees-taxes'
	| 'transportation'
	| 'miscellaneous';

export type VenueType = 'all-inclusive' | 'semi-inclusive' | 'open-vendor';
export type CalculationType = 'flat' | 'per-person' | 'percentage';
export type PricingTier = 'saturday' | 'friday-sunday' | 'weekday';
export type DateStatus = 'available' | 'held' | 'booked';

export interface Vendor {
	id: string;
	name: string;
	category: CostCategoryType;
	contact_info: string;
	line_items?: LineItem[];
	notes: string;
	created_at: string;
}

export interface Venue {
	id: string;
	name: string;
	location: string;
	description: string;
	contact_info: string;
	capacity_seated: number;
	capacity_standing: number;
	venue_type: VenueType;
	indoor: boolean;
	outdoor: boolean;
	weather_backup: string;
	parking_info: string;
	accessibility_notes: string;
	pros: string[];
	cons: string[];
	rating: number;
	notes: string;
	created_at: string;
	updated_at: string;
	cost_categories?: CostCategory[];
	venue_dates?: VenueDate[];
	contract?: ContractInfo;
}

export interface CostCategory {
	id: string;
	venue_id: string;
	name: string;
	type: CostCategoryType;
	included_in_venue: boolean;
	required_through_venue: boolean;
	vendor_id: string | null;
	sort_order: number;
	line_items?: LineItem[];
}

export interface LineItem {
	id: string;
	category_id: string | null;
	vendor_id: string | null;
	name: string;
	cost: number;
	quantity: number;
	calculation_type: CalculationType;
	included: boolean;
	notes: string;
	sort_order: number;
}

export interface VenueDate {
	id: string;
	venue_id: string;
	date: string;
	day_of_week: string;
	pricing_tier: PricingTier;
	tier_price_adjustment: number;
	status: DateStatus;
	notes: string;
}

export interface ContractInfo {
	id: string;
	venue_id: string;
	deposit_amount: number;
	deposit_due_date: string;
	cancellation_policy: string;
	force_majeure: string;
	vendor_restrictions: string;
	noise_restrictions: string;
	time_restrictions: string;
	decor_restrictions: string;
	additional_notes: string;
	payment_milestones?: PaymentMilestone[];
}

export interface PaymentMilestone {
	id: string;
	contract_id: string;
	description: string;
	amount: number;
	due_date: string;
	paid: boolean;
}

export interface BudgetSettings {
	id: string;
	total_budget: number;
	guest_count: number;
}

export const COST_CATEGORY_LABELS: Record<CostCategoryType, string> = {
	'venue-rental': 'Venue Rental',
	time: 'Time',
	catering: 'Catering',
	bar: 'Bar & Drinks',
	cake: 'Cake & Dessert',
	staffing: 'Staffing',
	'rentals-included': 'Rentals Included',
	'rental-upgrades': 'Rental Upgrades',
	'decor-floral': 'Decor & Floral',
	entertainment: 'Entertainment',
	'photo-video': 'Photo & Video',
	planning: 'Planning',
	'fees-taxes': 'Fees & Taxes',
	transportation: 'Transportation',
	miscellaneous: 'Miscellaneous'
};

export const ALL_CATEGORY_TYPES: CostCategoryType[] = [
	'venue-rental',
	'time',
	'catering',
	'bar',
	'cake',
	'staffing',
	'rentals-included',
	'rental-upgrades',
	'decor-floral',
	'entertainment',
	'photo-video',
	'planning',
	'fees-taxes',
	'transportation',
	'miscellaneous'
];
