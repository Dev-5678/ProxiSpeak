/**
 * 2D Spatial Vector Math and Boundary Clamping Utilities
 */

export function clampCoordinates(coord, bounds) {
  const minX = bounds.minX ?? 0;
  const minY = bounds.minY ?? 0;
  const maxX = bounds.maxX ?? 800;
  const maxY = bounds.maxY ?? 600;

  return {
    x: Math.max(minX, Math.min(coord.x, maxX)),
    y: Math.max(minY, Math.min(coord.y, maxY))
  };
}

export function calculateDistance(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function isWithinRadius(p1, p2, radius) {
  return calculateDistance(p1, p2) <= radius;
}
