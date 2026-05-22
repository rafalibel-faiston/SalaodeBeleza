import { useState } from 'react';
import api from '../api/client';

const fmt = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

const fmtDate = (s) => {
  const d = new Date(s);
  return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const STATUS_LABEL = {
  scheduled: { label: '📅 Agendado',  bg: '#dbeafe', color: '#1d4ed8' },
  completed: { label: '✅ Concluído', bg: '#d1fae5', color: '#065f46' },
  no_show:   { label: '🚫 Falta',     bg: '#fee2e2', color: '#dc2626' },
  cancelled: { label: '✕ Cancelado', bg: '#f3f4f6', color: '#6b7280' },
};

// Cartão de fidelidade — 1 stamp por atendimento
function Fidelidade({ total }) {
  const MAX = 10;
  const stamps = Math.min(total, MAX);
  const desconto = total >= 10 ? '10% de desconto' : total >= 5 ? '5% de desconto' : null;

  return (
    <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(216,67,139,0.12)', padding: '20px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <h3 style={{ margin: 0, color: 'var(--primary-color)', fontWeight: '800' }}>💅 Fidelidade</h3>
        {desconto && (
          <span style={{ background: '#fdf1f6', color: 'var(--primary-color)', padding: '4px 12px', borderRadius: '20px', fontWeight: '700', fontSize: '0.85rem' }}>
            🎁 {desconto}
          </span>
        )}
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '14px' }}>
        {total >= 10 ? '🎉 Você completou o cartão! Parabéns!' : `${stamps} de ${MAX} atendimentos — complete 10 para ganhar 10% off!`}
      </p>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {Array.from({ length: MAX }).map((_, i) => (
          <div key={i} style={{
            width: '36px', height: '36px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.1rem',
            background: i < stamps ? 'linear-gradient(135deg, #a0195e, #d8438b)' : '#f3f4f6',
            boxShadow: i < stamps ? '0 2px 8px rgba(216,67,139,0.3)' : 'none',
            transition: 'all 0.2s',
          }}>
            {i < stamps ? '💅' : '○'}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ClientVIP() {
  const [phone, setPhone] = useState('');
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const buscar = async (e) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true); setError(''); setData(null);
    try {
      const res = await api.get(`/minha-conta/${phone.replace(/\D/g, '')}/`);
      setData(res.data);
    } catch (err) {
      setError(err.response?.status === 404
        ? 'Nenhuma conta encontrada com este número. Verifique e tente novamente.'
        : 'Erro ao buscar. Tente novamente.');
    } finally { setLoading(false); }
  };

  const proximos = data?.appointments.filter(a => a.status === 'scheduled' && new Date(a.scheduled_at) >= new Date()) || [];
  const historico = data?.appointments.filter(a => a.status !== 'scheduled' || new Date(a.scheduled_at) < new Date()) || [];
  const client = data?.client;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-color)' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #a0195e 0%, #d8438b 100%)', padding: '32px 20px', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.75rem', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '8px' }}>
          ✦ Studio de Beleza ✦
        </p>
        <h1 style={{ color: '#fff', fontSize: '2rem', fontFamily: "'Playfair Display', Georgia, serif", margin: '0 0 6px' }}>
          Minha Conta
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', margin: 0 }}>
          Acompanhe seus agendamentos e histórico
        </p>
      </div>

      <div style={{ maxWidth: '500px', margin: '0 auto', padding: '24px 16px' }}>

        {/* Formulário de busca */}
        {!data && (
          <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: '28px', marginBottom: '20px' }}>
            <h2 style={{ color: 'var(--text-main)', fontSize: '1.2rem', fontWeight: '700', marginBottom: '8px', textAlign: 'center' }}>
              📱 Encontre sua conta
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', marginBottom: '20px' }}>
              Digite o número de WhatsApp que você usa para agendar
            </p>
            <form onSubmit={buscar}>
              <div className="form-group">
                <label>Seu WhatsApp</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  required
                />
              </div>
              {error && (
                <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px', borderRadius: '8px', fontSize: '0.88rem', marginBottom: '14px' }}>
                  {error}
                </div>
              )}
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Buscando...' : '🔍 Buscar minha conta'}
              </button>
            </form>

            <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '20px', paddingTop: '16px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '10px' }}>
                Ainda não tem horário marcado?
              </p>
              <a href="/#/" style={{ color: 'var(--primary-color)', fontWeight: '700', textDecoration: 'none', fontSize: '0.9rem' }}>
                ✨ Agendar agora
              </a>
            </div>
          </div>
        )}

        {/* Resultado */}
        {data && (
          <div>
            {/* Saudação */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>💅</div>
              <h2 style={{ color: 'var(--primary-color)', fontWeight: '800', margin: '0 0 4px', fontFamily: "'Playfair Display', Georgia, serif" }}>
                Olá, {client.name.split(' ')[0]}!
              </h2>
              {client.instagram && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>📸 @{client.instagram.replace('@', '')}</p>
              )}
            </div>

            {/* Alerta de bloqueio */}
            {client.is_blocked && (
              <div style={{ background: '#fee2e2', color: '#dc2626', padding: '14px', borderRadius: '10px', marginBottom: '16px', fontWeight: '600', textAlign: 'center' }}>
                🚫 Sua conta está bloqueada. Entre em contato com o estúdio pelo WhatsApp.
              </div>
            )}

            {/* Cartão fidelidade */}
            <Fidelidade total={data.appointments.filter(a => a.status !== 'no_show').length} />

            {/* Próximos horários */}
            {proximos.length > 0 && (
              <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.07)', padding: '20px', marginBottom: '16px' }}>
                <h3 style={{ color: 'var(--primary-color)', fontWeight: '700', marginBottom: '14px' }}>📅 Próximos horários</h3>
                {proximos.map(a => (
                  <div key={a.id} style={{ background: '#fdf1f6', borderRadius: '10px', padding: '14px', marginBottom: '10px' }}>
                    <p style={{ fontWeight: '700', color: 'var(--text-main)', margin: '0 0 4px' }}>{a.service_name}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '0 0 8px' }}>🗓️ {fmtDate(a.scheduled_at)}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>📍 Rua Ari Carneiro Fernandes 155</p>
                    {a.total_value && (
                      <p style={{ color: 'var(--primary-color)', fontWeight: '700', fontSize: '0.88rem', margin: '6px 0 0' }}>
                        💰 Total: {fmt(a.total_value)} · A pagar no dia: {fmt(a.balance_due)}
                      </p>
                    )}
                  </div>
                ))}
                <a href={`https://wa.me/5511993627584`} target="_blank" rel="noreferrer"
                  style={{ display: 'block', textAlign: 'center', color: '#25D366', fontWeight: '700', fontSize: '0.9rem', textDecoration: 'none', marginTop: '10px' }}>
                  💬 Falar com a Giovanna
                </a>
              </div>
            )}

            {/* Preferências registradas */}
            {(client.favorite_volume || client.sensitivity || client.maintenance_frequency) && (
              <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.07)', padding: '20px', marginBottom: '16px' }}>
                <h3 style={{ color: 'var(--text-main)', fontWeight: '700', marginBottom: '12px' }}>✨ Suas preferências</h3>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {client.favorite_volume && (
                    <span style={{ background: '#fdf1f6', color: 'var(--primary-color)', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600' }}>
                      💅 {client.favorite_volume}
                    </span>
                  )}
                  {client.sensitivity && (
                    <span style={{ background: '#ede9fe', color: '#5b21b6', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600' }}>
                      🌡️ Sensibilidade {client.sensitivity}
                    </span>
                  )}
                  {client.maintenance_frequency && (
                    <span style={{ background: '#d1fae5', color: '#065f46', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600' }}>
                      🗓️ Manutenção {client.maintenance_frequency} dias
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Histórico */}
            {historico.length > 0 && (
              <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.07)', padding: '20px', marginBottom: '20px' }}>
                <h3 style={{ color: 'var(--text-main)', fontWeight: '700', marginBottom: '14px' }}>📋 Histórico</h3>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {historico.slice(0, 10).map(a => {
                    const s = STATUS_LABEL[a.status] || STATUS_LABEL.scheduled;
                    return (
                      <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f9fafb', borderRadius: '8px', gap: '8px' }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: '600', fontSize: '0.88rem', color: 'var(--text-main)' }}>{a.service_name}</p>
                          <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{fmtDate(a.scheduled_at)}</p>
                        </div>
                        <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700', background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
                          {s.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Botões de ação */}
            <div style={{ display: 'grid', gap: '10px' }}>
              <a href="/#/" className="btn-primary" style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }}>
                ✨ Fazer novo agendamento
              </a>
              <button onClick={() => { setData(null); setPhone(''); }}
                style={{ padding: '14px', background: '#f3f4f6', color: 'var(--text-muted)', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}>
                🔄 Buscar outra conta
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
