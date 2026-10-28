import { useEffect, useState, type ReactNode } from 'react';
import type { AdminStatsResponse } from '../../shared/api';
import { FEATURE_EVENTS, FUNNEL_EVENTS } from '../../shared/stats';
import { fetchAdminStats } from '../lib/api';
import { EmptyState, LoadingState } from './ui';
import { Username } from './Username';

type Result =
  { ok: true; data: AdminStatsResponse } | { ok: false; error: string };

/** Weeks shown, each starting on Monday. */
type Range = 1 | 4;

const RANGES: { id: Range; label: string }[] = [
  { id: 1, label: 'This week' },
  { id: 4, label: '4 weeks' },
];

/** "this week" / "the last 4 weeks", for sentences. */
const rangeText = (range: Range) =>
  range === 1 ? 'this week' : 'the last 4 weeks';
type Metric = 'activeUsers' | 'ratings' | 'newUsers';

const METRICS: { id: Metric; label: string }[] = [
  { id: 'activeUsers', label: 'Active users' },
  { id: 'ratings', label: 'New ratings' },
  { id: 'newUsers', label: 'New users' },
];

const label = (map: Record<string, string>, key: string) => map[key] ?? key;

const formatDay = (date: string, long: boolean) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN', {
    timeZone: 'UTC',
    ...(long ? { day: 'numeric', month: 'short' } : { weekday: 'short' }),
  });

const pct = (part: number, whole: number) =>
  whole > 0 ? `${Math.round((part / whole) * 100)}%` : '–';

