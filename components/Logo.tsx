type LogoProps = {
  /** Affiche uniquement l'icône, sans le texte "LifEase" (ex: favicon, espace restreint) */
  iconOnly?: boolean;
  size?: number;
  className?: string;
};

export function Logo({ iconOnly = false, size = 34, className = "" }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 34 34"
        role="img"
        aria-label="LifEase"
      >
        <path
          d="M17 2C10.4 2 5 7.4 5 14c0 9 12 18 12 18s12-9 12-18c0-6.6-5.4-12-12-12z"
          className="fill-wine-600"
        />
        <path
          d="M17 9c-3 0-4.5 2.2-4.5 4.3 0 1.6 1 2.7 2.3 3.6-1.6.3-3 1.3-3 3.1h2c0-1.2 1.3-1.8 3.2-1.8s3.2.6 3.2 1.8h2c0-1.8-1.4-2.8-3-3.1 1.3-.9 2.3-2 2.3-3.6C21.5 11.2 20 9 17 9z"
          fill="#fff"
        />
      </svg>
      {!iconOnly && (
        <span className="text-xl font-medium tracking-tight text-wine-600">
          LifEase
        </span>
      )}
    </div>
  );
}
