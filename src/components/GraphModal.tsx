import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import type { InboxEvent } from '@/types/inbox';

type ChartType = 'line' | 'bar' | 'area' | 'pie';

export function GraphModal({ events, onClose }: { events: InboxEvent[]; onClose: () => void }) {
  const [chartType, setChartType] = useState<ChartType>('line');

  // Prepare data for charts
  const eventCountByDate = useMemo(() => {
    const map = new Map<string, number>();
    events.forEach((e) => {
      const date = new Date(e.createdAt)?.toISOString()?.split('T')[0];
      map.set(date, (map.get(date) ?? 0) + 1);
    });
    const arr = Array.from(map.entries()).map(([date, count]) => ({ date, count }));
    arr.sort((a, b) => a.date.localeCompare(b.date));
    return arr;
  }, [events]);

  const eventsByType = useMemo(() => {
    const map = new Map<string, number>();
    events.forEach((e) => {
      const type = e?.type ?? 'unknown';
      map.set(type, (map.get(type) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([type, count]) => ({ name: type, value: count }));
  }, [events]);

  const severityDist = useMemo(() => {
    const map = new Map<string, number>();
    events.forEach((e) => {
      const sev = (e?.severity ?? 'info') as string;
      map.set(sev, (map.get(sev) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [events]);

  const servicesDist = useMemo(() => {
    const map = new Map<string, number>();
    events.forEach((e) => {
      const svc = e.service ?? 'unknown';
      map.set(svc, (map.get(svc) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [events]);

  const COLORS = ['#4F46E5', '#EF4444', '#10B981', '#F59E0B', '#6366F1', '#EC4899'];

  const renderChart = () => {
    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width='100%' height={300}>
            <LineChart data={eventCountByDate}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis dataKey='date' />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type='monotone' dataKey='count' stroke='#4F46E5' strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'bar':
        return (
          <ResponsiveContainer width='100%' height={300}>
            <BarChart data={eventsByType}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis dataKey='name' />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey='value' fill='#10B981'>
                {eventsByType.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width='100%' height={300}>
            <AreaChart data={severityDist}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis dataKey='name' />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Area type='monotone' dataKey='value' stackId='1' fill='#EF4444' stroke='#EF4444' />
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width='100%' height={300}>
            <PieChart>
              <Pie data={servicesDist} dataKey='value' nameKey='name' outerRadius={100} label>
                {servicesDist.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm'>
      <div className='relative w-full max-w-3xl rounded-xl bg-white dark:bg-slate-800 p-6 shadow-lg'>
        <button
          onClick={onClose}
          className='absolute right-3 top-3 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          aria-label='Close modal'
        >
          ✕
        </button>
        <h2 className='mb-4 text-xl font-semibold text-slate-800 dark:text-slate-200'>Dashboard Visualizations</h2>
        <div className='mb-4 flex gap-2'>
          {(['line', 'bar', 'area', 'pie'] as ChartType[]).map((type) => (
            <button
              key={type}
              onClick={() => setChartType(type)}
              className={`px-3 py-1 rounded ${chartType === type ? 'bg-slate-200 dark:bg-slate-700' : 'bg-slate-100 dark:bg-slate-600'} text-sm`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
        {renderChart()}
      </div>
    </div>
  );
}
