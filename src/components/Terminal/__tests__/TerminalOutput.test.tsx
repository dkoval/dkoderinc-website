import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TerminalOutput from '../TerminalOutput';

describe('TerminalOutput', () => {
  it('wraps long plain lines instead of clipping them on narrow screens', () => {
    const content = '  • Use arrows to navigate command history';
    render(
      <TerminalOutput
        terminalOutput={[{ content, type: 'output' }]}
        isInputBlocked={false}
        revealStartIndex={0}
        showScrollIndicator={false}
        rainVisible={false}
        scrollRef={{ current: null }}
        sentinelRef={{ current: null }}
      />
    );
    expect(screen.getByText('• Use arrows to navigate command history')).toHaveStyle({ whiteSpace: 'pre-wrap' });
  });
});
