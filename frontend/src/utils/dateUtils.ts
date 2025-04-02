// frontend/src/utils/dateUtils.ts
export const normalizeDate = (dateString: string | null | undefined): string | null => {
    if (!dateString) return null;

    const date = new Date(dateString);
    // Reset time to midnight to avoid timezone issues
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString().split('T')[0];
};

export const formatDate = (dateString: string | null | undefined, format: 'short' | 'medium' | 'long' = 'medium'): string => {
    if (!dateString) return 'No date';

    const date = new Date(dateString);

    switch (format) {
        case 'short':
            return date.toLocaleDateString();
        case 'long':
            return date.toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        case 'medium':
        default:
            return date.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
    }
};