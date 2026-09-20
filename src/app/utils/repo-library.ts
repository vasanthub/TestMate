import { RepositoryNode } from '../models/question.model';

/**
 * Prunes the repository tree to the branches a profile has in its library.
 *
 * `assignedIds` holds the roots of the chosen branches. A node is kept when it
 * (or an ancestor) is assigned - which pulls in its whole subtree - or when some
 * descendant is, so the folders needed to navigate down to it stay visible.
 *
 * An empty `assignedIds` means "no library configured" and the tree is returned
 * untouched (every profile starts seeing everything and opts in).
 */
export function filterTreeByLibrary(
  tree: RepositoryNode[],
  assignedIds: Set<string>
): RepositoryNode[] {
  if (assignedIds.size === 0) return tree;

  const prune = (node: RepositoryNode, ancestorAssigned: boolean): RepositoryNode | null => {
    const selfAssigned = ancestorAssigned || assignedIds.has(node.id);

    const children: RepositoryNode[] = [];
    for (const child of node.children) {
      const kept = prune(child, selfAssigned);
      if (kept) children.push(kept);
    }

    if (selfAssigned || children.length > 0) {
      return { ...node, children, hasChildren: children.length > 0 };
    }
    return null;
  };

  return tree
    .map(root => prune(root, false))
    .filter((n): n is RepositoryNode => n !== null);
}

/** id -> immediate parent id, and id -> all descendant ids. Built once per tree. */
export interface TreeIndex {
  parentById: Map<string, string>;
  descendantsById: Map<string, string[]>;
}

export function indexTree(tree: RepositoryNode[]): TreeIndex {
  const parentById = new Map<string, string>();
  const descendantsById = new Map<string, string[]>();

  const visit = (node: RepositoryNode): string[] => {
    const all: string[] = [];
    for (const child of node.children) {
      parentById.set(child.id, node.id);
      all.push(child.id, ...visit(child));
    }
    descendantsById.set(node.id, all);
    return all;
  };

  tree.forEach(visit);
  return { parentById, descendantsById };
}
