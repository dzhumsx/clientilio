import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface LogoProps {
  size?: number;
  showText?: boolean;
  textSize?: string;
  badge?: string;
  useFullImageInDark?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const LogoIcon: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({
  size = 26,
  className,
  style,
}) => {
  return (
    <img
      src="/marketivio-logo.png"
      alt="Marketiv.io"
      className={className}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        objectFit: 'contain',
        display: 'inline-block',
        verticalAlign: 'middle',
        filter: 'drop-shadow(0 0 10px rgba(5, 150, 105, 0.25))',
        ...style,
      }}
    />
  );
};

export const Logo: React.FC<LogoProps> = ({
  size = 26,
  showText = true,
  textSize = '16px',
  badge,
  useFullImageInDark = false,
  className,
  style,
}) => {
  const { theme } = useTheme();

  // If useFullImageInDark is enabled and we are in dark mode, we can show marketivio-texdt.png
  if (useFullImageInDark && theme === 'dark' && showText) {
    return (
      <div
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          ...style,
        }}
      >
        <img
          src="/marketivio-texdt.png"
          alt="Marketiv.io"
          style={{
            height: `${size + 4}px`,
            width: 'auto',
            objectFit: 'contain',
            display: 'block',
          }}
        />
        {badge && (
          <span
            className="eyebrow"
            style={{
              fontSize: '9px',
              color: 'var(--accent-primary)',
              background: 'var(--accent-subtle)',
              padding: '1px 6px',
              borderRadius: '4px',
              border: '1px solid var(--accent-border)',
              letterSpacing: '0.04em',
            }}
          >
            {badge}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.6rem',
        ...style,
      }}
    >
      <LogoIcon size={size} />

      {showText && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.45rem' }}>
          <span
            style={{
              fontSize: textSize,
              fontWeight: 700,
              letterSpacing: '-0.035em',
              color: 'var(--text-primary)',
              display: 'inline-flex',
              alignItems: 'baseline',
            }}
          >
            marketiv
            <span
              style={{
                color: 'var(--accent-primary)',
                fontWeight: 700,
              }}
            >
              .io
            </span>
          </span>

          {badge && (
            <span
              className="eyebrow"
              style={{
                fontSize: '9px',
                color: 'var(--accent-primary)',
                background: 'var(--accent-subtle)',
                padding: '1px 6px',
                borderRadius: '4px',
                border: '1px solid var(--accent-border)',
                letterSpacing: '0.04em',
              }}
            >
              {badge}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
