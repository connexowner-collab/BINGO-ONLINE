import { QRCodeSVG } from 'qrcode.react';

export function QRJoin({ joinCode }: { joinCode: string }) {
  const url = `${window.location.origin}/play/${joinCode}`;

  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4">
      <QRCodeSVG value={url} size={128} />
      <p className="font-display text-sm font-bold text-bingoNavy">Entre em:</p>
      <p className="text-sm text-bingoNavy/80">{url.replace(/^https?:\/\//, '')}</p>
    </div>
  );
}
