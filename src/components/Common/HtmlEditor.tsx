import React from 'react';
import { TextField } from '@mui/material';

interface HtmlEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export const HtmlEditor: React.FC<HtmlEditorProps> = ({ value, onChange }) => {
  return (
    <TextField
      label="HTML Content"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      multiline
      rows={10}
      fullWidth
    />
  );
};
