# Paginazilla

**[kel-lorran.github.io/paginazilla](https://kel-lorran.github.io/paginazilla/)**

Webapp para montar mosaicos de paginação de piso: posicione peças de material
real (ex.: fatias de telha) sobre a planta baixa de um projeto, respeitando a
escala real, e exporte o resultado como mapa de assentamento.

Veja [PLANNING.md](./PLANNING.md) para o desenho do produto e das decisões de
arquitetura.

## A ideia por trás do projeto

Surgiu de uma obra de verdade. Numa construção em andamento, apareceu a
possibilidade de reaproveitar telhas de barro — em vez de simplesmente
descartar o material, dava pra reusar de um jeito criativo. Isso puxou
referências de mosaicos feitos com seções desse tipo de telha: fatias
cortadas, recompostas num desenho novo.

Daí veio a ideia central do projeto: em vez de eu (ou um profissional
qualquer) simplesmente definir a paginação sozinho, e se os filhos da
família dona da casa participassem? Que eles montassem o mosaico — mexendo,
girando, experimentando as peças numa tela — e o resultado dessa brincadeira
virasse, de verdade, o desenho aplicado na casa deles.

A ideia é simples mas o efeito não é pequeno: a criança exercita a
criatividade construindo algo digitalmente, e depois vê aquilo que ela
mesma desenhou virar parte física, permanente, da própria casa — um pedaço
do lar que ela literalmente ajudou a criar. Um jeito de aumentar o senso de
pertencimento através de algo concreto, não só de um gesto simbólico.

O Paginazilla é a ferramenta que viabiliza isso: o adulto responsável
("Modo Autor") prepara o cenário — planta, escala real, materiais — e
qualquer pessoa da família, inclusive as crianças, pode entrar e brincar de
montar o mosaico, sabendo que aquele desenho vai sair da tela e ir pra
parede ou pro chão de verdade.

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

1. Mova o `.zip` baixado pra pasta `bundles/` na raiz do projeto (pode
   colocar vários de uma vez).
2. Rode:
   ```bash
   npm run publish        # extrai + atualiza index.json + commit + push, tudo de uma vez
   ```
   Ou, se preferir revisar antes de commitar:
   ```bash
   npm run publish-bundles           # só extrai e atualiza os arquivos locais
   git add public/scenarios && git commit && git push   # feito manualmente depois
   ```
   Se não houver nada novo (bundle já publicado, sem mudanças), `npm run
   publish` não commita nem dá push — só avisa que não tinha nada a fazer.

### Removendo um cenário

Um cenário publicado existe em dois lugares só: a pasta
`public/scenarios/<id>/` (imagens + `manifest.json`) e a entrada dele em
`public/scenarios/index.json` (o que faz aparecer na home). `bundles/` é
só uma área de rascunho usada na hora de publicar — depois que
`npm run publish` roda, o `.zip` já cumpriu seu papel; apagá-lo dali **não**
desfaz o que já foi publicado, porque a fonte da verdade não é mais ele.

Pra remover de fato:

```bash
node scripts/remove-scenario.mjs <id> --push
```

Isso faz, em ordem:

1. Apaga a pasta inteira `public/scenarios/<id>/`.
2. Tira a entrada `{ "id": "<id>", ... }` de `index.json`.
3. (só com `--push`) `git add` + commit ("Remove cenário: `<id>`") + push —
   o GitHub Actions rebuilda o site sem esse cenário: ele some da home e a
   URL `/cenario/<id>` volta a dar 404.

Sem `--push`, para no passo 2 — as mudanças ficam só localmente, pra você
revisar e commitar manualmente quando quiser (mesma lógica do
`publish-bundles` sem `--push`).

Não lembra o id exato? Roda sem argumento nenhum:

```bash
node scripts/remove-scenario.mjs
```

e ele lista todos os cenários publicados atualmente.

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
