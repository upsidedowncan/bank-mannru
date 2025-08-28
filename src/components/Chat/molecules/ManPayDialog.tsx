import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box
} from '@mui/material';
import { Send as SendIcon, Money as MoneyIcon } from '@mui/icons-material';

interface ManPayDialogProps {
  open: boolean;
  onClose: () => void;
  onSend: (amount: number) => void;
  receiverName: string;
}

export const ManPayDialog: React.FC<ManPayDialogProps> = ({ open, onClose, onSend, receiverName }) => {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const handleSend = () => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError('Пожалуйста, введите корректную сумму.');
      return;
    }
    setError('');
    onSend(numericAmount);
    onClose();
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setAmount(e.target.value);
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MoneyIcon color="primary" />
          <Typography variant="h6">Перевод ManPay</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography gutterBottom>
          Вы отправляете деньги <strong>{receiverName}</strong>.
        </Typography>
        <TextField
          autoFocus
          margin="dense"
          id="amount"
          label="Сумма (МР)"
          type="number"
          fullWidth
          variant="outlined"
          value={amount}
          onChange={handleAmountChange}
          error={!!error}
          helperText={error}
          InputProps={{
            startAdornment: <MoneyIcon color="action" sx={{ mr: 1 }} />,
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button onClick={handleSend} variant="contained" startIcon={<SendIcon />}>
          Отправить
        </Button>
      </DialogActions>
    </Dialog>
  );
};
