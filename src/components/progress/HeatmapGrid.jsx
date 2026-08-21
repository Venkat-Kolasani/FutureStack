import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildHeatmapGrid,
  formatHeatmapTooltip,
  getCellAriaLabel,
  HEATMAP_INTENSITY_CLASSES,
  HEATMAP_WEEKDAY_LABELS,
} from '../../utils/heatmapHelpers';

const CELL_SIZE = 11;
const CELL_GAP = 2;

const findCellPosition = (weeks, date) => {
  for (let weekIndex = 0; weekIndex < weeks.length; weekIndex += 1) {
    const dayIndex = weeks[weekIndex].findIndex((day) => day.date === date && !day.isPadding);
    if (dayIndex >= 0) return { weekIndex, dayIndex };
  }
  return null;
};

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
  const [focusedDate, setFocusedDate] = useState(selectedDate || grid.today);
  const gridWidth = grid.weeks.length * CELL_SIZE + Math.max(0, grid.weeks.length - 1) * CELL_GAP;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
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
          className="block rounded-[2px]"
          style={{ width: CELL_SIZE, height: CELL_SIZE }}
        />
      );
    }

    const isSelected = selectedDate === day.date;
    const isFocused = focusedDate === day.date;
    const intensityClass = HEATMAP_INTENSITY_CLASSES[day.intensity] || HEATMAP_INTENSITY_CLASSES[0];
    const ringClass = isSelected
      ? 'ring-2 ring-inset ring-emerald-700 dark:ring-emerald-300'
      : day.isToday
        ? 'ring-1 ring-inset ring-gray-900 dark:ring-white'
        : 'ring-1 ring-inset ring-black/5 dark:ring-white/10';

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
        className={`block rounded-[2px] ${intensityClass} ${ringClass} motion-safe:transition-transform motion-safe:hover:scale-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-emerald-500 dark:focus-visible:ring-offset-black`}
        style={{ width: CELL_SIZE, height: CELL_SIZE }}
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
      <div className="flex gap-2">
        <div className="flex flex-col pt-4" aria-hidden="true">
          {HEATMAP_WEEKDAY_LABELS.map((label, index) => (
            <span
              key={`weekday-${index}`}
              className="text-[10px] leading-[11px] text-gray-500 dark:text-gray-400"
              style={{ height: CELL_SIZE, marginBottom: index === 6 ? 0 : CELL_GAP }}
            >
              {label}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          <div
            ref={scrollRef}
            className="overflow-x-auto pb-1 [scrollbar-width:thin]"
          >
            <div role="grid" aria-label="Preparation activity for the past year" style={{ width: gridWidth }}>
              <div className="relative mb-1 h-4">
                {grid.monthLabels.map((label, index) => (
                  label ? (
                    <span
                      key={`month-${label}-${index}`}
                      className="absolute top-0 text-[10px] leading-4 text-gray-500 dark:text-gray-400"
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
          <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white dark:from-[#0A0A0A]" />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 text-[11px] text-gray-500 dark:text-gray-400">
        <span>Less</span>
        {HEATMAP_INTENSITY_CLASSES.map((tone, level) => (
          <span
            key={`legend-${level}`}
            className={`h-[11px] w-[11px] rounded-[2px] ring-1 ring-inset ring-black/5 dark:ring-white/10 ${tone}`}
            aria-hidden="true"
          />
        ))}
        <span>More</span>
      </div>

      {tooltip && (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-lg border border-gray-200 bg-white/95 px-3 py-2 text-xs text-gray-700 shadow-xl dark:border-white/10 dark:bg-gray-900/95 dark:text-gray-200"
          style={{ left: tooltip.x, top: tooltip.y - 8 }}
        >
          <p className="font-medium text-gray-900 dark:text-white">
            {formatHeatmapTooltip(tooltip.day)}
          </p>
          {tooltip.day.tracks?.length > 0 && (
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              {tooltip.day.tracks.join(' · ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default HeatmapGrid;
