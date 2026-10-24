import {useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent} from 'react';
import {init, use, type EChartsType, type ComposeOption} from 'echarts/core';
import {BarChart, type BarSeriesOption} from 'echarts/charts';
import {GridComponent, type GridComponentOption} from 'echarts/components';
import {CanvasRenderer} from 'echarts/renderers';
import type {ReceptionDayCount} from '../shared/reception';
import {formatReceptionCategory} from '../shared/reception';
import {isConstrainedDevice} from './motion';

use([BarChart, GridComponent, CanvasRenderer]);

export const RECEPTION_CATEGORIES = [
  {id: 'SFG', label: 'SFG', color: '#FF2070'},
  {id: 'FG', label: 'FG', color: '#2B3024'},
  {id: 'ST', label: 'STAB', color: '#D4B200'},
  {id: 'MIS', label: 'MISC', color: '#6E7565'},
  {id: 'WS', label: 'WATER', color: '#2563EB'},
  {id: 'RM', label: 'RM', color: '#B81B58'},
  {id: 'EM', label: 'EM', color: '#65A30D'},
];
export const receptionCategoryColor = (id: string) =>
  RECEPTION_CATEGORIES.find(item => item.id === id)?.color || '#6E7565';
const labelDate = (date: string, month = false) => new Intl.DateTimeFormat('en-GB', {
  day: '2-digit', ...(month ? {month: 'short'} : {}), timeZone: 'UTC',
}).format(new Date(`${date}T12:00:00Z`));

type Props = {
  days: ReceptionDayCount[];
  month: string;
  today: string;
  selectedDate: string;
  category: string;
  theme: 'light' | 'dark';
  animate: boolean;
  onSelectDate: (date: string) => void;
};

