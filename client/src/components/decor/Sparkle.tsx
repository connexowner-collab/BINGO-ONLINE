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
    <div
      style={{
        position: 'absolute',
        top,
        left,
        right,
        width,
        height,
        background: '#fff',
        borderRadius: 999,
        opacity,
      }}
    />
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

/** Faixa/banner recortada em ponta, como usada no título "BINGO DO ANTHONY". */
export function RibbonBanner({ children, fontSize = 46 }: { children: string; fontSize?: number }) {
  return (
    <div
      style={{
        background: '#5C8DF2',
        padding: '18px 40px 22px',
        borderRadius: 10,
        clipPath: 'polygon(0 0,100% 0,94% 50%,100% 100%,0 100%,6% 50%)',
        boxShadow: '0 18px 40px rgba(0,0,0,.4)',
      }}
    >
      <div
        className="font-display whitespace-nowrap text-center text-white"
        style={{ fontWeight: 800, fontSize }}
      >
        {children}
      </div>
    </div>
  );
}
