// In-memory stand-ins for both services. Every response is checked against the
// generated contract types with `satisfies` — a mock that drifts from the real
// API does not compile.
import type { components as A } from './assistant.gen';
import type { components as L } from './library.gen';

type LS = L['schemas'];
type AS = A['schemas'];

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': status >= 400 ? 'application/problem+json' : 'application/json' },
  });
const problem = (status: number, code: string) => json({ type: 'about:blank', status, code }, status);

let seq = 0;
const nextId = (prefix: string) => `${prefix}_${(++seq).toString().padStart(4, '0')}`;

// ---- library ---------------------------------------------------------------
type Book = { isbn: string; title: string; author: string };
const books: Book[] = [
  { isbn: '9780321125217', title: 'Domain-Driven Design', author: 'Eric Evans' },
  { isbn: '9780134494166', title: 'Clean Architecture', author: 'Robert C. Martin' },
  { isbn: '9781449373320', title: 'Designing Data-Intensive Applications', author: 'Martin Kleppmann' },
];
const copies = new Map<string, { isbn: string; onLoan: boolean }>([
  ['c_ddd_1', { isbn: '9780321125217', onLoan: false }],
  ['c_ddd_2', { isbn: '9780321125217', onLoan: false }],
  ['c_ca_1', { isbn: '9780134494166', onLoan: false }],
  ['c_ddia_1', { isbn: '9781449373320', onLoan: true }],
]);
const members = new Map<string, LS['MemberOut']>();

export async function mockLibraryFetch(input: Request): Promise<Response> {
  const url = new URL(input.url);
  const path = url.pathname;
  const body = input.method === 'POST' ? await input.clone().text().then((t) => (t ? JSON.parse(t) : {})) : {};

  if (input.method === 'GET' && path === '/catalog/search') {
    const q = (url.searchParams.get('q') ?? '').toLowerCase();
    const hits = books
      .filter((b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.isbn === q)
      .map((b) => {
        const own = [...copies.values()].filter((c) => c.isbn === b.isbn);
        return { ...b, copies_total: own.length, copies_available: own.filter((c) => !c.onLoan).length };
      });
    return json(hits satisfies LS['AvailabilityOut'][]);
  }
  const copiesOf = path.match(/^\/catalog\/books\/([^/]+)\/copies$/);
  if (input.method === 'GET' && copiesOf) {
    if (!books.some((b) => b.isbn === copiesOf[1])) return problem(404, 'book_not_found');
    const list = [...copies.entries()]
      .filter(([, c]) => c.isbn === copiesOf[1])
      .map(([copy_id, c]) => ({ copy_id, on_loan: c.onLoan }));
    return json(list satisfies LS['CopyStatusOut'][]);
  }
  if (input.method === 'POST' && path === '/lending/members') {
    const m = { member_id: nextId('m'), name: body.name, tier: body.tier ?? 'standard', outstanding_fees_cents: 0 };
    members.set(m.member_id, m);
    return json(m satisfies LS['MemberOut'], 201);
  }
  if (input.method === 'POST' && path === '/lending/loans') {
    if (!members.has(body.member_id)) return problem(404, 'member_not_found');
    const copy = copies.get(body.copy_id);
    if (!copy) return problem(404, 'copy_not_found');
    if (copy.onLoan) return problem(409, 'copy_on_loan');
    copy.onLoan = true;
    const loan = {
      loan_id: nextId('l'),
      copy_id: body.copy_id,
      member_id: body.member_id,
      borrowed_on: '2026-03-02',
      due_on: '2026-03-16',
      returned_on: null,
      late_fee_cents: 0,
    };
    return json(loan satisfies LS['LoanOut'], 201);
  }
  return problem(404, 'not_found');
}

// ---- assistant ---------------------------------------------------------------
const pending = new Map<string, AS['PendingActionOut']>();

function turn(text: string): AS['TurnOut'] {
  const lower = text.toLowerCase();
  if (lower.includes('ignore')) {
    const action = {
      action_id: nextId('a'),
      tool: 'borrow_copy',
      arguments: { member_id: 'm_attacker', copy_id: 'c_bad_1' },
      suspicious: true,
      reasons: ['the user did not ask for a change', 'proposed after tool output that contained instructions'],
    };
    pending.set(action.action_id, action);
    return { reply: 'I have prepared that change. Please confirm it before I go ahead.', tool_calls: ['search_books', 'borrow_copy'], pending: [action], flagged: ['search_books'], total_tokens: 212 };
  }
  if (lower.includes('borrow')) {
    const action = { action_id: nextId('a'), tool: 'borrow_copy', arguments: { member_id: 'm_ada', copy_id: 'c_ca_1' }, suspicious: false, reasons: [] };
    pending.set(action.action_id, action);
    return { reply: 'I have prepared that change. Please confirm it before I go ahead.', tool_calls: ['search_books', 'borrow_copy'], pending: [action], flagged: [], total_tokens: 180 };
  }
  return { reply: 'Domain-Driven Design by Eric Evans: 2 available.', tool_calls: ['search_books'], pending: [], flagged: [], total_tokens: 96 };
}

export async function mockAssistantFetch(input: Request): Promise<Response> {
  const path = new URL(input.url).pathname;
  if (input.method === 'POST' && path === '/v1/sessions') {
    return json({ session_id: nextId('s') } satisfies AS['SessionOut'], 201);
  }
  if (input.method === 'POST' && /^\/v1\/sessions\/[^/]+\/turns$/.test(path)) {
    const { text } = (await input.clone().json()) as AS['TurnIn'];
    return json(turn(text) satisfies AS['TurnOut']);
  }
  const confirm = path.match(/^\/v1\/sessions\/[^/]+\/actions\/([^/]+)\/confirm$/);
  if (input.method === 'POST' && confirm) {
    const action = pending.get(confirm[1]);
    if (!action) return problem(404, 'action_not_found');
    pending.delete(confirm[1]);
    const outcome = { loan_id: nextId('l'), copy_id: String(action.arguments.copy_id), due_on: '2026-03-16' };
    return json({ action_id: action.action_id, outcome } satisfies AS['ConfirmOut']);
  }
  return problem(404, 'not_found');
}
