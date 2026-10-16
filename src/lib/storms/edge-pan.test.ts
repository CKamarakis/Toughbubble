import { describe, expect, it } from "vitest";
import { EDGE_PAN_MAX, EDGE_PAN_ZONE, edgePanSpeed } from "./edge-pan";

describe("edgePanSpeed", () => {
  it("is 0 outside the zone", () => {
    expect(edgePanSpeed(500, 0, 1000)).toBe(0);
    expect(edgePanSpeed(EDGE_PAN_ZONE, 0, 1000)).toBe(0);
    expect(edgePanSpeed(1000 - EDGE_PAN_ZONE, 0, 1000)).toBe(0);
  });

  it("rises toward the edge, negative at the start edge and positive at the end edge", () => {
    const far = edgePanSpeed(30, 0, 1000);
    const near = edgePanSpeed(10, 0, 1000);
    expect(far).toBeLessThan(0);
    expect(near).toBeLessThan(far);
    expect(edgePanSpeed(990, 0, 1000)).toBeCloseTo(-near);
    expect(edgePanSpeed(970, 0, 1000)).toBeCloseTo(-far);
  });

  it("reaches the cap at the edge and stays there beyond it", () => {
    expect(edgePanSpeed(0, 0, 1000)).toBe(-EDGE_PAN_MAX);
    expect(edgePanSpeed(-50, 0, 1000)).toBe(-EDGE_PAN_MAX);
    expect(edgePanSpeed(1000, 0, 1000)).toBe(EDGE_PAN_MAX);
    expect(edgePanSpeed(1200, 0, 1000)).toBe(EDGE_PAN_MAX);
  });

  it("works with a non-zero start (a sidebar to the left)", () => {
    expect(edgePanSpeed(270, 260, 1000)).toBeLessThan(0);
    expect(edgePanSpeed(100, 260, 1000)).toBe(-EDGE_PAN_MAX);
  });
});
