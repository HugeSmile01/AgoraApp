import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface MobileScreenProps {
  backgroundColor: string;
  title: string;
  titleColor?: string;
  rightActionLabel?: string;
  onRightActionPress?: () => void;
  children: React.ReactNode;
  headerAccessory?: React.ReactNode;
  contentStyle?: ViewStyle;
  rightSlot?: React.ReactNode;
}

export function MobileScreen({
  backgroundColor,
  title,
  rightActionLabel,
  onRightActionPress,
  children,
  headerAccessory,
  contentStyle,
  titleColor,
  rightSlot,
}: MobileScreenProps) {
  return (
    <SafeAreaView style={[styles.root, { backgroundColor }]}> 
      <View style={styles.header}>
        <Text style={[styles.title, titleColor ? { color: titleColor } : null]}>{title}</Text>
        {rightSlot || headerAccessory || (rightActionLabel ? (
          <TouchableOpacity style={styles.actionBtn} onPress={onRightActionPress}>
            <Text style={styles.actionBtnText}>{rightActionLabel}</Text>
          </TouchableOpacity>
        ) : <View />)}
      </View>
      <View style={[styles.content, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: { fontSize: 24, fontWeight: '700' },
  actionBtn: { backgroundColor: '#1A56A0', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  actionBtnText: { color: '#fff', fontWeight: '600' },
  content: { flex: 1 },
});
