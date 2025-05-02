import React from 'react';

interface DevTestingProps {
  visible: boolean;
  onClose: () => void;
}

declare const DevTesting: React.FC<DevTestingProps>;

export default DevTesting; 