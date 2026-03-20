import type { CostCategory, LineItem } from '$lib/types';

export function calculateLineItemTotal(
	item: LineItem,
	guestCount: number,
	subtotalForPercentage?: number
): number {
	if (!item.included) return 0;

	switch (item.calculation_type) {
		case 'flat':
			return item.cost * item.quantity;
		case 'per-person':
			return item.cost * guestCount * item.quantity;
		case 'percentage':
			return ((subtotalForPercentage ?? 0) * item.cost) / 100;
		default:
			return 0;
	}
}

export function calculateCategoryTotal(category: CostCategory, guestCount: number): number {
	if (category.included_in_venue) return 0;
	if (!category.line_items) return 0;

	return category.line_items
		.filter((item) => item.calculation_type !== 'percentage')
		.reduce((sum, item) => sum + calculateLineItemTotal(item, guestCount), 0);
}

export function calculateVenueSubtotal(categories: CostCategory[], guestCount: number): number {
	return categories.reduce((sum, cat) => sum + calculateCategoryTotal(cat, guestCount), 0);
}

export function calculateFeesAndTaxes(
	categories: CostCategory[],
	guestCount: number
): { serviceCharge: number; gratuity: number; tax: number; otherFees: number } {
	const subtotal = calculateVenueSubtotal(categories, guestCount);
	const feesCategory = categories.find((c) => c.type === 'fees-taxes');
	if (!feesCategory?.line_items)
		return { serviceCharge: 0, gratuity: 0, tax: 0, otherFees: 0 };

	let serviceCharge = 0;
	let gratuity = 0;
	let tax = 0;
	let otherFees = 0;

	for (const item of feesCategory.line_items) {
		if (!item.included) continue;
		if (item.calculation_type === 'percentage') {
			const amount = (subtotal * item.cost) / 100;
			const nameLower = item.name.toLowerCase();
			if (nameLower.includes('service')) serviceCharge += amount;
			else if (nameLower.includes('gratuity') || nameLower.includes('tip')) gratuity += amount;
			else if (nameLower.includes('tax')) tax += amount;
			else otherFees += amount;
		} else {
			otherFees += calculateLineItemTotal(item, guestCount);
		}
	}

	return { serviceCharge, gratuity, tax, otherFees };
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
