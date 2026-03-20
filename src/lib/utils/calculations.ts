import type { CostCategory, CostScenario, LineItem } from '$lib/types';

export function calculateLineItemTotal(
	item: LineItem,
	guestCount: number,
	subtotalForPercentage?: number
): number {
	if (!item.included) return 0;
	if (item.applicable === false) return 0;

	switch (item.calculation_type) {
		case 'flat':
			return item.cost * item.quantity;
		case 'per-person':
			return item.cost * guestCount;
		case 'per-group':
			return item.cost * item.quantity;
		case 'percentage':
			return ((subtotalForPercentage ?? 0) * item.cost) / 100;
		default:
			return 0;
	}
}

/**
 * Calculate the non-percentage subtotal for a single category.
 */
export function calculateCategoryTotal(category: CostCategory, guestCount: number): number {
	if (category.included_in_venue) return 0;
	if (!category.line_items) return 0;

	return category.line_items
		.filter((item) => item.calculation_type !== 'percentage')
		.reduce((sum, item) => sum + calculateLineItemTotal(item, guestCount), 0);
}

/**
 * Build a map of category type -> non-percentage subtotal.
 */
function buildCategoryTotalsMap(
	categories: CostCategory[],
	guestCount: number
): Map<string, number> {
	const map = new Map<string, number>();
	for (const cat of categories) {
		const existing = map.get(cat.type) ?? 0;
		map.set(cat.type, existing + calculateCategoryTotal(cat, guestCount));
	}
	return map;
}

export function calculateVenueSubtotal(categories: CostCategory[], guestCount: number): number {
	return categories.reduce((sum, cat) => sum + calculateCategoryTotal(cat, guestCount), 0);
}

/**
 * Resolve the subtotal a percentage line item should be calculated against.
 * - null or 'all' -> global subtotal
 * - a category type (e.g., 'catering') -> that category's subtotal
 */
function resolvePercentageBase(
	item: LineItem,
	globalSubtotal: number,
	categoryTotals: Map<string, number>
): number {
	const target = item.percentage_target;
	if (!target || target === 'all') return globalSubtotal;
	return categoryTotals.get(target) ?? 0;
}

/**
 * Calculate all percentage-based fees/taxes across all categories.
 * Percentage items can target the global subtotal or a specific category.
 */
export function calculateFeesAndTaxes(
	categories: CostCategory[],
	guestCount: number
): { serviceCharge: number; gratuity: number; tax: number; otherFees: number } {
	const globalSubtotal = calculateVenueSubtotal(categories, guestCount);
	const categoryTotals = buildCategoryTotalsMap(categories, guestCount);

	let serviceCharge = 0;
	let gratuity = 0;
	let tax = 0;
	let otherFees = 0;

	for (const cat of categories) {
		if (!cat.line_items) continue;
		for (const item of cat.line_items) {
			if (!item.included) continue;
			if (item.applicable === false) continue;
			if (item.calculation_type !== 'percentage') continue;

			const base = resolvePercentageBase(item, globalSubtotal, categoryTotals);
			const amount = (base * item.cost) / 100;
			const nameLower = item.name.toLowerCase();

			if (nameLower.includes('service')) serviceCharge += amount;
			else if (nameLower.includes('gratuity') || nameLower.includes('tip')) gratuity += amount;
			else if (nameLower.includes('tax')) tax += amount;
			else otherFees += amount;
		}
	}

	return { serviceCharge, gratuity, tax, otherFees };
}

/**
 * Get the resolved percentage amount for a single item, for display purposes.
 */
export function resolvePercentageItemTotal(
	item: LineItem,
	categories: CostCategory[],
	guestCount: number
): number {
	if (item.calculation_type !== 'percentage') return 0;
	const globalSubtotal = calculateVenueSubtotal(categories, guestCount);
	const categoryTotals = buildCategoryTotalsMap(categories, guestCount);
	const base = resolvePercentageBase(item, globalSubtotal, categoryTotals);
	return (base * item.cost) / 100;
}

export function calculateGrandTotal(categories: CostCategory[], guestCount: number): number {
	const subtotal = calculateVenueSubtotal(categories, guestCount);
	const fees = calculateFeesAndTaxes(categories, guestCount);
	return subtotal + fees.serviceCharge + fees.gratuity + fees.tax + fees.otherFees;
}

export function calculateCategoryBreakdown(
	categories: CostCategory[],
	guestCount: number
): { type: string; label: string; total: number }[] {
	return categories
		.map((cat) => ({
			type: cat.type,
			label: cat.name,
			total: calculateCategoryTotal(cat, guestCount)
		}))
		.filter((item) => item.total > 0);
}

/**
 * Apply a scenario's overrides to categories, returning new categories
 * with line items adjusted per the scenario.
 */
export function applyCategoryScenario(
	categories: CostCategory[],
	scenario: CostScenario | null
): CostCategory[] {
	if (!scenario?.overrides?.length) return categories;

	const overrideMap = new Map(
		scenario.overrides.map((o) => [o.line_item_id, o])
	);

	return categories.map((cat) => ({
		...cat,
		line_items: (cat.line_items ?? []).map((li) => {
			const override = overrideMap.get(li.id);
			if (!override) return li;
			return {
				...li,
				applicable: override.applicable,
				included: li.included && override.applicable,
				cost: override.cost_override ?? li.cost,
				notes: override.notes_override ?? li.notes
			};
		})
	}));
}
