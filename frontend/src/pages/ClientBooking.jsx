import { useState, useEffect, useRef } from 'react';
import api from '../api/client';

export default function ClientBooking() {
  const [services, setServices] = useState([]);
  const [formData, setFormData] = useState({
    client_name: '',
    client_phone: '',
    service_id: '',
    scheduled_date: '',
    scheduled_time: ''
  });

  const timeSlots = [];
  for (let h = 8; h < 20; h++) {
    timeSlots.push(`${String(h).padStart(2,'0')}:00`);
    if (h < 19) timeSlots.push(`${String(h).padStart(2,'0')}:30`);
  }

  const [pixData, setPixData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const formRef = useRef(null);

  useEffect(() => {
    api.get('/services/')
      .then(r => setServices(r.data))
      .catch(e => console.error('Erro ao buscar catálogo:', e));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.service_id) { alert('Por favor, selecione um serviço.'); return; }
    if (!formData.scheduled_date || !formData.scheduled_time) { alert('Por favor, escolha a data e o horário.'); return; }
    const scheduledAt = new Date(`${formData.scheduled_date}T${formData.scheduled_time}:00`);
    if (scheduledAt < new Date()) { alert('Não é possível agendar em uma data ou horário que já passou.'); return; }
    setLoading(true);
    try {
      const response = await api.post('/appointments/', {
        client_name: formData.client_name,
        client_phone: formData.client_phone,
        service_id: parseInt(formData.service_id),
        scheduled_at: scheduledAt.toISOString()
      });
      setPixData(response.data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      alert('Erro ao criar agendamento: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const scrollToForm = (serviceFilter) => {
    setActiveModal(null);
    if (serviceFilter && services.length > 0) {
      const match =
        services.find(s => s.name.includes(serviceFilter) && s.name.includes('Aplicação')) ||
        services.find(s => s.name.includes(serviceFilter));
      if (match) setFormData(prev => ({ ...prev, service_id: String(match.id) }));
    }
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const modalDetails = {
    brasileiro: {
      title: 'Volume Brasileiro (Fio Y)',
      text: 'Aplicação delicada utilizando o Fio Y, garantindo um resultado leve e harmônico para o dia a dia. O procedimento leva em torno de 2h a 3h.',
      alert: '⚠️ Pré-procedimento: Venha sem maquiagem nos olhos e retire as lentes de contato.',
      serviceFilter: 'Brasileiro'
    },
    egipcio: {
      title: 'Volume Egípcio (Fio 4D)',
      text: 'Técnica que utiliza o Fio 4D para proporcionar mais preenchimento e um olhar marcante, ideal para quem busca um meio-termo entre o natural e o volumoso.',
      alert: '⚠️ Pré-procedimento: Venha sem maquiagem nos olhos e retire as lentes de contato.',
      serviceFilter: 'Egípcio'
    },
    luxxo: {
      title: 'Volume Luxxo (Fio 5D) e Glamour (Fio 6D)',
      text: 'Para quem ama cílios bem cheios! O Fio 5D e 6D entregam o máximo de volume e destaque para um olhar incrivelmente poderoso.',
      alert: '⚠️ Pré-procedimento: Venha sem maquiagem nos olhos e retire as lentes de contato.',
      serviceFilter: 'Luxxo'
    },
    foxy: {
      title: 'Volume Foxy Eyes (Curvatura M)',
      text: 'Utilizando Fio 5D com Curvatura M, essa técnica cria um efeito delineado que alonga e puxa o olhar para as extremidades. Extremamente sedutor.',
      alert: '⚠️ Pré-procedimento: Venha sem maquiagem nos olhos e retire as lentes de contato.',
      serviceFilter: 'Foxy'
    },
    capping: {
      title: 'Técnicas Capping (Sem Manutenção)',
      text: 'A revolução! Usamos a técnica "Capping Sanduíche" (um fio acoplado por cima e outro por baixo do fio natural). Aumenta o volume e a durabilidade para 30 dias ou mais.',
      alert: '✨ Perfeito para rotinas corridas. Disponível nos volumes Mega Brasileiro, Egípcio e Luxxo.',
      serviceFilter: 'CAPPING'
    },
    sobrancelhas: {
      title: 'Sobrancelhas e Lamination',
      text: 'A Brow Lamination alisa e engrossa os fios (durabilidade de 30 a 50 dias). Também oferecemos Design Personalizado com ou sem Henna e depilação de buço.',
      alert: '⚠️ Brow Lamination não é indicada para gestantes, lactantes ou pessoas em tratamento quimioterápico.',
      serviceFilter: 'Lamination Simples'
    },
    remocao: {
      title: 'Remoções Químicas',
      text: 'Usamos produto específico que dilui a cola e remove a extensão sem prejudicar seus fios naturais.',
      alert: 'Temos valores diferenciados para cílios feitos por nós ou de outras profissionais.',
      serviceFilter: 'Remoção Química'
    }
  };

  const marqueeItems = [
    'Volume Brasileiro', '✦', 'Volume Egípcio', '✦', 'Foxy Eyes', '✦',
    'Brow Lamination', '✦', 'Técnica Capping', '✦', 'Volume Luxxo', '✦',
    'Volume Glamour', '✦', 'Design de Sobrancelhas', '✦',
    'Volume Brasileiro', '✦', 'Volume Egípcio', '✦', 'Foxy Eyes', '✦',
    'Brow Lamination', '✦', 'Técnica Capping', '✦', 'Volume Luxxo', '✦',
    'Volume Glamour', '✦', 'Design de Sobrancelhas', '✦',
  ];

  if (pixData) {
    const bookedService = services.find(s => String(s.id) === String(formData.service_id));
    const bookedDate = new Date(`${formData.scheduled_date}T${formData.scheduled_time}:00`);
    const formattedDate = bookedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
    const formattedTime = formData.scheduled_time.replace(':', 'h');
    const hasPix = pixData.pix_qr_code_base64 && pixData.pix_copia_cola;

    return (
      <div className="container pix-container" style={{ marginTop: '50px', marginBottom: '50px' }}>
        <div style={{ fontSize: '3rem', marginBottom: '8px' }}>✅</div>
        <h2 className="title">Horário <span>Confirmado!</span></h2>
        <p style={{ color: 'var(--muted)', marginBottom: '28px', fontSize: '0.95rem' }}>
          Seu agendamento foi salvo, {pixData.client_name?.split(' ')[0]}!
        </p>

        <div style={{
          background: 'var(--pink-light)', borderRadius: '16px', padding: '20px 24px',
          marginBottom: '28px', textAlign: 'left', lineHeight: '2', border: '1px solid var(--pink-mid)'
        }}>
          <p>💅 <strong>{bookedService?.name || pixData.service_name}</strong></p>
          <p>📅 {formattedDate} às {formattedTime}</p>
          <p>📍 Rua Ari Carneiro Fernandes, 155</p>
          <p>💰 Total: <strong>R$ {pixData.total_value?.toFixed(2).replace('.', ',')}</strong>
            {pixData.deposit_amount > 0 && ` · Sinal: R$ ${pixData.deposit_amount?.toFixed(2).replace('.', ',')}`}
          </p>
        </div>

        {hasPix && (
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontWeight: '700', marginBottom: '12px', color: 'var(--text)' }}>
              Pague o sinal para garantir sua vaga:
            </p>
            <img src={`data:image/jpeg;base64,${pixData.pix_qr_code_base64}`} alt="QR Code Pix" className="pix-qrcode" />
            <p style={{ marginBottom: '8px', fontWeight: '600', marginTop: '16px', fontSize: '0.9rem' }}>Pix Copia e Cola:</p>
            <textarea readOnly value={pixData.pix_copia_cola} className="pix-textarea" />
            <button className="btn-primary" onClick={() => navigator.clipboard.writeText(pixData.pix_copia_cola)}>
              Copiar Código Pix
            </button>
          </div>
        )}

        <button
          className="btn-primary"
          style={{ background: '#555', marginTop: '10px' }}
          onClick={() => {
            setPixData(null);
            setFormData({ client_name: '', client_phone: '', service_id: '', scheduled_date: '', scheduled_time: '' });
          }}
        >
          Fazer Novo Agendamento
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* HERO */}
      <header className="hero-section">
        <p className="hero-badge">✦ Studio de Beleza ✦</p>

        <h1 className="hero-title">
          Realce o seu
          <span className="hero-title-accent">Olhar</span>
        </h1>

        <div className="hero-divider" />

        <p className="hero-subtitle">
          Extensão de cílios e design de sobrancelhas feitos com sofisticação e cuidado
        </p>

        <div className="hero-cta-group">
          <button className="btn-pill btn-pill-primary" onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })}>
            Agendar Agora →
          </button>
          <a
            href="https://wa.me/5511993627584?text=Oi%20Giovanna%2C%20vi%20o%20seu%20cat%C3%A1logo%20no%20site%20e%20gostaria%20de%20tirar%20uma%20d%C3%BAvida..."
            target="_blank"
            rel="noreferrer"
            className="btn-pill btn-pill-ghost"
          >
            💬 WhatsApp
          </a>
        </div>

        <div className="contact-badges">
          <div className="contact-item">
            <span className="contact-icon">📍</span>
            <p>Rua Ari Carneiro Fernandes, 155<br /><small style={{ color: '#aaa' }}>Jardim dos Francos</small></p>
          </div>
          <div className="contact-item">
            <span className="contact-icon">📸</span>
            <p>
              <a href="https://instagram.com/giovannasoares_beauty" target="_blank" rel="noreferrer"
                style={{ color: 'var(--pink)', fontWeight: '700', textDecoration: 'none' }}>
                @giovannasoares_beauty
              </a>
            </p>
          </div>
        </div>
      </header>

      {/* MARQUEE */}
      <div className="marquee-strip">
        <div className="marquee-track">
          {marqueeItems.map((item, i) => (
            <span key={i} className={item === '✦' ? 'accent' : ''}>{item}</span>
          ))}
        </div>
      </div>

      {/* CATÁLOGO */}
      <div className="section-header">
        <p className="section-label">✦ Procedimentos</p>
        <h2 className="section-title">
          Nosso <span className="section-title-accent">Catálogo</span>
        </h2>
        <p className="section-subtitle">Clique no card para entender como cada procedimento é feito</p>
      </div>

      <div className="filter-pills">
        <span className="filter-pill">CÍLIOS</span>
        <span className="filter-pill">SOBRANCELHAS</span>
        <span className="filter-pill">CAPPING</span>
        <span className="filter-pill">REMOÇÃO</span>
      </div>

      <section className="catalog-grid">
        {[
          { key: 'brasileiro', img: '/fotos/volume-brasileiro-fio-y.png', alt: 'Volume Brasileiro', title: 'Volume Brasileiro', sub: 'Fio Y' },
          { key: 'egipcio',    img: '/fotos/volume-egipicio-fio-4D.png',  alt: 'Volume Egípcio',  title: 'Volume Egípcio',  sub: 'Fio 4D' },
          { key: 'luxxo',      img: '/fotos/volume-luxxo-fio-5D.png',     alt: 'Volume Luxxo',    title: 'Volume Luxxo / Glamour', sub: 'Fios 5D e 6D' },
          { key: 'foxy',       img: '/fotos/volume-foxxy-eyes.png',       alt: 'Foxy Eyes',       title: 'Volume Foxy Eyes', sub: 'Curvatura M' },
          { key: 'capping',    img: '/fotos/volume-mega-brasileiro.png',  alt: 'Técnica Capping', title: 'Técnica Capping',  sub: 'Mega Retenção · Sem manutenção' },
          { key: 'sobrancelhas', img: '/fotos/brow lamination.png',       alt: 'Brow Lamination', title: 'Sobrancelhas',    sub: 'Lamination, Henna e Design' },
        ].map(({ key, img, alt, title, sub }) => (
          <div key={key} className="catalog-card" onClick={() => setActiveModal(key)}>
            <img src={img} alt={alt}
              onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1583241800698-e8ab01830a07?q=80&w=600'; }} />
            <div className="catalog-card-body">
              <h4>{title}</h4>
              <p>{sub}</p>
            </div>
          </div>
        ))}
      </section>

      {/* INFO */}
      <section className="info-box" style={{ marginLeft: '20px', marginRight: '20px' }}>
        <h3>✨ Como funciona o atendimento?</h3>
        <ul>
          <li><strong style={{ color: '#fff' }}>Garantia de Horário (Sinal):</strong> Para assegurar sua vaga, solicitamos um sinal via Pix — R$ 30 para Cílios e R$ 15 para Sobrancelhas. Valor integralmente descontado no dia.</li>
          <li><strong style={{ color: '#fff' }}>Tempo de Procedimento:</strong> Cílios: 2h a 3h. Sobrancelhas: 40min a 1h50. Venha com tempo para garantir um resultado perfeito.</li>
          <li><strong style={{ color: '#fff' }}>Pré-procedimento:</strong> Venha sem maquiagem nos olhos e retire as lentes de contato antes do atendimento.</li>
        </ul>
      </section>

      {/* FORMULÁRIO */}
      <div className="section-header" style={{ paddingBottom: '20px' }}>
        <p className="section-label">✦ Reserva</p>
        <h2 className="section-title">
          Agende sua <span className="section-title-accent">Sessão</span>
        </h2>
      </div>

      <div className="container" ref={formRef} style={{ marginBottom: '80px' }}>
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
              {timeSlots.map(t => <option key={t} value={t}>{t.replace(':', 'h')}</option>)}
            </select>
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Gerando Pix de Segurança...' : 'Confirmar Horário →'}
          </button>
        </form>
      </div>

      {/* MODAL */}
      {activeModal && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setActiveModal(null)}>✕</button>
            <h3 className="modal-title">{modalDetails[activeModal].title}</h3>
            <p className="modal-text">{modalDetails[activeModal].text}</p>
            <div className="modal-alert">{modalDetails[activeModal].alert}</div>
            <button className="btn-primary" onClick={() => scrollToForm(modalDetails[activeModal].serviceFilter)}>
              Quero Agendar →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
