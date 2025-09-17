import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Paper,
  IconButton,
  Divider,
  Chip,
  Alert,
  Fade,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Terminal as TerminalIcon,
  Clear as ClearIcon,
  Help as HelpIcon,
  AccountBalance as BalanceIcon,
  Send as SendIcon,
  History as HistoryIcon,
  Person as PersonIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { MannShellLogin } from './MannShellLogin';
import { getProgression, addXp as addXpProgress } from '../../services/progressionService';

interface Command {
  name: string;
  description: string;
  usage: string;
  category: 'account' | 'transfer' | 'history' | 'admin' | 'system';
  execute: (args: string[]) => Promise<string>;
}

interface TerminalLine {
  type: 'command' | 'output' | 'error' | 'info';
  content: string;
  timestamp: Date;
}

export const MannShell: React.FC = () => {
  const { user } = useAuthContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<TerminalLine[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState('~');
  
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize terminal
  useEffect(() => {
    if (isAuthenticated) {
      addLine('info', `MannShell v1.0.0 - Welcome to MannBank Terminal`);
      addLine('info', `Logged in as: ${user?.email || 'Admin'}`);
      addLine('info', `Type 'help' for available commands or 'clear' to clear screen`);
      addLine('info', '');
    }
  }, [isAuthenticated, user]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const addLine = (type: TerminalLine['type'], content: string) => {
    setHistory(prev => [...prev, {
      type,
      content,
      timestamp: new Date()
    }]);
  };

  const executeCommand = async (command: string) => {
    if (!command.trim()) return;

    const [cmd, ...args] = command.trim().split(' ');
    const commandObj = commands.find(c => c.name === cmd.toLowerCase());

    // Add command with proper terminal prompt
    const prompt = `${user?.email?.split('@')[0] || 'admin'}@mannbank:~$`;
    addLine('command', `${prompt} ${command}`);
    setCommandHistory(prev => [...prev, command]);
    setHistoryIndex(-1);

    if (!commandObj) {
      addLine('error', `Command not found: ${cmd}. Type 'help' for available commands.`);
      return;
    }

    setIsLoading(true);
    try {
      const result = await commandObj.execute(args);
      addLine('output', result);
    } catch (error) {
      addLine('error', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeCommand(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setInput('');
        } else {
          setHistoryIndex(newIndex);
          setInput(commandHistory[newIndex]);
        }
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Auto-complete command
      const matches = commands.filter(c => c.name.startsWith(input.toLowerCase()));
      if (matches.length === 1) {
        setInput(matches[0].name + ' ');
      }
    }
  };

  const clearTerminal = () => {
    setHistory([]);
    addLine('info', `MannShell v1.0.0 - Terminal cleared`);
    addLine('info', '');
  };

  const getAccountBalance = async (): Promise<string> => {
    if (!user) return 'Not logged in';
    
    try {
      const { data: cards, error } = await supabase
        .from('bank_cards')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      if (!cards || cards.length === 0) {
        return 'No bank cards found. Create one first.';
      }

      let result = 'Account Balances:\n';
      result += '─'.repeat(50) + '\n';
      
      cards.forEach((card, index) => {
        result += `${index + 1}. Card ${card.card_number.slice(-4)}: ${card.balance} ${card.currency}\n`;
      });

      const totalBalance = cards.reduce((sum, card) => sum + (card.balance || 0), 0);
      result += '─'.repeat(50) + '\n';
      result += `Total: ${totalBalance} MR`;

      return result;
    } catch (error) {
      throw new Error('Failed to fetch account balance');
    }
  };

  const getTransactionHistory = async (args: string[]): Promise<string> => {
    if (!user) return 'Not logged in';

    const limit = parseInt(args[0]) || 10;

    try {
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      if (!transactions || transactions.length === 0) {
        return 'No transactions found.';
      }

      let result = `Transaction History (Last ${limit}):\n`;
      result += '─'.repeat(80) + '\n';
      result += 'Date       | Amount  | Currency | Description\n';
      result += '─'.repeat(80) + '\n';

      transactions.forEach(transaction => {
        const date = new Date(transaction.created_at).toLocaleDateString();
        const amount = transaction.amount || 0;
        const currency = transaction.currency || 'MR';
        const description = transaction.description || 'N/A';
        
        result += `${date.padEnd(10)} | ${amount.toString().padEnd(7)} | ${currency.padEnd(8)} | ${description}\n`;
      });

      return result;
    } catch (error) {
      throw new Error('Failed to fetch transaction history');
    }
  };

  const transferMoney = async (args: string[]): Promise<string> => {
    if (!user) return 'Not logged in';
    if (args.length < 2) return 'Usage: transfer <amount> <recipient_email>';

    const amount = parseFloat(args[0]);
    const recipientEmail = args[1];

    if (isNaN(amount) || amount <= 0) {
      return 'Invalid amount. Please enter a positive number.';
    }

    try {
      // Find recipient user
      const { data: recipient, error: userError } = await supabase
        .from('auth.users')
        .select('id, email')
        .eq('email', recipientEmail)
        .single();

      if (userError || !recipient) {
        return `User not found: ${recipientEmail}`;
      }

      // Get sender's card
      const { data: senderCard, error: senderError } = await supabase
        .from('bank_cards')
        .select('*')
        .eq('user_id', user.id)
        .eq('currency', 'MR')
        .single();

      if (senderError || !senderCard) {
        return 'No MR card found. Please create one first.';
      }

      if (senderCard.balance < amount) {
        return `Insufficient funds. Available: ${senderCard.balance} MR`;
      }

      // Get recipient's card
      const { data: recipientCard, error: recipientError } = await supabase
        .from('bank_cards')
        .select('*')
        .eq('user_id', recipient.id)
        .eq('currency', 'MR')
        .single();

      if (recipientError || !recipientCard) {
        return `Recipient has no MR card: ${recipientEmail}`;
      }

      // Perform transfer (align to RPC signature)
      const { error: transferError } = await supabase.rpc('handle_manpay_transaction', {
        sender_id_in: user.id,
        receiver_id_in: recipient.id,
        amount_in: amount
      });

      if (transferError) throw transferError;

      // Award social XP for transfer
      try {
        const { addSocialXpForAction } = await import('../../services/progressionService');
        await addSocialXpForAction(user.id, 'manpay_transfer', Number(amount || 0));
      } catch {}

      return `Transfer successful! Sent ${amount} MR to ${recipientEmail}`;
    } catch (error) {
      throw new Error('Transfer failed. Please try again.');
    }
  };

  const getProfile = async (): Promise<string> => {
    if (!user) return 'Not logged in';

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      let result = 'User Profile:\n';
      result += '─'.repeat(40) + '\n';
      result += `Email: ${user.email}\n`;
      result += `Name: ${profile?.full_name || 'Not set'}\n`;
      result += `Phone: ${profile?.phone || 'Not set'}\n`;
      result += `Created: ${new Date(user.created_at).toLocaleDateString()}\n`;
      result += `Last Login: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}`;
      try {
        const prog = await getProgression(user.id);
        if (prog) {
          result += `\nLevel: ${prog.level} (${prog.currentLevelXp}/${prog.nextLevelXp} XP)`;
        }
      } catch {}

      return result;
    } catch (error) {
      return 'Failed to fetch profile information';
    }
  };

  const getUsers = async (): Promise<string> => {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (!users || users.length === 0) {
        return 'No users found.';
      }

      let result = 'Registered Users:\n';
      result += '─'.repeat(80) + '\n';
      result += 'ID'.padEnd(8) + ' | ' + 'Email'.padEnd(25) + ' | ' + 'Name'.padEnd(20) + ' | ' + 'Created\n';
      result += '─'.repeat(80) + '\n';

      users.forEach(user => {
        const id = user.id.substring(0, 8);
        const email = (user.email || 'N/A').substring(0, 25);
        const name = user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : (user.first_name || user.last_name || 'N/A');
        const nameDisplay = name.substring(0, 20);
        const created = new Date(user.created_at).toLocaleDateString();
        
        result += `${id.padEnd(8)} | ${email.padEnd(25)} | ${nameDisplay.padEnd(20)} | ${created}\n`;
      });

      return result;
    } catch (error) {
      throw new Error('Failed to fetch users');
    }
  };

  const getUserCards = async (args: string[]): Promise<string> => {
    if (args.length < 1) return 'Usage: usercards <user_email_or_id>';

    const userIdentifier = args[0];

    try {
      // Find user by email or ID
      let userId = userIdentifier;
      if (userIdentifier.includes('@')) {
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, email, first_name, last_name')
          .eq('email', userIdentifier)
          .single();

        if (userError || !user) {
          return `User not found: ${userIdentifier}`;
        }
        userId = user.id;
      }

      // Get user's cards
      const { data: cards, error } = await supabase
        .from('bank_cards')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!cards || cards.length === 0) {
        return `No bank cards found for user: ${userIdentifier}`;
      }

      let result = `Bank Cards for ${userIdentifier}:\n`;
      result += '─'.repeat(70) + '\n';
      result += 'Card Number'.padEnd(15) + ' | ' + 'Balance'.padEnd(10) + ' | ' + 'Currency'.padEnd(8) + ' | ' + 'Type'.padEnd(10) + ' | ' + 'Created\n';
      result += '─'.repeat(70) + '\n';

      cards.forEach(card => {
        const cardNum = card.card_number ? `****${card.card_number.slice(-4)}` : 'N/A';
        const balance = (card.balance || 0).toString();
        const currency = card.currency || 'MR';
        const type = card.card_type || 'Standard';
        const created = new Date(card.created_at).toLocaleDateString();
        
        result += `${cardNum.padEnd(15)} | ${balance.padEnd(10)} | ${currency.padEnd(8)} | ${type.padEnd(10)} | ${created}\n`;
      });

      return result;
    } catch (error) {
      throw new Error('Failed to fetch user cards');
    }
  };

  const getUserHistory = async (args: string[]): Promise<string> => {
    if (args.length < 1) return 'Usage: userhistory <user_email_or_id> [limit]';

    const userIdentifier = args[0];
    const limit = parseInt(args[1]) || 20;

    try {
      // Find user by email or ID
      let userId = userIdentifier;
      if (userIdentifier.includes('@')) {
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, email, first_name, last_name')
          .eq('email', userIdentifier)
          .single();

        if (userError || !user) {
          return `User not found: ${userIdentifier}`;
        }
        userId = user.id;
      }

      // Get user's transaction history
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      if (!transactions || transactions.length === 0) {
        return `No transactions found for user: ${userIdentifier}`;
      }

      let result = `Transaction History for ${userIdentifier} (Last ${limit}):\n`;
      result += '─'.repeat(80) + '\n';
      result += 'Date'.padEnd(12) + ' | ' + 'Amount'.padEnd(10) + ' | ' + 'Currency'.padEnd(8) + ' | ' + 'Description'.padEnd(30) + ' | ' + 'Status\n';
      result += '─'.repeat(80) + '\n';

      transactions.forEach(transaction => {
        const date = new Date(transaction.created_at).toLocaleDateString();
        const amount = (transaction.amount || 0).toString();
        const currency = transaction.currency || 'MR';
        const description = (transaction.description || 'N/A').substring(0, 30);
        const status = transaction.status || 'Completed';
        
        result += `${date.padEnd(12)} | ${amount.padEnd(10)} | ${currency.padEnd(8)} | ${description.padEnd(30)} | ${status}\n`;
      });

      return result;
    } catch (error) {
      throw new Error('Failed to fetch user history');
    }
  };

  const getUserProfile = async (args: string[]): Promise<string> => {
    if (args.length < 1) return 'Usage: userprofile <user_email_or_id>';

    const userIdentifier = args[0];

    try {
      // Find user by email or ID
      let user;
      if (userIdentifier.includes('@')) {
        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', userIdentifier)
          .single();

        if (error || !userData) {
          return `User not found: ${userIdentifier}`;
        }
        user = userData;
      } else {
        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userIdentifier)
          .single();

        if (error || !userData) {
          return `User not found: ${userIdentifier}`;
        }
        user = userData;
      }

      let result = `User Profile: ${userIdentifier}\n`;
      result += '─'.repeat(50) + '\n';
      result += `ID: ${user.id}\n`;
      result += `Email: ${user.email || 'N/A'}\n`;
      result += `First Name: ${user.first_name || 'Not set'}\n`;
      result += `Last Name: ${user.last_name || 'Not set'}\n`;
      result += `Username: ${user.username || 'Not set'}\n`;
      result += `Is Admin: ${user.is_admin ? 'Yes' : 'No'}\n`;
      result += `Created: ${new Date(user.created_at).toLocaleString()}\n`;
      result += `Last Seen: ${user.last_seen ? new Date(user.last_seen).toLocaleString() : 'Never'}\n`;

      return result;
    } catch (error) {
      throw new Error('Failed to fetch user profile');
    }
  };

  const getSystemStats = async (): Promise<string> => {
    try {
      // Get user count
      const { count: userCount, error: userError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      if (userError) throw userError;

      // Get total transactions
      const { count: transactionCount, error: transactionError } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true });

      if (transactionError) throw transactionError;

      // Get total cards
      const { count: cardCount, error: cardError } = await supabase
        .from('bank_cards')
        .select('*', { count: 'exact', head: true });

      if (cardError) throw cardError;

      // Get total marketplace items
      const { count: marketplaceCount, error: marketplaceError } = await supabase
        .from('marketplace_items')
        .select('*', { count: 'exact', head: true });

      if (marketplaceError) throw marketplaceError;

      let result = 'System Statistics:\n';
      result += '─'.repeat(40) + '\n';
      result += `Total Users: ${userCount || 0}\n`;
      result += `Total Transactions: ${transactionCount || 0}\n`;
      result += `Total Bank Cards: ${cardCount || 0}\n`;
      result += `Marketplace Items: ${marketplaceCount || 0}\n`;
      result += `Server Time: ${new Date().toLocaleString()}\n`;

      return result;
    } catch (error) {
      throw new Error('Failed to fetch system statistics');
    }
  };

  const giveMoney = async (args: string[]): Promise<string> => {
    if (args.length < 2) return 'Usage: give <amount> <user_email_or_id> [description]';

    const amount = parseFloat(args[0]);
    const userIdentifier = args[1];
    const description = args[2] || 'Admin Give';

    if (isNaN(amount) || amount <= 0) {
      return 'Invalid amount. Please enter a positive number.';
    }

    try {
      // Find user by email or ID
      let userId;
      let userName;
      if (userIdentifier.includes('@')) {
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, email, first_name, last_name')
          .eq('email', userIdentifier)
          .single();

        if (userError || !user) {
          return `User not found: ${userIdentifier}`;
        }
        userId = user.id;
        userName = user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email;
      } else {
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, email, first_name, last_name')
          .eq('id', userIdentifier)
          .single();

        if (userError || !user) {
          return `User not found: ${userIdentifier}`;
        }
        userId = user.id;
        userName = user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email;
      }

      // Get user's active card
      const { data: card, error: cardError } = await supabase
        .from('bank_cards')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (cardError || !card) {
        return `User has no active bank card: ${userIdentifier}`;
      }

      const oldBalance = card.balance || 0;
      const newBalance = oldBalance + amount;

      // Update card balance
      const { error: updateError } = await supabase
        .from('bank_cards')
        .update({ balance: newBalance })
        .eq('id', card.id);

      if (updateError) throw updateError;

      // Create transaction record (skip if transaction logging fails)
      try {
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            sender_id: user?.id || null, // Use current admin user or null
            recipient_id: userId,
            amount: amount,
            currency: 'MR',
            description: description,
            sender_name: 'Admin',
            recipient_name: userName,
            status: 'completed'
          });

        if (transactionError) {
          console.warn('Transaction logging failed:', transactionError);
          // Don't throw error, just log it
        }
      } catch (transactionError) {
        console.warn('Transaction logging failed:', transactionError);
        // Don't throw error, just log it
      }

      return `Successfully gave ${amount} MR to ${userName} (${userIdentifier})\nNew balance: ${newBalance} MR`;
    } catch (error) {
      throw new Error('Failed to give money. Please try again.');
    }
  };

  const takeMoney = async (args: string[]): Promise<string> => {
    if (args.length < 2) return 'Usage: take <amount> <user_email_or_id> [description]';

    const amount = parseFloat(args[0]);
    const userIdentifier = args[1];
    const description = args[2] || 'Admin Take';

    if (isNaN(amount) || amount <= 0) {
      return 'Invalid amount. Please enter a positive number.';
    }

    try {
      // Find user by email or ID
      let userId;
      let userName;
      if (userIdentifier.includes('@')) {
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, email, first_name, last_name')
          .eq('email', userIdentifier)
          .single();

        if (userError || !user) {
          return `User not found: ${userIdentifier}`;
        }
        userId = user.id;
        userName = user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email;
      } else {
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, email, first_name, last_name')
          .eq('id', userIdentifier)
          .single();

        if (userError || !user) {
          return `User not found: ${userIdentifier}`;
        }
        userId = user.id;
        userName = user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email;
      }

      // Get user's active card
      const { data: card, error: cardError } = await supabase
        .from('bank_cards')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (cardError || !card) {
        return `User has no active bank card: ${userIdentifier}`;
      }

      const oldBalance = card.balance || 0;
      
      if (oldBalance < amount) {
        return `Insufficient funds. User has ${oldBalance} MR, trying to take ${amount} MR`;
      }

      const newBalance = oldBalance - amount;

      // Update card balance
      const { error: updateError } = await supabase
        .from('bank_cards')
        .update({ balance: newBalance })
        .eq('id', card.id);

      if (updateError) throw updateError;

      // Create transaction record (skip if transaction logging fails)
      try {
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            sender_id: userId,
            recipient_id: user?.id || userId, // Use current admin user or fallback to sender
            amount: amount,
            currency: 'MR',
            description: description,
            sender_name: userName,
            recipient_name: 'Admin',
            status: 'completed'
          });

        if (transactionError) {
          console.warn('Transaction logging failed:', transactionError);
          // Don't throw error, just log it
        }
      } catch (transactionError) {
        console.warn('Transaction logging failed:', transactionError);
        // Don't throw error, just log it
      }

      return `Successfully took ${amount} MR from ${userName} (${userIdentifier})\nNew balance: ${newBalance} MR`;
    } catch (error) {
      throw new Error('Failed to take money. Please try again.');
    }
  };

  const setBalance = async (args: string[]): Promise<string> => {
    if (args.length < 2) return 'Usage: setbalance <amount> <user_email_or_id> [description]';

    const amount = parseFloat(args[0]);
    const userIdentifier = args[1];
    const description = args[2] || 'Admin Set Balance';

    if (isNaN(amount) || amount < 0) {
      return 'Invalid amount. Please enter a non-negative number.';
    }

    try {
      // Find user by email or ID
      let userId;
      let userName;
      if (userIdentifier.includes('@')) {
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, email, first_name, last_name')
          .eq('email', userIdentifier)
          .single();

        if (userError || !user) {
          return `User not found: ${userIdentifier}`;
        }
        userId = user.id;
        userName = user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email;
      } else {
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, email, first_name, last_name')
          .eq('id', userIdentifier)
          .single();

        if (userError || !user) {
          return `User not found: ${userIdentifier}`;
        }
        userId = user.id;
        userName = user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email;
      }

      // Get user's active card
      const { data: card, error: cardError } = await supabase
        .from('bank_cards')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (cardError || !card) {
        return `User has no active bank card: ${userIdentifier}`;
      }

      const oldBalance = card.balance || 0;
      const difference = amount - oldBalance;

      // Update card balance
      const { error: updateError } = await supabase
        .from('bank_cards')
        .update({ balance: amount })
        .eq('id', card.id);

      if (updateError) throw updateError;

      // Create transaction record if there's a difference (skip if transaction logging fails)
      if (difference !== 0) {
        try {
          const { error: transactionError } = await supabase
            .from('transactions')
            .insert({
              sender_id: difference > 0 ? (user?.id || null) : userId,
              recipient_id: difference > 0 ? userId : (user?.id || userId),
              amount: Math.abs(difference),
              currency: 'MR',
              description: description,
              sender_name: difference > 0 ? 'Admin' : userName,
              recipient_name: difference > 0 ? userName : 'Admin',
              status: 'completed'
            });

          if (transactionError) {
            console.warn('Transaction logging failed:', transactionError);
            // Don't throw error, just log it
          }
        } catch (transactionError) {
          console.warn('Transaction logging failed:', transactionError);
          // Don't throw error, just log it
        }
      }

      return `Successfully set balance to ${amount} MR for ${userName} (${userIdentifier})\nPrevious balance: ${oldBalance} MR\nNew balance: ${amount} MR`;
    } catch (error) {
      throw new Error('Failed to set balance. Please try again.');
    }
  };

  const getHelp = (): string => {
    const categories = {
      account: commands.filter(c => c.category === 'account'),
      transfer: commands.filter(c => c.category === 'transfer'),
      history: commands.filter(c => c.category === 'history'),
      admin: commands.filter(c => c.category === 'admin'),
      system: commands.filter(c => c.category === 'system')
    };

    let result = 'MannShell Commands:\n';
    result += '═'.repeat(60) + '\n\n';

    Object.entries(categories).forEach(([category, cmds]) => {
      if (cmds.length > 0) {
        result += `${category.toUpperCase()} COMMANDS:\n`;
        result += '─'.repeat(20) + '\n';
        cmds.forEach(cmd => {
          result += `  ${cmd.name.padEnd(12)} - ${cmd.description}\n`;
          result += `    Usage: ${cmd.usage}\n\n`;
        });
      }
    });

    result += 'TIPS:\n';
    result += '─'.repeat(10) + '\n';
    result += '• Use ↑/↓ arrows to navigate command history\n';
    result += '• Use Tab for command auto-completion\n';
    result += '• Type "clear" to clear the terminal\n';
    result += '• All amounts are in MR (MannRu currency)';

    return result;
  };

  const commands: Command[] = [
    {
      name: 'help',
      description: 'Show available commands',
      usage: 'help',
      category: 'system',
      execute: async () => getHelp()
    },
    {
      name: 'xptop',
      description: 'Show top users by XP',
      usage: 'xptop [limit]',
      category: 'admin',
      execute: async (args) => {
        const limit = Math.max(1, Math.min(50, parseInt(args[0]) || 10));
        try {
          const { data, error } = await supabase
            .from('user_progression_leaderboard')
            .select('user_id, total_xp, display_name, email')
            .order('total_xp', { ascending: false })
            .limit(limit);
          if (error) throw error;
          if (!data || data.length === 0) return 'No leaderboard data yet.';
          let result = `Top ${limit} by XP:\n`;
          result += '─'.repeat(60) + '\n';
          data.forEach((row: any, idx: number) => {
            const name = row.display_name || row.email || row.user_id?.slice(0, 8) || 'User';
            result += `${String(idx + 1).padEnd(3)} ${name.padEnd(24)} ${String(row.total_xp).padStart(8)} XP\n`;
          });
          return result;
        } catch (e: any) {
          return `Failed to fetch leaderboard: ${e.message || 'Unknown error'}`;
        }
      }
    },
    {
      name: 'xp',
      description: 'Show your XP and level',
      usage: 'xp',
      category: 'account',
      execute: async () => {
        if (!user) return 'Not logged in';
        const prog = await getProgression(user.id);
        if (!prog) return 'Progression not available.';
        return `Level ${prog.level}\nXP: ${prog.currentLevelXp}/${prog.nextLevelXp} (Total: ${prog.xp})\nTo next: ${prog.xpToNextLevel}`;
      }
    },
    {
      name: 'addxp',
      description: 'Grant XP to a user (admin/local only)',
      usage: 'addxp <amount> [user_id]',
      category: 'admin',
      execute: async (args) => {
        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount <= 0) return 'Usage: addxp <positive_amount> [user_id]';
        const targetId = args[1] || user?.id;
        if (!targetId) return 'No target user.';
        const prog = await addXpProgress(targetId, amount);
        if (!prog) return 'Failed to add XP.';
        return `Added ${amount} XP. Level ${prog.level} (${prog.currentLevelXp}/${prog.nextLevelXp}).`;
      }
    },
    {
      name: 'clear',
      description: 'Clear the terminal screen',
      usage: 'clear',
      category: 'system',
      execute: async () => {
        clearTerminal();
        return '';
      }
    },
    {
      name: 'balance',
      description: 'Show account balance',
      usage: 'balance',
      category: 'account',
      execute: async () => getAccountBalance()
    },
    {
      name: 'profile',
      description: 'Show user profile information',
      usage: 'profile',
      category: 'account',
      execute: async () => getProfile()
    },
    {
      name: 'transfer',
      description: 'Transfer money to another user',
      usage: 'transfer <amount> <recipient_email>',
      category: 'transfer',
      execute: async (args) => transferMoney(args)
    },
    {
      name: 'history',
      description: 'Show transaction history',
      usage: 'history [limit]',
      category: 'history',
      execute: async (args) => getTransactionHistory(args)
    },
    {
      name: 'ls',
      description: 'List available commands',
      usage: 'ls',
      category: 'system',
      execute: async () => {
        const cmdList = commands.map(c => c.name).join(' ');
        return `Available commands: ${cmdList}`;
      }
    },
    {
      name: 'whoami',
      description: 'Show current user',
      usage: 'whoami',
      category: 'system',
      execute: async () => user?.email || 'Not logged in'
    },
    {
      name: 'date',
      description: 'Show current date and time',
      usage: 'date',
      category: 'system',
      execute: async () => new Date().toLocaleString()
    },
    {
      name: 'users',
      description: 'List all registered users',
      usage: 'users',
      category: 'admin',
      execute: async () => getUsers()
    },
    {
      name: 'usercards',
      description: 'Show bank cards for a specific user',
      usage: 'usercards <user_email_or_id>',
      category: 'admin',
      execute: async (args) => getUserCards(args)
    },
    {
      name: 'userhistory',
      description: 'Show transaction history for a specific user',
      usage: 'userhistory <user_email_or_id> [limit]',
      category: 'admin',
      execute: async (args) => getUserHistory(args)
    },
    {
      name: 'userprofile',
      description: 'Show detailed profile for a specific user',
      usage: 'userprofile <user_email_or_id>',
      category: 'admin',
      execute: async (args) => getUserProfile(args)
    },
    {
      name: 'stats',
      description: 'Show system statistics',
      usage: 'stats',
      category: 'admin',
      execute: async () => getSystemStats()
    },
    {
      name: 'top',
      description: 'Show top users by balance',
      usage: 'top [limit]',
      category: 'admin',
      execute: async (args) => {
        const limit = parseInt(args[0]) || 10;
        try {
          const { data: cards, error } = await supabase
            .from('bank_cards')
            .select('user_id, balance, currency')
            .order('balance', { ascending: false })
            .limit(limit);

          if (error) throw error;

          if (!cards || cards.length === 0) {
            return 'No bank cards found.';
          }

          let result = `Top ${limit} Users by Balance:\n`;
          result += '─'.repeat(60) + '\n';
          result += 'Rank'.padEnd(6) + ' | ' + 'User ID'.padEnd(12) + ' | ' + 'Balance'.padEnd(15) + ' | ' + 'Currency\n';
          result += '─'.repeat(60) + '\n';

          cards.forEach((card, index) => {
            const rank = (index + 1).toString();
            const userId = card.user_id.substring(0, 12);
            const balance = (card.balance || 0).toString();
            const currency = card.currency || 'MR';
            
            result += `${rank.padEnd(6)} | ${userId.padEnd(12)} | ${balance.padEnd(15)} | ${currency}\n`;
          });

          return result;
        } catch (error) {
          throw new Error('Failed to fetch top users');
        }
      }
    },
    {
      name: 'search',
      description: 'Search for users by email or name',
      usage: 'search <query>',
      category: 'admin',
      execute: async (args) => {
        if (args.length < 1) return 'Usage: search <query>';

        const query = args[0];

        try {
          const { data: users, error } = await supabase
            .from('users')
            .select('id, email, first_name, last_name, created_at')
            .or(`email.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
            .order('created_at', { ascending: false })
            .limit(20);

          if (error) throw error;

          if (!users || users.length === 0) {
            return `No users found matching: ${query}`;
          }

          let result = `Search Results for "${query}":\n`;
          result += '─'.repeat(80) + '\n';
          result += 'ID'.padEnd(8) + ' | ' + 'Email'.padEnd(25) + ' | ' + 'Name'.padEnd(20) + ' | ' + 'Created\n';
          result += '─'.repeat(80) + '\n';

          users.forEach(user => {
            const id = user.id.substring(0, 8);
            const email = (user.email || 'N/A').substring(0, 25);
            const name = user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : (user.first_name || user.last_name || 'N/A');
            const nameDisplay = name.substring(0, 20);
            const created = new Date(user.created_at).toLocaleDateString();
            
            result += `${id.padEnd(8)} | ${email.padEnd(25)} | ${nameDisplay.padEnd(20)} | ${created}\n`;
          });

          return result;
        } catch (error) {
          throw new Error('Failed to search users');
        }
      }
    },
    {
      name: 'give',
      description: 'Give money to a user (admin only)',
      usage: 'give <amount> <user_email_or_id> [description]',
      category: 'admin',
      execute: async (args) => giveMoney(args)
    },
    {
      name: 'take',
      description: 'Take money from a user (admin only)',
      usage: 'take <amount> <user_email_or_id> [description]',
      category: 'admin',
      execute: async (args) => takeMoney(args)
    },
    {
      name: 'setbalance',
      description: 'Set exact balance for a user (admin only)',
      usage: 'setbalance <amount> <user_email_or_id> [description]',
      category: 'admin',
      execute: async (args) => setBalance(args)
    }
  ];

  const getLineColor = (type: TerminalLine['type']) => {
    switch (type) {
      case 'command': return '#ffffff';
      case 'error': return theme.palette.error.main;
      case 'info': return theme.palette.info.main;
      case 'output': return theme.palette.text.primary;
      default: return theme.palette.text.primary;
    }
  };

  const getLineIcon = (type: TerminalLine['type']) => {
    switch (type) {
      case 'command': return '';
      case 'error': return '✗';
      case 'info': return 'ℹ';
      case 'output': return ' ';
      default: return ' ';
    }
  };

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <MannShellLogin onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <Box sx={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      height: '100vh',
      width: '100vw',
      display: 'flex', 
      flexDirection: 'column', 
      bgcolor: '#1e1e1e',
      zIndex: 9999
    }}>

      {/* Terminal Output */}
      <Box
        ref={terminalRef}
        sx={{
          flexGrow: 1,
          p: 2,
          overflow: 'auto',
          fontFamily: 'monospace',
          fontSize: isMobile ? '0.875rem' : '0.9rem',
          lineHeight: 1.4,
          bgcolor: '#1e1e1e',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {history.map((line, index) => (
          <Box key={index} sx={{ mb: 0.5, display: 'flex', alignItems: 'flex-start' }}>
            {line.type === 'command' ? (
              // Special rendering for commands with colored prompt
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <Typography
                  component="span"
                  sx={{
                    color: '#4caf50',
                    fontFamily: 'monospace',
                    fontSize: 'inherit',
                    fontWeight: 'bold'
                  }}
                >
                  {line.content.split(' ')[0]}:
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    color: '#87ceeb',
                    fontFamily: 'monospace',
                    fontSize: 'inherit',
                    fontWeight: 'bold',
                    mr: 1
                  }}
                >
                  ~$
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    color: '#ffffff',
                    fontFamily: 'monospace',
                    fontSize: 'inherit'
                  }}
                >
                  {line.content.split(' ').slice(1).join(' ')}
                </Typography>
              </Box>
            ) : (
              // Regular rendering for other line types
              <>
                <Typography
                  component="span"
                  sx={{
                    color: getLineColor(line.type),
                    fontFamily: 'monospace',
                    fontSize: 'inherit',
                    mr: 1,
                    minWidth: '20px'
                  }}
                >
                  {getLineIcon(line.type)}
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    color: getLineColor(line.type),
                    fontFamily: 'monospace',
                    fontSize: 'inherit',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  {line.content}
                </Typography>
              </>
            )}
          </Box>
        ))}
        
        {isLoading && (
          <Fade in={isLoading}>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <Typography sx={{ color: '#4caf50', mr: 1 }}>ℹ</Typography>
              <Typography sx={{ color: '#4caf50', fontFamily: 'monospace' }}>
                Processing...
              </Typography>
            </Box>
          </Fade>
        )}
        
        {/* Command Line Input */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          mt: 'auto',
          p: 1,
          bgcolor: '#1e1e1e'
        }}>
          <Typography sx={{ 
            color: '#4caf50', 
            mr: 1, 
            fontFamily: 'monospace',
            fontSize: isMobile ? '0.875rem' : '0.9rem',
            fontWeight: 'bold'
          }}>
            {user?.email?.split('@')[0] || 'admin'}@mannbank:
          </Typography>
          <Typography sx={{ 
            color: '#87ceeb', 
            mr: 1, 
            fontFamily: 'monospace',
            fontSize: isMobile ? '0.875rem' : '0.9rem',
            fontWeight: 'bold'
          }}>
            ~$
          </Typography>
          <TextField
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder=""
            variant="standard"
            fullWidth
            InputProps={{
              disableUnderline: true,
              sx: {
                color: '#ffffff',
                fontFamily: 'monospace',
                fontSize: isMobile ? '0.875rem' : '0.9rem',
                '& input': {
                  padding: 0,
                  caretColor: '#4caf50',
                  '&::placeholder': {
                    color: '#888',
                    opacity: 1
                  }
                }
              }
            }}
            sx={{
              '& .MuiInput-root': {
                '&:before': { display: 'none' },
                '&:after': { display: 'none' }
              }
            }}
          />
        </Box>
      </Box>
    </Box>
  );
};
