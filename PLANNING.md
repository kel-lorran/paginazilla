# Paginazilla — Plano do Projeto

## Visão geral

Webapp para criar mosaicos de paginação de piso a partir de peças de material real (ex:
fatias de telha de barro cortadas), posicionadas sobre a planta baixa de um projeto
arquitetônico, respeitando a escala real — o resultado final serve como mapa/gabarito
para o assentamento físico do piso.

Duas personas / dois modos dentro do mesmo app:

- **Modo Autor** (você): monta um "cenário" de paginação — planta, isométrica de
  contexto, máscaras, materiais disponíveis, escala e viewport inicial.
- **Modo Usuário Final**: abre um cenário publicado e monta o mosaico — posiciona,
  move, rotaciona e espelha peças sobre a planta, depois exporta o resultado.

Sem backend em produção. Deploy estático via GitHub Pages.

## Conceitos e modelo de dados

**Cenário** (`Scenario`)
- `isometricImage`: imagem de contexto (não interativa, só ilustrativa).
- `planImage` + `scaleCalibration`: planta baixa (raster PNG/JPG) e a razão px↔cm,
  obtida por uma linha de referência que o autor traça sobre uma cota conhecida da
  planta, informando o comprimento real.
- `masks[]`: imagens PNG com transparência, sobrepostas à planta (posição + opacidade),
  para esmaecer áreas fora do piso-alvo. Prontas, importadas — não desenhadas no app.
- `materials[]`: peças disponíveis. Cada material tem uma imagem e um **tamanho real
  travado**, calibrado visualmente pelo autor (arrasta/redimensiona a peça sobre a
  planta já calibrada até o tamanho correto; o app deriva as dimensões reais a partir
  da escala e trava esse tamanho — sem digitar cm manualmente).
- `initialViewport`: zoom/pan inicial definido pelo autor, para o usuário final não
  cair numa visão tão ampla que as peças fiquem imperceptíveis.

**Instância de peça** (estado do usuário final, não do cenário)
- referência ao material, posição, rotação, espelhado (bool). Tamanho sempre derivado
  do material (não editável livremente).

## Stack técnico

- **React + TypeScript + Vite**, build estático.
- **Konva.js / react-konva** para o canvas: pan/zoom da planta, imagens
  transformáveis (mover/rotacionar/espelhar via `scaleX: -1`), export do stage como
  PNG (`stage.toDataURL()`), em resolução compatível com a escala real do projeto
  (permite imprimir como gabarito ~1:1).
- **IndexedDB** para persistência local do progresso do usuário final (rascunho do
  mosaico em andamento) — sem servidor.
- **Deploy**: GitHub Actions → GitHub Pages.

## Fluxo — Modo Autor

Rota separada do app (`/author`), só usada localmente por você — nunca precisa rodar
em produção.

1. Upload da isométrica (contexto) e da planta (raster).
2. Calibração de escala: traçar uma linha sobre uma cota conhecida da planta, informar
   o valor real (ex.: "3,20 m") → grava px/cm do cenário.
3. Upload e posicionamento de máscara(s), ajuste de opacidade.
4. Cadastro de materiais: upload da imagem da peça, calibração visual do tamanho real
   contra a planta (arrastar até o tamanho certo, travar).
5. Definir viewport inicial (zoom/pan) que o usuário final vai ver ao abrir o cenário.
6. Exportar bundle do cenário (`manifest.json` + imagens) → você move manualmente para
   `public/scenarios/<id>/` e commita no repo.

## Fluxo — Modo Usuário Final

1. Escolhe um cenário publicado (lista estática de cenários disponíveis no build).
2. Canvas abre na planta com o viewport inicial do autor, isométrica visível como
   contexto, máscara(s) aplicada(s).
3. Painel lateral (fundo blur) lista os materiais disponíveis no cenário.
4. Clicar num material adiciona uma instância no canvas, no tamanho real travado.
5. Selecionar uma peça mostra toolbar flutuante: mover / rotacionar / espelhar
   (sem redimensionar — escala é sempre a real, travada pelo autor).
6. Progresso salvo localmente (IndexedDB) enquanto trabalha.
7. Exportar resultado final como imagem PNG (mapa de referência para assentamento).

## Decisões já fechadas

- Escala: calibrada manualmente por linha de referência + valor real informado.
- Import de planta/máscara: imagem raster (PNG/JPG), não vetorial.
- Peças: tamanho real travado (não redimensionável livremente pelo usuário final).
- Máscaras: importadas prontas (com transparência), não desenhadas no app.
- Publicação de cenário: export de bundle no modo Autor + cópia manual pro repo
  (sem servidor de gravação).
- Entregável do usuário final: imagem/mapa de referência (PNG).

## Em aberto / Fase 2

- Lista de corte/quantidade de material (quantas telhas inteiras equivalem às fatias
  usadas) — não faz parte do MVP, mas o modelo de dados pode acomodar depois.
- Qualquer ideia adicional de backoffice/multiusuário que exija backend real.
