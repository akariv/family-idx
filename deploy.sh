#!/bin/bash
git checkout main && \
(git branch -D dist || true) && \
git checkout -b dist && \
rm .gitignore && \
python process/process.py && \
npm run build && \
cp dist/family-idx/index.html dist/family-idx/404.html && \
cp CNAME dist/family-idx/ || true && \
git add dist/family-idx && \
git commit -m dist && \
(git branch -D gh-pages || true) && \
git subtree split --prefix dist/family-idx -b gh-pages && \
git push -f origin gh-pages:gh-pages && \
git checkout main && \
git branch -D gh-pages && \
git branch -D dist && \
git checkout . 