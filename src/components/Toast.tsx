import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, X, AlertCircle } from 'lucide-react';

interface ToastProps {
  message: string | null;
  onClose: () => void;
  type?: 'success' | 'error';
}

const Toast: React.FC<ToastProps> = ({ message, onClose, type = 'success' }) => {
  const isSuccess = type === 'success';

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 80, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8, y: 40, transition: { duration: 0.2 } }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="glossy-toast-overlay"
          style={{ zIndex: 99999 }}
        >
          <div 
            className="glossy-toast"
            style={{
              background: isSuccess ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.85) 0%, rgba(4, 120, 87, 0.95) 100%)' : 'linear-gradient(135deg, rgba(239, 68, 68, 0.85) 0%, rgba(185, 28, 28, 0.95) 100%)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.4)',
              borderTop: '1px solid rgba(255,255,255,0.8)',
              boxShadow: isSuccess ? '0 25px 50px -12px rgba(16, 185, 129, 0.6), inset 0 1px 0 rgba(255,255,255,0.5)' : '0 25px 50px -12px rgba(239, 68, 68, 0.6), inset 0 1px 0 rgba(255,255,255,0.5)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              flexDirection: 'row',
              gap: '1.25rem',
              padding: '1.25rem 2.5rem',
              borderRadius: '9999px',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            {/* Top Shine Element for Glass Effect */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '50%',
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.3) 0%, transparent 100%)',
              pointerEvents: 'none'
            }} />

            <motion.div 
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.15 }}
              style={{
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '50%',
                padding: '0.6rem',
                display: 'flex',
                boxShadow: '0 0 20px rgba(255,255,255,0.4)',
                zIndex: 1
              }}
            >
              {isSuccess ? <CheckCircle2 size={32} color="#ffffff" strokeWidth={2.5} /> : <AlertCircle size={32} color="#ffffff" strokeWidth={2.5} />}
            </motion.div>
            
            <div style={{ display: 'flex', flexDirection: 'column', zIndex: 1 }}>
              <span className="toast-text" style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                {message}
              </span>
            </div>

            <motion.button 
              whileHover={{ scale: 1.1, background: 'rgba(255,255,255,0.25)' }}
              whileTap={{ scale: 0.9 }}
              className="toast-close-btn" 
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '50%',
                padding: '0.4rem',
                cursor: 'pointer',
                display: 'flex',
                color: '#ffffff',
                marginLeft: '1rem',
                zIndex: 1,
                transition: 'background 0.2s'
              }}
            >
              <X size={20} strokeWidth={2.5} />
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;
