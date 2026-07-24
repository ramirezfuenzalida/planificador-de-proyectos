import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp, Terminal, Home } from 'lucide-react';
import { monitoringService } from '../services/monitoringService';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    // Actualizar el estado para que el siguiente renderizado muestre la interfaz de repuesto.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Registrar el error en Supabase y Sentry
    monitoringService.logError(error, {
      componentName: 'ErrorBoundaryGlobal',
      eventoDisparador: 'error_boundary_react',
      excepcionCausa: errorInfo.componentStack || undefined
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private toggleDetails = () => {
    this.setState((prevState) => ({ showDetails: !prevState.showDetails }));
  };

  public render() {
    if (this.state.hasError) {
      const { error, showDetails } = this.state;
      
      return (
        <div style={styles.container}>
          {/* Fondo decorativo con gradientes orbitales */}
          <div style={styles.bgOrb1}></div>
          <div style={styles.bgOrb2}></div>

          <div style={styles.card}>
            <div style={styles.iconContainer}>
              <AlertTriangle size={48} color="#f59e0b" style={styles.iconAnimation} />
            </div>

            <h1 style={styles.title}>¡Ups! Algo no salió como esperábamos</h1>
            <p style={styles.subtitle}>
              Hemos detectado un fallo inesperado en la aplicación. No te preocupes, el error ha sido reportado automáticamente a nuestro equipo de desarrollo para solucionarlo.
            </p>

            <div style={styles.actions}>
              <button 
                onClick={this.handleReload} 
                style={styles.primaryButton}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(20, 184, 166, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(20, 184, 166, 0.2)';
                }}
              >
                <RefreshCw size={18} style={styles.buttonIcon} />
                Recargar Aplicación
              </button>

              <button 
                onClick={this.handleGoHome} 
                style={styles.secondaryButton}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                }}
              >
                <Home size={18} style={styles.buttonIcon} />
                Ir al Inicio
              </button>
            </div>

            {/* Panel de detalles técnicos */}
            <div style={styles.detailsSection}>
              <button onClick={this.toggleDetails} style={styles.detailsToggle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Terminal size={16} />
                  <span>Información técnica para diagnóstico</span>
                </div>
                {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showDetails && (
                <div style={styles.detailsContent}>
                  <div style={styles.metaRow}>
                    <strong>Error:</strong> {error?.name || 'Error desconocido'}
                  </div>
                  <div style={styles.metaRow}>
                    <strong>Mensaje:</strong> {error?.message || 'Sin mensaje de error'}
                  </div>
                  <div style={styles.metaRow}>
                    <strong>Ruta:</strong> {window.location.pathname}
                  </div>
                  <div style={styles.metaRow}>
                    <strong>Dispositivo / Agente:</strong> {navigator.userAgent}
                  </div>
                  <div style={styles.stackTraceContainer}>
                    <strong>Pila de llamadas:</strong>
                    <pre style={styles.stackTrace}>
                      {error?.stack || 'No hay traza de pila disponible.'}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Estilos premium en linea (Glassmorphism & Orbital gradients)
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100vw',
    height: '100dvh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#090514', // Fondo ultra oscuro
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    position: 'relative',
    overflow: 'hidden',
    padding: '24px',
    boxSizing: 'border-box',
  },
  bgOrb1: {
    position: 'absolute',
    width: '600px',
    height: '600px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(20, 184, 166, 0.15) 0%, rgba(0, 0, 0, 0) 70%)',
    top: '-10%',
    left: '-10%',
    zIndex: 0,
    pointerEvents: 'none',
  },
  bgOrb2: {
    position: 'absolute',
    width: '700px',
    height: '700px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(236, 72, 153, 0.1) 0%, rgba(0, 0, 0, 0) 70%)',
    bottom: '-10%',
    right: '-10%',
    zIndex: 0,
    pointerEvents: 'none',
  },
  card: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: '640px',
    background: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '32px', // Alineado con --radius-card
    padding: '40px',
    boxShadow: '0 24px 64px rgba(0, 0, 0, 0.5)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  iconContainer: {
    width: '80px',
    height: '80px',
    borderRadius: '24px',
    background: 'rgba(245, 158, 11, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '24px',
    border: '1px solid rgba(245, 158, 11, 0.2)',
  },
  iconAnimation: {
    animation: 'pulse 2s infinite',
  },
  title: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: '28px',
    fontWeight: 700,
    color: '#fff',
    marginBottom: '12px',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '15px',
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: '1.6',
    marginBottom: '32px',
    maxWidth: '500px',
  },
  actions: {
    display: 'flex',
    gap: '16px',
    marginBottom: '32px',
    width: '100%',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  primaryButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    background: 'linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '16px', // Alineado con --radius-btn
    padding: '14px 28px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 4px 12px rgba(20, 184, 166, 0.2)',
  },
  secondaryButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    background: 'rgba(255, 255, 255, 0.05)',
    color: 'rgba(255, 255, 255, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px', // Alineado con --radius-btn
    padding: '14px 28px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  buttonIcon: {
    flexShrink: 0,
  },
  detailsSection: {
    width: '100%',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    paddingTop: '20px',
  },
  detailsToggle: {
    width: '100%',
    background: 'none',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '13px',
    cursor: 'pointer',
    padding: '8px 4px',
    transition: 'color 0.2s',
  },
  detailsContent: {
    textAlign: 'left',
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '16px',
    padding: '16px',
    marginTop: '12px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '320px',
    overflowY: 'auto',
  },
  metaRow: {
    fontSize: '13px',
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: '1.4',
    wordBreak: 'break-all',
  },
  stackTraceContainer: {
    marginTop: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  stackTrace: {
    fontFamily: "monospace",
    fontSize: '11px',
    background: 'rgba(0, 0, 0, 0.4)',
    color: '#ef4444',
    padding: '12px',
    borderRadius: '8px',
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    margin: 0,
  },
};
export default ErrorBoundary;
