/**
 * BoundsTree - Spatial indexing for draw order assignment.
 *
 * A binary tree of axis-aligned bounding boxes that assigns DrawOrder values
 * to primitives based on spatial overlap. Inspired by GPUI's bounds_tree.rs.
 *
 * Key features:
 * - Automatic z-ordering based on insertion order and spatial overlap
 * - Non-overlapping bounds can share the same draw order
 * - Overlapping bounds get increasing draw orders to ensure correct stacking
 */

import type { Bounds } from "./types.ts";

/**
 * Draw order value for z-sorting primitives.
 * Higher values are drawn on top (closer to camera).
 */
export type DrawOrder = number;

/**
 * Leaf node containing a single bounds with its assigned order.
 */
interface LeafNode {
  type: "leaf";
  bounds: Bounds;
  order: DrawOrder;
}

/**
 * Internal node containing two children and cached metadata.
 */
interface InternalNode {
  type: "internal";
  left: number;
  right: number;
  bounds: Bounds;
  maxOrder: DrawOrder;
}

type Node = LeafNode | InternalNode;

/**
 * Compute the half-perimeter of bounds (width + height).
 * Used as surface area heuristic for tree balancing.
 */
function halfPerimeter(bounds: Bounds): number {
  return bounds.width + bounds.height;
}

/**
 * Compute the union of two bounds.
 */
function boundsUnion(a: Bounds, b: Bounds): Bounds {
  const minX = Math.min(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxX = Math.max(a.x + a.width, b.x + b.width);
  const maxY = Math.max(a.y + a.height, b.y + b.height);
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Check if two bounds intersect.
 */
function boundsIntersects(a: Bounds, b: Bounds): boolean {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

/**
 * BoundsTree for spatial indexing and draw order assignment.
 *
 * The tree automatically assigns draw orders based on spatial relationships:
 * - Overlapping primitives get consecutive draw orders
 * - Non-overlapping primitives can share the same draw order
 *
 * This ensures correct z-stacking without manual z-index management for most cases.
 */
export class BoundsTree {
  private root: number | null = null;
  private nodes: Node[] = [];
  private stack: number[] = [];

  /**
   * Clear the tree for a new frame.
   */
  clear(): void {
    this.root = null;
    this.nodes = [];
    this.stack = [];
  }

  /**
   * Insert bounds into the tree and get its draw order.
   *
   * The draw order is computed as max(overlapping orders) + 1,
   * ensuring correct z-stacking for overlapping elements.
   *
   * @param newBounds - The bounds to insert
   * @returns The assigned draw order
   */
  insert(newBounds: Bounds): DrawOrder {
    if (newBounds.width <= 0 || newBounds.height <= 0) {
      return this.root !== null ? 1 : 1;
    }

    if (this.root === null) {
      const newNode = this.pushLeaf(newBounds, 1);
      this.root = newNode;
      return 1;
    }

    let index = this.root;
    let maxIntersectingOrder: DrawOrder = 0;
    this.stack.length = 0;

    while (this.nodes[index]!.type === "internal") {
      const node = this.nodes[index] as InternalNode;
      node.bounds = boundsUnion(node.bounds, newBounds);
      this.stack.push(index);

      const leftNode = this.nodes[node.left]!;
      const rightNode = this.nodes[node.right]!;
      const leftCost = halfPerimeter(boundsUnion(leftNode.bounds, newBounds));
      const rightCost = halfPerimeter(boundsUnion(rightNode.bounds, newBounds));

      if (leftCost < rightCost) {
        maxIntersectingOrder = this.findMaxOrder(node.right, newBounds, maxIntersectingOrder);
        index = node.left;
      } else {
        maxIntersectingOrder = this.findMaxOrder(node.left, newBounds, maxIntersectingOrder);
        index = node.right;
      }
    }

    const sibling = index;
    const siblingNode = this.nodes[sibling] as LeafNode;

    if (boundsIntersects(siblingNode.bounds, newBounds)) {
      maxIntersectingOrder = Math.max(maxIntersectingOrder, siblingNode.order);
    }

    const order = maxIntersectingOrder + 1;
    const newNode = this.pushLeaf(newBounds, order);
    const newParent = this.pushInternal(sibling, newNode);

    const oldParent = this.stack[this.stack.length - 1];
    if (oldParent !== undefined) {
      const parentNode = this.nodes[oldParent] as InternalNode;
      if (parentNode.left === sibling) {
        parentNode.left = newParent;
      } else {
        parentNode.right = newParent;
      }
    } else {
      this.root = newParent;
    }

    for (let i = this.stack.length - 1; i >= 0; i--) {
      const nodeIndex = this.stack[i]!;
      const node = this.nodes[nodeIndex] as InternalNode;
      if (node.maxOrder >= order) {
        break;
      }
      node.maxOrder = order;
    }

    return order;
  }

  /**
   * Find the maximum draw order among all nodes that intersect the given bounds.
   */
  private findMaxOrder(index: number, bounds: Bounds, maxOrder: DrawOrder): DrawOrder {
    const node = this.nodes[index]!;

    if (node.type === "leaf") {
      if (boundsIntersects(node.bounds, bounds)) {
        return Math.max(maxOrder, node.order);
      }
      return maxOrder;
    }

    if (!boundsIntersects(node.bounds, bounds) || maxOrder >= node.maxOrder) {
      return maxOrder;
    }

    const leftNode = this.nodes[node.left]!;
    const rightNode = this.nodes[node.right]!;
    const leftMax = leftNode.type === "leaf" ? leftNode.order : (leftNode as InternalNode).maxOrder;
    const rightMax =
      rightNode.type === "leaf" ? rightNode.order : (rightNode as InternalNode).maxOrder;

    if (leftMax > rightMax) {
      maxOrder = this.findMaxOrder(node.left, bounds, maxOrder);
      maxOrder = this.findMaxOrder(node.right, bounds, maxOrder);
    } else {
      maxOrder = this.findMaxOrder(node.right, bounds, maxOrder);
      maxOrder = this.findMaxOrder(node.left, bounds, maxOrder);
    }

    return maxOrder;
  }

  private pushLeaf(bounds: Bounds, order: DrawOrder): number {
    const index = this.nodes.length;
    this.nodes.push({ type: "leaf", bounds, order });
    return index;
  }

  private pushInternal(left: number, right: number): number {
    const leftNode = this.nodes[left]!;
    const rightNode = this.nodes[right]!;

    const bounds = boundsUnion(leftNode.bounds, rightNode.bounds);
    const leftMax = leftNode.type === "leaf" ? leftNode.order : (leftNode as InternalNode).maxOrder;
    const rightMax =
      rightNode.type === "leaf" ? rightNode.order : (rightNode as InternalNode).maxOrder;
    const maxOrder = Math.max(leftMax, rightMax);

    const index = this.nodes.length;
    this.nodes.push({ type: "internal", left, right, bounds, maxOrder });
    return index;
  }

  /**
   * Get the current maximum draw order in the tree.
   */
  getMaxOrder(): DrawOrder {
    if (this.root === null) {
      return 0;
    }
    const rootNode = this.nodes[this.root]!;
    return rootNode.type === "leaf" ? rootNode.order : rootNode.maxOrder;
  }

  /**
   * Get the number of nodes in the tree.
   */
  getNodeCount(): number {
    return this.nodes.length;
  }
}
