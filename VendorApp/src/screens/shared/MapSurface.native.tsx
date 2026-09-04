import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import MapView, { Marker, type MapPressEvent, type Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Icon } from '@/lib/icons';
import { Text } from '@/components/ui/Text';
import { colors } from '@/theme/colors';

type Props = { lat?: number | null; lng?: number | null; editable?: boolean; onChange?: (lat: number, lng: number) => void; height?: number };
const DEFAULT = { lat: 22.7196, lng: 75.8577 };
export function MapSurface({ lat, lng, editable = false, onChange, height = 218 }: Props): React.ReactElement { const [point, setPoint] = useState({ lat: lat ?? DEFAULT.lat, lng: lng ?? DEFAULT.lng }); const move = (next: { lat: number; lng: number }) => { setPoint(next); onChange?.(next.lat, next.lng); }; const region: Region = { latitude: point.lat, longitude: point.lng, latitudeDelta: 0.012, longitudeDelta: 0.012 }; const locate = async () => { if (!editable) return; const permission = await Location.requestForegroundPermissionsAsync(); if (permission.status !== 'granted') return; const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }); move({ lat: current.coords.latitude, lng: current.coords.longitude }); }; return <View style={{ height }}><MapView style={StyleSheet.absoluteFillObject} initialRegion={region} onPress={(event: MapPressEvent) => { if (editable) move({ lat: event.nativeEvent.coordinate.latitude, lng: event.nativeEvent.coordinate.longitude }); }}><Marker coordinate={{ latitude: point.lat, longitude: point.lng }} title="Outlet pickup pin" draggable={editable} onDragEnd={(event) => move({ lat: event.nativeEvent.coordinate.latitude, lng: event.nativeEvent.coordinate.longitude })} /></MapView>{editable ? <Pressable onPress={() => void locate()} style={styles.locate}><Icon name="locate" size={17} color={colors.brand[700]} /><Text variant="caption" weight="bold" color={colors.brand[700]}>Use my location</Text></Pressable> : null}</View>; }
const styles = StyleSheet.create({ locate: { position: 'absolute', right: 12, bottom: 12, backgroundColor: colors.white, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5 } });
