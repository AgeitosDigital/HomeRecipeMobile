import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import {
  Colors,
  FontFamily,
  FontSize,
  HitTarget,
  Radius,
  Spacing,
} from '@/constants/theme';

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fromYmd(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0);
}

export function DateField({
  value,
  onChange,
  label = 'Date',
}: {
  value: string;
  onChange: (ymd: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const date = fromYmd(value || toYmd(new Date()));

  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setOpen(false);
      if (event.type === 'dismissed') return;
    }
    if (selected) onChange(toYmd(selected));
  };

  return (
    <View style={styles.wrap}>
      <AppText variant="label">{label}</AppText>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.field, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
        accessibilityLabel={`Select ${label}`}>
        <AppText style={styles.fieldText}>{value || 'Select date'}</AppText>
      </Pressable>

      {Platform.OS === 'android' && open ? (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={onPickerChange}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation?.()}>
              <AppText variant="title" style={{ marginBottom: Spacing[3] }}>
                {label}
              </AppText>
              <DateTimePicker
                value={date}
                mode="date"
                display="inline"
                onChange={onPickerChange}
                style={{ alignSelf: 'center' }}
              />
              <Button title="Done" onPress={() => setOpen(false)} />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

export { toYmd };

const styles = StyleSheet.create({
  wrap: { gap: Spacing[2] },
  field: {
    minHeight: HitTarget.min,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[3],
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  fieldText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.base,
    color: Colors.foreground,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    padding: Spacing[5],
    paddingBottom: Spacing[10],
    gap: Spacing[3],
  },
});
