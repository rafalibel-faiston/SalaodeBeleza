import { useState, useEffect } from 'react';
import api from '../api/client';
import AdminLogin from './AdminLogin';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, Legend
} from 'recharts';

// ─── Helpers ────────────────────────────────────────────────────────────────

const useMobile = () => {
  const [m, setM] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return m;
};

const fmt = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

const fmtDate = (s) => {
  const d = new Date(s);
  return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const fmtData = (s) => {
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const fmtHora = (s) => {
  const d = new Date(s);
  const m = d.getMinutes();
  return `${d.getHours()}h${m > 0 ? String(m).padStart(2, '0') : ''}`;
};

const fmtHoraPartes = (s) => {
  const d = new Date(s);
  return { h: String(d.getHours()).padStart(2, '0'), m: String(d.getMinutes()).padStart(2, '0') };
};

const fmtTel = (p) => {
  const d = (p || '').replace(/\D/g, '');
  return d.startsWith('55') ? d : `55${d}`;
};

const abrirWpp = (phone, msg) =>
  window.open(`https://wa.me/${fmtTel(phone)}?text=${encodeURIComponent(msg)}`, '_blank');

const msgConfirmacao = (apt) => {
  const sinal = (apt.financial?.total_value - apt.financial?.balance_due) || 0;
  return `Arrasou! ✨✨\n\nSeu horário está confirmado com sucesso!\n\n📅 Data: ${fmtData(apt.scheduled_at)}\n⏰ Horário: ${fmtHora(apt.scheduled_at)}\n📍 Local: Rua Ari Carneiro Fernandes 155\n💅 Procedimento: ${apt.service?.name}\n✅ Valor: ${fmt(apt.financial?.total_value)} - Sinal ${fmt(sinal)} PG ☑️\n\nEstou te esperando pra te deixar ainda mais linda ✨💅\n\nQualquer imprevisto, me avisa com antecedência, tá bom?`;
};

const msgLembrete = (apt) =>
  `Oi, meu amor! ✨\n\nPassando pra te lembrar do seu horário comigo.\n\n📅 Data: ${fmtData(apt.scheduled_at)}\n⏰ Horário: ${fmtHora(apt.scheduled_at)}\n📍 Local: Rua Ari Carneiro Fernandes 155\n\nTe espero pra te deixar ainda mais linda ✨💅\n\nPeço que chegue no horário certinho, tá bom? 💕\nQualquer imprevisto, me avisa.`;

const CORES = ['#d8438b', '#128C7E', '#f59e0b', '#6366f1', '#10b981', '#ef4444'];

const timeSlots = [];
for (let h = 8; h < 20; h++) {
  timeSlots.push(`${String(h).padStart(2, '0')}:00`);
  if (h < 19) timeSlots.push(`${String(h).padStart(2, '0')}:30`);
}

// ─── Design Tokens ──────────────────────────────────────────────────────────

const C = {
  primary: '#d8438b',
  primaryDark: '#a0195e',
  text: '#0f0614',
  textMuted: '#6b7280',
  bg: 'linear-gradient(145deg, #fce4ef 0%, #f5e8fb 35%, #ede8fb 65%, #e8f0fd 100%)',
  white: '#ffffff',
  glass: 'rgba(255,255,255,0.48)',
  glassBorder: 'rgba(255,255,255,0.55)',
  border: '#e9ddf2',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#dc2626',
  dangerBg: '#fef2f2',
  warnBg: '#fefce8',
  successBg: '#ecfdf5',
  teal: '#0d9488',
  tealBg: '#f0fdfa',
  fontDisplay: "'Syne', sans-serif",
  fontSans: "'Outfit', sans-serif",
  fontMono: "'JetBrains Mono', monospace",
  fontSerif: "'Fraunces', serif",
};

const gradientBtn = `linear-gradient(135deg, ${C.primaryDark} 0%, ${C.primary} 60%, #e055a0 100%)`;
const gradientBtnHover = `linear-gradient(135deg, #8a1250 0%, ${C.primaryDark} 60%, ${C.primary} 100%)`;
const glassBox = { background: C.glass, backdropFilter: 'blur(28px) saturate(140%)', WebkitBackdropFilter: 'blur(28px) saturate(140%)', border: `1px solid ${C.glassBorder}` };

// ─── UI reutilizável ─────────────────────────────────────────────────────────

const Card = ({ children, style, glow = false }) => (
  <div
    className={glow ? 'glow-card' : 'glass-panel'}
    style={{ padding: '20px', fontFamily: C.fontSans, ...style }}
  >
    {children}
  </div>
);

const StatCard = ({ label, value, sub, color }) => (
  <div style={{
    background: C.white,
    borderRadius: '16px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    padding: '20px',
    textAlign: 'center',
    borderTop: `4px solid ${color || C.primary}`,
    transition: 'transform 0.2s, box-shadow 0.2s',
  }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.13)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)'; }}
  >
    <p style={{ color: C.textMuted, fontSize: '0.82rem', marginBottom: '8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
    <p style={{ fontSize: '1.8rem', fontWeight: '800', color: color || C.primary, lineHeight: 1 }}>{value}</p>
    {sub && <p style={{ color: C.textMuted, fontSize: '0.78rem', marginTop: '6px' }}>{sub}</p>}
  </div>
);

const BtnWpp = ({ label, color, onClick }) => (
  <button onClick={onClick} className="btn-tactile animate-float" style={{
    flex: 1, minWidth: '140px', padding: '9px 12px',
    background: color, color: '#fff', border: 'none',
    borderRadius: '12px', fontWeight: '700', fontSize: '0.82rem', cursor: 'pointer',
    fontFamily: C.fontSans,
    boxShadow: `0 4px 14px ${color}55`,
    transition: 'opacity 0.2s, transform 0.12s',
  }}
    onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.boxShadow = `0 6px 20px ${color}77`; }}
    onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.boxShadow = `0 4px 14px ${color}55`; }}
  >
    {label}
  </button>
);

const Badge = ({ label, color = C.primary, bg = '#fdf1f6' }) => (
  <span style={{
    display: 'inline-block', padding: '3px 10px', borderRadius: '20px',
    fontSize: '0.73rem', fontWeight: '700', background: bg, color,
  }}>
    {label}
  </span>
);

const PrimaryBtn = ({ children, onClick, disabled, style = {} }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="btn-tactile"
    style={{
      padding: '10px 22px',
      background: disabled ? '#d1d5db' : gradientBtn,
      color: '#fff', border: 'none', borderRadius: '12px',
      fontWeight: '700', fontSize: '0.88rem', cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: C.fontSans,
      boxShadow: disabled ? 'none' : '0 4px 14px rgba(160,25,94,0.35)',
      transition: 'opacity 0.2s, transform 0.12s, box-shadow 0.2s',
      ...style,
    }}
    onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background = gradientBtnHover; e.currentTarget.style.boxShadow = '0 6px 20px rgba(160,25,94,0.45)'; } }}
    onMouseLeave={e => { if (!disabled) { e.currentTarget.style.background = gradientBtn; e.currentTarget.style.boxShadow = '0 4px 14px rgba(160,25,94,0.35)'; } }}
  >
    {children}
  </button>
);

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: '10px',
  border: `1px solid ${C.border}`, fontSize: '0.9rem',
  boxSizing: 'border-box', color: C.text, outline: 'none',
  transition: 'border-color 0.2s',
};
const selectStyle = { ...inputStyle };

