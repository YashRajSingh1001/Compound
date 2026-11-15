import { writeFile } from "node:fs/promises";
import { ImageResponse } from "next/og";

const ACCENT = "#c2410c";
const PAPER = "#fbfaf7";

async function loadFont(): Promise<ArrayBuffer> {
  const css = await fetch("https://fonts.googleapis.com/css2?family=Jost:wght@600", {
    headers: { "User-Agent": "Mozilla/4.0" },
  }).then((r) => r.text());
  const url = css.match(/src:\s*url\(([^)]+)\)/)?.[1];
  if (!url) throw new Error("Couldn't find the Jost font file");
  return fetch(url).then((r) => r.arrayBuffer());
}

function Icon({ size, padding }: { size: number; padding: number }) {
  const letter = (size - padding * 2) * 0.78;
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: ACCENT,
      }}
    >
      <div style={{ fontFamily: "Jost", fontWeight: 600, fontSize: letter, lineHeight: 1, color: PAPER, marginTop: -letter * 0.06 }}>
        C
      </div>
    </div>
  );
}

async function main() {
  const font = await loadFont();
  const outputs: { file: string; size: number; padding?: number }[] = [
    { file: "public/icon-192.png", size: 192 },
    { file: "public/icon-512.png", size: 512 },
    { file: "public/icon-maskable-512.png", size: 512, padding: 64 },
    { file: "app/apple-icon.png", size: 180 },
    { file: "app/icon.png", size: 64 },
  ];
  for (const { file, size, padding = 0 } of outputs) {
    const image = new ImageResponse(<Icon size={size} padding={padding} />, {
      width: size,
      height: size,
      fonts: [{ name: "Jost", data: font, style: "normal", weight: 600 }],
    });
    await writeFile(file, Buffer.from(await image.arrayBuffer()));
    console.log(`wrote ${file}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
