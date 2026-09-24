// One confirmation card for every change, whether the person asked for it
// (borrowing from the catalog) or an AI proposed it (the assistant). A
// proposal the user did not ask for arrives `suspicious`, with its reasons.
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from './theme';

type Props = {
  title: string;
  lines: string[];
  warning?: string[];
  busy?: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
  testID?: string;
};

export function ConfirmCard({ title, lines, warning, busy, onConfirm, onDismiss, testID }: Props) {
  const suspicious = !!warning?.length;
  return (
    <View style={[styles.card, suspicious && styles.suspicious]} testID={testID} accessibilityRole="summary">
      {suspicious ? (
        <View style={styles.warning} testID={`${testID}-warning`}>
          <Text style={styles.warningTitle}>⚠ Check before confirming</Text>
          {warning.map((w) => (
            <Text key={w} style={styles.warningText}>
              • {w}
            </Text>
          ))}
        </View>
      ) : null}
      <Text style={styles.title}>{title}</Text>
      {lines.map((l) => (
        <Text key={l} style={styles.line}>
          {l}
        </Text>
      ))}
      <View style={styles.row}>
        <Pressable accessibilityRole="button" onPress={onDismiss} style={[styles.button, styles.secondary]} testID={`${testID}-dismiss`}>
          <Text style={styles.secondaryText}>Dismiss</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: !!busy, disabled: !!busy }}
          disabled={busy}
          onPress={onConfirm}
          style={[styles.button, suspicious ? styles.danger : styles.primary]}
          testID={`${testID}-confirm`}
        >
          <Text style={styles.primaryText}>{busy ? 'Working…' : 'Confirm'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 14, gap: 6 },
  suspicious: { borderColor: colors.danger },
  warning: { backgroundColor: colors.dangerBg, borderRadius: 10, padding: 10, gap: 2, marginBottom: 4 },
  warningTitle: { color: colors.danger, fontWeight: '700' },
  warningText: { color: colors.danger, fontSize: 13 },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  line: { color: colors.muted, fontSize: 14 },
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 6 },
  button: { borderRadius: 10, paddingVertical: 9, paddingHorizontal: 16 },
  primary: { backgroundColor: colors.accent },
  danger: { backgroundColor: colors.danger },
  secondary: { backgroundColor: colors.chip },
  primaryText: { color: '#fff', fontWeight: '700' },
  secondaryText: { color: colors.text, fontWeight: '600' },
});
