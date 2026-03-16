import { screen } from '@testing-library/react';
import TerminalWindow from '../TerminalWindow';
import { renderWithProviders } from '../../test/helpers';

describe('TerminalWindow', () => {
  it('renders title bar text', () => {
    renderWithProviders(
      <TerminalWindow><div>child</div></TerminalWindow>
    );
    expect(screen.getByText('dkoderinc.com — bash — 80×24')).toBeInTheDocument();
  });

  it('renders 3 traffic light dots', () => {
    const { container } = renderWithProviders(
      <TerminalWindow><div>child</div></TerminalWindow>
    );
    const dots = container.querySelectorAll('.rounded-full.w-3.h-3');
    expect(dots).toHaveLength(3);
  });

  it('applies bell-flash class when bellFlash is true', () => {
    const { container } = renderWithProviders(
      <TerminalWindow bellFlash><div>child</div></TerminalWindow>
    );
    expect(container.firstChild).toHaveClass('bell-flash');
  });

  it('does not apply bell-flash class when bellFlash is false', () => {
    const { container } = renderWithProviders(
      <TerminalWindow bellFlash={false}><div>child</div></TerminalWindow>
    );
    expect(container.firstChild).not.toHaveClass('bell-flash');
  });

  it('renders children', () => {
    renderWithProviders(
      <TerminalWindow><div data-testid="child">content</div></TerminalWindow>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders status bar', () => {
    renderWithProviders(
      <TerminalWindow><div>child</div></TerminalWindow>
    );
    expect(screen.getByText('[0] bash')).toBeInTheDocument();
  });
});
