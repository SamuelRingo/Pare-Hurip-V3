/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { LatLngExpression } from "leaflet";
import { GeoJsonObject } from "geojson";

import { yAxisValueMap, formatKsaDate } from "@/lib/planting-phase/constants";

interface TasikmalayaCityMapProps {
  geoJsonDistrict: any;
  /** Dominant phase per district for each month: [{ district, "2026-06": phase, ... }] */
  phaseData: any[];
  phaseColorMapping: (phase: number | null) => string;
  selectedMonth: string;
}

const TasikmalayaCityMap: React.FC<TasikmalayaCityMapProps> = ({
  geoJsonDistrict,
  phaseData,
  phaseColorMapping,
  selectedMonth,
}) => {
  const center: LatLngExpression = [-7.35, 108.22];

  const phaseLookup = useMemo(() => {
    const lookup = new Map<string, number | null>();
    phaseData.forEach((d: any) => {
      const phase = d[selectedMonth];
      lookup.set(d.district, phase ?? null);
    });
    return lookup;
  }, [phaseData, selectedMonth]);

  const processedDistrictGeoJSON = useMemo(() => {
    if (!geoJsonDistrict || !geoJsonDistrict.features) {
      return null;
    }

    const processedFeatures = geoJsonDistrict.features.map((districtFeature: any) => {
      const phase = phaseLookup.get(districtFeature.properties.KECAMATAN) ?? null;
      const color = phaseColorMapping(phase);
      return {
        ...districtFeature,
        properties: {
          ...districtFeature.properties,
          color: color,
          phase: phase,
        },
      };
    });

    return { type: "FeatureCollection", features: processedFeatures } as GeoJsonObject;
  }, [geoJsonDistrict, phaseLookup, phaseColorMapping]);

  const styleDistrict = (feature: any) => {
    const fillColor = feature.properties.color || "#BDBDBD";
    return {
      fillColor: fillColor,
      weight: 2,
      color: "#FFFFFF",
      fillOpacity: 0.7,
    };
  };

  const onEachDistrict = (feature: any, layer: any) => {
    layer.bindTooltip(`${feature.properties.KECAMATAN}`, {
      permanent: true,
      direction: "center",
      className: "district-label",
    });

    const phaseLabel =
      feature.properties.phase != null
        ? yAxisValueMap[String(feature.properties.phase)] || "N/A"
        : "Belum ada data";
    layer.bindPopup(
      `<h3>Fase Dominan ${feature.properties.KECAMATAN} (${formatKsaDate(selectedMonth)}):</h3><p><strong>${phaseLabel}</strong></p>`
    );
  };

  return (
    <MapContainer
      key={selectedMonth}
      center={center}
      zoom={11}
      scrollWheelZoom={false}
      style={{ height: "500px", width: "100%", borderRadius: "8px", zIndex: 1 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {processedDistrictGeoJSON && (
        <GeoJSON
          data={processedDistrictGeoJSON}
          style={styleDistrict}
          onEachFeature={onEachDistrict}
        />
      )}
    </MapContainer>
  );
};

export default TasikmalayaCityMap;
