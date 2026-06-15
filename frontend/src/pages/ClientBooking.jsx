import { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import api from '../api/client';
import CalendarPicker from '../components/CalendarPicker';
import BeforeAfterSlider from '../components/BeforeAfterSlider';

// ── Animation presets ─────────────────────────────────────────
const ease = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 52 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.9, delay: i * 0.11, ease }
  })
};

const cardVar = {
  hidden: { opacity: 0, y: 40, scale: 0.96 },
  visible: (i) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.65, delay: i * 0.08, ease }
  })
};

// ── Static data ───────────────────────────────────────────────
const CATALOG = [
  { key: 'brasileiro',   filterCat: 'cilios',      img: '/fotos/volume-brasileiro-fio-y.png',  title: 'Volume Brasileiro',      sub: 'Fio Y' },
  { key: 'egipcio',      filterCat: 'cilios',      img: '/fotos/volume-egipicio-fio-4D.png',   title: 'Volume Egípcio',         sub: 'Fio 4D' },
  { key: 'luxxo',        filterCat: 'cilios',      img: '/fotos/volume-luxxo-fio-5D.png',      title: 'Volume Luxxo / Glamour', sub: 'Fios 5D e 6D' },
  { key: 'foxy',         filterCat: 'cilios',      img: '/fotos/volume-foxxy-eyes.png',        title: 'Volume Foxy Eyes',       sub: 'Curvatura M' },
  { key: 'capping',      filterCat: 'capping',     img: '/fotos/volume-mega-brasileiro.png',   title: 'Técnica Capping',        sub: 'Mega Retenção · Sem manutenção' },
  { key: 'sobrancelhas', filterCat: 'sobrancelha', img: '/fotos/brow lamination.png',          title: 'Sobrancelhas',           sub: 'Lamination, Henna e Design' },
];

const FILTER_TABS = [
  { key: null,          label: 'TODOS' },
  { key: 'cilios',      label: 'CÍLIOS' },
  { key: 'sobrancelha', label: 'SOBRANCELHAS' },
  { key: 'capping',     label: 'CAPPING' },
  { key: 'remocao',     label: 'REMOÇÃO' },
];

const MODALS = {
  brasileiro:   { title: 'Volume Brasileiro (Fio Y)',           text: 'Aplicação delicada utilizando o Fio Y, garantindo um resultado leve e harmônico para o dia a dia. O procedimento leva em torno de 2h a 3h.',                                                                          alert: '⚠️ Venha sem maquiagem nos olhos e retire as lentes de contato.',                                                              filter: 'Brasileiro' },
  egipcio:      { title: 'Volume Egípcio (Fio 4D)',             text: 'Técnica que utiliza o Fio 4D para proporcionar mais preenchimento e um olhar marcante, ideal para quem busca um meio-termo entre o natural e o volumoso.',                                                            alert: '⚠️ Venha sem maquiagem nos olhos e retire as lentes de contato.',                                                              filter: 'Egípcio' },
  luxxo:        { title: 'Volume Luxxo (Fio 5D) e Glamour (Fio 6D)', text: 'Para quem ama cílios bem cheios! O Fio 5D e 6D entregam o máximo de volume e destaque para um olhar incrivelmente poderoso.',                                                                              alert: '⚠️ Venha sem maquiagem nos olhos e retire as lentes de contato.',                                                              filter: 'Luxxo' },
  foxy:         { title: 'Volume Foxy Eyes (Curvatura M)',       text: 'Utilizando Fio 5D com Curvatura M, essa técnica cria um efeito delineado que alonga e puxa o olhar para as extremidades. Extremamente sedutor.',                                                                     alert: '⚠️ Venha sem maquiagem nos olhos e retire as lentes de contato.',                                                              filter: 'Foxy' },
  capping:      { title: 'Técnicas Capping (Sem Manutenção)',    text: 'A revolução! Usamos a técnica "Capping Sanduíche" — um fio acoplado por cima e outro por baixo do fio natural. Durabilidade de 30 dias ou mais, eliminando a necessidade de manutenções.',                          alert: '✨ Perfeito para rotinas corridas. Disponível nos volumes Mega Brasileiro, Egípcio e Luxxo.',                                   filter: 'CAPPING' },
  sobrancelhas: { title: 'Sobrancelhas e Lamination',            text: 'A Brow Lamination alisa e engrossa os fios (durabilidade de 30 a 50 dias). Também oferecemos Design Personalizado com ou sem Henna e depilação de buço.',                                                           alert: '⚠️ Brow Lamination não é indicada para gestantes, lactantes ou pessoas em tratamento quimioterápico.',                         filter: 'Lamination Simples' },
};

const MARQUEE_ITEMS = [
  'Volume Brasileiro','✦','Volume Egípcio','✦','Foxy Eyes','✦',
  'Brow Lamination','✦','Técnica Capping','✦','Volume Luxxo','✦',
  'Volume Glamour','✦','Design de Sobrancelhas','✦',
  'Volume Brasileiro','✦','Volume Egípcio','✦','Foxy Eyes','✦',
  'Brow Lamination','✦','Técnica Capping','✦','Volume Luxxo','✦',
  'Volume Glamour','✦','Design de Sobrancelhas','✦',
];

const FALLBACK = 'https://images.unsplash.com/photo-1583241800698-e8ab01830a07?q=80&w=600';

// ─────────────────────────────────────────────────────────────
const SESSION_KEY = 'salon_agendamento';

