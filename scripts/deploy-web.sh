#!/usr/bin/env bash
# Build the web app and publish it to GitHub Pages (the gh-pages branch of origin).
# Live at https://<owner>.github.io/signova/ (baseUrl "/signova" in app.json).
set -euo pipefail
cd "$(dirname "$0")/.."
ORIGIN="$(git remote get-url origin)"
rm -rf dist
npx expo export -p web
cp dist/index.html dist/404.html   # deep links (/conversation, /learning) load the app on GitHub Pages
touch dist/.nojekyll               # keep the _expo folder (Jekyll drops folders starting with "_")
cd dist
git init -q -b gh-pages
git add -A
git -c user.name="$(git -C .. config user.name || echo deploy)" -c user.email="$(git -C .. config user.email || echo deploy@localhost)" commit -qm "Deploy web build"
git push -fq "$ORIGIN" gh-pages
echo "Pushed to gh-pages"
