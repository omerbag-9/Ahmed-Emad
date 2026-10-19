/**
 * ReactBits Counter: each digit is a column of 0–9 that rolls to its value.
 * The text is in `aria-label` for screen readers; the columns are decoration.
 */
export default function RollingNumber({ value, className }: { value: number; className?: string }) {
  const digits = String(value).split('');
  return (
    <span
      className={className}
      aria-label={String(value)}
      style={{ display: 'inline-flex', height: '1.3em', lineHeight: '1.3em', overflow: 'hidden' }}
    >
      {digits.map((d, i) => (
        <span
          key={digits.length - i}
          aria-hidden
          style={{
            display: 'flex',
            flexDirection: 'column',
            transform: `translateY(-${Number(d) * 1.3}em)`,
            transition: 'transform 560ms cubic-bezier(.16,1,.3,1)',
          }}
        >
          {'0123456789'.split('').map((n) => (
            <span key={n} style={{ height: '1.3em', textAlign: 'center' }}>
              {n}
            </span>
          ))}
        </span>
      ))}
    </span>
  );
}