export default function ClientBooking() {
  const [services, setServices]         = useState([]);
  const [formData, setFormData]         = useState({ client_name:'', client_phone:'', service_id:'', scheduled_date:'', scheduled_time:'' });
  const [payFull, setPayFull]           = useState(true);
  const [pendingId, setPendingId]       = useState(null);
  const [confirmedData, setConfirmedData] = useState(null);
  const [rejected, setRejected]         = useState(false);
  const [loading, setLoading]           = useState(false);
  const [activeModal, setModal]         = useState(null);
  const [catalogFilter, setCatalogFilter] = useState(null);
  const [svcCategory, setSvcCategory]   = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false); // evita flicker ao restaurar sessão
  const [phoneQuery, setPhoneQuery]     = useState('');
  const [phoneQueryLoading, setPhoneQueryLoading] = useState(false);
  const [phoneQueryError, setPhoneQueryError]     = useState('');
  const [promoCode, setPromoCode]       = useState('');
  const [promoStatus, setPromoStatus]   = useState(null); // null | { valid, name, discount_type, discount_value } | 'error'
  const [promoError, setPromoError]     = useState('');
  const formRef  = useRef(null);
  const storyRef = useRef(null);

  // ── Helpers de sessão ────────────────────────────────────
  const saveSession = (appointmentId, fd) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      appointment_id: appointmentId,
      client_name:    fd.client_name,
      client_phone:   fd.client_phone,
      service_id:     fd.service_id,
      scheduled_date: fd.scheduled_date,
      scheduled_time: fd.scheduled_time,
    }));
  };

  const clearSession = () => localStorage.removeItem(SESSION_KEY);

  const resetBooking = () => {
    clearSession();
    setPendingId(null);
    setConfirmedData(null);
    setRejected(false);
    setSvcCategory(null);
    setPromoCode('');
    setPromoStatus(null);
    setPromoError('');
    setFormData({ client_name:'', client_phone:'', service_id:'', scheduled_date:'', scheduled_time:'' });
  };

  const validarCupom = async () => {
    if (!promoCode.trim()) return;
    setPromoError('');
    setPromoStatus(null);
    try {
      const r = await api.post('/promotions/validate/', {
        code: promoCode.trim(),
        service_id: formData.service_id ? parseInt(formData.service_id) : null,
      });
      setPromoStatus(r.data);
    } catch (err) {
      setPromoError(err.response?.data?.detail || 'Cupom inválido.');
      setPromoStatus('error');
    }
  };

  const timeSlots = [];
  for (let h = 8; h < 20; h++) {
    timeSlots.push(`${String(h).padStart(2,'0')}:00`);
    if (h < 19) timeSlots.push(`${String(h).padStart(2,'0')}:30`);
  }

  // ── Carrega serviços + restaura sessão salva ────────────
  useEffect(() => {
    api.get('/services/').then(r => setServices(r.data)).catch(console.error);

    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) { setSessionChecked(true); return; }

    let session;
    try { session = JSON.parse(raw); } catch { clearSession(); setSessionChecked(true); return; }

    api.get(`/appointments/${session.appointment_id}/status`)
      .then(r => {
        const s = r.data.status;
        if (s === 'confirmed' || s === 'scheduled' || s === 'aguardando_pagamento') {
          setConfirmedData(r.data);
        } else if (s === 'rejected') {
          setRejected(true);
          clearSession();
        } else if (s === 'pending') {
          setFormData({
            client_name:    session.client_name    || '',
            client_phone:   session.client_phone   || '',
            service_id:     session.service_id     || '',
            scheduled_date: session.scheduled_date || '',
            scheduled_time: session.scheduled_time || '',
          });
          setPendingId(session.appointment_id);
        } else {
          clearSession(); // completed, no_show, etc.
        }
      })
      .catch(() => clearSession())
      .finally(() => setSessionChecked(true));
  }, []);

  // ── Polling 1: aguarda admin confirmar ──────────────────
  useEffect(() => {
    if (!pendingId || confirmedData || rejected) return;
    const interval = setInterval(async () => {
      try {
        const r = await api.get(`/appointments/${pendingId}/status`);
        if (r.data.status === 'confirmed' || r.data.status === 'scheduled' || r.data.status === 'aguardando_pagamento') {
          setConfirmedData(r.data);
          clearInterval(interval);
        } else if (r.data.status === 'rejected') {
          setRejected(true);
          clearSession();
          clearInterval(interval);
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [pendingId, confirmedData, rejected]);

  // ── Polling 2: aguarda pagamento Pix ser aprovado ────────
  useEffect(() => {
    if (!confirmedData || confirmedData.status === 'scheduled') return;
    const interval = setInterval(async () => {
      try {
        const r = await api.get(`/appointments/${confirmedData.id}/status`);
        if (r.data.status === 'scheduled') {
          setConfirmedData(r.data);
          clearInterval(interval);
        } else if (r.data.status === 'aguardando_pagamento' && confirmedData.status !== 'aguardando_pagamento') {
          // PIX gerado pela admin — atualiza dados para exibir QR code
          setConfirmedData(r.data);
        }
      } catch {}
    }, 8000);
    return () => clearInterval(interval);
  }, [confirmedData]);

  // Força payFull para serviços <= R$50; mantém true como padrão para os demais
  useEffect(() => {
    const sel = services?.find(s => s.id === parseInt(formData.service_id));
    if (sel && sel.base_price <= 50) setPayFull(true);
    else setPayFull(true); // padrão: pagar tudo agora
  }, [formData.service_id, services]);

  const handleChange  = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.service_id)                            { alert('Por favor, selecione um serviço.'); return; }
    if (!formData.scheduled_date || !formData.scheduled_time) { alert('Por favor, escolha data e horário.'); return; }
    const scheduledAt = new Date(`${formData.scheduled_date}T${formData.scheduled_time}:00`);
    if (scheduledAt < new Date())                        { alert('Não é possível agendar em data passada.'); return; }
    setLoading(true);
    try {
      const r = await api.post('/appointments/', {
        client_name: formData.client_name, client_phone: formData.client_phone,
        service_id: parseInt(formData.service_id), scheduled_at: scheduledAt.toISOString(),
        promo_code: promoStatus?.valid ? promoCode.trim() : null,
        pay_full: payFull,
      });
      saveSession(r.data.appointment_id, formData);
      // PIX já vem na resposta — mostra QR direto sem etapa de aprovação
      setConfirmedData({
        id: r.data.appointment_id,
        status: r.data.status,
        service_name: r.data.service_name,
        client_name: r.data.client_name,
        scheduled_at: r.data.scheduled_at,
        total_value: r.data.total_value,
        deposit_amount: r.data.deposit_amount,
        balance_due: r.data.balance_due,
        pix_qr_code_base64: r.data.pix_qr_code_base64,
        pix_copia_cola: r.data.pix_copia_cola,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      alert('Erro ao criar agendamento: ' + (err.response?.data?.detail || err.message));
    } finally { setLoading(false); }
  };

  const fmtDur = (mins) => {
    const h = Math.floor(mins / 60), m = mins % 60;
    return m ? `${h}h${m}` : `${h}h`;
  };

  const cardPrice = (key) => {
    const kw = MODALS[key]?.filter;
    let matches;
    if (key === 'capping')      matches = services.filter(s => s.name.includes('CAPPING'));
    else if (key === 'sobrancelhas') matches = services.filter(s => s.category === 'sobrancelha');
    else matches = services.filter(s => s.name.includes(kw) && s.name.includes('Aplicação'));
    if (!matches.length) return null;
    return Math.min(...matches.map(s => s.base_price));
  };

  const cardDur = (key) => {
    const kw = MODALS[key]?.filter;
    let matches;
    if (key === 'capping')      matches = services.filter(s => s.name.includes('CAPPING'));
    else if (key === 'sobrancelhas') matches = services.filter(s => s.category === 'sobrancelha' && s.name.includes('Lamination'));
    else matches = services.filter(s => s.name.includes(kw) && s.name.includes('Aplicação'));
    return matches[0]?.estimated_minutes ?? null;
  };

  // ── Consulta por telefone (cross-device / cache limpo) ──
  const handlePhoneQuery = async () => {
    if (!phoneQuery.trim()) return;
    setPhoneQueryLoading(true);
    setPhoneQueryError('');
    try {
      const r = await api.get(`/minha-conta/${encodeURIComponent(phoneQuery)}/`);
      const active = r.data.appointments.find(a =>
        ['pending', 'confirmed', 'aguardando_pagamento', 'scheduled'].includes(a.status)
      );
      if (!active) {
        setPhoneQueryError('Nenhum agendamento ativo encontrado para este número.');
        return;
      }
      if (active.status === 'confirmed' || active.status === 'aguardando_pagamento' || active.status === 'scheduled') {
        setConfirmedData({
          ...active,
          client_name:  r.data.client.name,
          service_name: active.service_name,
        });
      } else {
        setFormData(p => ({
          ...p,
          client_name:  r.data.client.name,
          client_phone: r.data.client.phone,
        }));
        saveSession(active.id, {
          client_name:    r.data.client.name,
          client_phone:   r.data.client.phone,
          service_id:     String(active.service_id || ''),
          scheduled_date: '',
          scheduled_time: '',
        });
        setPendingId(active.id);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setPhoneQueryError(
        err.response?.status === 404
          ? 'Nenhum cadastro encontrado com este número.'
          : 'Erro ao consultar. Tente novamente.'
      );
    } finally {
      setPhoneQueryLoading(false);
    }
  };

  const scrollToForm = (filter, catKey) => {
    setModal(null);
    if (filter && services.length > 0) {
      const match = services.find(s => s.name.includes(filter) && s.name.includes('Aplicação'))
                 || services.find(s => s.name.includes(filter));
      if (match) {
        setFormData(p => ({ ...p, service_id: String(match.id) }));
        setSvcCategory(catKey || match.category || 'cilios');
      }
    } else if (catKey) {
      setSvcCategory(catKey);
    }
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ── Scroll-driven parallax (hooks SEMPRE chamados, sem early return antes) ──
  const { scrollY } = useScroll();
  const heroY      = useTransform(scrollY, [0, 700], [0, -220]);
  const heroBlobY  = useTransform(scrollY, [0, 700], [0, -100]);
  const heroOp     = useTransform(scrollY, [0, 500], [1, 0]);

  const { scrollYProgress: sp } = useScroll({ target: storyRef, offset: ['start end', 'end start'] });
  const bgWordY  = useTransform(sp, [0, 1], ['180px', '-130px']);
  const imgY     = useTransform(sp, [0, 1], ['60px', '-60px']);
  const imgScale = useTransform(sp, [0, 0.5], [1.14, 1.0]);
  const storyTY  = useTransform(sp, [0, 0.55], ['90px', '0px']);
  const storyOp  = useTransform(sp, [0, 0.38], [0, 1]);

  // ── Aguarda verificação de sessão (DEPOIS de todos os hooks) ─
  if (!sessionChecked) {
    return (
      <div style={{ minHeight:'60vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'16px' }}>
        <motion.div animate={{ rotate:360 }} transition={{ duration:1, repeat:Infinity, ease:'linear' }}
          style={{ width:'36px', height:'36px', borderRadius:'50%', border:'3px solid var(--pink-mid)', borderTopColor:'var(--pink)' }} />
        <p style={{ color:'var(--muted)', fontSize:'0.85rem' }}>Verificando seu agendamento...</p>
      </div>
    );
  }

  // ── Tela: solicitação enviada (aguarda confirmação via WhatsApp) ──
  if (pendingId && !confirmedData && !rejected) {
    const serviceName = services.find(s => String(s.id) === String(formData.service_id))?.name;
    const dateFormatted = formData.scheduled_date && formData.scheduled_time
      ? new Date(`${formData.scheduled_date}T${formData.scheduled_time}:00`)
          .toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }) +
        ' às ' + formData.scheduled_time.replace(':', 'h')
      : '';
    const wppUrl = `https://wa.me/5511993627584?text=${encodeURIComponent(`Oi Giovanna! ✨ Acabei de solicitar um agendamento pelo site e quero confirmar meu horário!`)}`;

    return (
      <motion.div className="container pix-container" style={{ marginTop: '50px', marginBottom: '50px' }}
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>

        {/* Ícone WhatsApp animado */}
        <motion.div
          style={{ fontSize: '3.5rem', marginBottom: '16px' }}
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}>
          💬
        </motion.div>

        <h2 className="title">Pedido <span>Enviado!</span> ✨</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '28px', lineHeight: 1.7 }}>
          A Giovanna vai confirmar seu horário pelo <strong style={{ color: '#25D366' }}>WhatsApp</strong> em instantes.<br />
          <small style={{ fontSize: '0.82rem' }}>Fique de olho nas suas mensagens! 📱</small>
        </p>

        {/* Card do agendamento */}
        <div style={{ background: 'var(--pink-light)', borderRadius: '16px', padding: '20px 24px', marginBottom: '24px', textAlign: 'left', border: '1px solid var(--pink-mid)', lineHeight: 1.9 }}>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
            {serviceName && <><strong style={{ color: 'var(--text)' }}>💅 {serviceName}</strong><br /></>}
            {dateFormatted && <>📅 {dateFormatted}<br /></>}
            📍 Rua Ari Carneiro Fernandes, 155
          </p>
        </div>

        {/* Card WhatsApp */}
        <div style={{ background: 'rgba(37,211,102,0.08)', border: '1.5px solid rgba(37,211,102,0.3)', borderRadius: '16px', padding: '18px 22px', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left' }}>
          <span style={{ fontSize: '2rem', flexShrink: 0 }}>📲</span>
          <div>
            <p style={{ margin: 0, fontWeight: '700', color: '#1a1a2e', fontSize: '0.92rem' }}>Acompanhe pelo WhatsApp</p>
            <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.5 }}>
              A confirmação, lembrete e qualquer atualização chegam direto na sua conversa com a Giovanna.
            </p>
          </div>
        </div>

        {/* Botão WhatsApp */}
        <motion.a
          href={wppUrl}
          target="_blank"
          rel="noreferrer"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            background: 'linear-gradient(135deg, #25D366, #128C7E)',
            color: '#fff', textDecoration: 'none',
            padding: '14px 28px', borderRadius: '14px',
            fontWeight: '700', fontSize: '1rem',
            boxShadow: '0 6px 20px rgba(37,211,102,0.4)',
            marginBottom: '14px',
          }}>
          <span>💬</span> Abrir WhatsApp
        </motion.a>

        <br />
        <button
          style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.82rem', cursor: 'pointer', marginTop: '8px', textDecoration: 'underline' }}
          onClick={resetBooking}>
          Fazer um novo agendamento
        </button>
      </motion.div>
    );
  }

  // ── Tela: recusado ────────────────────────────────────────────
  if (rejected) {
    return (
      <motion.div className="container pix-container" style={{ marginTop:'50px', marginBottom:'50px' }}
        initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.6 }}>
        <div style={{ fontSize:'3rem', marginBottom:'8px' }}>😔</div>
        <h2 className="title">Horário <span style={{ color:'#dc2626' }}>Indisponível</span></h2>
        <p style={{ color:'var(--muted)', marginBottom:'28px', lineHeight:1.7 }}>
          A Giovanna não conseguiu confirmar este horário. Tente outra data ou entre em contato pelo WhatsApp.
        </p>
        <a href="https://wa.me/5511993627584?text=Oi%20Giovanna%2C%20tentei%20agendar%20pelo%20site%20mas%20o%20hor%C3%A1rio%20n%C3%A3o%20foi%20confirmado..."
          target="_blank" rel="noreferrer" className="btn-pill btn-pill-primary"
          style={{ display:'inline-flex', marginBottom:'12px' }}>
          💬 Falar no WhatsApp
        </a>
        <br />
        <button className="btn-pill btn-pill-ghost" style={{ marginTop:'8px' }}
          onClick={resetBooking}>
          Tentar outra data
        </button>
      </motion.div>
    );
  }

  // ── Tela: confirmado + Pix ────────────────────────────────────
  if (confirmedData) {
    const bookedDate = new Date(confirmedData.scheduled_at);
    const dateStr    = bookedDate.toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'2-digit' });
    const timeStr    = `${String(bookedDate.getHours()).padStart(2,'0')}h${String(bookedDate.getMinutes()).padStart(2,'0')}`;
    const hasPix     = confirmedData.pix_qr_code_base64 && confirmedData.pix_copia_cola;
    const isPaid     = confirmedData.status === 'scheduled';

    const infoCard = (
      <div style={{ background:'var(--pink-light)', borderRadius:'16px', padding:'20px 24px', marginBottom:'28px', textAlign:'left', lineHeight:'2', border:'1px solid var(--pink-mid)' }}>
        <p>💅 <strong>{confirmedData.service_name}</strong></p>
        <p>📅 {dateStr} às {timeStr}</p>
        <p>📍 Rua Ari Carneiro Fernandes, 155</p>
        <p>💰 Total: <strong>R$ {confirmedData.total_value?.toFixed(2).replace('.',',')}</strong>
          {confirmedData.balance_due > 0
            ? ` · Sinal agora: R$ ${confirmedData.deposit_amount?.toFixed(2).replace('.',',')} · No dia: R$ ${confirmedData.balance_due?.toFixed(2).replace('.',',')}`
            : ' · Pagamento completo via Pix'
          }
        </p>
      </div>
    );

    // Vaga garantida — sinal pago via Pix
    if (isPaid) {
      return (
        <motion.div className="container pix-container" style={{ marginTop:'50px', marginBottom:'50px' }}
          initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.6 }}>
          <motion.div style={{ fontSize:'3.5rem', marginBottom:'8px' }}
            animate={{ scale:[1,1.15,1] }} transition={{ duration:0.5 }}>🎉</motion.div>
          <h2 className="title">Vaga <span>Garantida!</span></h2>
          <p style={{ color:'var(--muted)', marginBottom:'28px' }}>
            Pagamento confirmado! Até lá, {confirmedData.client_name?.split(' ')[0]}! 💅
          </p>
          {infoCard}
          <div style={{ background:'rgba(16,185,129,0.08)', border:'1.5px solid rgba(16,185,129,0.3)', borderRadius:'16px', padding:'16px 20px', marginBottom:'28px', display:'flex', alignItems:'center', gap:'14px' }}>
            <span style={{ fontSize:'1.8rem' }}>✅</span>
            <p style={{ margin:0, fontSize:'0.88rem', color:'#065f46', fontWeight:600 }}>
              Pagamento confirmado pelo Mercado Pago. Sua vaga está reservada!
            </p>
          </div>
          <button className="btn-primary" style={{ background:'#555' }} onClick={resetBooking}>
            Fazer Novo Agendamento
          </button>
        </motion.div>
      );
    }

    // aguardando_pagamento — Pix gerado, cliente ainda não pagou
    return (
      <motion.div className="container pix-container" style={{ marginTop:'50px', marginBottom:'50px' }}
        initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.6 }}>
        <div style={{ fontSize:'3rem', marginBottom:'8px' }}>✅</div>
        <h2 className="title">Horário <span>Confirmado!</span></h2>
        <p style={{ color:'var(--muted)', marginBottom:'28px' }}>Arrasou, {confirmedData.client_name?.split(' ')[0]}! 💅</p>
        {infoCard}
        <div style={{ marginBottom:'20px' }}>
          <p style={{ fontWeight:'700', marginBottom:'12px' }}>
            {confirmedData.balance_due > 0 ? 'Pague o sinal para garantir sua vaga:' : 'Pague via Pix para garantir sua vaga:'}
          </p>
          <img src={`data:image/jpeg;base64,${confirmedData.pix_qr_code_base64}`} alt="QR Code Pix" className="pix-qrcode" />
          <p style={{ marginBottom:'8px', fontWeight:'600', marginTop:'16px', fontSize:'0.9rem' }}>Pix Copia e Cola:</p>
          <textarea readOnly value={confirmedData.pix_copia_cola} className="pix-textarea" />
          <button className="btn-primary" onClick={() => navigator.clipboard.writeText(confirmedData.pix_copia_cola)}>Copiar Código Pix</button>
          <p style={{ fontSize:'0.75rem', color:'var(--muted)', marginTop:'12px' }}>
            Aguardando confirmação do pagamento...
          </p>
        </div>
        <button className="btn-primary" style={{ background:'#555', marginTop:'10px' }} onClick={resetBooking}>
          Fazer Novo Agendamento
        </button>
      </motion.div>
    );
  }

  // ── Main page ─────────────────────────────────────────────
  return (
    <div>

      {/* ══════════════ HERO ══════════════════════════════════ */}
      <section className="hero-section">

        {/* Floating gradient blobs */}
        <motion.div className="blob blob-1" style={{ y: heroBlobY }}
          animate={{ scale:[1,1.12,1], rotate:[0,8,0] }}
          transition={{ duration:13, repeat:Infinity, ease:'easeInOut' }} />
        <motion.div className="blob blob-2"
          animate={{ scale:[1,1.07,1], rotate:[0,-6,0] }}
          transition={{ duration:16, repeat:Infinity, ease:'easeInOut', delay:2.5 }} />
        <motion.div className="blob blob-3"
          animate={{ scale:[1,1.09,1] }}
          transition={{ duration:11, repeat:Infinity, ease:'easeInOut', delay:5 }} />

        {/* Content with scroll parallax */}
        <motion.div className="hero-content" style={{ y:heroY, opacity:heroOp }}>
          <motion.p className="hero-badge" variants={fadeUp} initial="hidden" animate="visible" custom={0}>
            ✦ Studio de Beleza ✦
          </motion.p>

          <motion.h1 className="hero-title" variants={fadeUp} initial="hidden" animate="visible" custom={1}>
            Realce o seu
            <span className="hero-title-accent">Olhar</span>
          </motion.h1>

          <motion.div className="hero-divider" variants={fadeUp} initial="hidden" animate="visible" custom={2} />

          <motion.p className="hero-subtitle" variants={fadeUp} initial="hidden" animate="visible" custom={3}>
            Extensão de cílios e design de sobrancelhas<br />feitos com sofisticação e cuidado
          </motion.p>

          <motion.div className="hero-cta-group" variants={fadeUp} initial="hidden" animate="visible" custom={4}>
            <motion.button className="btn-pill btn-pill-primary"
              whileHover={{ scale:1.06, y:-3, boxShadow:'0 14px 36px rgba(216,67,139,0.44)' }}
              whileTap={{ scale:0.97 }}
              onClick={() => formRef.current?.scrollIntoView({ behavior:'smooth' })}>
              Agendar Agora →
            </motion.button>
            <motion.a
              href="https://wa.me/5511993627584?text=Oi%20Giovanna%2C%20vi%20o%20seu%20cat%C3%A1logo%20no%20site%20e%20gostaria%20de%20tirar%20uma%20d%C3%BAvida..."
              target="_blank" rel="noreferrer"
              className="btn-pill btn-pill-ghost"
              whileHover={{ scale:1.05, y:-3 }} whileTap={{ scale:0.97 }}>
              💬 WhatsApp
            </motion.a>
          </motion.div>

          <motion.div className="contact-badges" variants={fadeUp} initial="hidden" animate="visible" custom={5}>
            <div className="contact-item">
              <span className="contact-icon">📍</span>
              <p>Rua Ari Carneiro Fernandes, 155<br /><small style={{ color:'#aaa' }}>Jardim dos Francos</small></p>
            </div>
            <div className="contact-item">
              <span className="contact-icon">📸</span>
              <p><a href="https://instagram.com/giovannasoares_beauty" target="_blank" rel="noreferrer"
                style={{ color:'var(--pink)', fontWeight:'700', textDecoration:'none' }}>
                @giovannasoares_beauty
              </a></p>
            </div>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          style={{ position:'absolute', bottom:'28px', left:'50%', transform:'translateX(-50%)', display:'flex', flexDirection:'column', alignItems:'center', gap:'6px', color:'var(--muted)' }}
          animate={{ y:[0,10,0] }} transition={{ duration:2.2, repeat:Infinity, ease:'easeInOut' }}>
          <span style={{ fontSize:'0.62rem', letterSpacing:'3px', textTransform:'uppercase', fontWeight:600 }}>SCROLL</span>
          <span style={{ fontSize:'1.1rem' }}>↓</span>
        </motion.div>
      </section>

      {/* ══════════════ MARQUEE ═══════════════════════════════ */}
      <div className="marquee-strip">
        <div className="marquee-track">
          {MARQUEE_ITEMS.map((item, i) => (
            <span key={i} className={item === '✦' ? 'accent' : ''}>{item}</span>
          ))}
        </div>
      </div>

      {/* ══════════════ STORY — text behind organic image ═════ */}
      <section ref={storyRef} className="story-section">

        {/* Huge watermark word — moves faster, sits behind organic image */}
        <motion.div className="story-bg-word" style={{ y: bgWordY }}>
          BELEZA
        </motion.div>

        <div className="story-inner">

          {/* LEFT — organic blob with before/after slider inside */}
          <motion.div className="story-image-blob" style={{ y:imgY, scale:imgScale }}>
            <BeforeAfterSlider
              before="/fotos/volume-brasileiro-fio-y.png"
              after="/fotos/volume-mega-luxxo.png"
            />
          </motion.div>

          {/* RIGHT — story copy that drifts in on scroll */}
          <motion.div className="story-content" style={{ y:storyTY, opacity:storyOp }}>
            <p className="section-label" style={{ justifyContent:'flex-start', marginBottom:'20px' }}>✦ Nossa essência</p>
            <h2 className="story-heading">
              A arte de<br />
              <span>realçar sua</span><br />
              beleza natural
            </h2>
            <p className="story-text">
              Cada atendimento é único. Trabalhamos com técnicas premium que valorizam o formato do seu olhar, garantindo cílios que duram semanas com aparência absolutamente natural.
            </p>
            <motion.button
              className="btn-pill btn-pill-primary"
              style={{ width:'fit-content' }}
              whileHover={{ scale:1.05, y:-2 }} whileTap={{ scale:0.97 }}
              onClick={() => formRef.current?.scrollIntoView({ behavior:'smooth' })}>
              Ver disponibilidade →
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* ══════════════ CATALOG ═══════════════════════════════ */}
      <div className="catalog-section">
      <div className="section-header">
        <p className="section-label">✦ Procedimentos</p>
        <h2 className="section-title">Nosso <span className="section-title-accent">Catálogo</span></h2>
        <p className="section-subtitle">Clique no card para entender como cada procedimento é feito</p>
      </div>

      <div className="filter-pills">
        {FILTER_TABS.map(({ key, label }) => (
          <button
            key={label}
            className={`filter-pill${catalogFilter === key ? ' filter-pill--active' : ''}`}
            onClick={() => setCatalogFilter(key)}>
            {label}
          </button>
        ))}
      </div>

      <motion.section className="catalog-grid">
        {CATALOG
          .filter(item => {
            if (!catalogFilter) return true;
            if (catalogFilter === 'remocao') return false;
            return item.filterCat === catalogFilter;
          })
          .map(({ key, img, title, sub }, i) => {
            const dur = cardDur(key);
            return (
              <motion.div key={key} className="catalog-card"
                initial={{ opacity: 0, y: 36, scale: 0.96 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: false, margin: '-60px' }}
                transition={{ duration: 0.55, delay: i * 0.06, ease }}
                onClick={() => setModal(key)}
                whileHover={{ y:-10, boxShadow:'0 28px 64px rgba(216,67,139,0.18)' }}>
                <div style={{ overflow:'hidden', borderRadius:'20px 20px 0 0', position:'relative' }}>
                  <motion.img
                    src={img} alt={title}
                    whileHover={{ scale:1.08 }} transition={{ duration:0.5 }}
                    style={{ width:'100%', height:'240px', objectFit:'cover', display:'block' }}
                    onError={(e) => { e.target.src = FALLBACK; }} />
                  {dur && (
                    <span style={{ position:'absolute', top:'12px', right:'12px', background:'rgba(0,0,0,0.52)', backdropFilter:'blur(6px)', color:'#fff', fontSize:'0.7rem', fontWeight:700, padding:'4px 10px', borderRadius:'999px', letterSpacing:'0.5px' }}>
                      ⏱ {fmtDur(dur)}
                    </span>
                  )}
                </div>
                <div className="catalog-card-body">
                  <h4>{title}</h4>
                  <p>{sub}</p>
                </div>
              </motion.div>
            );
          })
        }
        {catalogFilter === 'remocao' && (
          <motion.div
            variants={cardVar} custom={0}
            style={{ gridColumn:'1/-1', textAlign:'center', padding:'40px 20px', color:'var(--muted)' }}>
            <p style={{ fontSize:'2rem', marginBottom:'12px' }}>🧴</p>
            <p style={{ fontWeight:700, color:'var(--text)', marginBottom:'8px' }}>Remoção Química</p>
            <p style={{ fontSize:'0.9rem', lineHeight:1.7 }}>
              Remoção feita com segurança usando produtos especializados.<br />
              A partir de <strong style={{ color:'var(--pink)' }}>R$ 10,00</strong> · Agendamento pelo formulário abaixo.
            </p>
            <motion.button className="btn-pill btn-pill-primary"
              style={{ marginTop:'20px', width:'fit-content', display:'inline-flex' }}
              whileHover={{ scale:1.04 }} whileTap={{ scale:0.97 }}
              onClick={() => scrollToForm(null, 'remocao')}>
              Agendar Remoção →
            </motion.button>
          </motion.div>
        )}
      </motion.section>
      </div>{/* /catalog-section */}

      {/* ══════════════ INFO ══════════════════════════════════ */}
      <motion.section className="info-box"
        initial={{ opacity:0, y:40 }} whileInView={{ opacity:1, y:0 }}
        viewport={{ once:true }} transition={{ duration:0.7 }}>
        <h3>✨ Como funciona o atendimento?</h3>
        <ul>
          <li><strong style={{ color:'#fff' }}>Garantia de Horário:</strong> Você pode pagar o valor total via Pix agora (vaga garantida imediatamente) ou pagar um sinal — R$ 30 para Cílios e R$ 15 para Sobrancelhas — e quitar o restante no dia do atendimento.</li>
          <li><strong style={{ color:'#fff' }}>Tempo de Procedimento:</strong> Cílios: 2h a 3h. Sobrancelhas: 40min a 1h50. Venha com tempo para garantir um resultado perfeito.</li>
          <li><strong style={{ color:'#fff' }}>Pré-procedimento:</strong> Venha sem maquiagem nos olhos e retire as lentes de contato antes do atendimento.</li>
        </ul>
      </motion.section>

      {/* ══════════════ CONSULTAR AGENDAMENTO ════════════════ */}
      <motion.div
        initial={{ opacity:0, y:30 }} whileInView={{ opacity:1, y:0 }}
        viewport={{ once:true }} transition={{ duration:0.6 }}
        style={{ maxWidth:'480px', margin:'0 auto 0', padding:'0 20px 48px' }}>
        <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'20px', padding:'24px 28px' }}>
          <p style={{ fontWeight:700, fontSize:'0.9rem', marginBottom:'6px', color:'var(--text)' }}>
            📱 Já agendou antes?
          </p>
          <p style={{ fontSize:'0.8rem', color:'var(--muted)', marginBottom:'16px', lineHeight:1.6 }}>
            Consulte seu agendamento pelo telefone — mesmo trocando de dispositivo.
          </p>
          <div style={{ display:'flex', gap:'10px' }}>
            <input
              type="tel"
              value={phoneQuery}
              onChange={e => { setPhoneQuery(e.target.value); setPhoneQueryError(''); }}
              onKeyDown={e => e.key === 'Enter' && handlePhoneQuery()}
              placeholder="(11) 99999-9999"
              style={{ flex:1, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'12px', padding:'11px 16px', color:'var(--text)', fontSize:'0.9rem', outline:'none' }}
            />
            <motion.button
              onClick={handlePhoneQuery}
              disabled={phoneQueryLoading}
              whileHover={{ scale:1.04 }} whileTap={{ scale:0.97 }}
              style={{ background:'var(--pink)', color:'#fff', border:'none', borderRadius:'12px', padding:'11px 20px', fontWeight:700, fontSize:'0.85rem', cursor:'pointer', whiteSpace:'nowrap', opacity: phoneQueryLoading ? 0.7 : 1 }}>
              {phoneQueryLoading ? '...' : 'Consultar'}
            </motion.button>
          </div>
          {phoneQueryError && (
            <p style={{ fontSize:'0.78rem', color:'#f87171', marginTop:'10px' }}>{phoneQueryError}</p>
          )}
        </div>
      </motion.div>

      {/* ══════════════ FORM ══════════════════════════════════ */}
      <div className="form-section" ref={formRef}>
        <div className="form-section-deco form-deco-1" />
        <div className="form-section-deco form-deco-2" />
        <div className="form-section-deco form-deco-3" />

        <div className="section-header" style={{ paddingBottom:'20px' }}>
          <p className="section-label" style={{ color:'var(--pink)' }}>✦ Reserva</p>
          <h2 className="section-title">Agende sua <span className="section-title-accent">Sessão</span></h2>
        </div>

      <motion.div className="container" style={{ marginBottom:'0' }}
        initial={{ opacity:0, y:40 }} whileInView={{ opacity:1, y:0 }}
        viewport={{ once:true }} transition={{ duration:0.7 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nome Completo</label>
            <input type="text" name="client_name" required onChange={handleChange} value={formData.client_name} placeholder="Ex: Maria Silva" />
          </div>
          <div className="form-group">
            <label>WhatsApp</label>
            <input type="tel" name="client_phone" required onChange={handleChange} value={formData.client_phone} placeholder="(11) 99999-9999" />
          </div>
          <div className="form-group">
            <label>Procedimento</label>
            <div className="svc-cat-tabs">
              {[
                { k:'cilios',      l:'💅 Cílios' },
                { k:'sobrancelha', l:'✨ Sobrancelhas' },
                { k:'remocao',     l:'🧴 Remoção' },
              ].map(({ k, l }) => (
                <button key={k} type="button"
                  className={`svc-cat-tab${svcCategory === k ? ' active' : ''}`}
                  onClick={() => { setSvcCategory(k); setFormData(p => ({ ...p, service_id: '' })); }}>
                  {l}
                </button>
              ))}
            </div>
            {svcCategory && (
              <div className="svc-list">
                {svcCategory === 'cilios' && (
                  <>
                    <div className="svc-group-label">Aplicação & Manutenção</div>
                    {services.filter(s => s.category === 'cilios' && !s.name.includes('CAPPING')).map(srv => (
                      <div key={srv.id}
                        className={`svc-row${formData.service_id === String(srv.id) ? ' selected' : ''}`}
                        onClick={() => setFormData(p => ({ ...p, service_id: String(srv.id) }))}>
                        <span className="svc-row-name">{srv.name}</span>
                        <span className="svc-row-meta">
                          <span className="svc-row-price">R$ {srv.base_price.toFixed(2).replace('.',',')}</span>
                          <span className="svc-row-dur">{fmtDur(srv.estimated_minutes)}</span>
                        </span>
                      </div>
                    ))}
                    <div className="svc-group-label">Técnica Capping (sem manutenção)</div>
                    {services.filter(s => s.name.includes('CAPPING')).map(srv => (
                      <div key={srv.id}
                        className={`svc-row${formData.service_id === String(srv.id) ? ' selected' : ''}`}
                        onClick={() => setFormData(p => ({ ...p, service_id: String(srv.id) }))}>
                        <span className="svc-row-name">{srv.name}</span>
                        <span className="svc-row-meta">
                          <span className="svc-row-price">R$ {srv.base_price.toFixed(2).replace('.',',')}</span>
                          <span className="svc-row-dur">{fmtDur(srv.estimated_minutes)}</span>
                        </span>
                      </div>
                    ))}
                  </>
                )}
                {svcCategory === 'sobrancelha' && services.filter(s => s.category === 'sobrancelha').map(srv => (
                  <div key={srv.id}
                    className={`svc-row${formData.service_id === String(srv.id) ? ' selected' : ''}`}
                    onClick={() => setFormData(p => ({ ...p, service_id: String(srv.id) }))}>
                    <span className="svc-row-name">{srv.name}</span>
                    <span className="svc-row-meta">
                      <span className="svc-row-price">R$ {srv.base_price.toFixed(2).replace('.',',')}</span>
                      <span className="svc-row-dur">{fmtDur(srv.estimated_minutes)}</span>
                    </span>
                  </div>
                ))}
                {svcCategory === 'remocao' && services.filter(s => s.category === 'remocao').map(srv => (
                  <div key={srv.id}
                    className={`svc-row${formData.service_id === String(srv.id) ? ' selected' : ''}`}
                    onClick={() => setFormData(p => ({ ...p, service_id: String(srv.id) }))}>
                    <span className="svc-row-name">{srv.name}</span>
                    <span className="svc-row-meta">
                      <span className="svc-row-price">R$ {srv.base_price.toFixed(2).replace('.',',')}</span>
                      <span className="svc-row-dur">{fmtDur(srv.estimated_minutes)}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
            {!svcCategory && (
              <p style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.4)', marginTop:'10px', textAlign:'center' }}>
                Escolha uma categoria acima para ver os serviços
              </p>
            )}
          </div>
          <div className="form-group">
            <label>Data</label>
            <CalendarPicker
              value={formData.scheduled_date}
              onChange={(date) => setFormData(p => ({ ...p, scheduled_date: date }))}
            />
          </div>
          <div className="form-group">
            <label>Horário</label>
            <select name="scheduled_time" required onChange={handleChange} value={formData.scheduled_time}>
              <option value="" disabled>Selecione o horário...</option>
              {timeSlots.map(t => <option key={t} value={t}>{t.replace(':','h')}</option>)}
            </select>
          </div>
          {/* Cupom de desconto */}
          <div className="form-group">
            <label>Cupom de desconto <span style={{ fontWeight:400, color:'rgba(255,255,255,0.4)', fontSize:'0.8rem' }}>(opcional)</span></label>
            <div style={{ display:'flex', gap:'8px' }}>
              <input
                type="text"
                value={promoCode}
                onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoStatus(null); setPromoError(''); }}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), validarCupom())}
                placeholder="CUPOM"
                style={{ flex:1, textTransform:'uppercase', letterSpacing:'1px' }}
              />
              <button type="button" onClick={validarCupom}
                style={{ padding:'0 18px', background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'12px', color:'#fff', fontWeight:'700', fontSize:'0.85rem', cursor:'pointer', whiteSpace:'nowrap' }}>
                Aplicar
              </button>
            </div>
            {promoStatus?.valid && (
              <p style={{ marginTop:'8px', fontSize:'0.82rem', color:'#86efac', fontWeight:'600' }}>
                ✅ {promoStatus.name} — {promoStatus.discount_type === 'percent' ? `${promoStatus.discount_value}% de desconto` : `R$ ${promoStatus.discount_value.toFixed(2)} de desconto`}
              </p>
            )}
            {promoError && (
              <p style={{ marginTop:'8px', fontSize:'0.82rem', color:'#fca5a5' }}>❌ {promoError}</p>
            )}
          </div>

          {/* Opção B: pagar tudo agora (padrão) ou sinal + restante no dia */}
          {(() => {
            const sel = services?.find(s => s.id === parseInt(formData.service_id));
            if (!sel) return null;
            if (sel.base_price <= 50) {
              return (
                <p style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.5)', marginTop:'8px', marginBottom:'16px' }}>
                  💳 Valor total: <strong style={{ color:'var(--text)' }}>R$ {sel.base_price.toFixed(2).replace('.',',')}</strong>
                </p>
              );
            }
            const restante = sel.base_price - sel.deposit_amount;
            return (
              <div style={{ marginTop:'12px', marginBottom:'16px', display:'flex', flexDirection:'column', gap:'8px' }}>
                <p style={{ fontSize:'0.82rem', fontWeight:'700', margin:0, color:'var(--text)' }}>Como prefere pagar?</p>
                <label style={{ display:'flex', alignItems:'center', gap:'10px', cursor:'pointer', padding:'10px 14px', borderRadius:'12px', border:`2px solid ${payFull ? 'var(--pink, #d8438b)' : 'rgba(255,255,255,0.15)'}`, background: payFull ? 'rgba(216,67,139,0.08)' : 'rgba(255,255,255,0.03)' }}>
                  <input type="radio" name="pay_option" checked={payFull} onChange={() => setPayFull(true)} />
                  <span style={{ fontSize:'0.88rem', color:'#fff', lineHeight:1.5 }}>
                    ✅ Pagar tudo agora — <strong style={{ color:'#fff' }}>R$ {sel.base_price.toFixed(2).replace('.',',')}</strong>
                    <span style={{ display:'block', fontSize:'0.76rem', color:'rgba(255,255,255,0.5)', marginTop:'2px' }}>Vaga garantida na hora, sem precisar pagar no dia</span>
                  </span>
                </label>
                <label style={{ display:'flex', alignItems:'center', gap:'10px', cursor:'pointer', padding:'10px 14px', borderRadius:'12px', border:`2px solid ${!payFull ? 'var(--pink, #d8438b)' : 'rgba(255,255,255,0.15)'}`, background: !payFull ? 'rgba(216,67,139,0.08)' : 'rgba(255,255,255,0.03)' }}>
                  <input type="radio" name="pay_option" checked={!payFull} onChange={() => setPayFull(false)} />
                  <span style={{ fontSize:'0.88rem', color:'#fff', lineHeight:1.5 }}>
                    📅 Sinal agora + restante no dia — <strong style={{ color:'#fff' }}>R$ {sel.deposit_amount.toFixed(2).replace('.',',')} agora</strong>
                    <span style={{ display:'block', fontSize:'0.76rem', color:'rgba(255,255,255,0.5)', marginTop:'2px' }}>Garante sua vaga · R$ {restante.toFixed(2).replace('.',',')} pagos no atendimento</span>
                  </span>
                </label>
              </div>
            );
          })()}

          <motion.button type="submit" className="btn-primary" disabled={loading}
            whileHover={!loading ? { scale:1.02, y:-2 } : {}}
            whileTap={!loading ? { scale:0.98 } : {}}>
            {loading ? 'Gerando Pix...' : 'Confirmar Horário →'}
          </motion.button>
        </form>
      </motion.div>
      </div>{/* /form-section */}

      {/* ══════════════ MODAL ═════════════════════════════════ */}
      <AnimatePresence>
        {activeModal && (
          <motion.div className="modal-overlay"
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={() => setModal(null)}>
            <motion.div className="modal-content"
              initial={{ opacity:0, y:40, scale:0.93 }}
              animate={{ opacity:1, y:0, scale:1 }}
              exit={{ opacity:0, y:20, scale:0.96 }}
              transition={{ duration:0.35, ease }}
              onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
              <h3 className="modal-title">{MODALS[activeModal].title}</h3>
              {(() => {
                const price = cardPrice(activeModal);
                const dur   = cardDur(activeModal);
                return (price || dur) ? (
                  <div style={{ display:'flex', gap:'10px', marginBottom:'16px', flexWrap:'wrap' }}>
                    {price && (
                      <span style={{ background:'var(--pink-light)', border:'1px solid var(--pink-mid)', borderRadius:'999px', padding:'5px 14px', fontSize:'0.8rem', fontWeight:700, color:'var(--pink)', fontFamily:'var(--font-mono)' }}>
                        a partir de R$ {price.toFixed(2).replace('.',',')}
                      </span>
                    )}
                    {dur && (
                      <span style={{ background:'#f5f5f5', border:'1px solid #e5e5e5', borderRadius:'999px', padding:'5px 14px', fontSize:'0.8rem', fontWeight:600, color:'var(--muted)' }}>
                        ⏱ {fmtDur(dur)}
                      </span>
                    )}
                  </div>
                ) : null;
              })()}
              <p className="modal-text">{MODALS[activeModal].text}</p>
              <div className="modal-alert">{MODALS[activeModal].alert}</div>
              <motion.button className="btn-primary"
                whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
                onClick={() => {
                  const item = CATALOG.find(c => c.key === activeModal);
                  scrollToForm(MODALS[activeModal].filter, item?.filterCat);
                }}>
                Quero Agendar →
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
