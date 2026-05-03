import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, X } from 'lucide-react';

interface ToastProps {
  message: string | null;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 1, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 1, scale: 0.9, transition: { duration: 0.2 } }}
          className="glossy-toast-overlay"
        >
          <div className="glossy-toast">
            <CheckCircle2 size={20} className="text-emerald-400" />
            <span className="toast-text">{message}</span>
            <button className="toast-close-btn" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;
