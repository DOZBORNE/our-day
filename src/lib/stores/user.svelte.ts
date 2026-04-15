let currentUserId = $state<string>('');

export function setCurrentUserId(id: string) {
	currentUserId = id;
}

export function getCurrentUserId(): string {
	return currentUserId;
}
