import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });

    const stderr: string[] = [];
    proc.stderr?.on("data", (chunk: Buffer) => stderr.push(chunk.toString()));

    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg exited with code ${code}\n${stderr.join("")}`));
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to spawn ffmpeg: ${err.message}`));
    });
  });
}

/**
 * Stitches four 8-second segments into a single 32-second mp4.
 *
 * Strategy 1 (fast): concat demuxer with stream-copy — no re-encode.
 * Strategy 2 (fallback): filter_complex concat with re-encode to h264/aac.
 */
export async function stitch(segmentPaths: string[], outPath: string): Promise<void> {
  if (segmentPaths.length !== 4) {
    throw new Error(`Expected 4 segment paths, got ${segmentPaths.length}`);
  }

  const listPath = join(outPath, "..", "concat_list.txt");
  const listContent = segmentPaths.map((p) => `file '${p}'`).join("\n");
  await writeFile(listPath, listContent, "utf8");

  console.log("[stitch] Trying stream-copy concat (fast)…");
  try {
    await runFfmpeg([
      "-y",
      "-f", "concat",
      "-safe", "0",
      "-i", listPath,
      "-c", "copy",
      outPath,
    ]);
    console.log(`[stitch] Done (stream-copy): ${outPath}`);
    return;
  } catch (err) {
    console.warn("[stitch] Stream-copy failed, falling back to re-encode…", err);
  }

  // Fallback: re-encode via filter_complex concat
  const inputs = segmentPaths.flatMap((p) => ["-i", p]);
  const filterParts = segmentPaths.map((_, i) => `[${i}:v][${i}:a]`).join("");
  const filterComplex = `${filterParts}concat=n=${segmentPaths.length}:v=1:a=1[v][a]`;

  await runFfmpeg([
    "-y",
    ...inputs,
    "-filter_complex", filterComplex,
    "-map", "[v]",
    "-map", "[a]",
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "22",
    "-c:a", "aac",
    "-b:a", "192k",
    "-movflags", "+faststart",
    outPath,
  ]);
  console.log(`[stitch] Done (re-encode): ${outPath}`);
}