// ─── Calendário mensal ───────────────────────────────────────────────────────

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function MonthCalendar({ appointments, selectedDate, onSelectDate }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // Separate sets: confirmed/scheduled vs pending
  const daysScheduled = new Set();
  const daysPending = new Set();
  appointments.forEach(a => {
    const d = new Date(a.scheduled_at);
    if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
      if (a.status === 'pending') daysPending.add(d.getDate());
      else daysScheduled.add(d.getDate());
    }
  });

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isToday = (d) => d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
  const isSelected = (d) => {
    if (!selectedDate) return false;
    const [y, m, day] = selectedDate.split('-').map(Number);
    return d === day && viewMonth === m - 1 && viewYear === y;
  };

  const handleDayClick = (d) => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    onSelectDate(selectedDate === dateStr ? null : dateStr);
  };

  return (
    <Card glow style={{ padding: '18px', minWidth: '290px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <button onClick={prevMonth} className="btn-tactile" style={{ background: 'rgba(216,67,139,0.08)', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: C.primary, padding: '6px 10px', borderRadius: '10px', transition: 'all 0.2s', lineHeight: 1 }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(216,67,139,0.16)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(216,67,139,0.08)'}
        >‹</button>
        <span style={{ fontWeight: '700', fontSize: '0.95rem', fontFamily: C.fontSans, color: C.text, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.9rem' }}>📅</span>
          {MESES[viewMonth]} {viewYear}
        </span>
        <button onClick={nextMonth} className="btn-tactile" style={{ background: 'rgba(216,67,139,0.08)', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: C.primary, padding: '6px 10px', borderRadius: '10px', transition: 'all 0.2s', lineHeight: 1 }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(216,67,139,0.16)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(216,67,139,0.08)'}
        >›</button>
      </div>

      {/* Dias da semana */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
        {DIAS_SEMANA.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '0.68rem', fontWeight: '700', color: C.textMuted, padding: '4px 0', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Células dos dias */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {cells.map((d, i) => {
          if (!d) return <div key={`e-${i}`} />;
          const hasPending = daysPending.has(d);
          const hasScheduled = daysScheduled.has(d);
          const today_ = isToday(d);
          const selected = isSelected(d);

          let bg = 'transparent';
          let color = C.text;
          let border = 'none';

          if (selected) { bg = gradientBtn; color = '#fff'; border = 'none'; }
          else if (today_) { bg = 'rgba(216,67,139,0.1)'; color = C.primaryDark; border = `1.5px solid ${C.primary}`; }

          const dotColor = hasPending ? C.warning : hasScheduled ? C.primary : null;

          return (
            <button
              key={d}
              onClick={() => handleDayClick(d)}
              className="btn-tactile"
              style={{
                position: 'relative', background: bg, color, border,
                borderRadius: '9px', padding: '6px 2px',
                fontSize: '0.82rem', fontWeight: today_ || selected ? '700' : '500',
                cursor: 'pointer', textAlign: 'center', lineHeight: 1.2,
                fontFamily: C.fontSans,
                transition: 'all 0.15s',
                boxShadow: selected ? '0 3px 10px rgba(160,25,94,0.35)' : 'none',
              }}
              onMouseEnter={e => { if (!selected) { e.currentTarget.style.background = 'rgba(216,67,139,0.08)'; e.currentTarget.style.color = C.primaryDark; } }}
              onMouseLeave={e => { if (!selected) { e.currentTarget.style.background = bg; e.currentTarget.style.color = color; } }}
            >
              {d}
              {dotColor && (
                <span style={{
                  display: 'block', width: '5px', height: '5px',
                  borderRadius: '50%', background: selected ? 'rgba(255,255,255,0.8)' : dotColor,
                  margin: '2px auto 0',
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Legenda */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '14px', paddingTop: '12px', borderTop: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.73rem', color: C.textMuted }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: C.primary, display: 'inline-block', flexShrink: 0 }} />
          Agendado
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.73rem', color: C.textMuted }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: C.warning, display: 'inline-block', flexShrink: 0 }} />
          Pendente
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.73rem', color: C.textMuted }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', border: `1.5px solid ${C.primary}`, background: '#fdf1f6', display: 'inline-block', flexShrink: 0 }} />
          Hoje ({today.getDate()} {MESES[today.getMonth()].substring(0, 3)})
        </div>
      </div>
    </Card>
  );
}

// ─── ABA: AGENDA ─────────────────────────────────────────────────────────────

function AgendaTab({ appointments, onRefresh }) {
  const isMobile = useMobile();
  const [reagendando, setReagendando] = useState(null);
  const [novaData, setNovaData] = useState('');
  const [novaHora, setNovaHora] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  });
  const [activeFilter, setActiveFilter] = useState('proximos');

  const now = new Date();
  const pendentes   = appointments.filter(a => a.status === 'pending');
  const confirmados = appointments.filter(a => ['confirmed', 'scheduled', 'completed'].includes(a.status));
  const proximos    = appointments
    .filter(a => new Date(a.scheduled_at) >= now && !['rejected', 'cancelled', 'no_show'].includes(a.status))
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));

  const confirmar = async (apt) => {
    if (!window.confirm(`Confirmar agendamento de ${apt.client?.name}? O WhatsApp de confirmação será aberto automaticamente.`)) return;
    try {
      await api.patch(`/appointments/${apt.id}/status`, { status: 'confirmed' });
      onRefresh();
      abrirWpp(apt.client?.phone, msgConfirmacao(apt));
    } catch { alert('Erro ao confirmar.'); }
  };

  const recusar = async (apt) => {
    if (!window.confirm(`Recusar agendamento de ${apt.client?.name}? A cliente será avisada na tela de espera.`)) return;
    try {
      await api.patch(`/appointments/${apt.id}/status`, { status: 'rejected' });
      onRefresh();
    } catch { alert('Erro ao recusar.'); }
  };

  const confirmarReagendamento = async (apt) => {
    if (!novaData || !novaHora) return alert('Escolha data e horário.');
    setSalvando(true);
    try {
      await api.put(`/appointments/${apt.id}/reagendar/`, { scheduled_at: new Date(`${novaData}T${novaHora}:00`).toISOString() });
      setReagendando(null); onRefresh();
    } catch { alert('Erro ao reagendar.'); }
    finally { setSalvando(false); }
  };

  const registrarFalta = async (apt) => {
    if (!window.confirm(`Registrar falta de ${apt.client?.name}?`)) return;
    try {
      const res = await api.post(`/appointments/${apt.id}/no-show/`);
      if (res.data.is_blocked) alert(`⚠️ ${apt.client?.name} foi bloqueada automaticamente por 2 ou mais faltas.`);
      onRefresh();
    } catch { alert('Erro ao registrar falta.'); }
  };

  const cancelar = async (apt, motivo) => {
    if (!window.confirm(motivo === 'cliente' ? `Registrar cancelamento de ${apt.client?.name}?` : 'Remover este agendamento?')) return;
    try {
      if (motivo === 'cliente') await api.post(`/appointments/${apt.id}/cliente-cancelou/`);
      else await api.delete(`/appointments/${apt.id}/`);
      onRefresh();
    } catch { alert('Erro ao cancelar.'); }
  };

  const dayApts = selectedDate
    ? appointments.filter(a => {
        const d = new Date(a.scheduled_at);
        const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return ds === selectedDate;
      }).sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
    : [];

  const confirmedDayApts = dayApts.filter(a => ['confirmed', 'scheduled'].includes(a.status));

  const filteredList = activeFilter === 'pendentes'
    ? pendentes
    : activeFilter === 'confirmados'
    ? confirmados
    : activeFilter === 'proximos'
    ? proximos
    : [...appointments].sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at));

  const fmtSelectedDate = selectedDate
    ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '';

  const renderDayCard = (apt) => {
    const t = fmtHoraPartes(apt.scheduled_at);
    return (
      <div key={apt.id} style={{
        display: 'flex', gap: '14px', alignItems: 'flex-start',
        ...glassBox,
        borderRadius: '16px',
        border: `1px solid ${apt.status === 'no_show' ? 'rgba(220,38,38,0.25)' : 'rgba(255,255,255,0.55)'}`,
        padding: '16px',
        marginBottom: '10px',
        fontFamily: C.fontSans,
        transition: 'box-shadow 0.2s, transform 0.15s',
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(216,67,139,0.14)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}
      >
        {/* Time bubble */}
        <div style={{
          flexShrink: 0,
          background: apt.status === 'no_show'
            ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
            : 'linear-gradient(135deg, #0d9488, #059669)',
          color: '#fff',
          borderRadius: '14px',
          padding: '10px 10px',
          textAlign: 'center',
          minWidth: '56px',
          fontWeight: '800',
          lineHeight: 1.15,
          boxShadow: apt.status === 'no_show' ? '0 4px 12px rgba(220,38,38,0.4)' : '0 4px 12px rgba(13,148,136,0.4)',
        }}>
          <div style={{ fontSize: '1rem', fontFamily: C.fontMono }}>{t.h}</div>
          <div style={{ fontSize: '0.8rem', fontFamily: C.fontMono, opacity: 0.9 }}>{t.m}</div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '3px' }}>
            <span style={{ fontWeight: '700', color: C.text, fontSize: '0.95rem', fontFamily: C.fontSans }}>{apt.client?.name}</span>
            {apt.status === 'no_show' && <Badge label="Falta" color={C.danger} bg={C.dangerBg} />}
            {apt.client?.is_blocked && <Badge label="Bloqueada" color={C.danger} bg={C.dangerBg} />}
          </div>
          <p style={{ margin: 0, color: C.textMuted, fontSize: '0.83rem' }}>💅 {apt.service?.name}</p>
          {apt.client?.medical_restrictions && (
            <p style={{ margin: '5px 0 0', color: '#b45309', fontSize: '0.8rem', fontFamily: C.fontSerif, fontStyle: 'italic' }}>
              ⚠️ {apt.client.medical_restrictions}
            </p>
          )}

          {reagendando === apt.id && (
            <div style={{ background: 'rgba(216,67,139,0.06)', backdropFilter: 'blur(12px)', borderRadius: '14px', padding: '14px', marginTop: '12px', border: '1px solid rgba(216,67,139,0.15)' }}>
              <p style={{ fontWeight: '700', marginBottom: '10px', color: C.primary, fontSize: '0.88rem', fontFamily: C.fontDisplay }}>📅 Novo horário</p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input type="date" value={novaData} onChange={e => setNovaData(e.target.value)}
                  min={new Date().toISOString().split('T')[0]} style={{ flex: 1, ...inputStyle, fontFamily: C.fontSans }} />
                <select value={novaHora} onChange={e => setNovaHora(e.target.value)} style={{ flex: 1, ...selectStyle, fontFamily: C.fontSans }}>
                  <option value="">Horário...</option>
                  {timeSlots.map(ts => <option key={ts} value={ts}>{ts.replace(':', 'h')}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <PrimaryBtn onClick={() => confirmarReagendamento(apt)} disabled={salvando} style={{ flex: 1 }}>
                  {salvando ? 'Salvando...' : '✅ Confirmar'}
                </PrimaryBtn>
                <button onClick={() => setReagendando(null)} className="btn-tactile"
                  style={{ padding: '9px 16px', background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', fontFamily: C.fontSans }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {apt.status !== 'no_show' && apt.status !== 'pending' && reagendando !== apt.id && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }}>
              {apt.status === 'confirmed' && (
                <BtnWpp label="✅ Confirmação" color="#25D366" onClick={() => abrirWpp(apt.client?.phone, msgConfirmacao(apt))} />
              )}
              {(apt.status === 'confirmed' || apt.status === 'scheduled') && (
                <BtnWpp label="⏰ Lembrete" color="#128C7E" onClick={() => abrirWpp(apt.client?.phone, msgLembrete(apt))} />
              )}
              <button onClick={() => { setReagendando(apt.id); setNovaData(''); setNovaHora(''); }} className="btn-tactile"
                style={{ flex: 1, minWidth: '90px', padding: '8px', background: 'rgba(245,158,11,0.12)', color: '#92400e', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '12px', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer', fontFamily: C.fontSans }}>
                🔄 Remarcar
              </button>
              <button onClick={() => registrarFalta(apt)} className="btn-tactile"
                style={{ flex: 1, minWidth: '80px', padding: '8px', background: C.dangerBg, color: C.danger, border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}>
                🚫 Falta
              </button>
              <button onClick={() => cancelar(apt, 'cliente')}
                style={{ flex: 1, minWidth: '80px', padding: '8px', background: C.warnBg, color: '#92400e', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}>
                📵 Cancelou
              </button>
              <button onClick={() => cancelar(apt, 'admin')}
                style={{ padding: '8px 12px', background: '#f3f4f6', color: '#9ca3af', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '0.82rem', cursor: 'pointer' }}>
                ✕
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
          <span style={{ fontWeight: '700', color: C.text, fontSize: '0.92rem', fontFamily: C.fontMono }}>{fmt(apt.financial?.total_value)}</span>
          {apt.status !== 'no_show' && apt.status !== 'pending' && (
            <button
              onClick={() => abrirWpp(apt.client?.phone, msgConfirmacao(apt))}
              title="Enviar confirmação WhatsApp"
              className="btn-tactile animate-float"
              style={{
                width: '36px', height: '36px',
                background: 'linear-gradient(135deg, #25D366, #128C7E)',
                border: 'none', borderRadius: '10px',
                color: '#fff', fontSize: '1rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(37,211,102,0.4)',
              }}
            >
              💬
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderPendingCard = (apt) => (
    <div key={apt.id} style={{
      ...glassBox,
      borderRadius: '16px',
      border: '1px solid rgba(255,255,255,0.55)',
      padding: '18px',
      fontFamily: C.fontSans,
      transition: 'box-shadow 0.2s',
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 28px rgba(216,67,139,0.1)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: '800', color: C.text, fontSize: '0.95rem', fontFamily: C.fontSans }}>{apt.client?.name}</span>
          <span style={{
            background: 'rgba(245,158,11,0.15)', color: '#92400e',
            borderRadius: '8px', padding: '3px 10px',
            fontSize: '0.7rem', fontWeight: '800',
            letterSpacing: '0.03em', textTransform: 'uppercase',
            border: '1px solid rgba(245,158,11,0.3)',
          }}>AGUARDANDO</span>
          {apt.client?.is_blocked && <Badge label="Bloqueada" color={C.danger} bg={C.dangerBg} />}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '8px' }}>
          <p style={{ margin: 0, fontWeight: '800', color: C.text, fontSize: '0.92rem' }}>{fmt(apt.financial?.total_value)}</p>
          <p style={{ margin: '2px 0 0', color: C.textMuted, fontSize: '0.7rem' }}>Preço Base</p>
        </div>
      </div>

      <p style={{ margin: '0 0 10px', color: C.textMuted, fontSize: '0.82rem' }}>
        ⏰ {fmtDate(apt.scheduled_at)}
      </p>

      <div style={{
        background: 'rgba(216,67,139,0.04)', borderRadius: '12px',
        border: '1px solid rgba(216,67,139,0.12)', padding: '10px 14px',
        marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        <span style={{ fontSize: '1rem' }}>💅</span>
        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: C.text, fontFamily: C.fontSans }}>{apt.service?.name}</span>
      </div>

      {apt.client?.medical_restrictions && (
        <div style={{ background: 'rgba(245,158,11,0.1)', color: '#856404', padding: '8px 12px', borderRadius: '10px', fontSize: '0.82rem', marginBottom: '12px', border: '1px solid rgba(245,158,11,0.2)', fontFamily: C.fontSerif, fontStyle: 'italic' }}>
          ⚠️ {apt.client.medical_restrictions}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={() => confirmar(apt)} className="btn-tactile"
          style={{
            flex: 1, padding: '11px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff',
            border: 'none', borderRadius: '12px',
            fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer',
            fontFamily: C.fontSans,
            boxShadow: '0 4px 12px rgba(16,185,129,0.35)',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 18px rgba(16,185,129,0.5)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(16,185,129,0.35)'; }}
        >
          ✓ Confirmar
        </button>
        <button onClick={() => recusar(apt)} className="btn-tactile"
          style={{
            flex: 1, padding: '11px', background: 'rgba(220,38,38,0.06)', color: C.danger,
            border: '1px solid rgba(220,38,38,0.25)', borderRadius: '12px',
            fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer',
            fontFamily: C.fontSans, transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.12)'; e.currentTarget.style.borderColor = 'rgba(220,38,38,0.4)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.06)'; e.currentTarget.style.borderColor = 'rgba(220,38,38,0.25)'; }}
        >
          ✗ Recusar
        </button>
        <button
          onClick={() => cancelar(apt, 'admin')}
          title="Remover agendamento"
          className="btn-tactile"
          style={{
            padding: '11px 14px', background: 'rgba(0,0,0,0.04)', color: '#94a3b8',
            border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px',
            cursor: 'pointer', fontSize: '1rem', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = C.dangerBg; e.currentTarget.style.color = C.danger; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; e.currentTarget.style.color = '#94a3b8'; }}
        >
          🗑
        </button>
      </div>
    </div>
  );

  const renderListCard = (apt) => (
    <div key={apt.id} style={{
      display: 'flex', gap: '12px', alignItems: 'center',
      ...glassBox, borderRadius: '14px', padding: '14px',
      fontFamily: C.fontSans,
    }}>
      <div style={{
        flexShrink: 0,
        background: apt.status === 'no_show'
          ? 'linear-gradient(135deg, rgba(220,38,38,0.15), rgba(220,38,38,0.08))'
          : apt.status === 'pending'
          ? 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.08))'
          : 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.08))',
        color: apt.status === 'no_show' ? C.danger : apt.status === 'pending' ? '#92400e' : '#065f46',
        borderRadius: '12px', padding: '8px 10px', textAlign: 'center',
        minWidth: '54px', fontWeight: '700', lineHeight: 1.2,
        border: `1px solid ${apt.status === 'no_show' ? 'rgba(220,38,38,0.2)' : apt.status === 'pending' ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}`,
      }}>
        <div style={{ fontSize: '0.72rem', fontFamily: C.fontMono }}>{fmtData(apt.scheduled_at)}</div>
        <div style={{ fontSize: '0.85rem', fontFamily: C.fontMono }}>{fmtHora(apt.scheduled_at)}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: '700', color: C.text, fontSize: '0.9rem' }}>{apt.client?.name}</span>
          <Badge
            label={apt.status === 'confirmed' ? 'Confirmado' : apt.status === 'pending' ? 'Pendente' : apt.status === 'no_show' ? 'Falta' : apt.status === 'cancelled' ? 'Cancelado' : apt.status}
            color={apt.status === 'confirmed' ? C.success : apt.status === 'pending' ? C.warning : C.danger}
            bg={apt.status === 'confirmed' ? C.successBg : apt.status === 'pending' ? C.warnBg : C.dangerBg}
          />
        </div>
        <p style={{ margin: '2px 0 0', color: C.textMuted, fontSize: '0.82rem' }}>💅 {apt.service?.name}</p>
      </div>
      <div style={{ flexShrink: 0, fontWeight: '700', color: C.text, fontSize: '0.9rem' }}>
        <span style={{ fontWeight: '700', color: C.text, fontSize: '0.9rem', fontFamily: C.fontMono }}>{fmt(apt.financial?.total_value)}</span>
      </div>
    </div>
  );

  const filters = [
    { id: 'proximos',   label: 'Próximos Agendamentos', count: proximos.length,    color: '#6366f1', activeBg: 'rgba(99,102,241,0.08)' },
    { id: 'pendentes',  label: 'Aguardando Aprovação',  count: pendentes.length,   color: C.warning, activeBg: 'rgba(245,158,11,0.08)' },
    { id: 'confirmados',label: 'Confirmados',           count: confirmados.length, color: C.success, activeBg: 'rgba(16,185,129,0.08)' },
    { id: 'historico',  label: 'Histórico Completo',    count: appointments.length,color: C.danger,  activeBg: 'rgba(220,38,38,0.06)' },
  ];

  const activeFilterInfo = filters.find(f => f.id === activeFilter);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '320px 1fr', gap: '22px', alignItems: 'start', fontFamily: C.fontSans }}>
      {/* Coluna esquerda: calendário + filtros */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <MonthCalendar appointments={appointments} selectedDate={selectedDate} onSelectDate={setSelectedDate} />

        <Card style={{ padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <span style={{ fontSize: '1rem' }}>🔽</span>
            <h3 style={{ margin: 0, fontWeight: '700', color: C.text, fontSize: '0.9rem', fontFamily: C.fontSans }}>Filtros de Solicitações</h3>
          </div>
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', padding: '12px 14px', marginBottom: '8px',
                background: activeFilter === f.id ? f.activeBg : 'rgba(255,255,255,0.3)',
                border: `1.5px solid ${activeFilter === f.id ? f.color : 'rgba(255,255,255,0.4)'}`,
                borderRadius: '14px', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left',
                fontFamily: C.fontSans,
              }}
              onMouseEnter={e => { if (activeFilter !== f.id) e.currentTarget.style.background = 'rgba(255,255,255,0.55)'; }}
              onMouseLeave={e => { if (activeFilter !== f.id) e.currentTarget.style.background = 'rgba(255,255,255,0.3)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: f.color, flexShrink: 0, display: 'inline-block', boxShadow: `0 0 6px ${f.color}88` }} />
                <span style={{ fontSize: '0.84rem', fontWeight: activeFilter === f.id ? '700' : '500', color: C.text }}>{f.label}</span>
              </div>
              <span style={{ background: f.color, color: '#fff', borderRadius: '20px', padding: '2px 10px', fontSize: '0.75rem', fontWeight: '800', flexShrink: 0, boxShadow: `0 2px 8px ${f.color}55` }}>
                {f.count}
              </span>
            </button>
          ))}
        </Card>
      </div>

      {/* Coluna direita: agenda do dia + lista filtrada */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Agenda do Dia Selecionado */}
        <Card glow style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 style={{
                margin: 0,
                fontFamily: C.fontDisplay,
                background: `linear-gradient(135deg, ${C.primaryDark} 0%, ${C.primary} 60%, #e055a0 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontSize: '1.1rem',
                fontWeight: '800',
              }}>
                Agenda do Dia Selecionado
              </h3>
              {selectedDate && (
                <p style={{ margin: '4px 0 0', color: C.textMuted, fontSize: '0.82rem', fontFamily: C.fontSans }}>
                  Visualizando dia {fmtSelectedDate}
                </p>
              )}
            </div>
            {confirmedDayApts.length > 0 && (
              <span style={{
                background: 'rgba(16,185,129,0.12)', color: '#065f46',
                border: '1px solid rgba(16,185,129,0.3)', borderRadius: '20px',
                padding: '5px 16px', fontSize: '0.78rem', fontWeight: '700',
                whiteSpace: 'nowrap', flexShrink: 0, fontFamily: C.fontSans,
              }}>
                {confirmedDayApts.length} atendimento{confirmedDayApts.length !== 1 ? 's' : ''} confirmado{confirmedDayApts.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {!selectedDate ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: C.textMuted }}>
              <div style={{ fontSize: '2.2rem', marginBottom: '10px' }}>📅</div>
              <p style={{ fontSize: '0.9rem', margin: 0, fontFamily: C.fontSans }}>Selecione um dia no calendário</p>
            </div>
          ) : dayApts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: C.textMuted }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🌸</div>
              <p style={{ margin: 0, fontSize: '0.9rem', fontFamily: C.fontSans }}>Nenhum agendamento neste dia.</p>
            </div>
          ) : (
            <div style={{ maxHeight: '440px', overflowY: 'auto', paddingRight: '4px' }}>
              {dayApts.map(apt => renderDayCard(apt))}
            </div>
          )}
        </Card>

        {/* Lista filtrada */}
        <Card style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.2rem' }}>
                  {activeFilter === 'pendentes' ? '🔔' : activeFilter === 'confirmados' ? '✅' : '📋'}
                </span>
                <h3 style={{ margin: 0, fontWeight: '700', color: C.text, fontSize: '1rem', fontFamily: C.fontSans }}>
                  {activeFilter === 'pendentes' ? 'Pendentes de Confirmação'
                    : activeFilter === 'confirmados' ? 'Confirmados'
                    : 'Histórico Completo'}
                </h3>
              </div>
              {activeFilter === 'pendentes' && (
                <p style={{ margin: '4px 0 0 2.2rem', color: C.textMuted, fontSize: '0.8rem', fontFamily: C.fontSans }}>
                  Novas solicitações que necessitam de sua resposta de fluxo
                </p>
              )}
            </div>
            {filteredList.length > 0 && (
              <span style={{
                background: activeFilterInfo?.color || C.primary,
                color: '#fff', borderRadius: '20px',
                padding: '4px 14px', fontSize: '0.78rem', fontWeight: '800', flexShrink: 0,
                boxShadow: `0 3px 10px ${(activeFilterInfo?.color || C.primary)}55`,
                fontFamily: C.fontMono,
              }}>
                {filteredList.length}
              </span>
            )}
          </div>

          <div style={{ marginTop: '14px' }}>
            {filteredList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: C.textMuted }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🎉</div>
                <p style={{ fontSize: '0.9rem', margin: 0 }}>Nenhum resultado!</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '12px', maxHeight: '600px', overflowY: 'auto', paddingRight: '4px' }}>
                {filteredList.map(apt => activeFilter === 'pendentes' ? renderPendingCard(apt) : renderListCard(apt))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── ABA: NOVO ATENDIMENTO ───────────────────────────────────────────────────

function NovoAtendimentoTab({ services, onRefresh }) {
  const isMobile = useMobile();
  const [form, setForm] = useState({ client_name: '', client_phone: '', service_id: '', scheduled_date: '', scheduled_time: '', medical_restrictions: '' });
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.service_id || !form.scheduled_date || !form.scheduled_time) return alert('Preencha todos os campos obrigatórios.');
    setLoading(true);
    try {
      await api.post('/appointments/admin/', {
        client_name: form.client_name, client_phone: form.client_phone,
        service_id: parseInt(form.service_id),
        scheduled_at: new Date(`${form.scheduled_date}T${form.scheduled_time}:00`).toISOString(),
        medical_restrictions: form.medical_restrictions || null,
      });
      setSucesso(true);
      setForm({ client_name: '', client_phone: '', service_id: '', scheduled_date: '', scheduled_time: '', medical_restrictions: '' });
      onRefresh();
      setTimeout(() => setSucesso(false), 3000);
    } catch { alert('Erro ao criar atendimento.'); }
    finally { setLoading(false); }
  };

  const labelStyle = { fontSize: '0.82rem', fontWeight: '600', color: C.textMuted, display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' };
  const fieldWrap = { marginBottom: '16px' };

  return (
    <Card style={{ maxWidth: '520px' }}>
      <h3 style={{ color: C.primaryDark, marginBottom: '20px', fontWeight: '800', fontSize: '1.1rem' }}>Novo Atendimento</h3>
      {sucesso && (
        <div style={{ background: C.successBg, color: '#065f46', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
          ✅ Atendimento criado com sucesso!
        </div>
      )}
      <form onSubmit={handleSubmit}>
        {[
          { label: 'Nome da Cliente', name: 'client_name', type: 'text', placeholder: 'Ex: Maria Silva', req: true },
          { label: 'WhatsApp', name: 'client_phone', type: 'tel', placeholder: '(11) 99999-9999', req: true },
        ].map(f => (
          <div key={f.name} style={fieldWrap}>
            <label style={labelStyle}>{f.label} {f.req && <span style={{ color: C.primary }}>*</span>}</label>
            <input type={f.type} name={f.name} value={form[f.name]} onChange={handleChange} placeholder={f.placeholder} required={f.req} style={inputStyle} />
          </div>
        ))}
        <div style={fieldWrap}>
          <label style={labelStyle}>Procedimento <span style={{ color: C.primary }}>*</span></label>
          <select name="service_id" value={form.service_id} onChange={handleChange} required style={selectStyle}>
            <option value="">Selecione...</option>
            {services.filter(s => s.is_active !== false).map(s => <option key={s.id} value={s.id}>[{s.category?.toUpperCase()}] {s.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
          <div style={fieldWrap}>
            <label style={labelStyle}>Data <span style={{ color: C.primary }}>*</span></label>
            <input type="date" name="scheduled_date" value={form.scheduled_date} onChange={handleChange} min={new Date().toISOString().split('T')[0]} required style={inputStyle} />
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Horário <span style={{ color: C.primary }}>*</span></label>
            <select name="scheduled_time" value={form.scheduled_time} onChange={handleChange} required style={selectStyle}>
              <option value="">Horário...</option>
              {timeSlots.map(t => <option key={t} value={t}>{t.replace(':', 'h')}</option>)}
            </select>
          </div>
        </div>
        <div style={fieldWrap}>
          <label style={labelStyle}>Restrições médicas</label>
          <input type="text" name="medical_restrictions" value={form.medical_restrictions} onChange={handleChange} placeholder="Ex: Gestante, alergia a cola..." style={inputStyle} />
        </div>
        <PrimaryBtn disabled={loading} style={{ width: '100%', padding: '13px', fontSize: '0.95rem' }}>
          {loading ? 'Criando...' : '✨ Criar Atendimento'}
        </PrimaryBtn>
      </form>
    </Card>
  );
}

// ─── ABA: CLIENTES (CRM) ─────────────────────────────────────────────────────

function ClientesTab({ clients, appointments, onRefresh }) {
  const isMobile = useMobile();
  const [search, setSearch] = useState('');
  const [filtro, setFiltro] = useState('todas');
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    const match = c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.instagram || '').toLowerCase().includes(q);
    if (!match) return false;
    if (filtro === 'bloqueadas') return c.is_blocked;
    if (filtro === 'faltas') return (c.no_show_count || 0) > 0;
    return true;
  });

  const clientApts = (id) => appointments.filter(a => a.client_id === id).sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at));

  const startEdit = (c) => {
    setEditingId(c.id);
    setEditForm({
      instagram: c.instagram || '',
      favorite_volume: c.favorite_volume || '',
      sensitivity: c.sensitivity || '',
      maintenance_frequency: c.maintenance_frequency || '',
      has_henna_allergy: c.has_henna_allergy || false,
      medical_restrictions: c.medical_restrictions || '',
    });
  };

  const saveEdit = async (id) => {
    setSaving(true);
    try {
      await api.put(`/clients/${id}/`, {
        ...editForm,
        maintenance_frequency: editForm.maintenance_frequency ? parseInt(editForm.maintenance_frequency) : null,
      });
      setEditingId(null);
      onRefresh();
    } catch { alert('Erro ao salvar.'); }
    finally { setSaving(false); }
  };

  const toggleBlock = async (c) => {
    const acao = c.is_blocked ? 'Desbloquear' : 'Bloquear';
    if (!window.confirm(`${acao} ${c.name}?`)) return;
    try { await api.post(`/clients/${c.id}/toggle-block/`); onRefresh(); }
    catch { alert('Erro ao alterar bloqueio.'); }
  };

  const filtroOpts = [{ id: 'todas', label: 'Todas' }, { id: 'bloqueadas', label: '🚫 Bloqueadas' }, { id: 'faltas', label: '⚠️ Com faltas' }];

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <Card style={{ padding: '16px' }}>
        <input
          type="text" placeholder="🔍 Buscar por nome, telefone ou @instagram..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, marginBottom: '12px' }}
        />
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {filtroOpts.map(f => (
            <button key={f.id} onClick={() => setFiltro(f.id)} style={{
              padding: '6px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '0.82rem',
              background: filtro === f.id ? gradientBtn : '#f1f5f9',
              color: filtro === f.id ? '#fff' : C.textMuted,
              fontWeight: filtro === f.id ? '700' : '500',
              transition: 'all 0.2s',
            }}>{f.label}</button>
          ))}
          <span style={{ marginLeft: 'auto', color: C.textMuted, fontSize: '0.82rem', fontWeight: '500' }}>
            {filtered.length} cliente{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </Card>

      {filtered.length === 0 && <p style={{ color: C.textMuted, textAlign: 'center', padding: '24px 0' }}>Nenhuma cliente encontrada.</p>}

      {filtered.map(c => {
        const apts = clientApts(c.id);
        const isExpanded = expandedId === c.id;
        const isEditing = editingId === c.id;
        const noShows = c.no_show_count || 0;
        const cancels = c.cancellation_count || 0;

        return (
          <Card key={c.id} style={{
            borderLeft: `4px solid ${c.is_blocked ? C.danger : noShows > 0 ? C.warning : C.primary}`,
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 5px 20px rgba(0,0,0,0.11)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)'; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: C.text, fontWeight: '700' }}>{c.name}</h3>
                  {c.is_blocked && <Badge label="🚫 Bloqueada" color={C.danger} bg={C.dangerBg} />}
                  {noShows > 0 && <Badge label={`⚠️ ${noShows} falta${noShows > 1 ? 's' : ''}`} color="#92400e" bg={C.warnBg} />}
                </div>
                <p style={{ color: C.textMuted, fontSize: '0.85rem', margin: '4px 0 0' }}>
                  📱 {c.phone}
                  {c.instagram && <span style={{ marginLeft: '10px' }}>📸 @{c.instagram.replace('@', '')}</span>}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ color: C.textMuted, fontSize: '0.8rem' }}>
                  {apts.length} atend. · {cancels} cancel.
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: isExpanded ? '14px' : 0 }}>
              <button onClick={() => abrirWpp(c.phone, `Oi ${c.name}! 💕`)}
                style={{ padding: '7px 14px', background: '#25D366', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer' }}>
                📲 WhatsApp
              </button>
              <button onClick={() => { setExpandedId(isExpanded ? null : c.id); setEditingId(null); }}
                style={{ padding: '7px 14px', background: '#f1f5f9', color: C.textMuted, border: 'none', borderRadius: '10px', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer' }}>
                {isExpanded ? '▲ Fechar' : '▼ Detalhes'}
              </button>
              <button onClick={() => { startEdit(c); setExpandedId(c.id); }}
                style={{ padding: '7px 14px', background: '#ede9fe', color: '#5b21b6', border: 'none', borderRadius: '10px', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer' }}>
                ✏️ Preferências
              </button>
              <button onClick={() => toggleBlock(c)}
                style={{ padding: '7px 14px', background: c.is_blocked ? C.successBg : C.dangerBg, color: c.is_blocked ? '#065f46' : C.danger, border: 'none', borderRadius: '10px', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer' }}>
                {c.is_blocked ? '✅ Desbloquear' : '🚫 Bloquear'}
              </button>
            </div>

            {isExpanded && (
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '16px', marginTop: '4px' }}>
                {isEditing && (
                  <div style={{ background: '#fdf1f6', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                    <p style={{ fontWeight: '700', color: C.primary, marginBottom: '14px', fontSize: '0.9rem' }}>✏️ Editar preferências</p>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                      {[
                        { label: 'Instagram', key: 'instagram', placeholder: '@usuario' },
                        { label: 'Volume favorito', key: 'favorite_volume', placeholder: 'Ex: Volume Russo' },
                      ].map(f => (
                        <div key={f.key}>
                          <label style={{ fontSize: '0.78rem', color: C.textMuted, display: 'block', marginBottom: '4px', fontWeight: '600' }}>{f.label}</label>
                          <input value={editForm[f.key]} onChange={e => setEditForm({ ...editForm, [f.key]: e.target.value })} placeholder={f.placeholder} style={inputStyle} />
                        </div>
                      ))}
                      <div>
                        <label style={{ fontSize: '0.78rem', color: C.textMuted, display: 'block', marginBottom: '4px', fontWeight: '600' }}>Sensibilidade</label>
                        <select value={editForm.sensitivity} onChange={e => setEditForm({ ...editForm, sensitivity: e.target.value })} style={selectStyle}>
                          <option value="">Não informado</option>
                          <option value="baixa">Baixa</option>
                          <option value="media">Média</option>
                          <option value="alta">Alta</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.78rem', color: C.textMuted, display: 'block', marginBottom: '4px', fontWeight: '600' }}>Freq. manutenção</label>
                        <select value={editForm.maintenance_frequency} onChange={e => setEditForm({ ...editForm, maintenance_frequency: e.target.value })} style={selectStyle}>
                          <option value="">Não informado</option>
                          <option value="14">14 dias</option>
                          <option value="21">21 dias</option>
                          <option value="28">28 dias</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ marginTop: '12px' }}>
                      <label style={{ fontSize: '0.78rem', color: C.textMuted, display: 'block', marginBottom: '4px', fontWeight: '600' }}>Restrições médicas</label>
                      <input value={editForm.medical_restrictions} onChange={e => setEditForm({ ...editForm, medical_restrictions: e.target.value })}
                        placeholder="Ex: Gestante, lactante, alergias..." style={inputStyle} />
                    </div>
                    <div style={{ marginTop: '12px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', cursor: 'pointer', color: C.text }}>
                        <input type="checkbox" checked={editForm.has_henna_allergy} onChange={e => setEditForm({ ...editForm, has_henna_allergy: e.target.checked })} />
                        Alergia a hena
                      </label>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                      <PrimaryBtn onClick={() => saveEdit(c.id)} disabled={saving} style={{ flex: 1 }}>
                        {saving ? 'Salvando...' : '✅ Salvar'}
                      </PrimaryBtn>
                      <button onClick={() => setEditingId(null)}
                        style={{ padding: '10px 18px', background: '#f1f5f9', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', color: C.textMuted }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {!isEditing && (c.favorite_volume || c.sensitivity || c.maintenance_frequency || c.has_henna_allergy) && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                    {c.favorite_volume && <Badge label={`💅 ${c.favorite_volume}`} />}
                    {c.sensitivity && <Badge label={`🌡️ Sensib. ${c.sensitivity}`} color="#5b21b6" bg="#ede9fe" />}
                    {c.maintenance_frequency && <Badge label={`🗓️ Manut. ${c.maintenance_frequency}d`} color="#065f46" bg={C.successBg} />}
                    {c.has_henna_allergy && <Badge label="⚠️ Alérgica a hena" color="#92400e" bg={C.warnBg} />}
                  </div>
                )}

                <p style={{ fontWeight: '700', color: C.textMuted, fontSize: '0.82rem', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Histórico ({apts.length} atendimentos)
                </p>
                {apts.length === 0 ? (
                  <p style={{ color: C.textMuted, fontSize: '0.85rem' }}>Sem atendimentos registrados.</p>
                ) : (
                  <div style={{ display: 'grid', gap: '6px' }}>
                    {apts.slice(0, 8).map(a => (
                      <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', background: '#f8f7fc', borderRadius: '10px', fontSize: '0.84rem' }}>
                        <span style={{ color: C.text }}>{fmtDate(a.scheduled_at)} — {a.service?.name || '—'}</span>
                        <span style={{
                          padding: '2px 10px', borderRadius: '12px', fontSize: '0.73rem', fontWeight: '700',
                          background: a.status === 'no_show' ? C.dangerBg : a.status === 'pending' ? C.warnBg : a.status === 'rejected' ? '#f3f4f6' : a.status === 'scheduled' || a.status === 'confirmed' ? '#dbeafe' : C.successBg,
                          color: a.status === 'no_show' ? C.danger : a.status === 'pending' ? '#92400e' : a.status === 'rejected' ? '#9ca3af' : a.status === 'scheduled' || a.status === 'confirmed' ? '#1d4ed8' : '#065f46',
                        }}>
                          {a.status === 'no_show' ? 'Falta' : a.status === 'pending' ? 'Pendente' : a.status === 'rejected' ? 'Recusado' : a.status === 'confirmed' ? 'Confirmado' : a.status === 'scheduled' ? 'Agendado' : 'Concluído'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ─── ABA: CATÁLOGO ───────────────────────────────────────────────────────────

const CATEGORIAS = [
  { id: 'cilios',      label: '💅 Cílios' },
  { id: 'sobrancelha', label: '🪄 Sobrancelhas' },
  { id: 'remocao',     label: '🧪 Remoções' },
];

function CatalogoTab({ services, onRefresh }) {
  const isMobile = useMobile();
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', category: 'cilios', base_price: '', deposit_amount: '', estimated_minutes: '' });
  const [saving, setSaving] = useState(false);

  const startEdit = (s) => {
    setEditingId(s.id);
    setEditForm({ name: s.name, category: s.category, base_price: s.base_price, deposit_amount: s.deposit_amount, estimated_minutes: s.estimated_minutes });
  };

  const saveEdit = async (id) => {
    setSaving(true);
    try {
      await api.put(`/services/${id}/`, {
        ...editForm,
        base_price: parseFloat(editForm.base_price),
        deposit_amount: parseFloat(editForm.deposit_amount),
        estimated_minutes: parseInt(editForm.estimated_minutes),
      });
      setEditingId(null); onRefresh();
    } catch { alert('Erro ao salvar serviço.'); }
    finally { setSaving(false); }
  };

  const addService = async () => {
    if (!addForm.name || !addForm.base_price) return alert('Preencha nome e preço.');
    setSaving(true);
    try {
      await api.post('/services/', {
        ...addForm,
        base_price: parseFloat(addForm.base_price),
        deposit_amount: parseFloat(addForm.deposit_amount) || 0,
        estimated_minutes: parseInt(addForm.estimated_minutes) || 60,
      });
      setShowAdd(false);
      setAddForm({ name: '', category: 'cilios', base_price: '', deposit_amount: '', estimated_minutes: '' });
      onRefresh();
    } catch { alert('Erro ao adicionar serviço.'); }
    finally { setSaving(false); }
  };

  const toggleAtivo = async (s) => {
    try { await api.put(`/services/${s.id}/`, { is_active: !s.is_active }); onRefresh(); }
    catch { alert('Erro ao alterar status.'); }
  };

  const smallLabel = { fontSize: '0.78rem', color: C.textMuted, display: 'block', marginBottom: '4px', fontWeight: '600' };

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <PrimaryBtn onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? '✕ Cancelar' : '➕ Novo serviço'}
        </PrimaryBtn>
      </div>

      {showAdd && (
        <Card style={{ borderTop: `4px solid ${C.primary}` }}>
          <h4 style={{ color: C.primaryDark, marginBottom: '16px', fontWeight: '800', fontSize: '1rem' }}>Novo serviço</h4>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={smallLabel}>Nome *</label>
              <input value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} placeholder="Ex: Volume Russo" style={inputStyle} />
            </div>
            <div>
              <label style={smallLabel}>Categoria</label>
              <select value={addForm.category} onChange={e => setAddForm({ ...addForm, category: e.target.value })} style={selectStyle}>
                {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={smallLabel}>Preço total (R$) *</label>
              <input type="number" value={addForm.base_price} onChange={e => setAddForm({ ...addForm, base_price: e.target.value })} placeholder="130" style={inputStyle} />
            </div>
            <div>
              <label style={smallLabel}>Sinal (R$)</label>
              <input type="number" value={addForm.deposit_amount} onChange={e => setAddForm({ ...addForm, deposit_amount: e.target.value })} placeholder="30" style={inputStyle} />
            </div>
            <div>
              <label style={smallLabel}>Duração (min)</label>
              <input type="number" value={addForm.estimated_minutes} onChange={e => setAddForm({ ...addForm, estimated_minutes: e.target.value })} placeholder="120" style={inputStyle} />
            </div>
          </div>
          <PrimaryBtn onClick={addService} disabled={saving} style={{ marginTop: '16px' }}>
            {saving ? 'Salvando...' : '✅ Adicionar'}
          </PrimaryBtn>
        </Card>
      )}

      {CATEGORIAS.map(cat => {
        const catServices = services.filter(s => s.category === cat.id);
        if (!catServices.length) return null;
        return (
          <div key={cat.id}>
            <h4 style={{ color: C.text, fontWeight: '800', marginBottom: '12px', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{cat.label}</h4>
            <div style={{ display: 'grid', gap: '10px' }}>
              {catServices.map(s => (
                <Card key={s.id} style={{ padding: '16px', opacity: s.is_active === false ? 0.6 : 1, transition: 'transform 0.15s, box-shadow 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 5px 18px rgba(0,0,0,0.11)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)'; }}
                >
                  {editingId === s.id ? (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                        {[
                          { label: 'Nome', key: 'name', type: 'text' },
                          { label: 'Preço (R$)', key: 'base_price', type: 'number' },
                          { label: 'Sinal (R$)', key: 'deposit_amount', type: 'number' },
                          { label: 'Duração (min)', key: 'estimated_minutes', type: 'number' },
                        ].map(f => (
                          <div key={f.key}>
                            <label style={smallLabel}>{f.label}</label>
                            <input type={f.type} value={editForm[f.key]} onChange={e => setEditForm({ ...editForm, [f.key]: e.target.value })} style={inputStyle} />
                          </div>
                        ))}
                        <div>
                          <label style={smallLabel}>Categoria</label>
                          <select value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })} style={selectStyle}>
                            {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                          </select>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <PrimaryBtn onClick={() => saveEdit(s.id)} disabled={saving} style={{ flex: 1 }}>
                          {saving ? '...' : '✅ Salvar'}
                        </PrimaryBtn>
                        <button onClick={() => setEditingId(null)}
                          style={{ padding: '10px 18px', background: '#f1f5f9', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', color: C.textMuted }}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <p style={{ fontWeight: '700', color: C.text, margin: '0 0 4px', fontSize: '0.95rem' }}>
                          {s.name}
                          {s.is_active === false && <span style={{ marginLeft: '8px', fontSize: '0.73rem', color: '#9ca3af', fontWeight: '400' }}>(inativo)</span>}
                        </p>
                        <p style={{ color: C.textMuted, fontSize: '0.84rem', margin: 0 }}>
                          💰 {fmt(s.base_price)} · 💳 Sinal {fmt(s.deposit_amount)} · ⏱ {s.estimated_minutes}min
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => startEdit(s)}
                          style={{ padding: '7px 14px', background: '#ede9fe', color: '#5b21b6', border: 'none', borderRadius: '10px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}>
                          ✏️ Editar
                        </button>
                        <button onClick={() => toggleAtivo(s)}
                          style={{ padding: '7px 14px', background: s.is_active === false ? C.successBg : C.dangerBg, color: s.is_active === false ? '#065f46' : C.danger, border: 'none', borderRadius: '10px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}>
                          {s.is_active === false ? '✅ Ativar' : '🚫 Desativar'}
                        </button>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── ABA: ESTATÍSTICAS ────────────────────────────────────────────────────────

function EstatisticasTab({ stats, appointments }) {
  if (!stats) return <p style={{ color: C.textMuted }}>Carregando estatísticas...</p>;

  const top10 = (stats.services || []).filter(s => s.total > 0).slice(0, 10);
  const catData = ['cilios', 'sobrancelha', 'remocao'].map(cat => ({
    name: cat === 'cilios' ? 'Cílios' : cat === 'sobrancelha' ? 'Sobrancelhas' : 'Remoções',
    value: (stats.services || []).filter(s => s.category === cat).reduce((a, s) => a + s.total, 0),
  })).filter(c => c.value > 0);

  const proximos7 = appointments.filter(a => {
    const d = new Date(a.scheduled_at);
    const hoje = new Date(); const em7 = new Date();
    em7.setDate(hoje.getDate() + 7);
    return d >= hoje && d <= em7;
  }).length;

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
        <StatCard label="Total de Atendimentos" value={stats.total_appointments} color={C.primary} />
        <StatCard label="Próximos 7 dias" value={proximos7} color="#6366f1" />
        <StatCard label="Ticket Médio" value={fmt(stats.ticket_medio)} color={C.warning} />
      </div>

      {top10.length > 0 && (
        <Card>
          <h4 style={{ color: C.text, marginBottom: '16px', fontWeight: '700' }}>Serviços mais agendados</h4>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={top10} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: C.textMuted }} />
              <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 11, fill: C.text }} />
              <Tooltip />
              <Bar dataKey="total" fill={C.primary} radius={[0, 8, 8, 0]} name="Agendamentos" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {catData.length > 0 && (
        <Card>
          <h4 style={{ color: C.text, marginBottom: '16px', fontWeight: '700' }}>Distribuição por categoria</h4>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={catData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                {catData.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      )}

      {stats.total_appointments === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: C.textMuted }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📊</div>
          <p>Nenhum dado ainda. Os gráficos aparecem conforme os agendamentos forem criados.</p>
        </div>
      )}
    </div>
  );
}

// ─── ABA: FINANCEIRO ─────────────────────────────────────────────────────────

function FinanceiroTab({ stats }) {
  if (!stats) return <p style={{ color: C.textMuted }}>Carregando...</p>;

  const projecaoMensal = stats.ticket_medio * 20;
  const taxaRecebimento = stats.total_revenue > 0
    ? ((stats.total_deposits / stats.total_revenue) * 100).toFixed(0) : 0;

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <StatCard label="Receita Total Gerada" value={fmt(stats.total_revenue)} color={C.primary} sub="Soma de todos os atendimentos" />
        <StatCard label="Sinais Recebidos" value={fmt(stats.total_deposits)} color="#25D366" sub="Pix confirmados" />
        <StatCard label="A Receber no Dia" value={fmt(stats.total_pending)} color={C.warning} sub="Saldo dos atendimentos" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <StatCard label="Ticket Médio" value={fmt(stats.ticket_medio)} color="#6366f1" sub="Por atendimento" />
        <StatCard label="Projeção Mensal" value={fmt(projecaoMensal)} color="#128C7E" sub="Base: 20 atend./mês" />
        <StatCard label="Taxa de Recebimento" value={`${taxaRecebimento}%`} color="#ec4899" sub="Sinais / Total gerado" />
      </div>
      <Card>
        <h4 style={{ color: C.text, marginBottom: '16px', fontWeight: '700' }}>Faturamento por categoria</h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#fdf1f6' }}>
                {['Categoria', 'Atendimentos', 'Receita estimada'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: C.primaryDark, fontWeight: '700', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[{ cat: 'cilios', label: '💅 Cílios' }, { cat: 'sobrancelha', label: '🪄 Sobrancelhas' }, { cat: 'remocao', label: '🧪 Remoções' }].map(({ cat, label }) => {
                const itens = (stats.services || []).filter(s => s.category === cat);
                const total = itens.reduce((a, s) => a + s.total, 0);
                return (
                  <tr key={cat} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '12px 16px', color: C.text, fontWeight: '500' }}>{label}</td>
                    <td style={{ padding: '12px 16px', color: C.textMuted }}>{total}</td>
                    <td style={{ padding: '12px 16px', fontWeight: '700', color: C.primary }}>{fmt(total * stats.ticket_medio)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── ABA: CONFIGURAÇÕES ──────────────────────────────────────────────────────

function agruparBloqueios(slots) {
  if (!slots.length) return [];
  const sorted = [...slots].sort((a, b) => a.date.localeCompare(b.date));
  const groups = [];
  let grupo = { ids: [sorted[0].id], inicio: sorted[0].date, fim: sorted[0].date, reason: sorted[0].reason };
  for (let i = 1; i < sorted.length; i++) {
    const prevDate = new Date(sorted[i - 1].date);
    prevDate.setDate(prevDate.getDate() + 1);
    const prevNext = prevDate.toISOString().split('T')[0];
    if (prevNext === sorted[i].date && sorted[i].reason === sorted[i - 1].reason) {
      grupo.ids.push(sorted[i].id); grupo.fim = sorted[i].date;
    } else { groups.push(grupo); grupo = { ids: [sorted[i].id], inicio: sorted[i].date, fim: sorted[i].date, reason: sorted[i].reason }; }
  }
  groups.push(grupo);
  return groups;
}

function fmtDiaMes(d) { const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}`; }

function ConfiguracoesTab({ blockedSlots, onRefresh }) {
  const isMobile = useMobile();
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const hoje = new Date().toISOString().split('T')[0];

  const bloquear = async () => {
    if (!dateStart) return alert('Escolha a data de início.');
    const fim = dateEnd || dateStart;
    if (fim < dateStart) return alert('A data final deve ser igual ou posterior à data inicial.');
    setLoading(true);
    try {
      await api.post('/blocked-slots/range/', { date_start: dateStart, date_end: fim, reason: reason || null });
      setDateStart(''); setDateEnd(''); setReason('');
      onRefresh();
    } catch { alert('Erro ao bloquear período.'); }
    finally { setLoading(false); }
  };

  const desbloquearGrupo = async (ids) => {
    if (!window.confirm(`Desbloquear ${ids.length > 1 ? `os ${ids.length} dias deste período` : 'este dia'}?`)) return;
    try { await Promise.all(ids.map(id => api.delete(`/blocked-slots/${id}/`))); onRefresh(); }
    catch { alert('Erro ao desbloquear.'); }
  };

  const grupos = agruparBloqueios(blockedSlots);
  const labelStyle = { fontSize: '0.82rem', fontWeight: '600', color: C.textMuted, display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' };

  return (
    <div style={{ display: 'grid', gap: '20px', maxWidth: '600px' }}>
      <Card>
        <h3 style={{ color: C.primaryDark, marginBottom: '6px', fontWeight: '800', fontSize: '1rem' }}>Fechar agenda</h3>
        <p style={{ color: C.textMuted, fontSize: '0.88rem', marginBottom: '20px' }}>Selecione um dia ou período. As datas bloqueadas não aparecerão para agendamento.</p>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
          <div>
            <label style={labelStyle}>Data de início *</label>
            <input type="date" value={dateStart} min={hoje}
              onChange={e => { setDateStart(e.target.value); if (!dateEnd || dateEnd < e.target.value) setDateEnd(e.target.value); }}
              style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Data de fim</label>
            <input type="date" value={dateEnd} min={dateStart || hoje}
              onChange={e => setDateEnd(e.target.value)}
              style={inputStyle} />
          </div>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Motivo (opcional)</label>
          <input type="text" value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Ex: Viagem, compromisso pessoal..." style={inputStyle} />
        </div>
        <PrimaryBtn onClick={bloquear} disabled={loading} style={{ width: '100%', padding: '13px' }}>
          {loading ? 'Bloqueando...' : '🔒 Bloquear período'}
        </PrimaryBtn>
      </Card>

      <Card>
        <h3 style={{ color: C.text, marginBottom: '16px', fontWeight: '700', fontSize: '1rem' }}>
          Períodos bloqueados
          {blockedSlots.length > 0 && <span style={{ fontSize: '0.8rem', fontWeight: '400', color: C.textMuted, marginLeft: '8px' }}>({blockedSlots.length} dia{blockedSlots.length > 1 ? 's' : ''})</span>}
        </h3>
        {grupos.length === 0 ? (
          <p style={{ color: C.textMuted, fontSize: '0.9rem' }}>Nenhuma data bloqueada no momento.</p>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {grupos.map((g, i) => {
              const single = g.inicio === g.fim;
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#fdf1f6', borderRadius: '12px', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: C.primaryDark, fontSize: '0.93rem' }}>
                      📅 {single ? fmtDiaMes(g.inicio) : `${fmtDiaMes(g.inicio)} → ${fmtDiaMes(g.fim)}`}
                    </strong>
                    {!single && <span style={{ marginLeft: '8px', color: C.textMuted, fontSize: '0.82rem' }}>({g.ids.length} dias)</span>}
                    {g.reason && <p style={{ color: C.textMuted, fontSize: '0.84rem', margin: '4px 0 0' }}>{g.reason}</p>}
                  </div>
                  <button onClick={() => desbloquearGrupo(g.ids)}
                    style={{ background: C.dangerBg, color: C.danger, border: 'none', borderRadius: '10px', padding: '7px 14px', cursor: 'pointer', fontWeight: '700', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                    Desbloquear
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────

const TABS = [
  { id: 'agenda',     label: 'AGENDA',        icon: '📅' },
  { id: 'novo',       label: 'NOVO ATEND.',   icon: '+' },
  { id: 'clientes',   label: 'CLIENTES',      icon: '👤' },
  { id: 'catalogo',   label: 'CATÁLOGO',      icon: '📔' },
  { id: 'stats',      label: 'ESTATÍSTICAS',  icon: '📊' },
  { id: 'financeiro', label: 'FINANCEIRO',    icon: '💰' },
  { id: 'config',     label: 'CONFIGURAÇÕES', icon: '⚙️' },
];

export default function AdminDashboard() {
  const isMobile = useMobile();
  // ── Auth ──────────────────────────────────────────────────────────────────
  const [token, setToken] = useState(() => sessionStorage.getItem('admin_token'));

  // ── Estado do painel ──────────────────────────────────────────────────────
  const [activeTab, setActiveTab]       = useState('agenda');
  const [appointments, setAppointments] = useState([]);
  const [services, setServices]         = useState([]);
  const [stats, setStats]               = useState(null);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [clients, setClients]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [currentTime, setCurrentTime]   = useState(() => new Date().toLocaleTimeString('pt-BR'));

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString('pt-BR')), 1000);
    return () => clearInterval(timer);
  }, []);

  // Ouve o evento disparado pelo interceptor axios quando recebe 401
  useEffect(() => {
    const handleExpired = () => setToken(null);
    window.addEventListener('admin-session-expired', handleExpired);
    return () => window.removeEventListener('admin-session-expired', handleExpired);
  }, []);

  const fetchAll = async () => {
    try {
      const [a, s, st, b, c] = await Promise.all([
        api.get('/appointments/'),
        api.get('/services/'),
        api.get('/stats/'),
        api.get('/blocked-slots/'),
        api.get('/clients/'),
      ]);
      setAppointments(a.data);
      setServices(s.data);
      setStats(st.data);
      setBlockedSlots(b.data);
      setClients(c.data);
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token) fetchAll(); }, [token]);

  const logout = () => {
    sessionStorage.removeItem('admin_token');
    setToken(null);
  };

  // Se não tiver token, mostra a tela de login
  if (!token) return <AdminLogin onLogin={setToken} />;

  if (loading) return (
    <div style={{ textAlign: 'center', marginTop: '100px', padding: '20px' }}>
      <div style={{ width: '48px', height: '48px', border: `4px solid #f3f4f6`, borderTop: `4px solid ${C.primary}`, borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
      <h2 style={{ color: C.text, fontWeight: '700', marginBottom: '8px' }}>Carregando painel...</h2>
      <p style={{ color: C.textMuted, fontSize: '0.9rem' }}>Se demorar muito, o servidor pode estar iniciando — aguarde 30 segundos.</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ textAlign: 'center', marginTop: '100px', padding: '20px' }}>
      <div style={{ fontSize: '3rem', marginBottom: '12px' }}>⚠️</div>
      <h2 style={{ color: C.danger, fontWeight: '700', marginBottom: '8px' }}>Servidor offline</h2>
      <p style={{ color: C.textMuted, marginBottom: '24px' }}>{error}</p>
      <PrimaryBtn onClick={() => { setError(null); setLoading(true); fetchAll(); }} style={{ margin: '0 auto' }}>
        Tentar novamente
      </PrimaryBtn>
    </div>
  );

  const pendingCount = appointments.filter(a => a.status === 'pending').length;

  const currentDate = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: C.fontSans }}>
      {/* Header */}
      <div style={{
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(24px) saturate(160%)',
        WebkitBackdropFilter: 'blur(24px) saturate(160%)',
        borderBottom: '1px solid rgba(216,67,139,0.12)',
        padding: isMobile ? '0 14px' : '0 28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '72px',
        boxShadow: '0 2px 20px rgba(160,25,94,0.08)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px', height: '46px',
            background: gradientBtn,
            borderRadius: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.4rem',
            boxShadow: '0 6px 18px rgba(160,25,94,0.4)',
          }}>
            ✨
          </div>
          <div>
            <p style={{ margin: 0, lineHeight: 1.15, fontFamily: C.fontDisplay }}>
              <span style={{ fontWeight: '900', fontSize: '1.1rem', color: C.text }}>Giovanna</span>{' '}
              <span style={{ fontWeight: '900', fontSize: '1.1rem', color: C.primary, fontStyle: 'italic' }}>Beauty</span>
            </p>
            <p style={{ margin: 0, fontSize: '0.65rem', color: C.textMuted, fontWeight: '500', letterSpacing: '0.03em', fontFamily: C.fontSans }}>
              + Lash &amp; Brow · High Aesthetic Studio +
            </p>
          </div>
        </div>

        {/* Right: date/time + user + logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '20px' }}>
          {!isMobile && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '0.78rem' }}>🗓</span>
                <span style={{ fontSize: '0.82rem', color: C.text, fontWeight: '500', fontFamily: C.fontSans }}>{currentDate}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'flex-end', marginTop: '2px' }}>
                <span style={{ fontSize: '0.78rem' }}>⏰</span>
                <span style={{ fontSize: '0.82rem', color: C.textMuted, fontFamily: C.fontMono, letterSpacing: '0.04em' }}>{currentTime}</span>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px', height: '40px',
              background: gradientBtn,
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: '800', fontSize: '1.05rem', flexShrink: 0,
              fontFamily: C.fontDisplay,
              boxShadow: '0 4px 14px rgba(160,25,94,0.4)',
            }}>
              G
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: '700', fontSize: '0.88rem', color: C.text, fontFamily: C.fontDisplay }}>Giovanna</p>
              <p style={{ margin: 0, fontSize: '0.68rem', color: C.primary, fontWeight: '600', fontFamily: C.fontSans }}>Lash Expert</p>
            </div>
          </div>

          <button
            onClick={logout}
            title="Sair"
            className="btn-tactile"
            style={{
              width: '38px', height: '38px',
              background: 'rgba(216,67,139,0.07)',
              color: C.primary,
              border: '1px solid rgba(216,67,139,0.2)',
              borderRadius: '12px',
              fontSize: '1rem',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = C.dangerBg; e.currentTarget.style.color = C.danger; e.currentTarget.style.borderColor = 'rgba(220,38,38,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(216,67,139,0.07)'; e.currentTarget.style.color = C.primary; e.currentTarget.style.borderColor = 'rgba(216,67,139,0.2)'; }}
          >
            →
          </button>
        </div>
      </div>

      {/* Navigation tabs */}
      <div style={{
        background: 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(216,67,139,0.1)',
        display: 'flex',
        overflowX: 'auto',
        padding: '10px 20px',
        gap: '4px',
        scrollbarWidth: 'none',
      }}>
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          const hasBadge = tab.id === 'agenda' && pendingCount > 0;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="btn-tactile"
              style={{
                padding: '8px 16px',
                border: active ? 'none' : '1px solid rgba(216,67,139,0.12)',
                background: active ? gradientBtn : 'rgba(255,255,255,0.4)',
                color: active ? '#fff' : C.textMuted,
                fontWeight: active ? '700' : '500',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontSize: '0.76rem',
                letterSpacing: '0.01em',
                borderRadius: '20px',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontFamily: C.fontSans,
                boxShadow: active ? '0 4px 14px rgba(160,25,94,0.35)' : 'none',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(216,67,139,0.08)'; e.currentTarget.style.color = C.primaryDark; e.currentTarget.style.borderColor = 'rgba(216,67,139,0.25)'; } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.4)'; e.currentTarget.style.color = C.textMuted; e.currentTarget.style.borderColor = 'rgba(216,67,139,0.12)'; } }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {hasBadge && (
                <span style={{
                  background: active ? 'rgba(255,255,255,0.28)' : C.warning,
                  color: '#fff',
                  borderRadius: '10px', padding: '1px 7px',
                  fontSize: '0.65rem', fontWeight: '800',
                  fontFamily: C.fontMono,
                }}>
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: isMobile ? '16px 12px' : '28px 20px' }}>
        {activeTab === 'agenda'     && <AgendaTab appointments={appointments} onRefresh={fetchAll} />}
        {activeTab === 'novo'       && <NovoAtendimentoTab services={services} onRefresh={fetchAll} />}
        {activeTab === 'clientes'   && <ClientesTab clients={clients} appointments={appointments} onRefresh={fetchAll} />}
        {activeTab === 'catalogo'   && <CatalogoTab services={services} onRefresh={fetchAll} />}
        {activeTab === 'stats'      && <EstatisticasTab stats={stats} appointments={appointments} />}
        {activeTab === 'financeiro' && <FinanceiroTab stats={stats} />}
        {activeTab === 'config'     && <ConfiguracoesTab blockedSlots={blockedSlots} onRefresh={fetchAll} />}
      </div>
    </div>
  );
}
