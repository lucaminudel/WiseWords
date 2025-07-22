export const getConversationTypeColor = (type?: string): string => {
    switch (type) {
        case 'QUESTION': return 'var(--color-question)';
        case 'PROBLEM': return 'var(--color-problem)';
        case 'DILEMMA': return 'var(--color-dilemma)';
        default: return 'var(--color-text-primary)';
    }
};

export const getPostTypeDisplay = (sk: string, convoType?: string): string => {
    if (sk === 'METADATA') return '';
    
    // Find the last occurrence of each type marker
    const lastCC = sk.lastIndexOf('#CC#');
    const lastDD = sk.lastIndexOf('#DD#');
    const lastCM = sk.lastIndexOf('#CM#');
    
    // Determine which marker appears last
    const lastMarker = Math.max(lastCC, lastDD, lastCM);
    
    // If no markers found, default to Comment
    if (lastMarker === -1) return 'Comment';
    
    // Check which marker was the last one
    if (lastMarker === lastCC) {
        switch(convoType) {
            case 'QUESTION': return 'Proposed Answer';
            case 'PROBLEM': return 'Proposed Solution';
            case 'DILEMMA': return 'Proposed Choice';
            default: return 'Conclusion';
        }
    } else if (lastMarker === lastDD) {
        switch(convoType) {
            case 'QUESTION': return 'Sub-question';
            case 'PROBLEM': return 'Sub-problem';
            case 'DILEMMA': return 'Sub-dilemma';
            default: return 'Drill-down';
        }
    } else if (lastMarker === lastCM) {
        return 'Comment';
    }
    
    // Default to Comment if no type is determined
    return 'Comment';
};
