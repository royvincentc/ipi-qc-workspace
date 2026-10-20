import {Fragment, useEffect, useMemo, useState, type CSSProperties} from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight, CalendarDays, ChevronLeft, ChevronRight, FileText, FlaskConical, FolderOpen, Plus, RefreshCw, Search, SlidersHorizontal, X} from './components/LabIcons';
import {api} from './api';
import {useConfiguration} from './configuration';
import {ErrorBox, useCanEdit} from './ui';
import {LabGraphic} from './LabGraphic';
import {isConstrainedDevice} from './motion';
import {ReceptionChart, RECEPTION_CATEGORIES, receptionCategoryColor} from './ReceptionChart';
import {LabIconPlus, LabIconDossier, LabIconArchive, LabIconArrow, LabSpecimenBadge} from './components/LabIcons';
import type {ReceptionOverview} from '../shared/reception';

const dateLabel = (date: string, options: Intl.DateTimeFormatOptions = {day: '2-digit', month: 'short'}) =>
  new Intl.DateTimeFormat('en-GB', {...options, timeZone: 'UTC'}).format(new Date(`${date}T12:00:00Z`));
const monthLabel = (month: string) => dateLabel(`${month}-01`, {month: 'long', year: 'numeric'});
const moveMonth = (month: string, amount: number) => {
  const date = new Date(`${month}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 7);
};
const laboratoryDate = (timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en', {timeZone, year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(new Date());
  return ['year', 'month', 'day'].map(key => parts.find(part => part.type === key)!.value).join('-');
};

export function ReceptionDashboard() {
  const {config, theme} = useConfiguration();
  const canEdit = useCanEdit();
  const [today, setToday] = useState(() => laboratoryDate(config.value.general.timezone));
  const [chosenMonth, setChosenMonth] = useState('');
  const month = chosenMonth || today.slice(0, 7);
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [version, setVersion] = useState(0);
  const [data, setData] = useState<ReceptionOverview>();
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [motion, setMotion] = useState(() => {
    try { return localStorage.getItem('ipi.reception.motion') !== 'off' && !isConstrainedDevice(); }
    catch { return !isConstrainedDevice(); }
  });
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [visible, setVisible] = useState(() => !document.hidden);
  const animate = motion && !reducedMotion;

  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(query.trim()); setPage(1); }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const preference = () => setReducedMotion(media.matches);
    const visibility = () => {
      setVisible(!document.hidden);
      if (!document.hidden) setToday(laboratoryDate(config.value.general.timezone));
    };
    const refresh = () => setVersion(value => value + 1);
    const timer = window.setInterval(() => setToday(laboratoryDate(config.value.general.timezone)), 60_000);
    media.addEventListener('change', preference);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('ipi:sync-complete', refresh);
    return () => {
      window.clearInterval(timer);
      media.removeEventListener('change', preference);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('ipi:sync-complete', refresh);
    };
  }, [config.value.general.timezone]);
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError('');
    const params = new URLSearchParams({month, category, q: search, status, date: selectedDate, page: String(page)});
    api<ReceptionOverview>(`/reception?${params}`).then(result => {
      if (active) {
        setData(result);
        setPage(result.page);
      }
    }).catch(reason => {
      if (active) setError(reason instanceof Error ? reason.message : 'Sample receipts could not be loaded.');
    }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [month, category, search, status, selectedDate, page, version, today]);
  useEffect(() => {
    try { localStorage.setItem('ipi.reception.motion', motion ? 'on' : 'off'); } catch { /* The control still works without storage. */ }
  }, [motion]);
  useEffect(() => {
    const workspace = document.querySelector('.app-workspace');
    if (!workspace) return;
    workspace.classList.toggle('reception-motion', animate);
    workspace.classList.toggle('motion-off', !animate);
  }, [animate]);

  const overview = data?.month === month ? data : undefined;
  const categoryOptions = useMemo(() => {
    const defaults = RECEPTION_CATEGORIES.map(item => ({
      ...item, name: config.value.sampleTypes.find(type => type.id === item.id)?.name || item.label,
    }));
    const extras = [...new Set([
      ...Object.keys(overview?.totals || {}),
      ...(overview?.days.flatMap(day => Object.keys(day.counts)) || []),
      ...(overview?.items.map(item => item.category) || []),
    ])].filter(id => !defaults.some(item => item.id === id)).sort();
    return [...defaults, ...extras.map(id => ({
      id, label: id, color: receptionCategoryColor(id),
      name: config.value.sampleTypes.find(type => type.id === id)?.name || id,
    }))];
  }, [config.value.sampleTypes, overview]);
  const peak = overview?.days.filter(day => day.date.startsWith(month)).reduce<ReceptionOverview['days'][number] | undefined>(
    (best, day) => !best || day.total > best.total ? day : best, undefined,
  );
  const hasFilters = Boolean(category || query || status || selectedDate);
  const chooseDate = (date: string) => {
    const next = selectedDate === date ? '' : date;
    setSelectedDate(next);
    setPage(1);
    if (next) {
      window.requestAnimationFrame(() => document.getElementById('reception-log')?.scrollIntoView({behavior: animate ? 'smooth' : 'auto', block: 'nearest'}));
    }
  };
  const changeMonth = (value: string) => { setChosenMonth(value); setSelectedDate(''); setPage(1); };
  const clearFilters = () => { setCategory(''); setQuery(''); setStatus(''); setSelectedDate(''); setPage(1); };
  const pages = Math.max(1, Math.ceil((overview?.tableTotal || 0) / (overview?.pageSize || 30)));

  return (
    <div className={`reception-home ${animate ? 'reception-motion' : 'motion-off'} ${visible ? '' : 'motion-paused'}`}>
      <header className="reception-heading">
        <div>
          <h1>Microbiology workspace</h1>
          <div className="reception-motion-control">
            {/* Pill and dotted arrow adapted from Uiverse.io by vinodjangid07. */}
            <button type="button" className="reception-motion-button"
              aria-label={`Motion preview: ${motion && !reducedMotion ? 'Pause motion' : 'Preview motion'}`}
              aria-pressed={motion && !reducedMotion} disabled={reducedMotion}
              title={motion ? 'Pause ambient motion and chart animations' : 'Replay the chart entrance and resume ambient motion'}
              onClick={() => setMotion(value => !value)}>
              <span>{motion && !reducedMotion ? 'Pause motion' : 'Preview motion'}</span>
              <span className="reception-motion-icon" aria-hidden="true">
                <svg width="16" height="19" viewBox="0 0 16 19" fill="currentColor">
                  <circle cx="1.613" cy="1.613" r="1.5"/><circle cx="5.736" cy="1.613" r="1.5"/>
                  <circle cx="5.736" cy="5.557" r="1.5"/><circle cx="9.859" cy="5.557" r="1.5"/>
                  <circle cx="9.859" cy="9.5" r="1.5"/><circle cx="13.981" cy="9.5" r="1.5"/>
                  <circle cx="5.736" cy="13.443" r="1.5"/><circle cx="9.859" cy="13.443" r="1.5"/>
                  <circle cx="1.613" cy="17.387" r="1.5"/><circle cx="5.736" cy="17.387" r="1.5"/>
                </svg>
              </span>
            </button>
            <small className="reception-motion-status" aria-live="polite">
              {reducedMotion ? 'Reduced motion is on' : motion ? 'Live' : 'Paused'}
            </small>
          </div>
        </div>
        <nav className="reception-actions" aria-label="Workspace shortcuts">
          {canEdit ? <Link to="/new" aria-label="Log a sample" title="Log a sample"><LabIconPlus size={22}/></Link> : null}
          <Link to="/reports" aria-label="Open results and reports" title="Results and reports"><LabIconDossier size={22}/></Link>
          <Link to="/library" aria-label="Open file library" title="File library"><LabIconArchive size={22}/></Link>
        </nav>
      </header>

      <section className="reception-chart-panel reception-glass" aria-label="Daily sample receipts">
        <nav className="reception-month" aria-label="Chart month">
          <button type="button" aria-label="Previous month" onClick={() => changeMonth(moveMonth(month, -1))}><ChevronLeft size={19}/></button>
          <span aria-live="polite">{monthLabel(month)}</span>
          <button type="button" aria-label="Next month" disabled={month >= today.slice(0, 7)}
            onClick={() => changeMonth(moveMonth(month, 1))}><ChevronRight size={19}/></button>
        </nav>
        <div className="reception-chart-heading">
          <div className="reception-total">
            <h2>Samples received</h2>
            <div><strong>{overview ? overview.total.toLocaleString() : '\u2014'}</strong><span>this month</span></div>
            <p>{peak?.total ? <>Peak day <span aria-hidden="true">&middot;</span> {dateLabel(peak.date)} <span aria-hidden="true">&middot;</span> {peak.total} samples</> : busy ? 'Loading recorded receipts\u2026' : 'No dated receipts this month'}</p>
          </div>
          <div className="reception-legend" role="group" aria-label="Filter samples by category">
            {categoryOptions.map(item => <button type="button" key={item.id}
              className={category === item.id ? 'is-selected' : ''} aria-pressed={category === item.id}
              title={`Filter ${item.name}`} onClick={() => { setCategory(current => current === item.id ? '' : item.id); setPage(1); }}>
              <i style={{'--category-color': item.color} as CSSProperties}/><span>{item.label}</span><b>{(overview?.totals[item.id] || 0).toLocaleString()}</b>
            </button>)}
          </div>
          <div className="reception-specimen"><LabGraphic kind="dish"/></div>
        </div>
        {error ? <div className="reception-chart-error"><ErrorBox message={error}/><button type="button" className="button secondary" onClick={() => setVersion(value => value + 1)}><RefreshCw size={16}/>Retry receipts</button></div> :
          overview ? <ReceptionChart days={overview.days} month={month} today={overview.today} selectedDate={selectedDate}
            category={category} theme={theme} animate={animate} onSelectDate={chooseDate}/> :
            <div className="reception-chart-placeholder" role="status">Loading daily receipts<span/></div>}
        <div className="reception-chart-help">
          <span>{selectedDate ? `Showing receipts for ${dateLabel(selectedDate, {day: 'numeric', month: 'short', year: 'numeric'})}` : 'Select a day to explore its samples'}</span>
          {selectedDate ? <button type="button" onClick={() => { setSelectedDate(''); setPage(1); }}>Clear day <X size={13}/></button> : null}
          {month < today.slice(0, 7) ? <button type="button" onClick={() => changeMonth(today.slice(0, 7))}>Return to current month</button> : null}
        </div>
      </section>

      <section id="reception-log" className={`reception-log reception-glass ${selectedDate ? 'has-selected-day' : ''} ${busy ? 'is-updating' : ''}`} aria-labelledby="reception-log-heading">
        <div className="reception-log-progress" aria-hidden="true"><span/></div>
        <div className="reception-log-heading">
          <div className="reception-log-title">
            <h2 id="reception-log-heading">Sample log</h2>
            {selectedDate ? <button type="button" key={selectedDate} className="reception-selected-day"
              aria-label={`Clear selected day ${dateLabel(selectedDate)}`} onClick={() => chooseDate('')}>
              <CalendarDays size={14}/><time dateTime={selectedDate}>{dateLabel(selectedDate)}</time><X size={13}/>
            </button> : null}
          </div>
          <div className="reception-search-row">
            <label className="reception-search"><Search size={19} aria-hidden="true"/>
              <input aria-label="Search sample log" placeholder="Search by sample ID, product, batch or location" value={query} onChange={event => setQuery(event.target.value)}/>
              {query ? <button type="button" aria-label="Clear sample search" onClick={() => setQuery('')}><X size={16}/></button> : null}
            </label>
            <button type="button" className={`reception-filter-button ${filtersOpen || status || selectedDate ? 'is-active' : ''}`}
              aria-label="Sample log filters" aria-controls="reception-log-filters" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(value => !value)}>
              <SlidersHorizontal size={21}/>
            </button>
          </div>
        </div>
        <div className="reception-categories" role="group" aria-label="Sample log category">
          {[{id: '', label: 'All samples', color: ''}, ...categoryOptions].map(item => <button type="button" key={item.id}
            style={{'--category-color': item.color} as CSSProperties}
            aria-pressed={category === item.id} onClick={() => { setCategory(item.id); setPage(1); }}>
            {item.color ? <i aria-hidden="true"/> : null}{item.label}
          </button>)}
        </div>
        {filtersOpen ? <div className="reception-filters" id="reception-log-filters" onKeyDown={event => { if (event.key === 'Escape') { setFiltersOpen(false); document.querySelector<HTMLButtonElement>('.reception-filter-button')?.focus(); } }}>
          <label>Source status<select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">All statuses</option>
            {overview?.statuses.map(value => <option key={value}>{value}</option>)}</select></label>
          <label>Received on<input type="date" value={selectedDate} max={today} onChange={event => { setSelectedDate(event.target.value); setPage(1); }}/></label>
          {hasFilters ? <button type="button" className="reception-clear" onClick={clearFilters}>Clear filters <X size={14}/></button> : null}
        </div> : null}
        <div className="reception-results-meta" aria-live="polite" role="status">
          {busy ? 'Updating sample log\u2026' : error ? 'Receipts unavailable. Use Retry receipts above.' :
            `${overview?.tableTotal.toLocaleString() || 0} matching samples${selectedDate ? ` \u00b7 ${dateLabel(selectedDate, {day: 'numeric', month: 'short', year: 'numeric'})}` : ''}`}
          {!filtersOpen && hasFilters ? <button type="button" onClick={clearFilters}>Clear filters <X size={13}/></button> : null}
        </div>
        <div className={`reception-table-scroll ${busy ? 'is-loading' : ''}`} tabIndex={0} role="region" aria-label="Sample log, scroll for more records and columns" aria-busy={busy}>
          <table className="reception-table">
            <caption className="sr-only">Samples grouped by type, newest receipt first within each type. All source statuses are recorded values.</caption>
            <thead><tr><th scope="col">Sample / Product</th><th scope="col">Sample ID</th><th scope="col">Batch / Lot</th><th scope="col">Received</th><th scope="col">Source status</th><th scope="col"><span className="sr-only">Open</span></th></tr></thead>
            {!error && overview ? categoryOptions.map(item => {
              const samples = overview.items.filter(sample => sample.category === item.id);
              return samples.length ? <tbody key={item.id} style={{'--category-color': item.color} as CSSProperties}>
                <tr className="reception-group">
                  <th scope="rowgroup" colSpan={6}>
                    <span className="reception-group-tag">{item.label}</span>
                    <span className="reception-group-name">{item.name}</span>
                    <span className="reception-group-count">{samples.length} {samples.length === 1 ? 'sample' : 'samples'}</span>
                  </th>
                </tr>
                {samples.map(sample => <tr key={sample.id}>
                  <td>
                    <Link className="reception-product" to={`/samples/${encodeURIComponent(sample.id)}`}>
                      <span className="reception-specimen-cell" title={item.name}>
                        <LabSpecimenBadge category={sample.category} size={18}/>
                      </span>
                      <strong>{sample.name || 'Incomplete record'}</strong>
                    </Link>
                  </td>
                  <td className="reception-id">{sample.ml || 'Not recorded'}</td>
                  <td>{sample.batch || 'Not recorded'}</td>
                  <td>{sample.receiptDate ? <time dateTime={sample.receiptDate} title={sample.received}>{dateLabel(sample.receiptDate, {day: '2-digit', month: 'short', year: 'numeric'})}</time> : 'Not recorded'}</td>
                  <td><span className={`reception-status-badge status-${(sample.status || 'unrecorded').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}><i className="status-dot" aria-hidden="true"/>{sample.status || 'Not recorded'}</span></td>
                  <td><Link className="reception-open" to={`/samples/${encodeURIComponent(sample.id)}`} aria-label={`Open sample ${sample.ml || sample.name}`}><LabIconArrow size={16}/></Link></td>
                </tr>)}
              </tbody> : <Fragment key={item.id}/>;
            }) : null}
          </table>
          {!busy && !error && !overview?.items.length ? <div className="reception-empty"><FlaskConical size={27}/><strong>{hasFilters ? 'No samples match these filters' : 'No receipts recorded for this month'}</strong>
            <p>{hasFilters ? 'Try another day or search, or clear your filters.' : 'Choose another month or log a sample to begin.'}</p>
            {hasFilters ? <button type="button" className="button secondary" onClick={clearFilters}>Clear filters</button> : canEdit ? <Link className="button secondary" to="/new">Log a sample <Plus size={16}/></Link> : null}</div> : null}
          {busy && !overview ? <p className="reception-table-loading">Loading sample log\u2026</p> : null}
        </div>
        <footer className="reception-log-footer">
          <span>Newest receipt first within each sample type{overview?.undated ? ` \u00b7 ${overview.undated.toLocaleString()} records without a valid receipt date excluded` : ''}</span>
          {pages > 1 ? <nav aria-label="Sample log pages"><button type="button" disabled={busy || page <= 1} onClick={() => setPage(value => value - 1)} aria-label="Previous sample page"><ChevronLeft size={17}/></button><span>{page} / {pages}</span><button type="button" disabled={busy || page >= pages} onClick={() => setPage(value => value + 1)} aria-label="Next sample page"><ChevronRight size={17}/></button></nav> : null}
        </footer>
      </section>
    </div>
  );
}
