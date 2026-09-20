"use client";

import { useEffect } from "react";
import { Circle, CircleMarker, MapContainer, TileLayer, useMap } from "react-leaflet";

function Recenter({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lon], 14, { animate: true }); }, [lat, lon, map]);
  return null;
}

export default function RiskMap({ lat, lon, name }: { lat: number; lon: number; name: string }) {
  return (
    <MapContainer center={[lat, lon]} zoom={14} scrollWheelZoom className="h-full w-full" aria-label={`${name}风险地图`}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Circle center={[lat, lon]} radius={1200} pathOptions={{ color: "#ff5a36", fillColor: "#ff5a36", fillOpacity: 0.12, weight: 2 }} />
      <CircleMarker center={[lat, lon]} radius={8} pathOptions={{ color: "#ffffff", fillColor: "#ff5a36", fillOpacity: 1, weight: 3 }} />
      <Recenter lat={lat} lon={lon} />
    </MapContainer>
  );
}
