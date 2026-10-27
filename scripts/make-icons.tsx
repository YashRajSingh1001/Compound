/**
 * Draws the app icon (gold serif "C" on warm ink) at every size the PWA and
 * iPhone need, and writes the PNGs. Run once, or after changing the design:
 *
 *   npm run icons
 */
import { writeFile } from "node:fs/promises";
import { ImageResponse } from "next/og";

const INK = "#0d0c0a";
const GOLD = "#d8b26e";

// Satori needs a TTF, which Google Fonts serves to user agents that predate woff2.
async function loadSerif(): Promise<ArrayBuffer> {
  const css = await fetch("https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@1", {
    headers: { "User-Agent": "Mozilla/4.0" },
  }).then((r) => r.text());
  const url = css.match(/src:\s*url\(([^)]+)\)/)?.[1];
  if (!url) throw new Error("Couldn't find the Instrument Serif font file");
  return fetch(url).then((r) => r.arrayBuffer());
}

function Icon({ size, padding }: { size: number; padding: number }) {
  // `padding` shrinks the letter for maskable icons, which Android crops to a circle.
  const letter = (size - padding * 2) * 0.86;
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `radial-gradient(circle at 50% 30%, #2a2316 0%, ${INK} 70%)`,
      }}
    >
      <div
        style={{
          fontFamily: "Instrument Serif",
          fontStyle: "italic",
          fontSize: letter,
          lineHeight: 1,
          color: GOLD,
          marginTop: -letter * 0.08,
          marginRight: letter * 0.04,
        }}
      >
        C
      </div>
    </div>
  );
}

async function main() {
  const serif = await loadSerif();
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
      fonts: [{ name: "Instrument Serif", data: serif, style: "italic", weight: 400 }],
    });
    await writeFile(file, Buffer.from(await image.arrayBuffer()));
    console.log(`wrote ${file}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
