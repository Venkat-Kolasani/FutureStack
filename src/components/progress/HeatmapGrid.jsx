import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildHeatmapGrid,
  formatHeatmapRange,
  formatHeatmapTooltip,
  getCellAriaLabel,
  HEATMAP_INTENSITY_CLASSES,
  HEATMAP_WEEKDAY_LABELS,
} from '../../utils/heatmapHelpers';

const CELL_SIZE = 13;
const CELL_GAP = 3;
const MONTH_ROW = 18;
const WEEKDAY_COL = 28;

const findCellPosition = (weeks, date) => {
  for (let weekIndex = 0; weekIndex < weeks.length; weekIndex += 1) {
    const dayIndex = weeks[weekIndex].findIndex((day) => day.date === date && !day.isPadding);
    if (dayIndex >= 0) return { weekIndex, dayIndex };
  }
  return null;
};

const cellGlow = (day) => (
  day.intensity >= 3 ? '0 0 10px rgba(62, 230, 162, 0.28)' : undefined
);

const HeatmapGrid = ({
  data = [],
  onDaySelect,
  selectedDate,
  today,
  className = '',
}) => {
  const grid = useMemo(() => buildHeatmapGrid(data, { today }), [data, today]);
  const scrollRef = useRef(null);
  const cellRefs = useRef(new Map());
  const [tooltip, setTooltip] = useState(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [focusedDate, setFocusedDate] = useState(selectedDate || grid.today);
  const gridWidth = grid.weeks.length * CELL_SIZE + Math.max(0, grid.weeks.length - 1) * CELL_GAP;
  const rangeLabel = formatHeatmapRange(grid.rangeStart, grid.rangeEnd);

  const updateScrollState = () => {
    const node = scrollRef.current;
    if (!node) return;
    setCanScrollLeft(node.scrollLeft > 4);
  };

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    updateScrollState();
  }, [grid.weeks.length]);

  useEffect(() => {
    if (selectedDate) setFocusedDate(selectedDate);
  }, [selectedDate]);

  const focusCell = (date, moveDomFocus = false) => {
    setFocusedDate(date);
    if (!moveDomFocus) return;
    const node = cellRefs.current.get(date);
    if (node) node.focus();
  };

  const moveFocus = (weekDelta, dayDelta) => {
    const current = findCellPosition(grid.weeks, focusedDate) || findCellPosition(grid.weeks, grid.today);
    if (!current) return;

    let weekIndex = current.weekIndex + weekDelta;
    let dayIndex = current.dayIndex + dayDelta;

    while (
      weekIndex >= 0
      && weekIndex < grid.weeks.length
      && dayIndex >= 0
      && dayIndex <= 6
    ) {
      const cell = grid.weeks[weekIndex][dayIndex];
      if (cell && !cell.isPadding) {
        focusCell(cell.date, true);
        return;
      }
      weekIndex += weekDelta;
      dayIndex += dayDelta;
    }
  };

  const handleKeyDown = (event, day) => {
    const keys = {
      ArrowRight: [1, 0],
      ArrowLeft: [-1, 0],
      ArrowDown: [0, 1],
      ArrowUp: [0, -1],
    };

    if (keys[event.key]) {
      event.preventDefault();
      moveFocus(...keys[event.key]);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      const first = grid.weeks.flat().find((cell) => !cell.isPadding);
      if (first) focusCell(first.date, true);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      focusCell(grid.today, true);
      return;
    }

    if ((event.key === 'Enter' || event.key === ' ') && onDaySelect) {
      event.preventDefault();
      onDaySelect(day.date);
    }
  };

  const showTooltip = (event, day) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({
      day,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  const hideTooltip = () => setTooltip(null);

  const renderCell = (day) => {
    if (day.isPadding) {
      return (
        <span
          key={day.date}
          aria-hidden="true"
          className="block rounded-[3px]"
          style={{ width: CELL_SIZE, height: CELL_SIZE }}
        />
      );
    }

    const isSelected = selectedDate === day.date;
    const isFocused = focusedDate === day.date;
    const intensityClass = HEATMAP_INTENSITY_CLASSES[day.intensity] || HEATMAP_INTENSITY_CLASSES[0];

    return (
      <button
        key={day.date}
        type="button"
        ref={(node) => {
          if (node) cellRefs.current.set(day.date, node);
          else cellRefs.current.delete(day.date);
        }}
        role="gridcell"
        tabIndex={isFocused ? 0 : -1}
        aria-label={getCellAriaLabel(day)}
        aria-current={day.isToday ? 'date' : undefined}
        aria-selected={isSelected}
        className={`relative block rounded-[3px] ${intensityClass} motion-safe:transition-transform motion-safe:duration-150 motion-safe:hover:z-10 motion-safe:hover:scale-110 focus:outline-none ${
          isSelected
            ? 'z-[2] ring-2 ring-teal-600 ring-offset-2 ring-offset-white dark:ring-teal-300 dark:ring-offset-[#0A0A0A]'
            : day.isToday
              ? 'ring-1 ring-gray-900 dark:ring-white/80'
              : 'ring-1 ring-black/[0.04] dark:ring-white/[0.06]'
        }`}
        style={{
          width: CELL_SIZE,
          height: CELL_SIZE,
          boxShadow: !isSelected ? cellGlow(day) : undefined,
        }}
        onClick={() => onDaySelect?.(day.date)}
        onKeyDown={(event) => handleKeyDown(event, day)}
        onMouseEnter={(event) => showTooltip(event, day)}
        onMouseLeave={hideTooltip}
        onFocus={(event) => {
          focusCell(day.date);
          showTooltip(event, day);
        }}
        onBlur={hideTooltip}
      />
    );
  };

  return (
    <div className={className}>
      <div className="flex">
        <div
          className="flex shrink-0 flex-col text-right text-[10px] font-medium tracking-wide text-gray-500 dark:text-gray-500"
          style={{ width: WEEKDAY_COL, paddingTop: MONTH_ROW, paddingRight: 8 }}
          aria-hidden="true"
        >
          {HEATMAP_WEEKDAY_LABELS.map((label, index) => (
            <span
              key={`weekday-${index}`}
              className="flex items-center justify-end"
              style={{ height: CELL_SIZE, marginBottom: index === 6 ? 0 : CELL_GAP }}
            >
              {label}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          {canScrollLeft && (
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-white dark:from-[#0A0A0A]" />
          )}
          <div
            ref={scrollRef}
            className="overflow-x-auto pb-1 [scrollbar-width:thin]"
            onScroll={updateScrollState}
          >
            <div role="grid" aria-label="Preparation activity for the past year" style={{ width: gridWidth }}>
              <div className="relative" style={{ height: MONTH_ROW }}>
                {grid.monthLabels.map((label, index) => (
                  label ? (
                    <span
                      key={`month-${label}-${index}`}
                      className="absolute top-0 text-[11px] font-medium tracking-wide text-gray-500 dark:text-gray-400"
                      style={{ left: index * (CELL_SIZE + CELL_GAP) }}
                    >
                      {label}
                    </span>
                  ) : null
                ))}
              </div>

              <div className="flex flex-col" style={{ gap: CELL_GAP }}>
                {HEATMAP_WEEKDAY_LABELS.map((_, dayIndex) => (
                  <div
                    key={`row-${dayIndex}`}
                    role="row"
                    className="flex"
                    style={{ gap: CELL_GAP }}
                  >
                    {grid.weeks.map((week) => renderCell(week[dayIndex]))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[11px] text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <span>Less</span>
          {HEATMAP_INTENSITY_CLASSES.map((tone, level) => (
            <span
              key={`legend-${level}`}
              className={`h-[11px] w-[11px] rounded-[3px] ${tone}`}
              style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)' }}
              aria-hidden="true"
            />
          ))}
          <span>More</span>
        </div>
        {rangeLabel && <span className="tracking-wide">{rangeLabel}</span>}
      </div>

      {tooltip && (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full"
          style={{ left: tooltip.x, top: tooltip.y - 10 }}
        >
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-left shadow-2xl dark:border-white/10 dark:bg-[#141414]">
            <p className="text-[13px] font-medium text-gray-900 dark:text-white">
              {formatHeatmapTooltip(tooltip.day)}
            </p>
            {tooltip.day.tracks?.length > 0 && (
              <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                {tooltip.day.tracks.join(' · ')}
              </p>
            )}
          </div>
          <div className="mx-auto h-2 w-2 -translate-y-1 rotate-45 border-b border-r border-gray-200 bg-white dark:border-white/10 dark:bg-[#141414]" />
        </div>
      )}
    </div>
  );
};

export default HeatmapGrid;
