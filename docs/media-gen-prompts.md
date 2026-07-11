# Media-gen prompts — sportscardsnearme.ca (Refractor brand)

Ready-to-run prompts for Nathan's media-gen pipeline (`~/Projects/10-AI-Consulting/website-bridge/spec-builds/_tools/media-gen.sh`).
Requires AI Chrome running and signed in. Every image gets graded into the Refractor palette:
ink-blue night shadows (#0B1017), cool paper highlights, one thin iridescent foil glint. No gold-on-black.

Run from the repo root; `--into public/images --role <name>` drops optimized webp files where the site expects them.

## Homepage hero

```bash
~/Projects/10-AI-Consulting/website-bridge/spec-builds/_tools/media-gen.sh image \
  --role hero \
  --scene "interior of a small sports card shop at night, glass display counter glowing from within, graded card slabs catching a violet-blue light, shallow depth of field, one thin iridescent rainbow reflection across the glass, moody ink-blue shadows, cinematic, no people, no readable text or logos" \
  --into public/images
```

## City-page header template (swap the city line per run)

```bash
~/Projects/10-AI-Consulting/website-bridge/spec-builds/_tools/media-gen.sh image \
  --role city-generic \
  --scene "aerial view of a Canadian prairie city at night from a low angle, street grid glowing like a circuit board in ink-blue and slate tones, tiny warm window lights, one subtle iridescent light streak on the horizon, stylized, cinematic, no text" \
  --into public/images
```

(One shared night-city header is enough for launch; per-city variants are a later nicety — 19 runs of this template with "downtown Calgary skyline silhouette", "Edmonton river valley silhouette", etc.)

## Guide covers (Plan 4 — five runs)

Template:

```bash
~/Projects/10-AI-Consulting/website-bridge/spec-builds/_tools/media-gen.sh image \
  --role guide-<slug> \
  --scene "<SCENE>, ink-blue night palette, one thin iridescent foil glint, cinematic still life, no readable text" \
  --into public/images
```

Scenes:
1. `guide-best-alberta` — "a wooden table at a card show, cracked-open wax pack spilling cards toward the camera, collectors' hands blurred in the background"
2. `guide-psa-submissions` — "a neat stack of graded card slabs beside a shipping box and packing tape, desk lamp pooling light"
3. `guide-first-card-show` — "wide shot of a community-hall card show from the entrance, tables receding into the dark, one aisle lit"
4. `guide-selling-your-collection` — "an open binder of vintage hockey cards under a magnifying loupe, one card lifted mid-turn"
5. `guide-grading-101` — "a raw card and a slabbed card side by side on dark felt, dramatic side lighting"

## Notes

- Social-share cards (per city/store) are drawn in code at build time — not media-gen jobs.
- After generating: review each image at 375px width for legibility as a background (text sits on top).
- The `--role` name becomes the webp filename; Plan 4's tasks wire them into the pages.
