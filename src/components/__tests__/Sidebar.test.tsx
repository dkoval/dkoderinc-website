import { screen } from '@testing-library/react';
import Sidebar from '../Sidebar';
import { renderWithProviders, mockMatchMedia } from '../../test/helpers';

describe('Sidebar', () => {
  describe('desktop', () => {
    beforeEach(() => {
      mockMatchMedia(q => q === '(min-width: 768px)');
    });

    it('renders headshot image', () => {
      renderWithProviders(<Sidebar />);
      const img = screen.getAllByAltText('Dmytro Koval')[0];
      expect(img).toBeInTheDocument();
    });

    it('renders name and title', () => {
      renderWithProviders(<Sidebar />);
      // Name appears in multiple places (desktop name, /proc/dmytro/status, mobile bar)
      const nameElements = screen.getAllByText('Dmytro Koval');
      expect(nameElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
    });

    it('renders social links with labels', () => {
      renderWithProviders(<Sidebar />);
      expect(screen.getByText('github.com')).toBeInTheDocument();
      expect(screen.getByText('linkedin.com')).toBeInTheDocument();
      expect(screen.getByText('twitter.com')).toBeInTheDocument();
      expect(screen.getByText('dkoderinc@gmail.com')).toBeInTheDocument();
    });

    it('renders social link hrefs', () => {
      renderWithProviders(<Sidebar />);
      const ghLink = screen.getByText('github.com').closest('a');
      expect(ghLink).toHaveAttribute('href', 'https://github.com/dkoval');
    });

    it('renders uptime', () => {
      renderWithProviders(<Sidebar />);
      expect(screen.getByText(/Uptime:/)).toBeInTheDocument();
    });
  });

  describe('mobile', () => {
    // Default mock: matches: false → useIsMobile returns true (mobile)

    it('renders compact bar with social icon links', () => {
      renderWithProviders(<Sidebar />);
      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThanOrEqual(4);
    });

    it('renders name', () => {
      renderWithProviders(<Sidebar />);
      // Name appears in both desktop and mobile sections
      const nameElements = screen.getAllByText('Dmytro Koval');
      expect(nameElements.length).toBeGreaterThanOrEqual(1);
    });
  });
});