/** A small pill toggle (7 / 30 days, or which metric to chart). */
const Toggle = <T extends string | number>({
  options,
  value,
  onChange,
  label: aria,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) => (
  <div
    role="radiogroup"
    aria-label={aria}
    className="flex rounded-full border border-line bg-soft p-0.5"
  >
    {options.map((o) => (
      <button
        key={o.id}
        role="radio"
        aria-checked={value === o.id}
        onClick={() => onChange(o.id)}
        className={`flex-1 rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
          value === o.id ? 'bg-cta text-cta-ink' : 'text-muted hover:text-ink'
        }`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

/** Rounded box holding a block of stats (titles stay outside). */
const Card = ({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={`rounded-2xl border border-line bg-surface p-4 shadow-sm backdrop-blur ${className}`}
  >
    {children}
  </div>
);

const Heading = ({ children }: { children: string }) => (
  <h2 className="px-1 text-base font-extrabold text-ink">{children}</h2>
);

/** A labelled horizontal bar: label, count and a bar scaled to `max`. */
const BarRow = ({
  name,
  count,
  max,
  note,
}: {
  name: ReactNode;
  count: number;
  max: number;
  note?: string;
}) => (
  <li className="flex flex-col gap-1">
    <div className="flex items-baseline justify-between gap-2 text-sm">
      <span className="min-w-0 truncate font-semibold text-ink">{name}</span>
      <span className="shrink-0 font-extrabold text-ink tabular-nums">
        {count}
        {note && (
          <span className="ml-1.5 text-xs font-semibold text-muted">
            {note}
          </span>
        )}
      </span>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-soft">
      <div
        className="bar-grow h-full rounded-full bg-cta"
        style={{ width: `${max > 0 ? (count / max) * 100 : 0}%` }}
      />
    </div>
  </li>
);

/**
 * Bars per day for one metric, Monday first. Days later this week show as
 * empty outlines. Values sit above the bars on the one-week view.
 */
const DayChart = ({
  days,
  metric,
}: {
  days: AdminStatsResponse['days'];
  metric: Metric;
}) => {
  const max = Math.max(1, ...days.map((d) => d[metric]));
  const long = days.length > 7;
  const todayIndex = days.findLastIndex((d) => !d.upcoming);
  return (
    <div>
      <ol
        className={`flex h-36 items-end ${long ? 'gap-0.5' : 'gap-2'}`}
        aria-label="Daily counts"
      >
        {days.map((day, i) => (
          <li
            key={day.date}
            className="flex h-full flex-1 flex-col items-center justify-end gap-1"
            title={
              day.upcoming
                ? `${formatDay(day.date, true)}: not yet`
                : `${formatDay(day.date, true)}: ${day[metric]}`
            }
          >
            {!long && !day.upcoming && (
              <span className="text-[11px] font-bold text-ink tabular-nums">
                {day[metric]}
              </span>
            )}
            {day.upcoming ? (
              <span className="h-2 w-full rounded-t-md border border-b-0 border-dashed border-line" />
            ) : (
              <span
                className={`w-full rounded-t-md bg-cta transition-[height] duration-500 ${
                  i === todayIndex ? '' : 'opacity-85'
                }`}
                style={{
                  height: `${(day[metric] / max) * 100}%`,
                  minHeight: day[metric] > 0 ? 3 : 1,
                  ...(day[metric] > 0 ? {} : { opacity: 0.25 }),
                }}
              />
            )}
          </li>
        ))}
      </ol>
      <div className="mt-1.5 flex text-[10px] font-semibold text-muted">
        {long
          ? // One label per week: the date of its Monday.
            days
              .filter((_, i) => i % 7 === 0)
              .map((day) => (
                <span key={day.date} className="flex-1 px-0.5">
                  {formatDay(day.date, true)}
                </span>
              ))
          : days.map((day, i) => (
              <span
                key={day.date}
                className={`flex-1 text-center ${i === todayIndex ? 'font-extrabold text-ink' : ''}`}
              >
                {i === todayIndex ? 'Today' : formatDay(day.date, false)}
              </span>
            ))}
      </div>
    </div>
  );
};

/** Admin analytics: totals, daily activity, top raters, usage, add flow. */
export const AdminStats = ({ refreshKey }: { refreshKey: number }) => {
  const [range, setRange] = useState<Range>(1);
  const [metric, setMetric] = useState<Metric>('activeUsers');
  const [result, setResult] = useState<{ for: Range } & Result>();

  useEffect(() => {
    let cancelled = false;
    fetchAdminStats(range)
      .then((data) => !cancelled && setResult({ for: range, ok: true, data }))
      .catch((err: Error) => {
        if (!cancelled)
          setResult({ for: range, ok: false, error: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, [range, refreshKey]);

  const current = result?.for === range ? result : undefined;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-3 px-1">
        <h2 className="text-lg font-extrabold text-ink">Overview</h2>
        <div className="w-44">
          <Toggle
            label="Time range"
            options={RANGES}
            value={range}
            onChange={setRange}
          />
        </div>
      </div>

      {!current ? (
        <LoadingState />
      ) : !current.ok ? (
        <EmptyState>Couldn't load stats: {current.error}</EmptyState>
      ) : (
        <Overview
          data={current.data}
          metric={metric}
          onMetric={setMetric}
          range={range}
        />
      )}
    </div>
  );
};

const Overview = ({
  data,
  metric,
  onMetric,
  range,
}: {
  data: AdminStatsResponse;
  metric: Metric;
  onMetric: (metric: Metric) => void;
  range: Range;
}) => {
  const { totals, days, topRaters, features, funnel } = data;
  const tiles = [
    { label: 'Ratings', value: totals.ratings },
    { label: 'Raters', value: totals.raters },
    { label: 'Food categories', value: totals.categories },
    { label: 'Users seen', value: totals.users },
  ];
  const featureMax = Math.max(0, ...features.map((f) => f.count));
  const raterMax = topRaters[0]?.count ?? 0;
  const [firstStep] = funnel;
  const sum = (key: Metric) => days.reduce((s, d) => s + d[key], 0);

  return (
    <>
      {/* Totals, all time. */}
      <div className="-mt-4 grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <Card key={t.label} className="flex flex-col gap-1">
            <p className="text-3xl leading-none font-extrabold text-ink tabular-nums">
              {t.value.toLocaleString('en-IN')}
            </p>
            <p className="text-xs font-semibold text-muted">{t.label}</p>
          </Card>
        ))}
      </div>

      <section className="flex flex-col gap-3">
        <Heading>Daily activity</Heading>
        <Card className="flex flex-col gap-4">
          <Toggle
            label="Metric"
            options={METRICS}
            value={metric}
            onChange={onMetric}
          />
          <DayChart days={days} metric={metric} />
        </Card>
        <p className="px-1 text-xs text-muted">
          {range === 1 ? 'This week' : 'Last 4 weeks'} (from Monday):{' '}
          {sum('ratings')} new ratings, {sum('newUsers')} new users,{' '}
          {data.edits} edits and {data.deletes} deletions.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <Heading>Add to tier flow</Heading>
        <p className="-mt-1 px-1 text-xs text-muted">
          Times each step happened {rangeText(range)}, with the share of step 1
          that got that far.
        </p>
        <Card>
          <ol className="flex flex-col gap-3">
            {funnel.map((step, i) => (
              <BarRow
                key={step.event}
                name={`${i + 1}. ${label(FUNNEL_EVENTS, step.event)}`}
                count={step.count}
                max={firstStep?.count ?? 0}
                {...(i > 0
                  ? { note: pct(step.count, firstStep?.count ?? 0) }
                  : {})}
              />
            ))}
          </ol>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <Heading>Feature usage</Heading>
        <p className="-mt-1 px-1 text-xs text-muted">
          Taps {rangeText(range)}.
        </p>
        <Card>
          <ul className="flex flex-col gap-3">
            {[...features]
              .sort((a, b) => b.count - a.count)
              .map((f) => (
                <BarRow
                  key={f.event}
                  name={label(FEATURE_EVENTS, f.event)}
                  count={f.count}
                  max={featureMax}
                />
              ))}
          </ul>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <Heading>Top raters</Heading>
        {topRaters.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">No ratings counted yet.</p>
          </Card>
        ) : (
          <Card>
            <ol className="flex flex-col gap-3">
              {topRaters.map((r, i) => (
                <BarRow
                  key={r.username}
                  name={
                    <span className="flex items-center gap-2">
                      <span className="w-4 text-right text-xs font-extrabold text-muted">
                        {i + 1}
                      </span>
                      <Username name={r.username} />
                    </span>
                  }
                  count={r.count}
                  max={raterMax}
                />
              ))}
            </ol>
          </Card>
        )}
      </section>

      <p className="-mt-2 px-1 text-[11px] leading-relaxed text-muted">
        Daily counts, usage and the add flow start from this update. Top raters
        and users fill in as people open the app.
      </p>
    </>
  );
};
