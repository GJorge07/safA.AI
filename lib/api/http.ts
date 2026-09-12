import { Prisma } from '@/app/generated/prisma/client';

export type Context = { params: Promise<{ id: string }> };

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function handle(action: () => Promise<Response>): Promise<Response> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof ApiError) return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const errors: Record<string, [number, string]> = {
        P2025: [404, 'Registro não encontrado'],
        P2003: [404, 'Cliente, contrato ou parcela não encontrado'],
        P2002: [409, 'Já existe um pagamento para esta parcela'],
        P2034: [409, 'O registro foi alterado simultaneamente. Tente novamente'],
      };
      const match = errors[error.code];
      if (match) return Response.json({ error: match[1] }, { status: match[0] });
    }
    console.error('Erro na API:', error);
    return Response.json({ error: 'Erro interno ao processar a solicitação' }, { status: 500 });
  }
}

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError(400, 'Envie um objeto JSON');
  return value as Record<string, unknown>;
}

export async function body(request: Request) {
  try {
    return object(await request.json());
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, 'JSON inválido');
  }
}

export function text(value: unknown, field: string, max = 200) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
    throw new ApiError(400, `${field} deve ser um texto entre 1 e ${max} caracteres`);
  }
  return value.trim();
}

export function money(value: unknown, field: string) {
  if ((typeof value !== 'number' && typeof value !== 'string') || !/^\d{1,12}(\.\d{1,2})?$/.test(String(value))) {
    throw new ApiError(400, `${field} deve ser um valor positivo com até duas casas decimais`);
  }
  const result = new Prisma.Decimal(value);
  if (result.lte(0)) throw new ApiError(400, `${field} deve ser maior que zero`);
  return result;
}

// Datas civis são armazenadas à meia-noite UTC; timestamps exigem fuso explícito.
export function date(value: unknown, field: string): Date {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) {
    throw new ApiError(400, `${field} deve ser YYYY-MM-DD ou um timestamp ISO com fuso`);
  }
  const civil = value.slice(0, 10);
  const day = new Date(`${civil}T00:00:00.000Z`);
  const result = new Date(value);
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== civil || !Number.isFinite(result.getTime())) {
    throw new ApiError(400, `${field} contém uma data inválida`);
  }
  return result;
}

export function parcela(value: unknown) {
  const data = object(value);
  return { valor: money(data.valor, 'valor'), vencimento: date(data.vencimento, 'vencimento') };
}

export function contrato(data: Record<string, unknown>): Pick<Prisma.ContratoUncheckedCreateInput, 'clienteId' | 'tipoPagamento' | 'valorTotal' | 'clausulaOriginal'> {
  const tipo = text(data.tipoPagamento, 'tipoPagamento').toUpperCase();
  if (tipo !== 'FIXO' && tipo !== 'EXITO' && tipo !== 'MISTO') throw new ApiError(400, 'tipoPagamento deve ser FIXO, EXITO ou MISTO');
  return {
    clienteId: text(data.clienteId, 'clienteId'),
    tipoPagamento: tipo,
    valorTotal: money(data.valorTotal, 'valorTotal'),
    clausulaOriginal: text(data.clausulaOriginal, 'clausulaOriginal', 50000),
  };
}

export function pagination(url: URL) {
  const parse = (name: string, fallback: number, max: number) => {
    const raw = url.searchParams.get(name);
    if (raw === null) return fallback;
    if (!/^\d+$/.test(raw) || Number(raw) < 1 || Number(raw) > max) throw new ApiError(400, `${name} inválido`);
    return Number(raw);
  };
  const page = parse('page', 1, 1000000);
  const limit = parse('limit', 20, 100);
  return { skip: (page - 1) * limit, take: limit };
}

export function period(url: URL) {
  const start = url.searchParams.get('inicio');
  const end = url.searchParams.get('fim');
  const year = new Date().getUTCFullYear();
  if ((start === null) !== (end === null)) throw new ApiError(400, 'Informe inicio e fim juntos');
  const from = start ?? `${year}-01-01`;
  const to = end ?? `${year}-12-31`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) throw new ApiError(400, 'inicio e fim devem ser YYYY-MM-DD');
  const gte = date(from, 'inicio');
  const last = date(to, 'fim');
  if (last < gte || last.getTime() - gte.getTime() > 366 * 5 * 86400000) throw new ApiError(400, 'Período inválido ou maior que cinco anos');
  return { gte, lt: new Date(last.getTime() + 86400000) };
}
