import React from 'react';
import { AlumniMapDirectory } from './AlumniMapDirectory';

interface MapViewProps {
  onViewProfile: (profileId: number) => void;
}

export const MapView: React.FC<MapViewProps> = ({ onViewProfile }) => {
  return <AlumniMapDirectory onViewProfile={onViewProfile} />;
};

export default MapView;
