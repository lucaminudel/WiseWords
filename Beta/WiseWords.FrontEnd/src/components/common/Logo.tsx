import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Logo.module.css';

interface LogoProps {
  className?: string;
  linkTo?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = '', linkTo = '/conversations' }) => {
  const content = (
    <div className={`${styles.container} ${className}`}>
      <span className={styles.titleWord}>
        <span className={styles.bigW}>W</span>
        <span className={styles.smallLetters}>ISE</span>
      </span>
      <span className={styles.spacer}></span>
      <span className={styles.titleWord}>
        <span className={`${styles.bigW} ${styles.accent}`}>W</span>
        <span className={styles.smallLetters}>ORDS</span>
      </span>
    </div>
  );

  return linkTo ? (
    <Link to={linkTo} className={styles.link}>
      {content}
    </Link>
  ) : (
    content
  );
};
