export interface ValidationIssue {
    type: 'warning' | 'error';
    message: string;
    nodeName?: string;
}

export interface ValidationResult {
    canExport: boolean;
    layerCount: number;
    maxDepth: number;
    warnings: ValidationIssue[];
    errors: ValidationIssue[];
    summary: string;
}

function countLayers(nodes: ReadonlyArray<any>): number {
    let count = 0;
    for (const node of nodes) {
        count++;
        if ('children' in node) {
            count += countLayers(node.children);
        }
    }
    return count;
}

function getMaxDepth(nodes: ReadonlyArray<any>, depth: number = 0): number {
    let max = depth;
    for (const node of nodes) {
        if ('children' in node) {
            const childMax = getMaxDepth(node.children, depth + 1);
            if (childMax > max) max = childMax;
        }
    }
    return max;
}

function collectIssues(nodes: ReadonlyArray<any>, issues: ValidationIssue[]): void {
    for (const node of nodes) {
        if ((node.type === 'GROUP' || node.type === 'FRAME') &&
            'children' in node &&
            (node as ChildrenMixin).children.length === 0) {
            issues.push({
                type: 'warning',
                message: `Empty group/frame "${node.name}" will be skipped`,
                nodeName: node.name,
            });
        }

        if ('effects' in node) {
            const effects = (node as BlendMixin).effects;
            const blurs = effects.filter(
                e => e.type === 'LAYER_BLUR' || e.type === 'BACKGROUND_BLUR'
            );
            if (blurs.length > 1) {
                issues.push({
                    type: 'warning',
                    message: `"${node.name}" has ${blurs.length} blur effects — only one will import`,
                    nodeName: node.name,
                });
            }
        }

        if ('children' in node) {
            collectIssues((node as ChildrenMixin).children, issues);
        }
    }
}

export function analyzeNodes(nodes: ReadonlyArray<SceneNode>): ValidationResult {
    const issues: ValidationIssue[] = [];
    const layerCount = countLayers(nodes);
    const maxDepth = getMaxDepth(nodes);

    if (maxDepth > 15) {
        issues.push({
            type: 'warning',
            message: `Nesting depth ${maxDepth} (recommended ≤15) — deeply nested layers may fail to import`,
        });
    }

    if (layerCount > 300) {
        issues.push({
            type: 'warning',
            message: `${layerCount} layers selected — import may be slow`,
        });
    }

    collectIssues(nodes, issues);

    const errors = issues.filter(i => i.type === 'error');
    const warnings = issues.filter(i => i.type === 'warning');

    let summary: string;
    if (errors.length > 0) {
        summary = `${errors.length} error${errors.length !== 1 ? 's' : ''} must be fixed before export`;
    } else if (warnings.length > 0) {
        summary = `${warnings.length} warning${warnings.length !== 1 ? 's' : ''} — export may have issues`;
    } else {
        summary = `${layerCount} layer${layerCount !== 1 ? 's' : ''} ready`;
    }

    return { canExport: errors.length === 0, layerCount, maxDepth, warnings, errors, summary };
}
