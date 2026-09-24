// Search the catalog, open a book's copies (CAT-R3), borrow one — through the
// same confirmation card the assistant's proposals use.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { library, problemCode, type LibrarySchemas } from '../../api/clients';
import { ConfirmCard } from '../../ui/ConfirmCard';
import { colors } from '../../ui/theme';

type Availability = LibrarySchemas['AvailabilityOut'];

export function CatalogScreen() {
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const results = useQuery({
    queryKey: ['search', query],
    enabled: query.length > 0,
    queryFn: async () => {
      const { data, error } = await library.GET('/catalog/search', { params: { query: { q: query } } });
      if (error) throw error;
      return data;
    },
  });
  return (
    <View style={styles.root}>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={() => setQuery(draft.trim())}
        placeholder="Search title, author or ISBN"
        placeholderTextColor={colors.muted}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
        testID="search-input"
      />
      <FlatList
        data={results.data ?? []}
        keyExtractor={(b) => b.isbn}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          query && results.isSuccess ? <Text style={styles.muted}>Nothing matches “{query}”.</Text> : null
        }
        renderItem={({ item }) => (
          <BookRow book={item} open={open === item.isbn} onToggle={() => setOpen(open === item.isbn ? null : item.isbn)} />
        )}
      />
    </View>
  );
}

function BookRow({ book, open, onToggle }: { book: Availability; open: boolean; onToggle: () => void }) {
  return (
    <View style={styles.card}>
      <Pressable accessibilityRole="button" onPress={onToggle} testID={`book-${book.isbn}`}>
        <Text style={styles.title}>{book.title}</Text>
        <Text style={styles.muted}>{book.author}</Text>
        <Text style={book.copies_available ? styles.ok : styles.muted} testID={`availability-${book.isbn}`}>
          {book.copies_available} of {book.copies_total} available
        </Text>
      </Pressable>
      {open ? <Copies isbn={book.isbn} title={book.title} /> : null}
    </View>
  );
}

function Copies({ isbn, title }: { isbn: string; title: string }) {
  const qc = useQueryClient();
  const member = useMember();
  const [picked, setPicked] = useState<string | null>(null);
  const copies = useQuery({
    queryKey: ['copies', isbn],
    queryFn: async () => {
      const { data, error } = await library.GET('/catalog/books/{isbn}/copies', { params: { path: { isbn } } });
      if (error) throw error;
      return data;
    },
  });
  const borrow = useMutation({
    mutationFn: async (copyId: string) => {
      const { data, error } = await library.POST('/lending/loans', {
        body: { member_id: await member(), copy_id: copyId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setPicked(null);
      void qc.invalidateQueries({ queryKey: ['search'] });
      void qc.invalidateQueries({ queryKey: ['copies', isbn] });
    },
  });
  return (
    <View style={styles.copies}>
      {copies.data?.map((c) => (
        <View key={c.copy_id} style={styles.copyRow}>
          <Text style={styles.muted}>{c.copy_id}</Text>
          {c.on_loan ? (
            <Text style={styles.muted}>on loan</Text>
          ) : (
            <Pressable accessibilityRole="button" onPress={() => setPicked(c.copy_id)} style={styles.chip} testID={`borrow-${c.copy_id}`}>
              <Text style={styles.chipText}>Borrow</Text>
            </Pressable>
          )}
        </View>
      ))}
      {picked ? (
        <ConfirmCard
          title={`Borrow “${title}”?`}
          lines={[`Copy ${picked}`, 'Due in 14 days (standard tier)']}
          busy={borrow.isPending}
          onConfirm={() => borrow.mutate(picked)}
          onDismiss={() => setPicked(null)}
          testID="borrow-card"
        />
      ) : null}
      {borrow.data ? (
        <Text style={styles.ok} testID="loan-receipt">
          Borrowed · due {borrow.data.due_on}
        </Text>
      ) : null}
      {borrow.error ? <Text style={styles.error}>Refused: {problemCode(borrow.error)}</Text> : null}
    </View>
  );
}

/** One demo member per app run, created on first borrow. */
function useMember(): () => Promise<string> {
  const id = useRef<string | null>(null);
  return async () => {
    if (id.current) return id.current;
    const { data, error } = await library.POST('/lending/members', { body: { name: 'Demo reader', tier: 'standard' } });
    if (error) throw error;
    id.current = data.member_id;
    return data.member_id;
  };
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: 16, gap: 12 },
  input: { backgroundColor: colors.card, color: colors.text, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  list: { gap: 10, paddingBottom: 32 },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 14, gap: 4 },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  muted: { color: colors.muted },
  ok: { color: colors.ok, fontWeight: '600' },
  error: { color: colors.danger },
  copies: { marginTop: 8, gap: 8 },
  copyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chip: { backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { color: '#fff', fontWeight: '700' },
});
