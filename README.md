# SIGNOVA

Sign language translator for the classroom. A deaf student signs to the camera and the teacher reads the words. The teacher answers out loud, and an avatar signs the reply back in Georgian Sign Language (GESL).

**Live demo:** https://antony-x.github.io/signova/ (open it on a phone or laptop and allow the camera and microphone)

## The demo conversation

1. **The student signs:** “შეგიძლიათ რომ ეს ამოცანა ამიხსნათ?” (Can you explain this problem to me?)
   The camera tracks the body (33 points) and both hands (21 points each) live with MediaPipe. The words appear as the hands move.
2. **The teacher answers by voice:** “რომელი ნაბიჯი ვერ გაიგე?” (Which step didn’t you understand?)
   A live microphone meter runs and the words appear as the teacher speaks.
3. **The student watches:** the avatar signs the answer word by word, and each word lights up as it is signed.

Keyboard shortcuts on the conversation screen: **Space** moves to the next step and **R** starts again. The student's turn also starts on its own when raised hands start moving.

## Run it

```bash
npm install
npx expo start --web     # http://localhost:8081
```

Pose tracking runs in the web build (Chrome, Edge or Safari, on desktop or phone). The camera needs `localhost` or HTTPS.

## Deploy to GitHub Pages

```bash
bash scripts/deploy-web.sh
```

This exports the web build, adds the GitHub Pages fallbacks and pushes it to the `gh-pages` branch. The site's base path is set by `experiments.baseUrl` in `app.json`.

## How it is built

- `src/app/conversation.tsx`: the three-step classroom flow.
- `src/components/pose/`: the live camera with the MediaPipe pose, hand and face tracking drawn over the video.
- `src/components/avatar/`: the signing avatar (an SVG rig with 2-bone IK and sign clips).
- `src/theme/tokens.ts` and `src/components/ui/`: the one design system. It was dealt with [tasteskill](https://github.com/Leonxlnx/taste-skill): a near-black ground with one lime accent, IBM Plex Sans and Mono, and soft radii.
- `public/models`, `public/mediapipe`: the MediaPipe models and WASM, served with the site so they work offline.
