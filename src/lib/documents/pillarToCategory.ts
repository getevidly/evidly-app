/**
 * Maps onboarding document pillars to document tab categories.
 * Shared between Documents page and required-docs computation hooks.
 */
export function pillarToCategory(pillar: string): string {
  switch (pillar) {
    case 'fire_safety': return 'service';
    case 'food_safety': return 'kitchen';
    case 'vendor':      return 'business';
    default:            return 'kitchen';
  }
}
