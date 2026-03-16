import { render, screen } from '@testing-library/react';
import AutoSuggestion from '../AutoSuggestion';

describe('AutoSuggestion', () => {
  it('renders nothing when suggestion is null', () => {
    const { container } = render(
      <AutoSuggestion inputCommand="wh" suggestion={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders completion suffix', () => {
    render(<AutoSuggestion inputCommand="wh" suggestion="whoami" />);
    expect(screen.getByText('oami')).toBeInTheDocument();
  });

  it('renders hidden prefix matching input for alignment', () => {
    const { container } = render(
      <AutoSuggestion inputCommand="the" suggestion="theme" />
    );
    const spans = container.querySelectorAll('span');
    const prefixSpan = spans[0];
    expect(prefixSpan.textContent).toBe('the');
    expect(prefixSpan.className).toContain('opacity-0');
  });
});
