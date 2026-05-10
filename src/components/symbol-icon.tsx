import React from 'react';
import { SymbolView } from 'expo-symbols';

interface SymbolIconProps {
  name: string;
  size?: number;
  color?: string;
}

export default function SymbolIcon({ name, size = 20, color = '#1A56A0' }: SymbolIconProps) {
  return <SymbolView name={name as any} tintColor={color} size={size} />;
}
