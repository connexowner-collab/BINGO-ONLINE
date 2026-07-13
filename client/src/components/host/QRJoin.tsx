import { QRCodeSVG } from 'qrcode.react';

export function QRJoin({ joinCode }: { joinCode: string }) {
  const url = `${window.location.origin}/play/${joinCode}`;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="rounded-[24px] bg-white p-6 shadow-[0_16px_40px_rgba(0,0,0,.35)]">
        <QRCodeSVG value={url} size={220} />
      </div>
      <p className="text-lg font-bold text-white/75">aponte a câmera e entre</p>
    </div>
  );
}
