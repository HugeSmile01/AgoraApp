import React from 'react';
import { SymbolView } from 'expo-symbols';
import type { SymbolViewProps } from 'expo-symbols';

interface SymbolIconProps {
  name: SymbolViewProps['name'];
  size?: number;
  color?: string;
}

export default function SymbolIcon({ name, size = 20, color = '#1A56A0' }: SymbolIconProps) {
  return <SymbolView name={name} tintColor={color} size={size} />;
}
