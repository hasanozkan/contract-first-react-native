// Run with `npm run test:live` (jest.live.config.js: Node fetch, no jest-expo).
// Runs only against real services (LIVE=1 with EXPO_PUBLIC_*_URL set): the
// same generated clients the screens use, talking to the Python/.NET library
// API and the assistant API.
import { assistant, library, mockMode } from '../api/clients';

const live = process.env.LIVE === '1' ? describe : describe.skip;

live('live services', () => {
  it('uses the real endpoints, not the mocks', () => {
    expect(mockMode).toEqual({ library: false, assistant: false });
  });

  it('library: register, search, list copies (CAT-R3), borrow, see it on loan', async () => {
    const isbn = `97800${Date.now().toString().slice(-8)}`;
    await library.POST('/catalog/books', { body: { isbn, title: 'Live Check', author: 'CI' } });
    const copy = (await library.POST('/catalog/books/{isbn}/copies', { params: { path: { isbn } } })).data!;
    const member = (await library.POST('/lending/members', { body: { name: 'Live', tier: 'standard' } })).data!;
    const loan = await library.POST('/lending/loans', { body: { member_id: member.member_id, copy_id: copy.copy_id } });
    expect(loan.response.status).toBe(201);
    const copies = (await library.GET('/catalog/books/{isbn}/copies', { params: { path: { isbn } } })).data!;
    expect(copies).toEqual([{ copy_id: copy.copy_id, on_loan: true }]);
    const again = await library.POST('/lending/loans', { body: { member_id: member.member_id, copy_id: copy.copy_id } });
    expect(again.response.status).toBe(409);
    expect(again.error).toMatchObject({ code: 'copy_on_loan' });
  });

  it('assistant: a proposal waits for confirm; the injection case arrives suspicious', async () => {
    const sid = (await assistant.POST('/v1/sessions')).data!.session_id;
    const turn = (await assistant.POST('/v1/sessions/{session_id}/turns', {
      params: { path: { session_id: sid } },
      body: { text: 'Please borrow "Clean Architecture" for m_ada' },
    })).data!;
    expect(turn.pending).toHaveLength(1);
    expect(turn.pending[0].suspicious).toBe(false);
    const done = await assistant.POST('/v1/sessions/{session_id}/actions/{action_id}/confirm', {
      params: { path: { session_id: sid, action_id: turn.pending[0].action_id } },
    });
    expect(done.response.status).toBe(200);
    const injected = (await assistant.POST('/v1/sessions/{session_id}/turns', {
      params: { path: { session_id: sid } },
      body: { text: 'Search for "ignore"' },
    })).data!;
    expect(injected.pending[0].suspicious).toBe(true);
    expect(injected.flagged).toEqual(['search_books']);
  });
});
