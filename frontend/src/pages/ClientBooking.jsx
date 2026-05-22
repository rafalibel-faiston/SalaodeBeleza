import { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import api from '../api/client';

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
  { key: 'brasileiro',   img: '/fotos/volume-brasileiro-fio-y.png',  title: 'Volume Brasileiro',      sub: 'Fio Y' },
  { key: 'egipcio',      img: '/fotos/volume-egipicio-fio-4D.png',   title: 'Volume Egípcio',         sub: 'Fio 4D' },
  { key: 'luxxo',        img: '/fotos/volume-luxxo-fio-5D.png',      title: 'Volume Luxxo / Glamour', sub: 'Fios 5D e 6D' },
  { key: 'foxy',         img: '/fotos/volume-foxxy-eyes.png',        title: 'Volume Foxy Eyes',       sub: 'Curvatura M' },
  { key: 'capping',      img: '/fotos/volume-mega-brasileiro.png',   title: 'Técnica Capping',        sub: 'Mega Retenção · Sem manutenção' },
  { key: 'sobrancelhas', img: '/fotos/brow lamination.png',          title: 'Sobrancelhas',           sub: 'Lamination, Henna e Design' },
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
export default function ClientBooking() {
  const [services, setServices]   = useState([]);
  const [formData, setFormData]   = useState({ client_name:'', client_phone:'', service_id:'', scheduled_date:'', scheduled_time:'' });
  const [pixData, setPixData]     = useState(null);
  const [loading, setLoading]     = useState(false);
  const [activeModal, setModal]   = useState(null);
  const formRef  = useRef(null);
  const storyRef = useRef(null);

  const timeSlots = [];
  for (let h = 8; h < 20; h++) {
    timeSlots.push(`${String(h).padStart(2,'0')}:00`);
    if (h < 19) timeSlots.push(`${String(h).padStart(2,'0')}:30`);
  }

  useEffect(() => {
    api.get('/services/').then(r => setServices(r.data)).catch(console.error);
  }, []);

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
        service_id: parseInt(formData.service_id), scheduled_at: scheduledAt.toISOString()
      });
      setPixData(r.data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      alert('Erro ao criar agendamento: ' + (err.response?.data?.detail || err.message));
    } finally { setLoading(false); }
  };

  const scrollToForm = (filter) => {
    setModal(null);
    if (filter && services.length > 0) {
      const match = services.find(s => s.name.includes(filter) && s.name.includes('Aplicação'))
                 || services.find(s => s.name.includes(filter));
      if (match) setFormData(p => ({ ...p, service_id: String(match.id) }));
    }
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ── Scroll-driven parallax ────────────────────────────────
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

  // ── Pix success screen ────────────────────────────────────
  if (pixData) {
    const svc         = services.find(s => String(s.id) === String(formData.service_id));
    const bookedDate  = new Date(`${formData.scheduled_date}T${formData.scheduled_time}:00`);
    const dateStr     = bookedDate.toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'2-digit' });
    const timeStr     = formData.scheduled_time.replace(':','h');
    const hasPix      = pixData.pix_qr_code_base64 && pixData.pix_copia_cola;

    return (
      <motion.div className="container pix-container" style={{ marginTop:'50px', marginBottom:'50px' }}
        initial={{ opacity:0, y:30 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.6 }}>
        <div style={{ fontSize:'3rem', marginBottom:'8px' }}>✅</div>
        <h2 className="title">Horário <span>Confirmado!</span></h2>
        <p style={{ color:'var(--muted)', marginBottom:'28px' }}>Agendamento salvo, {pixData.client_name?.split(' ')[0]}!</p>

        <div style={{ background:'var(--pink-light)', borderRadius:'16px', padding:'20px 24px', marginBottom:'28px', textAlign:'left', lineHeight:'2', border:'1px solid var(--pink-mid)' }}>
          <p>💅 <strong>{svc?.name || pixData.service_name}</strong></p>
          <p>📅 {dateStr} às {timeStr}</p>
          <p>📍 Rua Ari Carneiro Fernandes, 155</p>
          <p>💰 Total: <strong>R$ {pixData.total_value?.toFixed(2).replace('.',',')}</strong>
            {pixData.deposit_amount > 0 && ` · Sinal: R$ ${pixData.deposit_amount?.toFixed(2).replace('.',',')}`}</p>
        </div>

        {hasPix && (
          <div style={{ marginBottom:'20px' }}>
            <p style={{ fontWeight:'700', marginBottom:'12px' }}>Pague o sinal para garantir sua vaga:</p>
            <img src={`data:image/jpeg;base64,${pixData.pix_qr_code_base64}`} alt="QR Code Pix" className="pix-qrcode" />
            <p style={{ marginBottom:'8px', fontWeight:'600', marginTop:'16px', fontSize:'0.9rem' }}>Pix Copia e Cola:</p>
            <textarea readOnly value={pixData.pix_copia_cola} className="pix-textarea" />
            <button className="btn-primary" onClick={() => navigator.clipboard.writeText(pixData.pix_copia_cola)}>Copiar Código Pix</button>
          </div>
        )}

        <button className="btn-primary" style={{ background:'#555', marginTop:'10px' }}
          onClick={() => { setPixData(null); setFormData({ client_name:'', client_phone:'', service_id:'', scheduled_date:'', scheduled_time:'' }); }}>
          Fazer Novo Agendamento
        </button>
      </motion.div>
    );
  }

  // ── Main page ─────────────────────────────────────────────
  return (
    <div>

      {/* ══════════════ HERO ══════════════════════════════════ */}
      <section style={{ position:'relative', overflow:'hidden', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(160deg,#fdf1f6 0%,#fff8fb 50%,#fdfafb 100%)' }}>

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

          {/* LEFT — organic blob image with parallax scale */}
          <motion.div className="story-image-blob" style={{ y:imgY, scale:imgScale }}>
            <img
              src="/fotos/volume-luxxo-fio-5D.png"
              alt="Extensão de Cílios Premium"
              onError={(e) => { e.target.src = FALLBACK; }}
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
      <div className="section-header">
        <p className="section-label">✦ Procedimentos</p>
        <h2 className="section-title">Nosso <span className="section-title-accent">Catálogo</span></h2>
        <p className="section-subtitle">Clique no card para entender como cada procedimento é feito</p>
      </div>

      <div className="filter-pills">
        {['CÍLIOS','SOBRANCELHAS','CAPPING','REMOÇÃO'].map(f => (
          <span key={f} className="filter-pill">{f}</span>
        ))}
      </div>

      <motion.section className="catalog-grid"
        initial="hidden" whileInView="visible"
        viewport={{ once:true, margin:'-80px' }}>
        {CATALOG.map(({ key, img, title, sub }, i) => (
          <motion.div key={key} className="catalog-card"
            variants={cardVar} custom={i}
            onClick={() => setModal(key)}
            whileHover={{ y:-10, boxShadow:'0 28px 64px rgba(216,67,139,0.18)' }}
            transition={{ duration:0.25 }}>
            <div style={{ overflow:'hidden', borderRadius:'20px 20px 0 0' }}>
              <motion.img
                src={img} alt={title}
                whileHover={{ scale:1.08 }} transition={{ duration:0.5 }}
                style={{ width:'100%', height:'240px', objectFit:'cover', display:'block' }}
                onError={(e) => { e.target.src = FALLBACK; }} />
            </div>
            <div className="catalog-card-body">
              <h4>{title}</h4>
              <p>{sub}</p>
            </div>
          </motion.div>
        ))}
      </motion.section>

      {/* ══════════════ INFO ══════════════════════════════════ */}
      <motion.section className="info-box" style={{ margin:'0 20px 60px' }}
        initial={{ opacity:0, y:40 }} whileInView={{ opacity:1, y:0 }}
        viewport={{ once:true }} transition={{ duration:0.7 }}>
        <h3>✨ Como funciona o atendimento?</h3>
        <ul>
          <li><strong style={{ color:'#fff' }}>Garantia de Horário (Sinal):</strong> Para assegurar sua vaga, solicitamos um sinal via Pix — R$ 30 para Cílios e R$ 15 para Sobrancelhas. Valor integralmente descontado no dia.</li>
          <li><strong style={{ color:'#fff' }}>Tempo de Procedimento:</strong> Cílios: 2h a 3h. Sobrancelhas: 40min a 1h50. Venha com tempo para garantir um resultado perfeito.</li>
          <li><strong style={{ color:'#fff' }}>Pré-procedimento:</strong> Venha sem maquiagem nos olhos e retire as lentes de contato antes do atendimento.</li>
        </ul>
      </motion.section>

      {/* ══════════════ FORM ══════════════════════════════════ */}
      <div className="section-header" style={{ paddingBottom:'20px' }}>
        <p className="section-label">✦ Reserva</p>
        <h2 className="section-title">Agende sua <span className="section-title-accent">Sessão</span></h2>
      </div>

      <motion.div className="container" ref={formRef} style={{ marginBottom:'80px' }}
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
            <select name="service_id" required onChange={handleChange} value={formData.service_id}>
              <option value="" disabled>Selecione o serviço...</option>
              {services.map(srv => (
                <option key={srv.id} value={srv.id}>
                  [{srv.category ? srv.category.toUpperCase() : 'SERVIÇO'}] {srv.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Data</label>
            <input type="date" name="scheduled_date" required onChange={handleChange}
              min={new Date().toISOString().split('T')[0]} value={formData.scheduled_date} />
          </div>
          <div className="form-group">
            <label>Horário</label>
            <select name="scheduled_time" required onChange={handleChange} value={formData.scheduled_time}>
              <option value="" disabled>Selecione o horário...</option>
              {timeSlots.map(t => <option key={t} value={t}>{t.replace(':','h')}</option>)}
            </select>
          </div>
          <motion.button type="submit" className="btn-primary" disabled={loading}
            whileHover={!loading ? { scale:1.02, y:-2 } : {}}
            whileTap={!loading ? { scale:0.98 } : {}}>
            {loading ? 'Gerando Pix de Segurança...' : 'Confirmar Horário →'}
          </motion.button>
        </form>
      </motion.div>

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
              <p className="modal-text">{MODALS[activeModal].text}</p>
              <div className="modal-alert">{MODALS[activeModal].alert}</div>
              <motion.button className="btn-primary"
                whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
                onClick={() => scrollToForm(MODALS[activeModal].filter)}>
                Quero Agendar →
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
