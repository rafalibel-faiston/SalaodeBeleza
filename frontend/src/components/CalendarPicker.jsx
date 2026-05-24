import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../api/client';

const WEEKDAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

export default function CalendarPicker({ value, onChange }) {
  const [blocked, setBlocked] = useState([]);
  const [view, setView]       = useState(() => {
    const d = new Date(); d.setDate(1); return d;
  });

  useEffect(() => {
    api.get('/blocked-slots/')
      .then(r => setBlocked(r.data.map(s => s.date)))
      .catch(console.error);
  }, []);

  const year  = view.getFullYear();
  const month = view.getMonth();

  const today = new Date(); today.setHours(0,0,0,0);

  const daysInMonth    = new Date(year, month + 1, 0).getDate();
  const firstWeekday   = new Date(year, month, 1).getDay();
  const monthLabel     = view.toLocaleDateString('pt-BR', { month:'long', year:'numeric' });

  const toISO = (d) =>
    `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

  const isBlocked  = (d) => blocked.includes(toISO(d));
  const isPast     = (d) => new Date(year, month, d) < today;
  const isSelected = (d) => value === toISO(d);
  const isDisabled = (d) => isPast(d) || isBlocked(d);

  const handleDay = (d) => { if (!isDisabled(d)) onChange(toISO(d)); };

  // Build grid cells (nulls = leading blanks)
  const cells = [...Array(firstWeekday).fill(null),
                 ...Array.from({length: daysInMonth}, (_, i) => i + 1)];

  return (
    <div className="cal-wrap">
      {/* Header */}
      <div className="cal-header">
        <button type="button" className="cal-nav"
          onClick={() => setView(new Date(year, month - 1, 1))}>‹</button>
        <span className="cal-month-label">{monthLabel}</span>
        <button type="button" className="cal-nav"
          onClick={() => setView(new Date(year, month + 1, 1))}>›</button>
      </div>

      {/* Weekday labels */}
      <div className="cal-weekdays">
        {WEEKDAYS.map(w => <span key={w}>{w}</span>)}
      </div>

      {/* Day grid */}
      <div className="cal-grid">
        {cells.map((day, i) => {
          if (!day) return <span key={`_${i}`} />;
          const dis  = isDisabled(day);
          const blk  = isBlocked(day);
          const sel  = isSelected(day);
          return (
            <motion.button
              key={day} type="button"
              className={`cal-day${dis ? ' cal-dis' : ' cal-avail'}${blk ? ' cal-blk' : ''}${sel ? ' cal-sel' : ''}`}
              onClick={() => handleDay(day)}
              whileHover={!dis ? { scale:1.15 } : {}}
              whileTap={!dis ? { scale:0.92 } : {}}
              transition={{ duration:0.15 }}
            >
              {day}
            </motion.button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="cal-legend">
        <span><i className="cal-dot cal-dot-avail"/>Selecionado</span>
        <span><i className="cal-dot cal-dot-blk"/>Bloqueado</span>
      </div>
    </div>
  );
}
