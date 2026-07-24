import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { iniciarSesion, recuperarContrasena, traducirError } from '../services/authService';
import { Lock, Mail, Eye, EyeOff, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: unknown) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [aviso, setAviso]       = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAviso(null);
    if (!email.trim() || !password) { setError('Completa todos los campos.'); return; }
    setLoading(true);
    try {
      const user = await iniciarSesion(email, password);
      onLoginSuccess(user);
    } catch (err: any) {
      setError(traducirError(err?.code ?? ''));
    } finally {
      setLoading(false);
    }
  };

  const handleRecuperar = async () => {
    setError(null);
    setAviso(null);
    if (!email.trim()) { setError('Escribe tu correo para enviarte el enlace.'); return; }
    setLoading(true);
    try {
      await recuperarContrasena(email);
      setAviso('Te enviamos un enlace para restablecer tu contraseña. Revisa tu correo.');
    } catch (err: any) {
      setError(traducirError(err?.code ?? ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', fontFamily: "'Inter', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── FONDO 4K UNIVERSO CON MOVIMIENTO ── */
        .lv-bg {
          position: absolute;
          inset: -8%;
          background-image: url('https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=3840&q=100&fit=crop');
          background-size: cover;
          background-position: center;
          animation: lv-drift 40s ease-in-out infinite alternate;
          filter: brightness(0.8) saturate(1.3) contrast(1.05);
          will-change: transform;
        }
        @keyframes lv-drift {
          0%   { transform: scale(1.08) translate(0%, 0%); }
          25%  { transform: scale(1.1)  translate(-1.5%, 1%); }
          50%  { transform: scale(1.09) translate(1%, -1.5%); }
          75%  { transform: scale(1.11) translate(-0.5%, 1.5%); }
          100% { transform: scale(1.1)  translate(1.5%, -0.5%); }
        }

        /* ── VELO CENTRAL PARA LEGIBILIDAD ── */
        .lv-veil {
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 60% 80% at 50% 50%, rgba(6,2,20,0.25) 0%, rgba(6,2,20,0.55) 100%);
        }

        /* ── CARD GLASSMORPHIC CON GLOSS ── */
        .lv-card {
          position: relative; z-index: 10;
          width: 100%; max-width: 490px;
          margin: 20px;
          border-radius: 28px;
          padding: 60px 54px 52px;
          /* Gloss base with rich teal/cyan tones */
          background:
            linear-gradient(
              135deg,
              rgba(255, 255, 255, 0.12) 0%,
              rgba(13, 148, 136, 0.08) 30%,
              rgba(15, 118, 110, 0.15) 60%,
              rgba(12, 6, 26, 0.85) 100%
            );
          backdrop-filter: blur(40px) saturate(200%) brightness(1.05);
          -webkit-backdrop-filter: blur(40px) saturate(200%) brightness(1.05);
          border: 1px solid rgba(13, 148, 136, 0.2);
          border-top: 1px solid rgba(165, 243, 252, 0.35);
          border-left: 1px solid rgba(13, 148, 136, 0.22);
          box-shadow:
            0 48px 96px rgba(0,0,0,0.75),
            0 0 0 1px rgba(255,255,255,0.04) inset,
            inset 0 1px 0 rgba(255,255,255,0.18),
            0 0 80px rgba(13, 148, 136, 0.22);
          overflow: hidden;
        }

        /* Gloss highlight top sweep */
        .lv-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 55%;
          background: linear-gradient(
            180deg,
            rgba(255,255,255,0.08) 0%,
            rgba(13, 148, 136, 0.03) 60%,
            transparent 100%
          );
          border-radius: 26px 26px 0 0;
          pointer-events: none;
        }

        /* Shimmer line top */
        .lv-card::after {
          content: '';
          position: absolute;
          top: 0; left: 15%; right: 15%; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(13, 148, 136, 0.8), transparent);
        }

        /* ── APP ICON ── */
        .lv-icon-wrap {
          width: 108px; height: 108px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 28px;
          background: rgba(6, 3, 18, 0.5);
          border: 2px solid rgba(255,255,255,0.18);
          box-shadow:
            0 8px 32px rgba(0,0,0,0.5),
            0 0 0 6px rgba(255,255,255,0.04),
            0 0 50px rgba(251,191,36,0.18),
            inset 0 2px 0 rgba(255,255,255,0.22);
          overflow: hidden;
          padding: 0;
          animation: icon-float 6s ease-in-out infinite;
        }
        @keyframes icon-float {
          0%,100% { transform: translateY(0px);  box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 6px rgba(255,255,255,0.04), 0 0 50px rgba(251,191,36,0.18), inset 0 2px 0 rgba(255,255,255,0.22); }
          50%      { transform: translateY(-6px); box-shadow: 0 18px 48px rgba(0,0,0,0.6), 0 0 0 6px rgba(255,255,255,0.06), 0 0 72px rgba(251,191,36,0.28), inset 0 2px 0 rgba(255,255,255,0.22); }
        }
        .lv-icon-wrap img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }

        /* ── TEXTS ── */
        .lv-title {
          font-family: 'Outfit', sans-serif;
          font-size: 1.5rem; font-weight: 800;
          color: #fff; text-align: center;
          letter-spacing: -0.02em; margin-bottom: 5px;
        }
        .lv-title span {
          background: linear-gradient(135deg, #FFE082, #fbbf24 50%, #f59e0b);
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .lv-sub {
          text-align: center; font-size: 0.72rem;
          color: rgba(255,255,255,0.3); font-weight: 500;
          letter-spacing: 0.08em; text-transform: uppercase;
          margin-bottom: 38px;
        }

        /* ── ERROR ── */
        .lv-error {
          display: flex; align-items: center; gap: 8px;
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 10px; padding: 10px 12px;
          color: #fca5a5; font-size: 0.78rem;
          font-weight: 500; margin-bottom: 14px;
          overflow: hidden;
        }

        /* ── FORM ── */
        .lv-form { display: flex; flex-direction: column; gap: 13px; }

        /* Input wrap */
        .lv-iw { position: relative; }
        .lv-ico {
          position: absolute; left: 14px; top: 50%;
          transform: translateY(-50%);
          color: rgba(255,255,255,0.22); pointer-events: none;
          transition: color 0.22s;
        }
        .lv-iw:focus-within .lv-ico { color: rgba(251,191,36,0.75); }

        /* Input con gloss */
        .lv-in {
          width: 100%;
          background: linear-gradient(
            145deg,
            rgba(255,255,255,0.08) 0%,
            rgba(255,255,255,0.03) 100%
          );
          border: 1px solid rgba(255,255,255,0.11);
          border-top: 1px solid rgba(255,255,255,0.18);
          border-radius: 13px;
          padding: 13px 44px;
          font-size: 0.875rem; font-family: 'Inter', sans-serif;
          color: #fff; outline: none;
          transition: all 0.22s cubic-bezier(0.16,1,0.3,1);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.1);
        }
        .lv-in::placeholder { color: rgba(255,255,255,0.18); }
        .lv-in:focus {
          border-color: rgba(251,191,36,0.4);
          border-top-color: rgba(251,191,36,0.5);
          background: linear-gradient(145deg, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.05) 100%);
          box-shadow:
            0 0 0 3px rgba(251,191,36,0.08),
            inset 0 1px 0 rgba(255,255,255,0.15);
        }

        /* Eye */
        .lv-eye {
          position: absolute; right: 13px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none;
          color: rgba(255,255,255,0.22); cursor: pointer;
          display: flex; align-items: center; padding: 4px;
          border-radius: 6px; transition: color 0.2s;
        }
        .lv-eye:hover { color: rgba(255,255,255,0.55); }

        /* ── BUTTON ── */
        .lv-btn {
          width: 100%; border: none; border-radius: 13px;
          padding: 14px; cursor: pointer; margin-top: 4px;
          background: linear-gradient(135deg, #ffe082 0%, #fbbf24 45%, #f59e0b 100%);
          color: #0c0822; font-weight: 800; font-size: 0.88rem;
          font-family: 'Inter', sans-serif;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: all 0.22s cubic-bezier(0.16,1,0.3,1);
          box-shadow: 0 6px 28px rgba(245,158,11,0.32);
          position: relative; overflow: hidden;
          letter-spacing: 0.01em;
        }
        /* Gloss on button */
        .lv-btn::before {
          content: ''; position: absolute;
          top: 0; left: 0; right: 0; height: 50%;
          background: linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 100%);
          border-radius: 13px 13px 0 0;
        }
        .lv-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(245,158,11,0.45);
          background: linear-gradient(135deg, #fff3b0 0%, #fcd34d 45%, #f59e0b 100%);
        }
        .lv-btn:active:not(:disabled) { transform: translateY(0px); }
        .lv-btn:disabled { opacity: 0.38; cursor: not-allowed; transform: none; box-shadow: none; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .lv-spin { animation: spin 0.85s linear infinite; }

        /* Footer */
        .lv-footer {
          text-align: center; margin-top: 28px;
          font-size: 0.65rem; color: rgba(255,255,255,0.12);
          font-weight: 500; letter-spacing: 0.05em;
        }
      `}</style>

      {/* ── FONDO 4K CON MOVIMIENTO ── */}
      <div className="lv-bg" />
      <div className="lv-veil" />

      {/* ── CARD ── */}
      <motion.div
        className="lv-card"
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* App icon */}
        <div className="lv-icon-wrap">
          <img src="/zenit_app_icon.png" alt="ZenitApp" />
        </div>

        {/* Title */}
        <h1 className="lv-title">Liceo Bicentenario <span>William Taylor</span></h1>
        <p className="lv-sub">ZenitApp · Portal Docente · Seguimiento de Proyectos</p>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="lv-error"
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
            >
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </motion.div>
          )}
          {aviso && (
            <motion.div
              className="lv-error"
              style={{
                background: 'rgba(16,185,129,0.1)',
                borderColor: 'rgba(16,185,129,0.2)',
                color: '#6ee7b7',
              }}
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
            >
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span>{aviso}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form className="lv-form" onSubmit={handleLogin}>
          <div className="lv-iw">
            <Mail size={15} className="lv-ico" />
            <input
              type="email"
              placeholder="correo@cmwt.cl"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="lv-in"
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div className="lv-iw">
            <Lock size={15} className="lv-ico" />
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="lv-in"
              disabled={loading}
              autoComplete="current-password"
              style={{ letterSpacing: showPw ? 'normal' : '0.12em' }}
            />
            <button type="button" className="lv-eye" onClick={() => setShowPw(!showPw)}>
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          <button type="submit" className="lv-btn" disabled={loading}>
            {loading
              ? <><RefreshCw size={14} className="lv-spin" /><span>Verificando...</span></>
              : <><span>Ingresar</span><ArrowRight size={15} /></>
            }
          </button>
        </form>

        <button
          type="button"
          onClick={handleRecuperar}
          disabled={loading}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(251,191,36,0.75)', fontSize: '0.75rem',
            fontFamily: "'Inter', sans-serif", fontWeight: 600,
            marginTop: 14, width: '100%', textAlign: 'center',
          }}
        >
          ¿Olvidaste tu contraseña?
        </button>

        <div className="lv-footer">© 2026 Liceo Bicentenario William Taylor</div>
      </motion.div>
    </div>
  );
}
