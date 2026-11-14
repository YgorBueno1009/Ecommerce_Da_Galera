-- Textos de vitrine na coluna products.description — idempotente; pode reaplicar.
--
-- Uso:
--   npm run db:descriptions
--   psql -h localhost -U postgres -d ecommerce -f back-end-node/src/database/007-product-descriptions.sql

BEGIN;

SET search_path TO ecommerce, public;

WITH textos (slug, description) AS (
  VALUES
    (
      'furadeira-de-impacto-650w'::citext,
      'Furadeira de impacto 650 W para furos em alvenaria, madeira e metal com mandril de 13 mm. O gatilho com controle de velocidade ajuda a começar o furo com precisão e o modo impacto enfrenta paredes e concreto leve. Empunhadura emborrachada e base leve facilitam o uso em reformas domésticas e pequenos serviços.'
    ),
    (
      'liquidificador-1200w',
      'Liquidificador com motor de 1200 W, jarra de 3 L e 12 velocidades mais função pulsar para sucos, cremes, massas e gelo. A tampa vedada reduz respingos e o copo em resistente policarbonato acompanha o dia a dia da cozinha. Ideal para famílias que preparam bebidas e receitas em maior volume.'
    ),
    (
      'ventilador-de-coluna-40cm',
      'Ventilador de coluna 40 cm com oscilação horizontal e três velocidades para ambientes médios e grandes. A altura regulável direciona o fluxo de ar sem ocupar tanto espaço no chão quanto modelos circulares de piso. Operação bivolt, consumo baixo e estrutura estável para salas, escritórios e quartos.'
    ),
    (
      'air-fryer-4l',
      'Fritadeira a ar de 4 L com painel digital e até 1500 W de potência para preparar porções crocantes com pouco óleo. Pré-aquecimento rápido, timer e ajustes de temperatura para salgados, carnes, legumes e sobremesas. A cesto antiaderente facilita a limpeza e o tamanho atende casais e famílias pequenas.'
    ),
    (
      'parafusadeira-12v',
      'Parafusadeira a bateria 12 V com íon-lítio, torque de até 20 Nm e carregador bivolt para montagem de móveis, prateleiras e reparos em casa. Mandril auto travante aceita bits comuns e o corpo compacto alcança cantos apertados. Luz de trabalho integrada ajuda em áreas com pouca iluminação.'
    ),
    (
      'cafeteira-eletrica-30-xicaras',
      'Cafeteira elétrica para até 30 xícaras, reservatório de 1,5 L e aquecedor de 800 W que mantém o café na temperatura ideal. Filtro permanente lavável reduz custo com papel e a base com sinal luminoso indica quando o preparo terminou. Acabamento em inox combina com cozinhas residenciais e pequenos escritórios.'
    ),
    (
      'aspirador-vertical-2-em-1',
      'Aspirador vertical 2 em 1 com 1250 W e reservatório de 0,8 L para pó e sujeira seca. O tubo desmontável vira aspirador de mão para estofados, cantos e escadas, e os filtros laváveis prolongam a vida útil do aparelho. Rodízios suaves e cabo longo permitem limpar salas inteiras sem trocar de tomada o tempo todo.'
    ),
    (
      'chaleira-eletrica-1-7l',
      'Chaleira elétrica de inox com capacidade de 1,7 L e 2200 W para ferver água em poucos minutos. O desligamento automático evita aquecimento a seco e a base giratória facilita o manuseio para destros e canhotos. Indicador de nível de água visível e bico fundido ajudam a servir chás, cafés solúveis e instantâneos sem respingar.'
    ),
    (
      'trena-a-laser-40m',
      'Trena a laser com alcance de até 40 m e precisão de ± 2 mm para medições internas em reformas e marcenaria. Telo retroiluminado exibe metros, pés e polegadas, e o modo contínuo registra distâncias sem precisar de outra pessoa. Estojo compacto e correia incluída para transporte em canteiros e visitas técnicas.'
    ),
    (
      'luminaria-de-mesa-led',
      'Luminária de mesa LED de 7 W com temperatura de cor ajustável entre 3000 K e 6500 K para leitura, estudo ou home office. Braço articulado direciona a luz sem ofuscar a tela e o dimmer suave adaposta o ambiente ao longo do dia. Bivolt, baixo consumo e base estável para mesas de até 60 cm de largura.'
    ),
    (
      'jogo-chaves-combinadas-12-pecas',
      'Jogo com 12 chaves combinadas em aço cromado, cobrindo as medidas mais usadas em manutenção automotiva e hidráulica residencial. O acabamento polido resiste à oxidação e as cabeças usinadas oferecem bom encaixe em parafusos sextavados. Maleta organizadora mantém as peças identificadas e prontas na caixa de ferramentas.'
    ),
    (
      'esmerilhadeira-angular-115',
      'Esmerilhadeira angular para discos de 4½" indicada a corte e desbaste de metal, concreto e alvenaria. Empunhadura lateral removível melhora o controle em trabalhos longos e a proteção ajustável direciona faíscas para longe do operador. Gatilho com trava e carcaça ventilada ajudam na durabilidade do motor.'
    ),
    (
      'serra-tico-tico-500w',
      'Serra tico-tico 500 W com curso pendular e base inclinável para cortes retos e curvos em madeira, MDF e chapas finas de metal. O guia de paralelismo auxilia ripas uniformes e a troca rápida de lâmina mantém a produtividade. Pegada ergonômica e gatilho com velocidade variável para acabamentos mais limpos.'
    ),
    (
      'kit-laminas-madeira',
      'Kit com lâminas variadas para serra tico-tico, pensado em madeira maciça, MDF e compensado. Dentes com passo diferenciado reduzem lascamento em laminados e a liga de aço prolonga o tempo entre afiações. Identificação por cores no tubo organizador facilita escolher a lâmina certa para cada material.'
    ),
    (
      'nivel-bolha-60-cm',
      'Nível de bolha profissional de 60 cm com três cápsulas de leitura horizontal, vertical e 45°. Corpo em alumínio leve com cantos reforçados resiste a quedas em obra e a bolha de alta visibilidade aumenta a precisão do alinhamento. Essencial para instalar armários, prateleiras, rodapés e revestimentos.'
    ),
    (
      'caixa-brocas-30-pecas',
      'Maleta com 30 brocas para madeira, metal e alvenaria, em diâmetros graduais para furos piloto, instalações elétricas e montagem geral. Hastes cilíndricas compatíveis com furadeiras e parafusadeiras comuns, com tratamento superficial que reduz o aquecimento. Estojo com encaixes numerados evita perder peças no caminhão da ferramenta.'
    )
)
UPDATE ecommerce.products p
SET description = t.description
FROM textos t
WHERE p.slug = t.slug;

COMMIT;