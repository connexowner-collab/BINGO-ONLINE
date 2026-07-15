// Elementos decorativos do documento de identidade visual (nuvens + estrelas
// recortadas via clip-path). Usados só no lobby e nas telas de celebração —
// nunca no painel de jogo em andamento (regra do próprio documento).

const STAR_CLIP =
  'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';

export function Star({
  top,
  left,
  right,
  size,
  opacity = 0.6,
  color = '#FBC259',
}: {
  top: number;
  left?: number;
  right?: number;
  size: number;
  opacity?: number;
  color?: string;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left,
        right,
        width: size,
        height: size,
        background: color,
        opacity,
        clipPath: STAR_CLIP,
      }}
    />
  );
}

export function Cloud({
  top,
  left,
  right,
  width,
  height,
  opacity = 0.75,
}: {
  top: number;
  left?: number;
  right?: number;
  width: number;
  height: number;
  opacity?: number;
}) {
  return (
    <img
      src="/decor/cloud.png"
      alt=""
      style={{
        position: 'absolute',
        top,
        left,
        right,
        width,
        height,
        objectFit: 'contain',
        opacity,
      }}
    />
  );
}

type CloudSpec = { top: number; left?: number; right?: number; width: number; height: number; opacity?: number };

// Céu com várias nuvens espalhadas (em vez de só 2 cantos) — mistura de
// tamanhos/opacidades pra dar profundidade, como no papel de parede de
// referência. Usado em todas as telas com fundo azul do documento de
// identidade visual.
const CLOUD_FIELD: CloudSpec[] = [
  { top: 10, left: -60, width: 340, height: 110, opacity: 0.85 },
  { top: 30, right: -70, width: 300, height: 100, opacity: 0.75 },
  { top: 130, left: 60, width: 170, height: 56, opacity: 0.5 },
  { top: 170, right: 90, width: 190, height: 62, opacity: 0.45 },
  { top: 250, left: -40, width: 220, height: 72, opacity: 0.55 },
  { top: 300, right: -50, width: 240, height: 78, opacity: 0.5 },
  { top: 380, left: 220, width: 150, height: 50, opacity: 0.35 },
  { top: 420, right: 200, width: 160, height: 52, opacity: 0.3 },
];

/** Espalha várias <Cloud> pelo fundo azul da tela em vez de só duas nos cantos. */
export function CloudField() {
  return (
    <>
      {CLOUD_FIELD.map((c, i) => (
        <Cloud key={i} {...c} />
      ))}
    </>
  );
}

/** Bola sorteada como "objeto físico": gradiente radial + brilho de topo + sombra projetada. */
export function SignatureBall({ letter, number, size }: { letter: string; number: number; size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: 'radial-gradient(circle at 32% 28%, #FFDB8A 0%, #F5A623 45%, #C97F12 100%)',
        boxShadow:
          '0 30px 60px rgba(0,0,0,.5), inset 0 -14px 30px rgba(0,0,0,.25), inset 0 10px 20px rgba(255,255,255,.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <div
        className="font-display"
        style={{ fontWeight: 800, fontSize: size * 0.34, color: '#201B3B', letterSpacing: -1 }}
      >
        {letter}
        {number}
      </div>
    </div>
  );
}

/**
 * Faixa/banner recortada em ponta, como usada no título "BINGO DO ANTHONY".
 * `variant="toy"` imita o logo de brinquedo enviado como referência (letras
 * amarelas com contorno grosso azul + sombra, sobre uma faixa vermelha).
 */
export function RibbonBanner({
  children,
  fontSize = 46,
  wrap = false,
  variant = 'default',
}: {
  children: string;
  fontSize?: number;
  wrap?: boolean;
  variant?: 'default' | 'toy';
}) {
  const isToy = variant === 'toy';
  return (
    <div
      style={{
        background: isToy ? '#D93B2B' : '#5C8DF2',
        padding: '18px 40px 22px',
        borderRadius: 10,
        clipPath: 'polygon(0 0,100% 0,94% 50%,100% 100%,0 100%,6% 50%)',
        boxShadow: '0 18px 40px rgba(0,0,0,.4)',
        maxWidth: wrap ? 320 : undefined,
      }}
    >
      <div
        className={`font-display text-center ${wrap ? '' : 'whitespace-nowrap'} ${isToy ? '' : 'text-white'}`}
        style={{
          fontWeight: 800,
          fontSize,
          textWrap: wrap ? 'balance' : undefined,
          ...(isToy
            ? {
                color: '#FFD23F',
                WebkitTextStroke: `${Math.max(2, fontSize * 0.06)}px #1E4FA0`,
                paintOrder: 'stroke fill',
                textShadow: '0 4px 0 rgba(0,0,0,.3)',
              }
            : {}),
        }}
      >
        {children}
      </div>
    </div>
  );
}
