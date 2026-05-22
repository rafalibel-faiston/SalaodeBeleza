import { useState } from 'react';
import api from '../api/client';

export default function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login/', { password });
      const token = res.data.access_token;
      sessionStorage.setItem('admin_token', token);
      onLogin(token);
    } catch (err) {
      setError(
        err.response?.status === 401
          ? 'Senha incorreta. Tente novamente.'
          : 'Não foi possível conectar ao servidor. Aguarde e tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '20px',
        boxShadow: '0 8px 40px rgba(216,67,139,0.15)',
        padding: '40px 36px',
        width: '100%',
        maxWidth: '380px',
        textAlign: 'center',
      }}>
        {/* Logo / título */}
        <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>✨</div>
        <h1 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          background: 'linear-gradient(135deg, #a0195e 0%, #d8438b 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontSize: '1.8rem',
          margin: '0 0 4px',
        }}>
          Giovanna Soares
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '30px' }}>
          Painel de Gerenciamento
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ textAlign: 'left', marginBottom: '16px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
              Senha de acesso
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoFocus
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '12px',
                border: error ? '2px solid #dc2626' : '1.5px solid var(--border-color)',
                fontSize: '1rem',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => { if (!error) e.target.style.borderColor = 'var(--primary-color)'; }}
              onBlur={e => { if (!error) e.target.style.borderColor = 'var(--border-color)'; }}
            />
          </div>

          {error && (
            <div style={{
              background: '#fee2e2', color: '#dc2626',
              padding: '10px 14px', borderRadius: '8px',
              fontSize: '0.85rem', marginBottom: '16px', textAlign: 'left',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading
                ? '#f0a0c4'
                : 'linear-gradient(135deg, #a0195e 0%, #d8438b 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? 'Entrando...' : 'Entrar no painel'}
          </button>
        </form>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '20px' }}>
          🔒 Acesso restrito — somente Giovanna
        </p>
      </div>
    </div>
  );
}
