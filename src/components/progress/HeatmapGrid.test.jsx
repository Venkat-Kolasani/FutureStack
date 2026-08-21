import { fireEvent, render, screen } from '@testing-library/react';
import HeatmapGrid from './HeatmapGrid';
import { HEATMAP_INTENSITY_CLASSES } from '../../utils/heatmapHelpers';

const TODAY = new Date(2026, 7, 21, 12, 0, 0);

const renderHeatmap = (props = {}) => render(
  <HeatmapGrid today={TODAY} {...props} />
);

const getCell = (label) => screen.getByRole('gridcell', { name: label });

describe('HeatmapGrid', () => {
  it('renders a full local year of cells from empty data', () => {
    renderHeatmap();

    expect(screen.getByRole('grid', { name: 'Preparation activity for the past year' })).toBeInTheDocument();
    expect(screen.getAllByRole('gridcell')).toHaveLength(365);
    expect(screen.getByText('Less')).toBeInTheDocument();
    expect(screen.getByText('More')).toBeInTheDocument();
    expect(screen.queryByText(/contributions/i)).not.toBeInTheDocument();
  });

  it('applies the four intensity levels and keeps empty days in the grid', () => {
    renderHeatmap({
      data: [
        { date: '2026-08-18', count: 1, tracks: ['DSA'] },
        { date: '2026-08-19', count: 3 },
        { date: '2026-08-20', count: 4, tracks: ['DSA', 'System Design'] },
      ],
    });

    expect(getCell('Tue, Aug 18 · 1 log. DSA')).toHaveClass(HEATMAP_INTENSITY_CLASSES[1]);
    expect(getCell('Wed, Aug 19 · 3 logs')).toHaveClass(HEATMAP_INTENSITY_CLASSES[2]);
    expect(getCell('Thu, Aug 20 · 4 logs. DSA, System Design')).toHaveClass(HEATMAP_INTENSITY_CLASSES[3]);
    expect(getCell('Fri, Aug 21 · 0 logs')).toHaveClass(HEATMAP_INTENSITY_CLASSES[0]);
  });

  it('marks today and shows month labels', () => {
    renderHeatmap({
      data: [{ date: '2026-08-21', count: 2 }],
    });

    expect(getCell('Fri, Aug 21 · 2 logs')).toHaveAttribute('aria-current', 'date');
    expect(screen.getAllByText('Aug').length).toBeGreaterThan(0);
    expect(screen.getByText('Jan')).toBeInTheDocument();
  });

  it('shows a logs tooltip on hover and notifies when a day is selected', () => {
    const onDaySelect = jest.fn();
    renderHeatmap({
      data: [{ date: '2026-08-20', count: 2, tracks: ['DSA'] }],
      selectedDate: '2026-08-20',
      onDaySelect,
    });

    const cell = getCell('Thu, Aug 20 · 2 logs. DSA');
    expect(cell).toHaveAttribute('aria-selected', 'true');

    fireEvent.mouseEnter(cell);
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('Thu, Aug 20 · 2 logs');
    expect(tooltip).toHaveTextContent('DSA');
    expect(tooltip).not.toHaveTextContent(/contributions/i);

    fireEvent.click(cell);
    expect(onDaySelect).toHaveBeenCalledWith('2026-08-20');
  });

  it('moves focus across days with arrow keys', () => {
    const onDaySelect = jest.fn();
    renderHeatmap({
      selectedDate: '2026-08-20',
      onDaySelect,
    });

    const start = getCell('Thu, Aug 20 · 0 logs');
    fireEvent.focus(start);
    fireEvent.keyDown(start, { key: 'ArrowDown' });

    expect(document.activeElement).toHaveAttribute('aria-label', 'Fri, Aug 21 · 0 logs');

    fireEvent.keyDown(document.activeElement, { key: 'Enter' });
    expect(onDaySelect).toHaveBeenCalledWith('2026-08-21');
  });
});
