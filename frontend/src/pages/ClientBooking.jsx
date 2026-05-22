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

  // Horários disponíveis: 08h00 até 19h30, de 30 em 30 minutos
  const timeSlots = [];
  for (let h = 8; h < 20; h++) {
    timeSlots.push(`${String(h).padStart(2,'0')}:00`);
    if (h < 19) timeSlots.push(`${String(h).padStart(2,'0')}:30`);
  }
  
  const [pixData, setPixData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // Controla qual modal está aberto
  
  const formRef = useRef(null);

  useEffect(() => {
    api.get('/services/')
      .then(response => setServices(response.data))
      .catch(error => console.error("Erro ao buscar catálogo:", error));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.service_id) {
      alert("Por favor, selecione um serviço.");
      return;
    }
    if (!formData.scheduled_date || !formData.scheduled_time) {
      alert("Por favor, escolha a data e o horário.");
      return;
    }
    const scheduledAt = new Date(`${formData.scheduled_date}T${formData.scheduled_time}:00`);
    if (scheduledAt < new Date()) {
      alert("Não é possível agendar em uma data ou horário que já passou.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        client_name: formData.client_name,
        client_phone: formData.client_phone,
        service_id: parseInt(formData.service_id),
        scheduled_at: scheduledAt.toISOString()
      };
      const response = await api.post('/appointments/', payload);
      setPixData(response.data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      alert("Erro ao criar agendamento: " + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const scrollToForm = (serviceFilter) => {
    setActiveModal(null);
    // Pré-seleciona o serviço correspondente ao card clicado
    if (serviceFilter && services.length > 0) {
      const match =
        services.find(s => s.name.includes(serviceFilter) && s.name.includes('Aplicação')) ||
        services.find(s => s.name.includes(serviceFilter));
      if (match) {
        setFormData(prev => ({ ...prev, service_id: String(match.id) }));
      }
    }
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Conteúdos dos Modais baseados rigorosamente no catálogo técnico
  const modalDetails = {
    brasileiro: {
      title: "Volume Brasileiro (Fio Y)",
      text: "Aplicação delicada utilizando o Fio Y, garantindo um resultado leve e harmônico para o dia a dia. O procedimento leva em torno de 2h a 3h.",
      alert: "⚠️ Pré-procedimento: Venha sem maquiagem nos olhos e retire as lentes de contato.",
      serviceFilter: "Brasileiro"
    },
    egipcio: {
      title: "Volume Egípcio (Fio 4D)",
      text: "Técnica que utiliza o Fio 4D para proporcionar mais preenchimento e um olhar marcante, ideal para quem busca um meio-termo entre o natural e o volumoso.",
      alert: "⚠️ Pré-procedimento: Venha sem maquiagem nos olhos e retire as lentes de contato.",
      serviceFilter: "Egípcio"
    },
    luxxo: {
      title: "Volume Luxxo (Fio 5D) e Glamour (Fio 6D)",
      text: "Para quem ama cílios bem cheios! O Fio 5D e 6D entregam o máximo de volume e destaque para um olhar incrivelmente poderoso.",
      alert: "⚠️ Pré-procedimento: Venha sem maquiagem nos olhos e retire as lentes de contato.",
      serviceFilter: "Luxxo"
    },
    foxy: {
      title: "Volume Foxy Eyes (Curvatura M)",
      text: "Utilizando Fio 5D com Curvatura M, essa técnica cria um efeito delineado que alonga e puxa o olhar para as extremidades. Extremamente sedutor.",
      alert: "⚠️ Pré-procedimento: Venha sem maquiagem nos olhos e retire as lentes de contato.",
      serviceFilter: "Foxy"
    },
    capping: {
      title: "Técnicas Capping (Sem Manutenção)",
      text: "A revolução! Usamos a técnica 'Capping Sanduíche' (um fio acoplado por cima e outro por baixo do fio natural). Aumenta o volume e a durabilidade para 30 dias ou mais, eliminando a necessidade de manutenções.",
      alert: "✨ Perfeito para rotinas corridas. Disponível nos volumes Mega Brasileiro, Egípcio e Luxxo.",
      serviceFilter: "CAPPING"
    },
    sobrancelhas: {
      title: "Sobrancelhas e Lamination",
      text: "A Brow Lamination alisa e engrossa os fios (durabilidade de 30 a 50 dias). Também oferecemos Design Personalizado com ou sem Henna e depilação de buço.",
      alert: "⚠️ Brow Lamination não é indicada para gestantes, lactantes ou pessoas em tratamento quimioterápico.",
      serviceFilter: "Lamination Simples"
    },
    remocao: {
      title: "Remoções Químicas",
      text: "Usamos produto específico que dilui a cola e remove a extensão sem prejudicar seus fios naturais.",
      alert: "Temos valores diferenciados para cílios feitos por nós ou de outras profissionais.",
      serviceFilter: "Remoção Química"
    }
  };

  if (pixData) {
    const bookedService = services.find(s => String(s.id) === String(formData.service_id));
    const bookedDate = new Date(`${formData.scheduled_date}T${formData.scheduled_time}:00`);
    const formattedDate = bookedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
    const formattedTime = formData.scheduled_time.replace(':', 'h');
    const hasPix = pixData.pix_qr_code_base64 && pixData.pix_copia_cola;

    return (
      <div className="container pix-container" style={{ marginTop: '50px' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '8px' }}>✅</div>
        <h2 className="title">Horário Confirmado!</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '25px', fontSize: '0.95rem' }}>
          Seu agendamento foi salvo com sucesso, {pixData.client_name?.split(' ')[0]}!
        </p>

        {/* Resumo do agendamento */}
        <div style={{
          background: '#fdf1f6', borderRadius: '12px', padding: '20px',
          marginBottom: '25px', textAlign: 'left', lineHeight: '2'
        }}>
          <p>💅 <strong>{bookedService?.name || pixData.service_name}</strong></p>
          <p>📅 {formattedDate} às {formattedTime}</p>
          <p>📍 Rua Ari Carneiro Fernandes, 155</p>
          <p>💰 Total: <strong>R$ {pixData.total_value?.toFixed(2).replace('.', ',')}</strong>
            {pixData.deposit_amount > 0 && ` · Sinal: R$ ${pixData.deposit_amount?.toFixed(2).replace('.', ',')}`}
          </p>
        </div>

        {/* Pix — só aparece se foi gerado */}
        {hasPix && (
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontWeight: 'bold', marginBottom: '12px', color: 'var(--text-main)' }}>
              Pague o sinal para garantir sua vaga:
            </p>
            <img src={`data:image/jpeg;base64,${pixData.pix_qr_code_base64}`} alt="QR Code Pix" className="pix-qrcode" />
            <p style={{ marginBottom: '8px', fontWeight: 'bold', marginTop: '16px' }}>Ou Pix Copia e Cola:</p>
            <textarea readOnly value={pixData.pix_copia_cola} className="pix-textarea" />
            <button className="btn-primary" onClick={() => navigator.clipboard.writeText(pixData.pix_copia_cola)}>
              Copiar Código Pix
            </button>
          </div>
        )}

        <button
          className="btn-primary"
          style={{ background: 'var(--text-muted)', marginTop: '10px' }}
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
      {/* 1. APRESENTAÇÃO E CONTATO (GIOVANNA BEAUTY) */}
      <header className="hero-section">
        <p className="hero-badge">✦ Studio de Beleza ✦</p>
        <h1 className="hero-title">Giovanna Beauty</h1>
        <div className="hero-divider"></div>
        <p className="hero-subtitle">Realçando a sua beleza natural com sofisticação e cuidado</p>

        <div className="contact-badges">
          <div className="contact-item">
            <span className="contact-icon">📍</span>
            <p>Rua Ari Carneiro Fernandes, 155<br/><small style={{color: '#999'}}>Jardim dos Francos</small></p>
          </div>

          <div className="contact-item">
            <span className="contact-icon">📱</span>
            <p>WhatsApp:<br/>
              <a
                href="https://wa.me/5511993627584?text=Oi%20Giovanna%2C%20vi%20o%20seu%20cat%C3%A1logo%20no%20site%20e%20gostaria%20de%20tirar%20uma%20d%C3%BAvida..."
                target="_blank"
                rel="noreferrer"
                style={{color: 'var(--text-main)', fontWeight: 'bold', textDecoration: 'none'}}
              >
                (11) 99362-7584
              </a>
            </p>
          </div>

          <div className="contact-item">
            <span className="contact-icon">📸</span>
            <p>Instagram:<br/>
              <a href="https://instagram.com/giovannasoares_beauty" target="_blank" rel="noreferrer" style={{color: 'var(--primary-color)', fontWeight: 'bold', textDecoration: 'none'}}>
                @giovannasoares_beauty
              </a>
            </p>
          </div>
        </div>
      </header>

      {/* CATÁLOGO VISUAL DETALHADO - AGORA COM FOTOS REAIS (PNG) */}
      <h2 className="title" style={{marginTop: '40px'}}>Nosso Catálogo</h2>
      <p style={{textAlign: 'center', color: 'var(--text-muted)', marginBottom: '20px', fontSize: '0.95rem'}}>Clique no card para entender como o procedimento é feito</p>
      
      <section className="catalog-grid">
        
        <div className="catalog-card" onClick={() => setActiveModal('brasileiro')} style={{cursor: 'pointer'}}>
          <img src="/fotos/volume-brasileiro-fio-y.png" alt="Volume Brasileiro Giovanna Beauty" onError={(e) => {e.target.src = "https://images.unsplash.com/photo-1583241800698-e8ab01830a07?q=80&w=600"}} />
          <div className="catalog-card-body">
            <h4>Volume Brasileiro</h4>
            <p style={{fontSize: '0.9rem', color: 'var(--text-muted)'}}>Fio Y</p>
          </div>
        </div>

        <div className="catalog-card" onClick={() => setActiveModal('egipcio')} style={{cursor: 'pointer'}}>
          <img src="/fotos/volume-egipicio-fio-4D.png" alt="Volume Egípcio Giovanna Beauty" onError={(e) => {e.target.src = "https://images.unsplash.com/photo-1512496015851-a90838d54446?q=80&w=600"}} />
          <div className="catalog-card-body">
            <h4>Volume Egípcio</h4>
            <p style={{fontSize: '0.9rem', color: 'var(--text-muted)'}}>Fio 4D</p>
          </div>
        </div>

        <div className="catalog-card" onClick={() => setActiveModal('luxxo')} style={{cursor: 'pointer'}}>
          <img src="/fotos/volume-luxxo-fio-5D.png" alt="Volume Luxxo e Glamour Giovanna Beauty" onError={(e) => {e.target.src = "https://images.unsplash.com/photo-1620052579624-9adfa8ee9c51?q=80&w=600"}} />
          <div className="catalog-card-body">
            <h4>Volume Luxxo / Glamour</h4>
            <p style={{fontSize: '0.9rem', color: 'var(--text-muted)'}}>Fios 5D e 6D</p>
          </div>
        </div>

        <div className="catalog-card" onClick={() => setActiveModal('foxy')} style={{cursor: 'pointer'}}>
          <img src="/fotos/volume-foxxy-eyes.png" alt="Foxy Eyes Giovanna Beauty" onError={(e) => {e.target.src = "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?q=80&w=600"}} />
          <div className="catalog-card-body">
            <h4>Volume Foxy Eyes</h4>
            <p style={{fontSize: '0.9rem', color: 'var(--text-muted)'}}>Curvatura M</p>
          </div>
        </div>

        <div className="catalog-card" onClick={() => setActiveModal('capping')} style={{cursor: 'pointer'}}>
          <img src="/fotos/volume-mega-brasileiro.png" alt="Técnica Capping Giovanna Beauty" onError={(e) => {e.target.src = "https://images.unsplash.com/photo-1515377905703-c4788e51af15?q=80&w=600"}} />
          <div className="catalog-card-body">
            <h4>Técnica Capping</h4>
            <p style={{fontSize: '0.9rem', color: 'var(--text-muted)'}}>Mega Retenção (Sem manutenção)</p>
          </div>
        </div>

        <div className="catalog-card" onClick={() => setActiveModal('sobrancelhas')} style={{cursor: 'pointer'}}>
          <img src="/fotos/brow-lamination.png" alt="Sobrancelhas e Lamination Giovanna Beauty" onError={(e) => {e.target.src = "https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?q=80&w=600"}} />
          <div className="catalog-card-body">
            <h4>Sobrancelhas</h4>
            <p style={{fontSize: '0.9rem', color: 'var(--text-muted)'}}>Lamination, Henna e Design</p>
          </div>
        </div>

      </section>

      {/* 3. REGRAS DE AGENDAMENTO E SINAL (VEIO DEPOIS DO CATÁLOGO) */}
      <section className="info-box">
        <h3>✨ Como funciona o nosso atendimento?</h3>
        <ul>
          <li><strong>Garantia de Horário (Sinal):</strong> Para assegurar sua vaga com organização, solicitamos um pagamento de sinal automático via Pix (R$ 30,00 para Cílios | R$ 15,00 para Sobrancelhas).</li>
          <li><strong>Abatimento do Valor:</strong> O valor do sinal é integralmente descontado do preço do serviço no dia do atendimento.</li>
          <li><strong>Tempo de Procedimento:</strong> Vá com tempo! Cílios demoram de 2h a 3h, e sobrancelhas de 40min a 1h50. Cada minuto faz diferença no resultado.</li>
        </ul>
      </section>

      {/* 4. FORMULÁRIO DE RESERVA */}
      <div className="container" ref={formRef} style={{ marginBottom: '80px' }}>
        <h2 className="title">Agende sua Sessão</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Seu Nome Completo</label>
            <input type="text" name="client_name" required onChange={handleChange} placeholder="Ex: Maria Silva" />
          </div>
          
          <div className="form-group">
            <label>Número do seu WhatsApp</label>
            <input type="tel" name="client_phone" required onChange={handleChange} placeholder="(11) 99999-9999" />
          </div>
          
          <div className="form-group">
            <label>Escolha o Procedimento Comercial</label>
            <select name="service_id" required onChange={handleChange} value={formData.service_id} style={{width:'100%', padding:'14px', borderRadius:'10px', border:'1px solid var(--border-color)'}}>
              <option value="" disabled>Selecione o serviço desejado...</option>
              {services.map(srv => (
                <option key={srv.id} value={srv.id}>
                  [{srv.category ? srv.category.toUpperCase() : 'SERVIÇO'}] {srv.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label>Escolha o Dia</label>
            <input
              type="date"
              name="scheduled_date"
              required
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
              value={formData.scheduled_date}
            />
          </div>

          <div className="form-group">
            <label>Escolha o Horário</label>
            <select name="scheduled_time" required onChange={handleChange} value={formData.scheduled_time}
              style={{width:'100%', padding:'14px', borderRadius:'10px', border:'1px solid var(--border-color)'}}>
              <option value="" disabled>Selecione o horário...</option>
              {timeSlots.map(t => (
                <option key={t} value={t}>
                  {t.replace(':', 'h')}
                </option>
              ))}
            </select>
          </div>
          
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Gerando Pix de Segurança...' : 'Confirmar Horário e Ir para o Pagamento'}
          </button>
        </form>
      </div>

      {/* --- RENDERIZAÇÃO DO MODAL DINÂMICO --- */}
      {activeModal && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setActiveModal(null)}>&times;</button>
            <h3 className="modal-title">{modalDetails[activeModal].title}</h3>
            <p className="modal-text">{modalDetails[activeModal].text}</p>
            <div className="modal-alert">{modalDetails[activeModal].alert}</div>
            <button className="btn-primary" onClick={() => scrollToForm(modalDetails[activeModal].serviceFilter)}>Quero Agendar Esse!</button>
          </div>
        </div>
      )}
    </div>
  );
}