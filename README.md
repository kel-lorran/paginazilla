# Paginazilla

Webapp para montar mosaicos de paginação de piso: posicione peças de material
real (ex.: fatias de telha) sobre a planta baixa de um projeto, respeitando a
escala real, e exporte o resultado como mapa de assentamento.

Veja [PLANNING.md](./PLANNING.md) para o desenho do produto e das decisões de
arquitetura.

## Desenvolvimento

```bash
npm install
npm run dev
```

## Cenários

Cada "cenário" (planta + isométrica + máscaras + materiais) vive em
`public/scenarios/<id>/`, listado em `public/scenarios/index.json`. Um
cenário de demonstração (`demo`) está incluído para testes.

### Criando um cenário novo (Modo Autor)

Acesse `/author` (na versão publicada ou local — o Modo Autor roda 100% no
navegador, sem backend).

1. Faça upload da planta e da isométrica.
2. Aba **Escala**: clique dois pontos na planta sobre uma cota conhecida
   (ex.: uma parede) e informe o comprimento real em cm.
3. Aba **Materiais**: faça upload da imagem de cada peça, clique em
   "Calibrar tamanho", arraste os cantos até o tamanho real na planta e
   clique em "Travar tamanho".
4. Aba **Máscaras** (opcional) — duas formas de marcar a área fora do
   piso-alvo pra esmaecer:
   - **Polígono** (recomendado): clique os vértices direto na planta,
     "Concluir polígono".
   - **Imagem**: upload de uma imagem preto-e-branco (preto esmaece, branco
     deixa passar — sem precisar de canal alfa).
5. Dê zoom/pan na visão que quer como inicial e clique em "Usar visão
   atual como inicial".
6. Clique em "Exportar bundle (.zip)" — baixa um `.zip` com o cenário.

### Publicando um cenário

1. Mova o `.zip` baixado pra pasta `bundles/` na raiz do projeto.
2. Rode:
   ```bash
   npm run publish-bundles
   ```
   Isso extrai todo `.zip` de `bundles/` pra `public/scenarios/<id>/` e
   atualiza `public/scenarios/index.json` automaticamente (processa vários
   de uma vez).
3. `git add public/scenarios && git commit && git push` — o deploy no
   GitHub Pages roda sozinho via Actions.

## Deploy (GitHub Pages)

Deploy automático via GitHub Actions (`.github/workflows/deploy.yml`) a
cada push na branch `main`. Configuração necessária, uma vez só, nas
configurações do repositório no GitHub: **Settings → Pages → Source →
GitHub Actions**.

O `base` em `vite.config.ts` está fixo em `/paginazilla/` — ajuste se o nome
do repositório no GitHub for diferente.

Build manual (sem deploy):

```bash
npm run build
```
