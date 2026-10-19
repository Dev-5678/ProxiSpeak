import { clampCoordinates, calculateDistance, isWithinRadius } from './coordinateMath';

describe('Spatial Coordinate Math & Boundary Clamping', () => {
  test('clamps negative coordinates to minimum bounds', () => {
    const clamped = clampCoordinates({ x: -50, y: -20 }, { minX: 0, minY: 0, maxX: 800, maxY: 600 });
    expect(clamped.x).toBe(0);
    expect(clamped.y).toBe(0);
  });

  test('clamps oversized coordinates to maximum canvas boundaries', () => {
    const clamped = clampCoordinates({ x: 920, y: 700 }, { minX: 0, minY: 0, maxX: 800, maxY: 600 });
    expect(clamped.x).toBe(800);
    expect(clamped.y).toBe(600);
  });

  test('calculates correct Euclidean distance and radius thresholds', () => {
    const p1 = { x: 100, y: 100 };
    const p2 = { x: 130, y: 140 };
    expect(calculateDistance(p1, p2)).toBe(50);
    expect(isWithinRadius(p1, p2, 60)).toBe(true);
    expect(isWithinRadius(p1, p2, 40)).toBe(false);
  });
});
