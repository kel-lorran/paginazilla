# bundles/

Pasta de staging local. Coloque aqui os `.zip` exportados pelo Modo Autor
(`/author` → "Exportar bundle") e rode:

```bash
npm run publish-bundles
```

Isso extrai cada `.zip` para `public/scenarios/<id>/` e atualiza
`public/scenarios/index.json`. Depois é só `git add`, commit e push — o
deploy no GitHub Pages roda automático.

Os `.zip` em si não são versionados (só o conteúdo extraído em
`public/scenarios/`).
