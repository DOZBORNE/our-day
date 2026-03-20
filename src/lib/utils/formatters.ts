import type { PricingTier } from '$lib/types';

export function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(amount);
}

export function formatCurrencyDetailed(amount: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(amount);
}

export function formatDate(dateStr: string): string {
	const date = new Date(dateStr + 'T00:00:00');
	return date.toLocaleDateString('en-US', {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
}

export function formatDateShort(dateStr: string): string {
	const date = new Date(dateStr + 'T00:00:00');
	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric'
	});
}

export function getDayOfWeek(dateStr: string): string {
	const date = new Date(dateStr + 'T00:00:00');
	return date.toLocaleDateString('en-US', { weekday: 'long' });
}

export function detectPricingTier(dateStr: string): PricingTier {
	const date = new Date(dateStr + 'T00:00:00');
	const day = date.getDay();
	if (day === 6) return 'saturday';
	if (day === 5 || day === 0) return 'friday-sunday';
	return 'weekday';
}

export function tierLabel(tier: PricingTier): string {
	switch (tier) {
		case 'saturday':
			return 'Saturday (Premium)';
		case 'friday-sunday':
			return 'Friday / Sunday';
		case 'weekday':
			return 'Weekday';
	}
}

export function tierColor(tier: PricingTier): string {
	switch (tier) {
		case 'saturday':
			return 'var(--color-tier-saturday)';
		case 'friday-sunday':
			return 'var(--color-tier-frisun)';
		case 'weekday':
			return 'var(--color-tier-weekday)';
	}
}
