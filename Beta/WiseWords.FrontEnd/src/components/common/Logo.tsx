import React from 'react';
import { Link } from 'react-router-dom';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    fontSize: '1.8rem',
    lineHeight: 1,
    gap: '0.2rem',
    fontFamily: 'Orbitron, Inter, sans-serif',
    fontWeight: 900,
    letterSpacing: '0.08em'
  },
  bigW: {
    fontSize: '3.2rem',
    lineHeight: 0.7
  },
  accentW: {
    fontSize: '3.2rem',
    lineHeight: 0.7,
    color: 'var(--color-accent)'
  },
  smallLetters: {
    fontSize: '1.35rem',
    marginLeft: '0.1em'
  },
  accentLetters: {
    fontSize: '1.35rem',
    marginLeft: '0.1em',
    color: 'var(--color-text-primary)'
  },
  spacer: {
    width: '0.4rem',
    display: 'inline-block'
  }
} as const;

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className }) => (
  <Link to="/conversations" style={{ textDecoration: 'none' }}>
    <div style={{ ...styles.container, ...(className ? { className } : {}) }}>
      <span className="title-word">
        <span className="big-w" style={styles.bigW}>W</span>
        <span className="small-letters" style={styles.smallLetters}>ISE</span>
      </span>
      <span style={styles.spacer}></span>
      <span className="title-word">
        <span className="big-w" style={styles.accentW}>W</span>
        <span className="small-letters" style={styles.accentLetters}>ORDS</span>
      </span>
    </div>
  </Link>
);
