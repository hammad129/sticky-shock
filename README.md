# Sticky — The Quiet Stage

A browser game for the DreamLayer jam. A stick-figure performer crosses an empty stage. The traps are not marked. Walking slowly makes the audience give them away. Sprinting is how you get through a sandbag, and how you get shocked by everything else.

Open `index.html` in a browser. No install.

## Controls

- Left / right, or A / D: move
- Hold Shift: walk slow enough for a warning
- Space, W, or up: jump. Hold it to jump farther
- R: start the night over
- M: mute

On a phone, the buttons along the bottom do the same jobs.

## What DreamLayer is for

The body stays drawn in code so the jumps and hit boxes stay exact. DreamLayer paints the world around him, which is the part that wants a consistent face and a real stage:

- `assets/poster.png` — the performer, full body, one reference
- `assets/backdrop.png` — the moon-and-city cloth behind the audience
- `assets/portrait.png` — the live-camera face
- `assets/portrait-zap.png` — that same face, shocked, from the portrait

The game already runs without those files. When they are in `assets/`, the backdrop and the live camera pick them up.

Generate them after the jam credits are on the account. This spends 4 credits.

```bash
export DREAMLAYER_API_KEY="dlr_live_..."
node tools/generate-assets.mjs
```

## Itch submission

Playable in the browser. Upload this folder as an HTML project. Suggested text:

> Sticky is a stickman crossing a theater stage wired like a streamer shock game. Plates, wires, trapdoors, and sandbags are invisible until they hit. Walk and the audience warns you. Sprint and they don't. Fewer shocks is a better night.
>
> DreamLayer made the stage cloth and the live-camera face. The same portrait is edited into the shocked take, so the collar cam stays the same person. The body is drawn in code so the collision stays honest.

## Still on you

The jam page asks for an itch.io account, a DreamLayer account, and the credit form. Those need your login. Submissions close October 12.

- Jam: https://itch.io/jam/dreamlayer-jam-1
- DreamLayer: https://platform.dreamlayer.io
- Credit form: https://forms.gle/f7GoK78bp9kEKzck7

Reply to Mackenzie with the itch.io link after you publish.
