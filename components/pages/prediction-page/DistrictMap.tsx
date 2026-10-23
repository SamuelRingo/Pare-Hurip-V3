/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { LatLngExpression } from "leaflet";
import * as turf from "@turf/turf";
import { GeoJsonObject } from "geojson";

import { yAxisValueMap } from "@/lib/planting-phase/constants";

interface DistrictMapProps {
  geoJsonDistrict: any;
  geoJsonRiceField: any;
  phaseData: any[];
  selectedMonth: string;
  phaseColorMapping: (phase: number | null) => string;
}

const DistrictMap: React.FC<DistrictMapProps> = ({
  geoJsonDistrict,
  geoJsonRiceField,
  phaseData,
  selectedMonth,
  phaseColorMapping,
}) => {
  const center: LatLngExpression = [-7.35, 108.22];

  const phaseLookup = useMemo(() => {
    const lookup = new Map();
    phaseData.forEach((d) => {
      lookup.set(d.district, d[selectedMonth]);
    });
    return lookup;
  }, [phaseData, selectedMonth]);

  const processedRiceFieldGeoJSON = useMemo(() => {
    if (!geoJsonRiceField || !geoJsonRiceField.features || phaseLookup.size === 0) {
      return null;
    }

    const processedFeatures = geoJsonRiceField.features.map((riceFieldFeature: any) => {
      const pointInRiceField = turf.pointOnFeature(riceFieldFeature);
      let districtName = "Tidak Diketahui";

      for (const districtFeature of geoJsonDistrict.features) {
        if (
          districtFeature.properties &&
          districtFeature.properties.KECAMATAN &&
          turf.booleanPointInPolygon(pointInRiceField, districtFeature)
        ) {
          districtName = districtFeature.properties.KECAMATAN;
          break;
        }
      }

      const phase = phaseLookup.get(districtName);
      const color = phaseColorMapping(phase ?? null);

      return {
        ...riceFieldFeature,
        properties: {
          ...riceFieldFeature.properties,
          district: districtName,
          phase: phase,
          color: color,
        },
      };
    });

    return { type: "FeatureCollection", features: processedFeatures } as GeoJsonObject;
  }, [geoJsonRiceField, geoJsonDistrict, phaseLookup, phaseColorMapping]);

  const styleRiceField = (feature: any) => {
    const defaultFillColor = feature.properties.color || "#808080";
    let fillOpacity = 0.8;

    if (
      feature.properties.district === "Kawalu" ||
      feature.properties.district === "Tamansari"
    ) {
      fillOpacity = 0.4;
    }

    return {
      fillColor: defaultFillColor,
      weight: 0.5,
      color: "white",
      fillOpacity: fillOpacity,
    };
  };

  const styleDistrictBoundary = () => {
    return {
      fillColor: "transparent",
      weight: 2,
      color: "#808080",
      fillOpacity: 0,
    };
  };

  const onEachRiceField = (feature: any, layer: any) => {
    const { district, phase } = feature.properties;
    layer.bindTooltip(
      `Kecamatan: ${district}<br/>Fase: ${yAxisValueMap[String(phase)] || "N/A"}`
    );
  };

  const onEachDistrictBoundary = (feature: any, layer: any) => {
    layer.bindTooltip(feature.properties.KECAMATAN, {
      permanent: true,
      direction: "center",
      className: "district-label",
    });
  };

  return (
    <MapContainer
      center={center}
      scrollWheelZoom={false}
      zoom={12}
      style={{ height: "500px", width: "100%", borderRadius: "8px", zIndex: 1 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {geoJsonDistrict && (
        <GeoJSON
          data={geoJsonDistrict}
          style={styleDistrictBoundary}
          onEachFeature={onEachDistrictBoundary}
        />
      )}

      {processedRiceFieldGeoJSON && (
        <GeoJSON
          key={selectedMonth}
          data={processedRiceFieldGeoJSON}
          style={styleRiceField}
          onEachFeature={onEachRiceField}
        />
      )}
    </MapContainer>
  );
};

export default DistrictMap;
