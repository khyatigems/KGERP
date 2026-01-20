
/**
 * Generic function to remove duplicate items from an array based on a unique key.
 * @param items Array of items to deduplicate
 * @param key The key to check for uniqueness
 * @returns Deduplicated array
 */
export function removeDuplicates<T>(items: T[], key: keyof T): T[] {
  const seen = new Set();
  return items.filter((item) => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}

/**
 * Validates if an item already exists in a collection.
 * @param items Collection to check against
 * @param newItem Item to check
 * @param key Key to identify uniqueness
 * @returns boolean indicating if duplicate exists
 */
export function isDuplicate<T>(items: T[], newItem: T, key: keyof T): boolean {
  return items.some((item) => item[key] === newItem[key]);
}
