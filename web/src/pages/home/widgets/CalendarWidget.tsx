// Calendar Widget
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { WidgetProps } from '../types';
import { WidgetWrapper, WidgetLoading, WidgetError } from '../components/WidgetWrapper';
import { http } from '../../../lib/http';

type CalendarEvent = {
  id: string;
  date: string;
  title: string;
  type: 'task' | 'meeting' | 'deadline';
  priority?: string;
};

const CalendarWidget: React.FC<WidgetProps> = ({ config, onUpdate, onRemove }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await http(`/api/calendar/events?month=${currentDate.getMonth() + 1}&year=${currentDate.getFullYear()}`);
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth };
  };

  const getEventsForDate = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter((e) => e.date === dateStr);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
  };

  const { firstDay, daysInMonth } = getDaysInMonth();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <WidgetWrapper
      config={config}
      onRefresh={fetchEvents}
      onRemove={onRemove}
      allowRefresh
      allowRemove
    >
      {loading ? (
        <WidgetLoading message="Loading calendar..." />
      ) : error ? (
        <WidgetError message={error} onRetry={fetchEvents} />
      ) : (
        <div className="p-3">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => changeMonth(-1)}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </button>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {monthName}
            </h3>
            <button
              onClick={() => changeMonth(1)}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Day Headers */}
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div
                key={i}
                className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center py-1"
              >
                {day}
              </div>
            ))}

            {/* Empty Days */}
            {emptyDays.map((i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {/* Calendar Days */}
            {days.map((day) => {
              const dayEvents = getEventsForDate(day);
              const hasEvents = dayEvents.length > 0;
              const today = isToday(day);

              return (
                <div
                  key={day}
                  className={`aspect-square p-1 text-xs rounded-lg transition-all cursor-pointer ${
                    today
                      ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-bold'
                      : hasEvents
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 text-gray-900 dark:text-white hover:bg-indigo-100 dark:hover:bg-indigo-900/30'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center h-full">
                    <span>{day}</span>
                    {hasEvents && !today && (
                      <div className="flex gap-0.5 mt-0.5">
                        {dayEvents.slice(0, 3).map((_, i) => (
                          <div
                            key={i}
                            className="w-1 h-1 rounded-full bg-indigo-600 dark:bg-indigo-400"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Today's Events */}
          {events.some((e) => isToday(new Date(e.date).getDate())) && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                Today's Events
              </p>
              <div className="space-y-1">
                {events
                  .filter((e) => isToday(new Date(e.date).getDate()))
                  .slice(0, 3)
                  .map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Clock className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-gray-900 dark:text-white flex-1">
                        {event.title}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </WidgetWrapper>
  );
};

export default CalendarWidget;
