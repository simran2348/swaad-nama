import { useEffect, useState, type ReactNode } from 'react';
import type { AdminStatsResponse } from '../../shared/api';
import { FEATURE_EVENTS, FUNNEL_EVENTS } from '../../shared/stats';
import { fetchAdminStats } from '../lib/api';
import { EmptyState, LoadingState } from './ui';
import { Username } from './Username';

type Result =
  { ok: true; data: AdminStatsResponse } | { ok: false; error: string };

type Range = 7 | 30;
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

/** Bars per day for one metric; values shown above bars on the 7-day view. */
const DayChart = ({
  days,
  metric,
}: {
  days: AdminStatsResponse['days'];
  metric: Metric;
}) => {
  const max = Math.max(1, ...days.map((d) => d[metric]));
  const long = days.length > 7;
  return (
    <div>
      <ol
        className={`flex h-36 items-end ${long ? 'gap-0.5' : 'gap-2'}`}
        aria-label="Daily counts"
      >
        {days.map((day) => (
          <li
            key={day.date}
            className="flex h-full flex-1 flex-col items-center justify-end gap-1"
            title={`${formatDay(day.date, true)}: ${day[metric]}`}
          >
            {!long && (
              <span className="text-[11px] font-bold text-ink tabular-nums">
                {day[metric]}
              </span>
            )}
            <span
              className="w-full rounded-t-md bg-cta transition-[height] duration-500"
              style={{
                height: `${(day[metric] / max) * 100}%`,
                minHeight: day[metric] > 0 ? 3 : 1,
                opacity: day[metric] > 0 ? 1 : 0.25,
              }}
            />
          </li>
        ))}
      </ol>
      <div className="mt-1.5 flex justify-between text-[10px] font-semibold text-muted">
        {long ? (
          <>
            <span>{formatDay(days[0]?.date ?? '', true)}</span>
            <span>Today</span>
          </>
        ) : (
          days.map((day, i) => (
            <span key={day.date} className="flex-1 text-center">
              {i === days.length - 1 ? 'Today' : formatDay(day.date, false)}
            </span>
          ))
        )}
      </div>
    </div>
  );
};

/** Admin analytics: totals, daily activity, top raters, usage, add flow. */
export const AdminStats = ({ refreshKey }: { refreshKey: number }) => {
  const [range, setRange] = useState<Range>(7);
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
        <div className="w-32">
          <Toggle
            label="Time range"
            options={[
              { id: 7, label: '7 days' },
              { id: 30, label: '30 days' },
            ]}
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
      <div className="-mt-4 grid grid-cols-2 gap-x-4 gap-y-5 px-1">
        {tiles.map((t) => (
          <div key={t.label}>
            <p className="text-3xl leading-none font-extrabold text-ink tabular-nums">
              {t.value.toLocaleString('en-IN')}
            </p>
            <p className="mt-1 text-xs font-semibold text-muted">{t.label}</p>
          </div>
        ))}
      </div>

      <section className="flex flex-col gap-3">
        <Heading>Daily activity</Heading>
        <Toggle
          label="Metric"
          options={METRICS}
          value={metric}
          onChange={onMetric}
        />
        <DayChart days={days} metric={metric} />
        <p className="px-1 text-xs text-muted">
          Last {range} days: {sum('ratings')} new ratings, {sum('newUsers')} new
          users, {data.edits} edits and {data.deletes} deletions.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <Heading>Add to tier flow</Heading>
        <p className="-mt-1 px-1 text-xs text-muted">
          Times each step happened in the last {range} days, with the share of
          step 1 that got that far.
        </p>
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
      </section>

      <section className="flex flex-col gap-3">
        <Heading>Feature usage</Heading>
        <p className="-mt-1 px-1 text-xs text-muted">
          Taps, last {range} days.
        </p>
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
      </section>

      <section className="flex flex-col gap-3">
        <Heading>Top raters</Heading>
        {topRaters.length === 0 ? (
          <p className="px-1 text-sm text-muted">No ratings counted yet.</p>
        ) : (
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
        )}
      </section>

      <p className="-mt-2 px-1 text-[11px] leading-relaxed text-muted">
        Daily counts, usage and the add flow start from this update. Top raters
        and users fill in as people open the app.
      </p>
    </>
  );
};