export function ReceptionChart({days, month, today, selectedDate, category, theme, animate, onSelectDate}: Props) {
  const [lowPerformance] = useState(isConstrainedDevice);
  const mount = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const chart = useRef<EChartsType | null>(null);
  const revealState = useRef({month: '', animate: false});
  const controls = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({width: 0, height: 0});
  const [hovered, setHovered] = useState<number | null>(null);
  const [focusIndex, setFocusIndex] = useState(days.length - 1);
  const instructions = useId();
  const categories = [...RECEPTION_CATEGORIES, ...[...new Set(days.flatMap(day => Object.keys(day.counts)))]
    .filter(id => !RECEPTION_CATEGORIES.some(item => item.id === id))
    .sort().map(id => ({id, label: formatReceptionCategory(id), color: receptionCategoryColor(id)}))];
  const boundary = days.findIndex(day => day.date.startsWith(month));
  const monthDays = days.filter(day => day.date.startsWith(month));
  const peak = monthDays.reduce<ReceptionDayCount | undefined>((best, day) => !best || day.total > best.total ? day : best, undefined);
  const selectedIndex = days.findIndex(day => day.date === selectedDate);
  const activeIndex = hovered ?? (selectedIndex >= 0 ? selectedIndex : null);
  const active = activeIndex === null ? undefined : days[activeIndex];
  const max = Math.max(1, ...days.map(day => day.total));
  const plotHeight = Math.max(100, size.height - 60);
  const gap = 2;
  const maxSegments = Math.max(1, ...days.map(day => Object.values(day.counts).filter(count => count > 0).length));
  const maxValue = max * 1.08 / (1 - (maxSegments - 1) * gap / plotHeight);
  const gapValue = maxValue * gap / plotHeight;
  const activeX = 7 + (size.width - 14) * (((activeIndex ?? 0) + .5) / days.length);
  const tooltipX = Math.max(84, Math.min(size.width - 84, activeX + (activeX > 184 ? -100 : 100)));

  useEffect(() => {
    if (!mount.current) return;
    const instance = init(mount.current, undefined, {renderer: 'canvas', devicePixelRatio: Math.min(window.devicePixelRatio || 1, lowPerformance ? 1 : 2)});
    chart.current = instance;
    const resize = new ResizeObserver(([entry]) => {
      if (!entry.contentRect.width || !entry.contentRect.height) return;
      instance.resize();
      setSize({width: entry.contentRect.width, height: entry.contentRect.height});
    });
    resize.observe(mount.current);
    return () => { resize.disconnect(); instance.dispose(); chart.current = null; };
  }, []);
  useEffect(() => {
    setHovered(null);
    setFocusIndex(days.length - 1);
    // On narrow screens the current day is visible first; earlier context is a pan away.
    if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth;
  }, [month, days.length]);
  useEffect(() => {
    if (selectedIndex >= 0) setFocusIndex(selectedIndex);
  }, [selectedIndex]);
  useEffect(() => {
    const instance = chart.current;
    if (!instance || !size.width || !size.height) return;
    const reveal = animate && (revealState.current.month !== month || !revealState.current.animate);
    revealState.current = {month, animate};
    const foreground = theme === 'dark' ? '#b8bca9' : '#4a4e44';
    const axisLine = theme === 'dark' ? 'rgba(246,247,242,.18)' : 'rgba(12,14,9,.14)';
    const series: BarSeriesOption[] = [];
    categories.forEach((item, position) => {
      series.push({
        id: item.id, name: item.label, type: 'bar', stack: 'received', barWidth: '71%',
        silent: true, emphasis: {disabled: true}, animationDuration: animate ? (lowPerformance ? 360 : 680) : 0,
        animationDelay: index => index * (lowPerformance ? 6 : 14), animationDurationUpdate: animate ? 240 : 0,
        data: days.map((day, index) => {
          const highlighted = day.date === selectedDate || day.date === peak?.date || index === days.length - 1;
          const previous = !day.date.startsWith(month);
          const dimmed = Boolean(category && category !== item.id);
          const value = day.counts[item.id] || 0;
          const opacity = !value ? 0 : dimmed ? .16 : highlighted ? 1 : previous ? .22 : .57;
          return {value: day.counts[item.id] || 0, itemStyle: {
            borderRadius: 4, opacity,
            color: item.color,
          }};
        }),
      });
      if (position < categories.length - 1) series.push({
        id: `gap-${item.id}`, name: `gap-${item.id}`, type: 'bar', stack: 'received', silent: true, barWidth: '71%',
        itemStyle: {color: 'transparent'}, emphasis: {disabled: true},
        animation: false,
        data: days.map(day => day.counts[item.id] > 0 && categories.slice(position + 1).some(next => day.counts[next.id] > 0) ? gapValue : 0),
      });
    });
    const option: ComposeOption<BarSeriesOption | GridComponentOption> = {
      animation: animate, animationEasing: 'cubicOut', animationEasingUpdate: 'cubicOut',
      grid: {left: 7, right: 7, top: 22, bottom: 38},
      xAxis: {
        type: 'category', data: days.map(day => day.date), axisTick: {show: false},
        axisLine: {lineStyle: {color: axisLine}},
        axisLabel: {
          interval: 0, color: foreground, fontSize: 11, margin: 12, hideOverlap: true,
          formatter: (date: string, index: number) => {
            const isLast = index === days.length - 1;
            const tick = index === 0 || isLast || index === boundary || index === boundary + 7 ||
              (index % 7 === 0 && (index < boundary - 2 || index > boundary + 2));
            if (!tick) return '';
            const text = labelDate(date, index === 0 || isLast || index === boundary);
            return date === today ? `${text}\n{today|Today}` : text;
          },
          rich: {today: {fontSize: 11, fontWeight: 700, color: theme === 'dark' ? '#fcff1a' : '#ff2070', lineHeight: 17}},
        },
      },
      yAxis: {type: 'value', min: 0, max: maxValue, show: false},
      series,
    };
    // Re-enabling preview must replay the entrance, even with the same month and data.
    if (reveal) { instance.clear(); instance.setOption(option, {notMerge: true, replaceMerge: ['series']}); } else { instance.setOption(option, {notMerge: false}); }
  }, [days, month, today, selectedDate, category, theme, animate, size]);

  const navigate = (event: KeyboardEvent<HTMLDivElement>) => {
    let next = focusIndex;
    if (event.key === 'ArrowRight') next = Math.min(days.length - 1, focusIndex + 1);
    else if (event.key === 'ArrowLeft') next = Math.max(0, focusIndex - 1);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = days.length - 1;
    else if (event.key === 'Escape') { setHovered(null); if (selectedDate) onSelectDate(''); return; }
    else return;
    event.preventDefault();
    controls.current?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus();
  };
  const monthName = (date: string) => new Intl.DateTimeFormat('en', {month: 'long', timeZone: 'UTC'}).format(new Date(`${date}T12:00:00Z`));

  return (
    <div className="reception-chart" ref={scroller}>
      <p className="sr-only" id={instructions}>Daily received samples, oldest on the left and latest on the right. Use Left and Right arrows, Home and End to explore. Enter or Space filters the sample log to a day. Escape clears that day.</p>
      <div className="reception-chart-plot" onPointerLeave={() => setHovered(null)}>
        <div ref={mount} className="reception-chart-canvas" aria-hidden="true"/>
        <div className="reception-month-labels" aria-hidden="true">
          {boundary > 0 ? <span>{monthName(days[0].date)}</span> : null}
          <span className="is-current" style={{left: boundary > 0 ? `calc(${boundary / days.length * 100}% + 14px)` : 0}}>{monthName(`${month}-01`)}</span>
        </div>
        {boundary > 0 ? <div className="reception-month-divider" aria-hidden="true" style={{left: `calc(7px + (100% - 14px) * ${boundary / days.length})`}}/> : null}
        <div className="reception-chart-controls" ref={controls} role="group" aria-label="Explore daily receipts" aria-describedby={instructions}
          onKeyDown={navigate} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setHovered(null); }}
          style={{gridTemplateColumns: `repeat(${days.length},minmax(0,1fr))`}}>
          {days.map((day, index) => <button type="button" key={day.date} tabIndex={focusIndex === index ? 0 : -1}
            aria-label={`${labelDate(day.date, true)}: ${day.total} samples. ${categories.map(item => `${item.label} ${day.counts[item.id] || 0}`).join(', ')}`}
            aria-pressed={selectedDate === day.date} aria-controls="reception-log" data-date={day.date}
            onFocus={() => { setFocusIndex(index); setHovered(index); }} onPointerEnter={() => setHovered(index)}
            onClick={() => onSelectDate(day.date)}/>)}
        </div>
        {active ? <div className="reception-chart-tooltip" style={{left: tooltipX, top: Math.max(18, plotHeight * (1 - active.total / maxValue) - 132)}} aria-hidden="true">
          <strong>{labelDate(active.date, true)}</strong>
          {categories.filter(item => active.counts[item.id]).map(item => <div key={item.id}><i style={{'--category-color': item.color} as CSSProperties}/><span>{item.label}</span><b>{active.counts[item.id]}</b></div>)}
          <footer><span>Total</span><b>{active.total}</b></footer>
        </div> : null}
      </div>
    </div>
  );
}
