import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

// O módulo fala com window.localStorage; aqui ele ganha um de mentira, no
// mesmo formato, para a lógica poder ser testada fora do navegador.
function instalarJanelaFalsa() {
  const dados = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (chave) => (dados.has(chave) ? dados.get(chave) : null),
      setItem: (chave, valor) => dados.set(chave, String(valor)),
    },
    dispatchEvent: () => true,
  };
  globalThis.Event = class {
    constructor(tipo) {
      this.type = tipo;
    }
  };
  return dados;
}

const { listarConversas, obterConversa, salvarConversa, excluirConversa } = await (async () => {
  instalarJanelaFalsa();
  return import('@/components/dashboard/conversas');
})();

function conversa(id, diaDoMes) {
  return {
    id,
    titulo: `Conversa ${id}`,
    criadoEm: `2026-09-${String(diaDoMes).padStart(2, '0')}T10:00:00.000Z`,
    mensagens: [{ autor: 'usuario', texto: 'oi' }],
  };
}

describe('histórico de conversas', () => {
  beforeEach(() => {
    instalarJanelaFalsa();
  });

  it('lista da mais recente para a mais antiga', () => {
    salvarConversa(conversa('a', 1));
    salvarConversa(conversa('b', 5));
    salvarConversa(conversa('c', 3));

    assert.deepEqual(listarConversas().map((c) => c.id), ['b', 'c', 'a']);
  });

  it('salvar a mesma conversa atualiza em vez de duplicar', () => {
    salvarConversa(conversa('a', 1));
    salvarConversa({ ...conversa('a', 1), mensagens: [{ autor: 'usuario', texto: 'de novo' }] });

    assert.equal(listarConversas().length, 1);
    assert.equal(listarConversas()[0].mensagens[0].texto, 'de novo');
  });

  it('apaga definitivamente e não mexe nas outras', () => {
    salvarConversa(conversa('a', 1));
    salvarConversa(conversa('b', 2));

    excluirConversa('a');

    assert.equal(obterConversa('a'), undefined);
    assert.deepEqual(listarConversas().map((c) => c.id), ['b']);
  });

  it('apagar id inexistente não derruba nem altera a lista', () => {
    salvarConversa(conversa('a', 1));

    assert.doesNotThrow(() => excluirConversa('nao-existe'));
    assert.deepEqual(listarConversas().map((c) => c.id), ['a']);
  });

  it('guarda no máximo 20 conversas, descartando as mais antigas', () => {
    for (let i = 1; i <= 25; i += 1) salvarConversa(conversa(`c-${i}`, (i % 28) + 1));

    assert.equal(listarConversas().length, 20);
  });

  it('sobrevive a localStorage indisponível', () => {
    globalThis.window = {
      localStorage: {
        getItem: () => {
          throw new Error('modo privado');
        },
        setItem: () => {
          throw new Error('modo privado');
        },
      },
      dispatchEvent: () => true,
    };

    assert.deepEqual(listarConversas(), []);
    assert.doesNotThrow(() => excluirConversa('a'));
  });
});
