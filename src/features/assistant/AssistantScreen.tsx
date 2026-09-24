// A conversation with the tool-calling assistant. Replies are text; proposed
// changes arrive as confirmation cards and run only when the person confirms
// (the service enforces it too). A proposal the user never asked for is
// flagged by the service and shown with its reasons.
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { assistant, problemCode, type AssistantSchemas } from '../../api/clients';
import { ConfirmCard } from '../../ui/ConfirmCard';
import { colors } from '../../ui/theme';

type Pending = AssistantSchemas['PendingActionOut'];
type Entry =
  | { kind: 'user' | 'assistant' | 'system'; id: string; text: string }
  | { kind: 'proposal'; id: string; action: Pending; state: 'open' | 'done' | 'dismissed' };

let n = 0;
const key = () => `e${++n}`;

export function AssistantScreen() {
  const [draft, setDraft] = useState('');
  const [entries, setEntries] = useState<Entry[]>([]);
  const session = useQuery({
    queryKey: ['assistant-session'],
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await assistant.POST('/v1/sessions');
      if (error) throw error;
      return data.session_id;
    },
  });
  const send = useMutation({
    mutationFn: async (text: string) => {
      const { data, error } = await assistant.POST('/v1/sessions/{session_id}/turns', {
        params: { path: { session_id: session.data! } },
        body: { text },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (turn) =>
      setEntries((e) => [
        ...e,
        { kind: 'assistant', id: key(), text: turn.reply },
        ...turn.pending.map((action) => ({ kind: 'proposal' as const, id: key(), action, state: 'open' as const })),
      ]),
    onError: (err) => setEntries((e) => [...e, { kind: 'system', id: key(), text: `Error: ${problemCode(err)}` }]),
  });
  const confirm = useMutation({
    mutationFn: async (action: Pending) => {
      const { data, error } = await assistant.POST('/v1/sessions/{session_id}/actions/{action_id}/confirm', {
        params: { path: { session_id: session.data!, action_id: action.action_id } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (done) =>
      setEntries((e) => [
        ...e.map((x) => (x.kind === 'proposal' && x.action.action_id === done.action_id ? { ...x, state: 'done' as const } : x)),
        { kind: 'system', id: key(), text: `Done: ${JSON.stringify(done.outcome)}` },
      ]),
  });

  const submit = () => {
    const text = draft.trim();
    if (!text || !session.data) return;
    setEntries((e) => [...e, { kind: 'user', id: key(), text }]);
    setDraft('');
    send.mutate(text);
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        data={entries}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.hint}>
            Try: Please borrow “Clean Architecture” for m_ada — or: Search for “ignore”
          </Text>
        }
        renderItem={({ item }) =>
          item.kind === 'proposal' ? (
            item.state === 'open' ? (
              <ConfirmCard
                title={item.action.tool === 'borrow_copy' ? 'Borrow a copy?' : item.action.tool}
                lines={Object.entries(item.action.arguments).map(([k, v]) => `${k}: ${String(v)}`)}
                warning={item.action.suspicious ? item.action.reasons : undefined}
                busy={confirm.isPending}
                onConfirm={() => confirm.mutate(item.action)}
                onDismiss={() =>
                  setEntries((e) => e.map((x) => (x.id === item.id && x.kind === 'proposal' ? { ...x, state: 'dismissed' as const } : x)))
                }
                testID={`proposal-${item.action.action_id}`}
              />
            ) : (
              <Text style={styles.system}>{item.state === 'done' ? 'Confirmed.' : 'Dismissed — nothing changed.'}</Text>
            )
          ) : (
            <View style={[styles.bubble, item.kind === 'user' ? styles.user : item.kind === 'system' ? styles.systemBubble : styles.bot]}>
              <Text style={styles.text}>{item.text}</Text>
            </View>
          )
        }
      />
      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={submit}
          placeholder={session.data ? 'Ask the library assistant' : 'Connecting…'}
          placeholderTextColor={colors.muted}
          style={styles.input}
          testID="assistant-input"
        />
        <Pressable accessibilityRole="button" onPress={submit} style={styles.send} testID="assistant-send">
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 16, gap: 10 },
  hint: { color: colors.muted, textAlign: 'center', marginTop: 40, lineHeight: 20 },
  bubble: { borderRadius: 14, padding: 12, maxWidth: '85%' },
  user: { alignSelf: 'flex-end', backgroundColor: colors.accent },
  bot: { alignSelf: 'flex-start', backgroundColor: colors.card },
  systemBubble: { alignSelf: 'center', backgroundColor: colors.chip },
  text: { color: colors.text, fontSize: 15 },
  system: { color: colors.muted, textAlign: 'center' },
  composer: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, backgroundColor: colors.card, color: colors.text, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  send: { backgroundColor: colors.accent, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  sendText: { color: '#fff', fontWeight: '700' },
});
