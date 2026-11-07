# Official KhyatiGems Companion assets

All 22 supplied transparent PNGs and the thinking MP4 from
`C:/Users/akans/Downloads/ERP Avatar/bgeraser_results` are integrated.
The original downloads are unchanged. No new character was generated.

## Active library

The active catalog is `scripts/companion-asset-map.json`. Every supplied image has its
own named pose; the manifest records source filename, SHA-256, source dimensions and
crop bounds. The production library is `public/companion/khyati`:

- 22 poses, each at 128, 256 and 512 pixels, in transparent WebP (66 images).
- Portrait and full-body alternatives, plus greetings, waves, celebrating, twirling,
  standing ready, explaining, laptop work and resting on the chaise.
- A silent 360 x 640 thinking MP4, with fast-start metadata and a static poster.
- An active version-2 manifest. No absolute Downloads paths are used at runtime.

**Settings > ERP Companion** and **Companion > Style** offer a portrait/full-body
choice and all 22 pose previews. Previewing a pose does not override business states
or claim a business operation succeeded. Legacy character preference IDs remain
compatible; they now render the same official KhyatiGems character.

## Live state mapping

| Application state | Portrait | Full-body view |
| --- | --- | --- |
| Idle | Relaxed portrait | Standing at ease |
| Greeting | Greeting portrait | Waving |
| Hover/focus greeting | Gentle welcome | Waving |
| Open tools, ready | Welcoming gesture | Ready to help |
| Speaking/update | Speaking | Explaining |
| Processing feedback | Working at laptop | Working at laptop |
| Workday query in flight | Thinking | Thinking standing |
| Success | Confident success | Celebrating |
| Happy | Happy portrait | Happy twirl |
| Warning/concern | Concerned | Concerned standing |
| Urgent alert | Attention | Concerned standing |
| Quiet, Rest or inactivity | Quiet rest | Resting on chaise |

The additional warm-welcome pose and all variations are available in the preview
library. Source poses are never swapped randomly on a timer. Existing short manual
hover reactions remain, while processing, notifications and quiet states take priority.

## Framing and image checks

The 20 landscape exports contain substantial transparent margins and faint remnants
from background removal at the canvas border. The two larger welcome portraits have
different canvas dimensions. The preparation script locates confident foreground alpha,
keeps padding for hair/jewellery edges, removes unused export margins and fits each
complete pose into a shared square stage without stretching or repainting it.
A seated pose keeps the entire chaise; full-body poses keep hands, skirts and feet.

The resulting 66 variants total approximately 1.57 MB. Only the current state and visible
lazy gallery thumbnails load; this is not a single 1.57 MB sprite sheet. Production
image checks verify real transparency, visible subject occupancy and readable framing.
Identity and visual quality were checked against the supplied reference and contact sheets.

## Thinking video

The supplied MP4 is approximately 3.03 seconds, 720 x 1280, with an opaque illustrated
background and an audio track. It is a supplementary supplied animation, not a transparent
avatar or a Rive rig. It stays in a rounded framed card so its background never becomes
a rectangular floating overlay on ERP controls. The persistent avatar keeps the transparent
thinking PNG during processing.

The optimized copy is about 101 KB. Its audio track is removed. Playback is muted,
inline and allowed only while a Workday query is in flight, or during explicit manual
preview. It stops when processing ends, the panel closes, the card scrolls out of view,
the browser tab hides, Quiet/Rest applies, animations are disabled or reduced motion
is requested. A poster remains in place when animation is suppressed or playback fails.
No processing animation claims that a business operation has completed.

## Rebuilding assets

The originals do not need renaming. Run from the repository, using an available FFmpeg
executable for the optional video preparation step:

```powershell
node scripts/prepare-companion-assets.mjs --input "C:\Users\akans\Downloads\ERP Avatar\bgeraser_results" --ffmpeg "C:\path\to\ffmpeg.exe"
```

The script checks every PNG before encoding, preserves alpha, writes all optimized
variants, strips video audio/metadata, then activates the manifest only after success.
No FFmpeg or media-processing package is added to the ERP runtime. A build-only FFmpeg
copy was used from the ignored local review folder.

## Rive

The supplied PNGs and MP4 do not contain a Rive rig. The active implementation uses
static expressions, finite CSS responses and the supplied video. A future authored
`.riv` can use the same state mapping and retain these same-character static fallbacks.
No Rive dependency or simulated lip sync has been introduced.
