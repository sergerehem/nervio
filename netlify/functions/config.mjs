import { getStore } from '@netlify/blobs';

const auth = (req) => {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  return token === process.env.ADMIN_PASSWORD;
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
};

const DEFAULT_CONFIG = {
  welcome: 'Vou fazer 5 perguntas rápidas para entender como você está agora e indicar a prática de respiração mais adequada para este momento.',
  questions: [
    { text: 'Neste momento, qual dessas frases mais combina com você?', opts: [
      {k:'A',v:'Minha cabeça não para.'},{k:'B',v:'Estou com coisa demais para dar conta.'},
      {k:'C',v:'Estou sem muita energia.'},{k:'D',v:'Estou me sentindo bem e equilibrado.'},
      {k:'E',v:'Tenho algo importante pela frente e quero estar no meu melhor.'}
    ]},
    { text: 'Como você descreveria sua mente agora?', opts: [
      {k:'A',v:'Acelerada'},{k:'B',v:'Confusa'},{k:'C',v:'Lenta'},{k:'D',v:'Clara'},{k:'E',v:'Focada'}
    ]},
    { text: 'Como você percebe seu corpo neste momento?', opts: [
      {k:'A',v:'Tenso'},{k:'B',v:'Sobrecarregado'},{k:'C',v:'Cansado'},{k:'D',v:'Confortável'},{k:'E',v:'Pronto para agir'}
    ]},
    { text: 'O que você sente que mais precisa agora?', opts: [
      {k:'A',v:'Desacelerar'},{k:'B',v:'Organizar as ideias'},{k:'C',v:'Recuperar energia'},
      {k:'D',v:'Manter como estou'},{k:'E',v:'Entrar em modo de alta performance'}
    ]},
    { text: 'Pensando nas próximas horas, o que seria mais útil para você?', opts: [
      {k:'A',v:'Mais calma'},{k:'B',v:'Mais clareza'},{k:'C',v:'Mais energia'},{k:'D',v:'Mais presença'},{k:'E',v:'Mais foco'}
    ]}
  ],
  states: {
    A:{ nome:'Cabeça a Mil', momento:'Sua mente está em modo acelerado — processando muitos estímulos ao mesmo tempo, sem conseguir desacelerar.', gera:'Dificuldade de foco, sensação de urgência constante e um leve esgotamento mesmo sem ter feito muito.', busca:'Vamos ativar o freio natural do seu sistema nervoso e trazer de volta a sensação de espaço interno.', audio:'BW Ansiedade e Pânico', url:'https://s3.sa-east-1.amazonaws.com/midia.marketing4nerds.com/download/BW+Ansiedade+e+Pa%CC%82nico.mp3' },
    B:{ nome:'Sobrecarregado', momento:'Você está carregando mais do que consegue processar com tranquilidade — a sensação é de acúmulo e pressão.', gera:'Dificuldade para priorizar, mente congestionada e a sensação de que tudo é urgente ao mesmo tempo.', busca:'Vamos criar uma pausa estruturada para reorganizar o sistema e liberar a pressão interna.', audio:'Respiração Caixa', url:'https://s3.sa-east-1.amazonaws.com/midia.marketing4nerds.com/download/CAIXA+5min.mp3' },
    C:{ nome:'Sem Energia', momento:'Seu sistema está operando em baixa potência — com lentidão, pouca disposição e sensação de cansaço.', gera:'Procrastinação, dificuldade de iniciativa e uma sensação de distância das coisas ao redor.', busca:'Vamos ativar suavemente o seu sistema para recuperar clareza e disposição.', audio:'Foco 4-4', url:'https://s3.sa-east-1.amazonaws.com/midia.marketing4nerds.com/download/FOCO+4-4+5min.mp3' },
    D:{ nome:'Equilíbrio', momento:'Você está em um bom momento — estável, presente e com o sistema funcionando de forma saudável.', gera:'Mais clareza nas decisões, presença nas relações e capacidade de responder bem ao que aparece.', busca:'Vamos consolidar esse estado com uma prática de coerência para manter e aprofundar o equilíbrio.', audio:'Respiração Coerente', url:'https://s3.sa-east-1.amazonaws.com/midia.marketing4nerds.com/download/COERENTE+5min.mp3' },
    E:{ nome:'Alta Performance', momento:'Você está se preparando para dar o seu melhor — com foco, presença e disposição para executar.', gera:'Clareza de intenção, maior capacidade de concentração e menos dispersão nas ações.', busca:'Vamos calibrar seu sistema para entrar em modo de alta performance com mais precisão e presença.', audio:'Foco 4-4', url:'https://s3.sa-east-1.amazonaws.com/midia.marketing4nerds.com/download/FOCO+4-4+5min.mp3' }
  }
};

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  const store = getStore('nervio-config');

  // GET — public (used by chat to load config)
  if (req.method === 'GET') {
    try {
      const cfg = await store.get('config', { type: 'json' });
      const valid = cfg && Array.isArray(cfg.questions) && cfg.questions.length > 0;
      return new Response(JSON.stringify(valid ? cfg : DEFAULT_CONFIG), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    } catch {
      return new Response(JSON.stringify(DEFAULT_CONFIG), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
  }

  // PUT — admin only
  if (req.method === 'PUT') {
    if (!auth(req)) return new Response('Unauthorized', { status: 401, headers: cors });
    try {
      const body = await req.json();
      await store.setJSON('config', body);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: cors });
    }
  }

  return new Response('Method not allowed', { status: 405, headers: cors });
};

export const config = { path: '/api/config' };
