import { useState, useEffect } from 'react';
import api from '../api/client';
import AdminLogin from './AdminLogin';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, Legend
} from 'recharts';

// ─── Helpers ────────────────────────────────────────────────────────────────

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

// ─── UI reutilizável ─────────────────────────────────────────────────────────

const Card = ({ children, style }) => (
  <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)', padding: '20px', ...style }}>
    {children}
  </div>
);

const StatCard = ({ label, value, sub, color }) => (
  <Card style={{ textAlign: 'center', borderTop: `4px solid ${color || 'var(--primary-color)'}` }}>
    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '6px' }}>{label}</p>
    <p style={{ fontSize: '1.8rem', fontWeight: '800', color: color || 'var(--primary-color)' }}>{value}</p>
    {sub && <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>{sub}</p>}
  </Card>
);

const BtnWpp = ({ label, color, onClick }) => (
  <button onClick={onClick} style={{ flex: 1, minWidth: '140px', padding: '9px 12px', background: color, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.82rem', cursor: 'pointer' }}>
    {label}
  </button>
);

const Badge = ({ label, color = 'var(--primary-color)', bg = '#fdf1f6' }) => (
  <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', background: bg, color }}>
    {label}
  </span>
);

const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', boxSizing: 'border-box' };
const selectStyle = { ...inputStyle };

// ─── ABA: AGENDA ─────────────────────────────────────────────────────────────

function AgendaTab({ appointments, onRefresh }) {
  const [reagendando, setReagendando] = useState(null);
  const [novaData, setNovaData] = useState('');
  const [novaHora, setNovaHora] = useState('');
  const [salvando, setSalvando] = useState(false);
  const pendingCount = appointments.filter(a => a.status === 'pending').length;
  const [filtro, setFiltro] = useState(() => pendingCount > 0 ? 'pending' : 'scheduled');

  const confirmar = async (apt) => {
    if (!window.confirm(`Confirmar agendamento de ${apt.client?.name}?`)) return;
    try {
      await api.patch(`/appointments/${apt.id}/status`, { status: 'confirmed' });
      onRefresh();
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

  const filtros = [
    { id: 'pending',   label: pendingCount > 0 ? `⏳ Pendentes (${pendingCount})` : '⏳ Pendentes' },
    { id: 'scheduled', label: '📅 Confirmados' },
    { id: 'no_show',   label: '🚫 Faltas' },
    { id: 'todos',     label: 'Todos' },
  ];

  const lista = appointments.filter(a => {
    if (filtro === 'todos') return true;
    if (filtro === 'pending') return a.status === 'pending';
    if (filtro === 'scheduled') return a.status === 'scheduled' || a.status === 'confirmed';
    return a.status === filtro;
  });

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        {filtros.map(f => (
          <button key={f.id} onClick={() => setFiltro(f.id)} style={{
            padding: '7px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer',
            background: filtro === f.id ? 'var(--primary-color)' : '#eee',
            color: filtro === f.id ? '#fff' : 'var(--text-muted)',
            fontWeight: filtro === f.id ? '700' : '400', fontSize: '0.85rem'
          }}>{f.label}</button>
        ))}
        <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          {lista.length} registro{lista.length !== 1 ? 's' : ''}
        </span>
      </div>

      {lista.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Nenhum registro para este filtro.</p>}

      {lista.map(apt => (
        <Card key={apt.id} style={{
          borderLeft: `5px solid ${apt.status === 'no_show' ? '#dc2626' : apt.status === 'pending' ? '#f59e0b' : apt.client?.is_blocked ? '#f59e0b' : 'var(--primary-color)'}`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ color: 'var(--text-main)', fontSize: '1.05rem', margin: 0 }}>{apt.client?.name}</h3>
              {apt.status === 'pending' && <Badge label="⏳ Pendente" color="#92400e" bg="#fef3c7" />}
              {apt.client?.is_blocked && <Badge label="🚫 Bloqueada" color="#dc2626" bg="#fee2e2" />}
              {apt.status === 'no_show' && <Badge label="Falta" color="#dc2626" bg="#fee2e2" />}
            </div>
            <span style={{ background: '#fdf1f6', color: 'var(--primary-color)', padding: '4px 14px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.85rem' }}>
              {fmtDate(apt.scheduled_at)}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '12px' }}>
            <p>📱 {apt.client?.phone}</p>
            <p>💅 {apt.service?.name}</p>
            <p>💰 Total: <strong>{fmt(apt.financial?.total_value)}</strong></p>
            <p style={{ color: '#d9534f', fontWeight: 'bold' }}>🏷️ Receber: {fmt(apt.financial?.balance_due)}</p>
          </div>

          {apt.client?.medical_restrictions && (
            <div style={{ background: '#fff3cd', color: '#856404', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '12px' }}>
              ⚠️ {apt.client.medical_restrictions}
            </div>
          )}

          {reagendando === apt.id && (
            <div style={{ background: '#fdf1f6', borderRadius: '10px', padding: '14px', marginBottom: '12px' }}>
              <p style={{ fontWeight: 'bold', marginBottom: '10px', color: 'var(--primary-color)' }}>📅 Novo horário</p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input type="date" value={novaData} onChange={e => setNovaData(e.target.value)}
                  min={new Date().toISOString().split('T')[0]} style={{ flex: 1, ...inputStyle }} />
                <select value={novaHora} onChange={e => setNovaHora(e.target.value)} style={{ flex: 1, ...selectStyle }}>
                  <option value="">Horário...</option>
                  {timeSlots.map(t => <option key={t} value={t}>{t.replace(':', 'h')}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button onClick={() => confirmarReagendamento(apt)} disabled={salvando}
                  style={{ flex: 1, padding: '9px', background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                  {salvando ? 'Salvando...' : '✅ Confirmar'}
                </button>
                <button onClick={() => setReagendando(null)}
                  style={{ padding: '9px 16px', background: '#eee', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {apt.status === 'pending' && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <button onClick={() => confirmar(apt)}
                style={{ flex: 1, padding: '11px', background: '#d8438b', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer' }}>
                ✅ Confirmar
              </button>
              <button onClick={() => recusar(apt)}
                style={{ flex: 1, padding: '11px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer' }}>
                ❌ Recusar
              </button>
              <button onClick={() => abrirWpp(apt.client?.phone, `Oi ${apt.client?.name?.split(' ')[0]}! ✨ Vi seu pedido de agendamento. Vou confirmar em instantes! 💅`)}
                style={{ padding: '11px 14px', background: '#25D366', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer' }}>
                💬
              </button>
            </div>
          )}

          {apt.status !== 'no_show' && apt.status !== 'pending' && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <BtnWpp label="✅ Confirmação" color="#25D366" onClick={() => abrirWpp(apt.client?.phone, msgConfirmacao(apt))} />
              <BtnWpp label="⏰ Lembrete" color="#128C7E" onClick={() => abrirWpp(apt.client?.phone, msgLembrete(apt))} />
              <button onClick={() => { setReagendando(apt.id); setNovaData(''); setNovaHora(''); }}
                style={{ flex: 1, minWidth: '100px', padding: '9px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.82rem', cursor: 'pointer' }}>
                🔄 Remarcar
              </button>
              <button onClick={() => registrarFalta(apt)}
                style={{ flex: 1, minWidth: '90px', padding: '9px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.82rem', cursor: 'pointer' }}>
                🚫 Falta
              </button>
              <button onClick={() => cancelar(apt, 'cliente')}
                style={{ flex: 1, minWidth: '90px', padding: '9px', background: '#fef3c7', color: '#92400e', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.82rem', cursor: 'pointer' }}>
                📵 Cancelou
              </button>
              <button onClick={() => cancelar(apt, 'admin')}
                style={{ padding: '9px 14px', background: '#f3f4f6', color: '#9ca3af', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer' }}>
                ✕
              </button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

// ─── ABA: NOVO ATENDIMENTO ───────────────────────────────────────────────────

function NovoAtendimentoTab({ services, onRefresh }) {
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

  return (
    <Card style={{ maxWidth: '500px' }}>
      <h3 style={{ color: 'var(--primary-color)', marginBottom: '20px', fontWeight: '700' }}>➕ Novo Atendimento</h3>
      {sucesso && (
        <div style={{ background: '#d1fae5', color: '#065f46', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontWeight: 'bold' }}>
          ✅ Atendimento criado com sucesso!
        </div>
      )}
      <form onSubmit={handleSubmit}>
        {[
          { label: 'Nome da Cliente *', name: 'client_name', type: 'text', placeholder: 'Ex: Maria Silva' },
          { label: 'WhatsApp *', name: 'client_phone', type: 'tel', placeholder: '(11) 99999-9999' },
        ].map(f => (
          <div key={f.name} className="form-group">
            <label>{f.label}</label>
            <input type={f.type} name={f.name} value={form[f.name]} onChange={handleChange} placeholder={f.placeholder} required />
          </div>
        ))}
        <div className="form-group">
          <label>Procedimento *</label>
          <select name="service_id" value={form.service_id} onChange={handleChange} required style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <option value="">Selecione...</option>
            {services.filter(s => s.is_active !== false).map(s => <option key={s.id} value={s.id}>[{s.category?.toUpperCase()}] {s.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label>Data *</label>
            <input type="date" name="scheduled_date" value={form.scheduled_date} onChange={handleChange} min={new Date().toISOString().split('T')[0]} required />
          </div>
          <div className="form-group">
            <label>Horário *</label>
            <select name="scheduled_time" value={form.scheduled_time} onChange={handleChange} required style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <option value="">Horário...</option>
              {timeSlots.map(t => <option key={t} value={t}>{t.replace(':', 'h')}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Restrições médicas (opcional)</label>
          <input type="text" name="medical_restrictions" value={form.medical_restrictions} onChange={handleChange} placeholder="Ex: Gestante, alergia a cola..." />
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Criando...' : 'Criar Atendimento'}</button>
      </form>
    </Card>
  );
}

// ─── ABA: CLIENTES (CRM) ─────────────────────────────────────────────────────

function ClientesTab({ clients, appointments, onRefresh }) {
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

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      {/* Busca + filtros */}
      <Card style={{ padding: '14px' }}>
        <input
          type="text" placeholder="🔍 Buscar por nome, telefone ou @instagram..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, marginBottom: '10px' }}
        />
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {[{ id: 'todas', label: 'Todas' }, { id: 'bloqueadas', label: '🚫 Bloqueadas' }, { id: 'faltas', label: '⚠️ Com faltas' }].map(f => (
            <button key={f.id} onClick={() => setFiltro(f.id)} style={{
              padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '0.82rem',
              background: filtro === f.id ? 'var(--primary-color)' : '#eee',
              color: filtro === f.id ? '#fff' : 'var(--text-muted)',
              fontWeight: filtro === f.id ? '700' : '400',
            }}>{f.label}</button>
          ))}
          <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.82rem' }}>{filtered.length} cliente{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </Card>

      {filtered.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Nenhuma cliente encontrada.</p>}

      {filtered.map(c => {
        const apts = clientApts(c.id);
        const isExpanded = expandedId === c.id;
        const isEditing = editingId === c.id;
        const noShows = c.no_show_count || 0;
        const cancels = c.cancellation_count || 0;

        return (
          <Card key={c.id} style={{ borderLeft: `5px solid ${c.is_blocked ? '#dc2626' : noShows > 0 ? '#f59e0b' : 'var(--primary-color)'}` }}>
            {/* Cabeçalho do card */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)' }}>{c.name}</h3>
                  {c.is_blocked && <Badge label="🚫 Bloqueada" color="#dc2626" bg="#fee2e2" />}
                  {noShows > 0 && <Badge label={`⚠️ ${noShows} falta${noShows > 1 ? 's' : ''}`} color="#92400e" bg="#fef3c7" />}
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '4px 0 0' }}>
                  📱 {c.phone}
                  {c.instagram && <span style={{ marginLeft: '10px' }}>📸 @{c.instagram.replace('@', '')}</span>}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', alignSelf: 'center' }}>
                  {apts.length} atend. · {cancels} cancel.
                </span>
              </div>
            </div>

            {/* Botões principais */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: isExpanded ? '14px' : 0 }}>
              <button onClick={() => abrirWpp(c.phone, `Oi ${c.name}! 💕`)}
                style={{ padding: '7px 12px', background: '#25D366', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 'bold', cursor: 'pointer' }}>
                📲 WhatsApp
              </button>
              <button onClick={() => { setExpandedId(isExpanded ? null : c.id); setEditingId(null); }}
                style={{ padding: '7px 12px', background: '#f3f4f6', color: 'var(--text-muted)', border: 'none', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 'bold', cursor: 'pointer' }}>
                {isExpanded ? '▲ Fechar' : '▼ Ver detalhes'}
              </button>
              <button onClick={() => { startEdit(c); setExpandedId(c.id); }}
                style={{ padding: '7px 12px', background: '#ede9fe', color: '#5b21b6', border: 'none', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 'bold', cursor: 'pointer' }}>
                ✏️ Preferências
              </button>
              <button onClick={() => toggleBlock(c)}
                style={{ padding: '7px 12px', background: c.is_blocked ? '#d1fae5' : '#fee2e2', color: c.is_blocked ? '#065f46' : '#dc2626', border: 'none', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 'bold', cursor: 'pointer' }}>
                {c.is_blocked ? '✅ Desbloquear' : '🚫 Bloquear'}
              </button>
            </div>

            {/* Painel expandido */}
            {isExpanded && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>

                {/* Formulário de preferências */}
                {isEditing && (
                  <div style={{ background: '#fdf1f6', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
                    <p style={{ fontWeight: '700', color: 'var(--primary-color)', marginBottom: '12px' }}>✏️ Editar preferências</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Instagram</label>
                        <input value={editForm.instagram} onChange={e => setEditForm({ ...editForm, instagram: e.target.value })}
                          placeholder="@usuario" style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Volume favorito</label>
                        <input value={editForm.favorite_volume} onChange={e => setEditForm({ ...editForm, favorite_volume: e.target.value })}
                          placeholder="Ex: Volume Russo" style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Sensibilidade</label>
                        <select value={editForm.sensitivity} onChange={e => setEditForm({ ...editForm, sensitivity: e.target.value })} style={selectStyle}>
                          <option value="">Não informado</option>
                          <option value="baixa">Baixa</option>
                          <option value="media">Média</option>
                          <option value="alta">Alta</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Freq. manutenção</label>
                        <select value={editForm.maintenance_frequency} onChange={e => setEditForm({ ...editForm, maintenance_frequency: e.target.value })} style={selectStyle}>
                          <option value="">Não informado</option>
                          <option value="14">14 dias</option>
                          <option value="21">21 dias</option>
                          <option value="28">28 dias</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ marginTop: '10px' }}>
                      <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Restrições médicas</label>
                      <input value={editForm.medical_restrictions} onChange={e => setEditForm({ ...editForm, medical_restrictions: e.target.value })}
                        placeholder="Ex: Gestante, lactante, alergias..." style={inputStyle} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={editForm.has_henna_allergy} onChange={e => setEditForm({ ...editForm, has_henna_allergy: e.target.checked })} />
                        Alergia a hena
                      </label>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <button onClick={() => saveEdit(c.id)} disabled={saving}
                        style={{ flex: 1, padding: '9px', background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                        {saving ? 'Salvando...' : '✅ Salvar'}
                      </button>
                      <button onClick={() => setEditingId(null)}
                        style={{ padding: '9px 16px', background: '#eee', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Preferências salvas */}
                {!isEditing && (c.favorite_volume || c.sensitivity || c.maintenance_frequency || c.has_henna_allergy) && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {c.favorite_volume && <Badge label={`💅 ${c.favorite_volume}`} />}
                    {c.sensitivity && <Badge label={`🌡️ Sensib. ${c.sensitivity}`} color="#5b21b6" bg="#ede9fe" />}
                    {c.maintenance_frequency && <Badge label={`🗓️ Manut. ${c.maintenance_frequency}d`} color="#065f46" bg="#d1fae5" />}
                    {c.has_henna_allergy && <Badge label="⚠️ Alérgica a hena" color="#92400e" bg="#fef3c7" />}
                  </div>
                )}

                {/* Histórico de atendimentos */}
                <p style={{ fontWeight: '700', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px' }}>
                  📋 Histórico ({apts.length} atendimentos)
                </p>
                {apts.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Sem atendimentos registrados.</p>
                ) : (
                  <div style={{ display: 'grid', gap: '6px' }}>
                    {apts.slice(0, 8).map(a => (
                      <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f9fafb', borderRadius: '8px', fontSize: '0.85rem' }}>
                        <span>{fmtDate(a.scheduled_at)} — {a.service?.name || '—'}</span>
                        <span style={{
                          padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: '700',
                          background: a.status === 'no_show' ? '#fee2e2' : a.status === 'pending' ? '#fef3c7' : a.status === 'rejected' ? '#f3f4f6' : a.status === 'scheduled' || a.status === 'confirmed' ? '#dbeafe' : '#d1fae5',
                          color: a.status === 'no_show' ? '#dc2626' : a.status === 'pending' ? '#92400e' : a.status === 'rejected' ? '#9ca3af' : a.status === 'scheduled' || a.status === 'confirmed' ? '#1d4ed8' : '#065f46',
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

  const fieldStyle = (label, value, setter, type = 'text', placeholder = '') => (
    <div>
      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>{label}</label>
      <input type={type} value={value} onChange={e => setter(e.target.value)} placeholder={placeholder} style={inputStyle} />
    </div>
  );

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      {/* Botão adicionar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => setShowAdd(!showAdd)} style={{
          padding: '10px 20px', background: 'var(--primary-color)', color: '#fff',
          border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer'
        }}>
          {showAdd ? '✕ Cancelar' : '➕ Novo serviço'}
        </button>
      </div>

      {/* Formulário de adição */}
      {showAdd && (
        <Card style={{ borderTop: '4px solid var(--primary-color)' }}>
          <h4 style={{ color: 'var(--primary-color)', marginBottom: '14px', fontWeight: '700' }}>Novo serviço</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Nome *</label>
              <input value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} placeholder="Ex: Volume Russo" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Categoria</label>
              <select value={addForm.category} onChange={e => setAddForm({ ...addForm, category: e.target.value })} style={selectStyle}>
                {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Preço total (R$) *</label>
              <input type="number" value={addForm.base_price} onChange={e => setAddForm({ ...addForm, base_price: e.target.value })} placeholder="130" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Sinal (R$)</label>
              <input type="number" value={addForm.deposit_amount} onChange={e => setAddForm({ ...addForm, deposit_amount: e.target.value })} placeholder="30" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Duração (min)</label>
              <input type="number" value={addForm.estimated_minutes} onChange={e => setAddForm({ ...addForm, estimated_minutes: e.target.value })} placeholder="120" style={inputStyle} />
            </div>
          </div>
          <button onClick={addService} disabled={saving} style={{ marginTop: '14px', padding: '10px 24px', background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
            {saving ? 'Salvando...' : '✅ Adicionar'}
          </button>
        </Card>
      )}

      {/* Serviços por categoria */}
      {CATEGORIAS.map(cat => {
        const catServices = services.filter(s => s.category === cat.id);
        if (!catServices.length) return null;
        return (
          <div key={cat.id}>
            <h4 style={{ color: 'var(--text-main)', fontWeight: '700', marginBottom: '12px', fontSize: '1rem' }}>{cat.label}</h4>
            <div style={{ display: 'grid', gap: '10px' }}>
              {catServices.map(s => (
                <Card key={s.id} style={{ padding: '14px', opacity: s.is_active === false ? 0.6 : 1 }}>
                  {editingId === s.id ? (
                    /* Modo edição */
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Nome</label>
                          <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} style={inputStyle} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Categoria</label>
                          <select value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })} style={selectStyle}>
                            {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Preço (R$)</label>
                          <input type="number" value={editForm.base_price} onChange={e => setEditForm({ ...editForm, base_price: e.target.value })} style={inputStyle} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Sinal (R$)</label>
                          <input type="number" value={editForm.deposit_amount} onChange={e => setEditForm({ ...editForm, deposit_amount: e.target.value })} style={inputStyle} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Duração (min)</label>
                          <input type="number" value={editForm.estimated_minutes} onChange={e => setEditForm({ ...editForm, estimated_minutes: e.target.value })} style={inputStyle} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => saveEdit(s.id)} disabled={saving}
                          style={{ flex: 1, padding: '8px', background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                          {saving ? '...' : '✅ Salvar'}
                        </button>
                        <button onClick={() => setEditingId(null)}
                          style={{ padding: '8px 16px', background: '#eee', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    /* Modo visualização */
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <p style={{ fontWeight: '700', color: 'var(--text-main)', margin: '0 0 4px' }}>
                          {s.name}
                          {s.is_active === false && <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: '#9ca3af' }}>(inativo)</span>}
                        </p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                          💰 {fmt(s.base_price)} · 💳 Sinal {fmt(s.deposit_amount)} · ⏱ {s.estimated_minutes}min
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => startEdit(s)}
                          style={{ padding: '6px 12px', background: '#ede9fe', color: '#5b21b6', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}>
                          ✏️ Editar
                        </button>
                        <button onClick={() => toggleAtivo(s)}
                          style={{ padding: '6px 12px', background: s.is_active === false ? '#d1fae5' : '#fee2e2', color: s.is_active === false ? '#065f46' : '#dc2626', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}>
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
  if (!stats) return <p style={{ color: 'var(--text-muted)' }}>Carregando estatísticas...</p>;

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
        <StatCard label="Total de Atendimentos" value={stats.total_appointments} color="#d8438b" />
        <StatCard label="Próximos 7 dias" value={proximos7} color="#6366f1" />
        <StatCard label="Ticket Médio" value={fmt(stats.ticket_medio)} color="#f59e0b" />
      </div>

      {top10.length > 0 && (
        <Card>
          <h4 style={{ color: 'var(--text-main)', marginBottom: '16px', fontWeight: '700' }}>📊 Serviços mais agendados</h4>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={top10} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="total" fill="#d8438b" radius={[0, 6, 6, 0]} name="Agendamentos" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {catData.length > 0 && (
        <Card>
          <h4 style={{ color: 'var(--text-main)', marginBottom: '16px', fontWeight: '700' }}>🥧 Distribuição por categoria</h4>
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
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px' }}>
          Nenhum dado ainda. Os gráficos aparecem conforme os agendamentos forem criados.
        </p>
      )}
    </div>
  );
}

// ─── ABA: FINANCEIRO ─────────────────────────────────────────────────────────

function FinanceiroTab({ stats }) {
  if (!stats) return <p style={{ color: 'var(--text-muted)' }}>Carregando...</p>;

  const projecaoMensal = stats.ticket_medio * 20;
  const taxaRecebimento = stats.total_revenue > 0
    ? ((stats.total_deposits / stats.total_revenue) * 100).toFixed(0) : 0;

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <StatCard label="Receita Total Gerada" value={fmt(stats.total_revenue)} color="#d8438b" sub="Soma de todos os atendimentos" />
        <StatCard label="Sinais Recebidos" value={fmt(stats.total_deposits)} color="#25D366" sub="Pix confirmados" />
        <StatCard label="A Receber no Dia" value={fmt(stats.total_pending)} color="#f59e0b" sub="Saldo dos atendimentos" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <StatCard label="Ticket Médio" value={fmt(stats.ticket_medio)} color="#6366f1" sub="Por atendimento" />
        <StatCard label="Projeção Mensal" value={fmt(projecaoMensal)} color="#128C7E" sub="Base: 20 atend./mês" />
        <StatCard label="Taxa de Recebimento" value={`${taxaRecebimento}%`} color="#ec4899" sub="Sinais / Total gerado" />
      </div>
      <Card>
        <h4 style={{ color: 'var(--text-main)', marginBottom: '16px', fontWeight: '700' }}>💰 Faturamento por categoria</h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#fdf1f6' }}>
                {['Categoria', 'Atendimentos', 'Receita estimada'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--primary-color)', fontWeight: '700' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[{ cat: 'cilios', label: '💅 Cílios' }, { cat: 'sobrancelha', label: '🪄 Sobrancelhas' }, { cat: 'remocao', label: '🧪 Remoções' }].map(({ cat, label }) => {
                const itens = (stats.services || []).filter(s => s.category === cat);
                const total = itens.reduce((a, s) => a + s.total, 0);
                return (
                  <tr key={cat} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px 14px' }}>{label}</td>
                    <td style={{ padding: '10px 14px' }}>{total}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 'bold', color: 'var(--primary-color)' }}>{fmt(total * stats.ticket_medio)}</td>
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

  return (
    <div style={{ display: 'grid', gap: '20px', maxWidth: '600px' }}>
      <Card>
        <h3 style={{ color: 'var(--primary-color)', marginBottom: '8px', fontWeight: '700' }}>🔒 Fechar agenda</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '18px' }}>Selecione um dia ou período. As datas bloqueadas não aparecerão para agendamento.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label>Data de início *</label>
            <input type="date" value={dateStart} min={hoje} onChange={e => { setDateStart(e.target.value); if (!dateEnd || dateEnd < e.target.value) setDateEnd(e.target.value); }} />
          </div>
          <div className="form-group">
            <label>Data de fim</label>
            <input type="date" value={dateEnd} min={dateStart || hoje} onChange={e => setDateEnd(e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label>Motivo (opcional)</label>
          <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="Ex: Viagem, compromisso pessoal..." />
        </div>
        <button className="btn-primary" onClick={bloquear} disabled={loading}>{loading ? 'Bloqueando...' : '🔒 Bloquear período'}</button>
      </Card>

      <Card>
        <h3 style={{ color: 'var(--text-main)', marginBottom: '16px', fontWeight: '700' }}>
          📅 Períodos bloqueados
          {blockedSlots.length > 0 && <span style={{ fontSize: '0.8rem', fontWeight: '400', color: 'var(--text-muted)', marginLeft: '8px' }}>({blockedSlots.length} dia{blockedSlots.length > 1 ? 's' : ''})</span>}
        </h3>
        {grupos.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhuma data bloqueada no momento.</p>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {grupos.map((g, i) => {
              const single = g.inicio === g.fim;
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#fdf1f6', borderRadius: '8px', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: 'var(--primary-color)', fontSize: '0.95rem' }}>
                      📅 {single ? fmtDiaMes(g.inicio) : `${fmtDiaMes(g.inicio)} → ${fmtDiaMes(g.fim)}`}
                    </strong>
                    {!single && <span style={{ marginLeft: '8px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>({g.ids.length} dias)</span>}
                    {g.reason && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '3px 0 0' }}>{g.reason}</p>}
                  </div>
                  <button onClick={() => desbloquearGrupo(g.ids)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
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
  { id: 'agenda',     label: '📅 Agenda' },
  { id: 'novo',       label: '➕ Novo Atendimento' },
  { id: 'clientes',   label: '👩‍💼 Clientes' },
  { id: 'catalogo',   label: '📸 Catálogo' },
  { id: 'stats',      label: '📊 Estatísticas' },
  { id: 'financeiro', label: '💰 Financeiro' },
  { id: 'config',     label: '⚙️ Configurações' },
];

export default function AdminDashboard() {
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
    <div style={{ textAlign: 'center', marginTop: '80px' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⏳</div>
      <h2 className="title">Carregando painel...</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Se demorar muito, o servidor pode estar iniciando — aguarde 30 segundos.</p>
    </div>
  );

  if (error) return (
    <div style={{ textAlign: 'center', marginTop: '80px', padding: '20px' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⚠️</div>
      <h2 className="title" style={{ color: '#d9534f' }}>Servidor offline</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>{error}</p>
      <button className="btn-primary" style={{ maxWidth: '220px', margin: '0 auto' }}
        onClick={() => { setError(null); setLoading(true); fetchAll(); }}>
        Tentar novamente
      </button>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid var(--border-color)', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ color: 'var(--primary-color)', fontWeight: '800', fontSize: '1.5rem', margin: 0 }}>
          ✨ Painel da Giovanna
        </h2>
        <button onClick={logout} style={{
          padding: '7px 14px', background: '#f3f4f6', color: 'var(--text-muted)',
          border: 'none', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '600',
          cursor: 'pointer',
        }}>
          Sair 🔒
        </button>
      </div>

      <div style={{ background: '#fff', borderBottom: '1px solid var(--border-color)', display: 'flex', overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '14px 16px', border: 'none', background: 'none',
            borderBottom: activeTab === tab.id ? '3px solid var(--primary-color)' : '3px solid transparent',
            color: activeTab === tab.id ? 'var(--primary-color)' : 'var(--text-muted)',
            fontWeight: activeTab === tab.id ? '700' : '400',
            cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.85rem', transition: 'all 0.2s'
          }}>{tab.label}</button>
        ))}
      </div>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '24px 16px' }}>
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
