import React from 'react';
import { 
  Box, 
  Typography, 
  FormControlLabel, 
  Switch, 
  Slider,
  Stack
} from '@mui/material';

interface SettingsProps {
  showDevSettings: boolean;
  setShowDevSettings: (value: boolean) => void;
  magnifierEnabled: boolean;
  setMagnifierEnabled: (value: boolean) => void;
  magnificationSize: number;
  setMagnificationSize: (value: number) => void;
}

const Settings: React.FC<SettingsProps> = ({ 
  showDevSettings, 
  setShowDevSettings,
  magnifierEnabled,
  setMagnifierEnabled,
  magnificationSize,
  setMagnificationSize
}) => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Настройки
      </Typography>

      <Stack spacing={3} sx={{ mb: 3 }}>
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={magnifierEnabled}
                onChange={(e) => setMagnifierEnabled(e.target.checked)}
              />
            }
            label="Увеличение боковой панели"
          />
          
          {magnifierEnabled && (
            <Box sx={{ mt: 2, pl: 4 }}>
              <Typography gutterBottom>Размер увеличения: {magnificationSize.toFixed(1)}x</Typography>
              <Slider
                value={magnificationSize}
                onChange={(_, value) => setMagnificationSize(value as number)}
                min={1.0}
                max={2.0}
                step={0.1}
                marks={[
                  { value: 1.0, label: '1x' },
                  { value: 1.5, label: '1.5x' },
                  { value: 2.0, label: '2x' }
                ]}
              />
            </Box>
          )}
        </Box>

        {showDevSettings && (
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={showDevSettings}
                  onChange={(e) => setShowDevSettings(e.target.checked)}
                />
              }
              label="Режим разработчика"
            />
          </Box>
        )}
      </Stack>
    </Box>
  );
};

export default Settings;
