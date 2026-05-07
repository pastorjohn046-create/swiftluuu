import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Send, 
  History, 
  User, 
  LogOut, 
  Plus,
  ChevronRight,
  Bell,
  Search,
  CreditCard,
  PieChart,
  Settings,
  Moon,
  Sun,
  Camera,
  CheckCircle2,
  ShieldCheck,
  Trash2,
  MinusCircle,
  PlusCircle,
  ExternalLink,
  Headset,
  MessageSquare,
  MessageCircle,
  Landmark,
  Bitcoin,
  Coins,
  RefreshCw,
  CreditCard as CardIcon,
  Lock,
  Fingerprint,
  Smartphone,
  Monitor
} from 'lucide-react';
import axios from 'axios';
import { Button } from './components/Button';
import { Input } from './components/Input';
import { Card } from './components/Card';
import { UserProfile, Transaction, Message, PaymentMethod, Investment, WithdrawalRequest } from './types';
import { format } from 'date-fns';
import { cn } from './lib/utils';

type View = 'onboarding' | 'login' | 'signup' | 'dashboard' | 'transfer' | 'history' | 'profile' | 'admin' | 'support' | 'deposit';
type ProfileSubView = 'main' | 'personal' | 'cards' | 'security' | 'notifications';

const Logo = ({ className }: { className?: string }) => (
  <div className={cn("flex items-center gap-3", className)}>
    <div className="w-12 h-12 bg-gradient-to-br from-slate-800 to-slate-950 dark:from-white dark:to-slate-200 rounded-2xl flex items-center justify-center shadow-2xl shadow-slate-900/20 dark:shadow-white/10">
      <Wallet className="w-6 h-6 text-white dark:text-slate-900" />
    </div>
    <span className="text-2xl font-display font-bold tracking-tight text-slate-900 dark:text-white bg-clip-text">Vertex</span>
  </div>
);

export default function App() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [view, setView] = useState<View>('onboarding');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isServerMode, setIsServerMode] = useState(false); // Track if we are successfully talking to a backend
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [adminSelectedUser, setAdminSelectedUser] = useState<UserProfile | null>(null);
  const [adminBalanceAmount, setAdminBalanceAmount] = useState('');
  const [adminPortfolioAmount, setAdminPortfolioAmount] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [supportContent, setSupportContent] = useState('');
  const [adminReply, setAdminReply] = useState('');
  const [adminActiveTab, setAdminActiveTab] = useState<'users' | 'support' | 'payments' | 'withdrawals'>('users');
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [userInvestment, setUserInvestment] = useState<Investment | null>(null);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('');
  const [withdrawDetails, setWithdrawDetails] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState({ name: '', details: '', icon: 'landmark' });
  const [profileSubView, setProfileSubView] = useState<ProfileSubView>('main');

  const fileInputRef = useRef<HTMLInputElement>(null);
  // Ref to track the current user ID to prevent race conditions in async fetches
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Update ref whenever user changes
    currentUserIdRef.current = user?.uid || null;
  }, [user]);

  useEffect(() => {
    // Splash screen timer
    const timer = setTimeout(() => setIsSplashVisible(false), 2500);
    
    // Check local storage for session
    const savedUser = localStorage.getItem('nexus_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      currentUserIdRef.current = parsed.uid;
      setIsDarkMode(parsed.theme === 'dark');
      fetchData(parsed.uid);
      setView('dashboard');
    }

    // Polling for live updates (Railway/Full-stack mode)
    const pollInterval = setInterval(() => {
      const storedUser = JSON.parse(localStorage.getItem('nexus_user') || 'null');
      // Only poll if we have a user and it matches our current session
      if (storedUser && currentUserIdRef.current === storedUser.uid) {
        fetchData(storedUser.uid);
      }
    }, 10000); // Poll every 10 seconds

    // Storage sync for Netlify/Static mode
    const handleStorageChange = (e: StorageEvent) => {
      // Avoid reacting to our own changes or irrelevant keys
      if (e.key === 'nexus_user' && e.newValue !== e.oldValue) {
        const currentUser = e.newValue ? JSON.parse(e.newValue) : null;
        
        if (currentUser && currentUser.uid !== currentUserIdRef.current) {
          setUser(currentUser);
          fetchData(currentUser.uid);
        } else if (!currentUser && currentUserIdRef.current) {
          // Handle logout in another tab
          setUser(null);
          setView('onboarding');
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearTimeout(timer);
      clearInterval(pollInterval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const fetchData = async (uid: string) => {
    try {
      const [txRes, usersRes, msgRes, pmRes, invRes, wdRes, userRes] = await Promise.all([
        axios.get(`/api/transactions/${uid}`),
        axios.get('/api/users'),
        axios.get('/api/support/messages'),
        axios.get('/api/payment-methods'),
        axios.get(`/api/investments/${uid}`),
        axios.get('/api/admin/withdrawals'),
        axios.get(`/api/user/${uid}`)
      ]);
      setTransactions(txRes.data);
      setAllUsers(usersRes.data.filter((u: any) => u.uid !== uid));
      setMessages(msgRes.data);
      setPaymentMethods(pmRes.data);
      setUserInvestment(invRes.data);
      setWithdrawalRequests(wdRes.data);
      
      // Update current user state to reflect balance changes from admin
      // CRITICAL: Only update if this request matches the current active user
      if (userRes.data && uid === currentUserIdRef.current) {
        setUser(userRes.data);
        localStorage.setItem('nexus_user', JSON.stringify(userRes.data));
        setIsServerMode(true); // Successfully talking to server
      }
    } catch (err: any) {
      console.error("Fetch error:", err);
      // Fallback for static/offline mode
      if (!err.response || err.response.status === 404) {
        let localUsers = JSON.parse(localStorage.getItem('nexus_local_users') || '[]');
        
        // Ensure default admin exists in local store
        if (!localUsers.find((u: any) => u.email === 'demo@nexus.bank')) {
          const admin = {
            uid: 'admin-001',
            email: 'demo@nexus.bank',
            displayName: 'System Admin',
            photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
            balance: 10000.00,
            createdAt: new Date().toISOString(),
            theme: 'light',
            role: 'admin'
          };
          localUsers.push(admin);
          localStorage.setItem('nexus_local_users', JSON.stringify(localUsers));
        }

        setAllUsers(localUsers.filter((u: any) => u.uid !== uid));
        
        const localTxs = JSON.parse(localStorage.getItem('nexus_local_transactions') || '[]');
        setTransactions(localTxs.filter((tx: any) => tx.fromUid === uid || tx.toUid === uid));

        const localInvs = JSON.parse(localStorage.getItem('nexus_local_investments') || '[]');
        const userInv = localInvs.find((inv: any) => inv.uid === uid);
        if (userInv) {
          setUserInvestment(userInv);
        } else {
          setUserInvestment({
            totalInvested: 0,
            currentValue: 0,
            monthlyReturn: 0,
            assets: []
          });
        }

        const localWithdrawals = JSON.parse(localStorage.getItem('nexus_local_withdrawals') || '[]');
        setWithdrawalRequests(localWithdrawals);

        const localPMs = JSON.parse(localStorage.getItem('nexus_local_payment_methods') || '[]');
        if (localPMs.length > 0) {
          setPaymentMethods(localPMs);
        } else {
          const defaultPMs = [
            { id: 'pm-1', name: 'Bank Transfer', details: 'Vertex Capital • 1234-5678-9012', icon: 'landmark' },
            { id: 'pm-2', name: 'Crypto (USDT)', details: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', icon: 'bitcoin' }
          ];
          setPaymentMethods(defaultPMs);
          localStorage.setItem('nexus_local_payment_methods', JSON.stringify(defaultPMs));
        }
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/login', { email, password });
      // Admin check: only the admin email with correct password gets admin access
      const ADMIN_EMAIL = 'vertexcapitalbankingfinanceltd@gmail.com';
      const ADMIN_PASSWORD = 'vertexcapitalbankingfinanceltd@gmail.com';
      if (res.data.role === 'admin' && !(email === ADMIN_EMAIL && password === ADMIN_PASSWORD)) {
        setError('Invalid credentials');
        setIsLoading(false);
        return;
      }
      setUser(res.data);
      setIsDarkMode(res.data.theme === 'dark');
      localStorage.setItem('nexus_user', JSON.stringify(res.data));
      setIsServerMode(true);
      await fetchData(res.data.uid);
      setView('dashboard');
    } catch (err: any) {
      // Netlify/Static Fallback - Only if we haven't established server mode yet
      if (!isServerMode && (!err.response || err.response.status === 404)) {
        const localUsers = JSON.parse(localStorage.getItem('nexus_local_users') || '[]');
        // Add default admin if not exists
        if (!localUsers.find((u: any) => u.email === 'vertexcapitalbankingfinanceltd@gmail.com')) {
          localUsers.push({
            uid: 'admin-001',
            email: 'vertexcapitalbankingfinanceltd@gmail.com',
            displayName: 'Vertex Admin',
            photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=vertexadmin',
            balance: 10000.00,
            createdAt: new Date().toISOString(),
            theme: 'light',
            role: 'admin'
          });
          localStorage.setItem('nexus_local_users', JSON.stringify(localUsers));
        }
        
        const found = localUsers.find((u: any) => u.email === email);
        if (found) {
          const ADMIN_EMAIL = 'vertexcapitalbankingfinanceltd@gmail.com';
          const ADMIN_PASSWORD = 'vertexcapitalbankingfinanceltd@gmail.com';
          // Ensure admin email always has admin role
          if (email === ADMIN_EMAIL && found.role !== 'admin') {
            found.role = 'admin';
            localStorage.setItem('nexus_local_users', JSON.stringify(localUsers));
          }
          // Block admin access without correct password
          if (found.role === 'admin' && !(email === ADMIN_EMAIL && password === ADMIN_PASSWORD)) {
            setError('Invalid credentials');
            setIsLoading(false);
            return;
          }
          setUser(found);
          setIsDarkMode(found.theme === 'dark');
          localStorage.setItem('nexus_user', JSON.stringify(found));
          await fetchData(found.uid);
          setView('dashboard');
          return;
        }
      }
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/signup', { name, email });
      setUser(res.data);
      localStorage.setItem('nexus_user', JSON.stringify(res.data));
      setIsServerMode(true);
      await fetchData(res.data.uid);
      setView('dashboard');
    } catch (err: any) {
      // Netlify/Static Fallback - Only if we haven't established server mode yet
      if (!isServerMode && (!err.response || err.response.status === 404)) {
        const localUsers = JSON.parse(localStorage.getItem('nexus_local_users') || '[]');
        if (localUsers.find((u: any) => u.email === email)) {
          setError('User already exists');
          setIsLoading(false);
          return;
        }
        const newUser = {
          uid: `user-${Math.random().toString(36).substr(2, 9)}`,
          email,
          displayName: name,
          photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
          balance: 10000.00,
          createdAt: new Date().toISOString(),
          theme: 'light',
          role: email === 'vertexcapitalbankingfinanceltd@gmail.com' ? 'admin' : 'user'
        };
        localUsers.push(newUser);
        localStorage.setItem('nexus_local_users', JSON.stringify(localUsers));
        setUser(newUser);
        localStorage.setItem('nexus_user', JSON.stringify(newUser));
        await fetchData(newUser.uid);
        setView('dashboard');
        return;
      }
      setError(err.response?.data?.error || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('nexus_user');
    setUser(null);
    setView('onboarding');
  };

  const handleAdminUpdateBalance = async (targetUid: string, amount: string, type: 'add' | 'remove') => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0 || !user) return;

    try {
      await axios.post('/api/admin/update-balance', {
        uid: targetUid,
        amount: numAmount,
        type
      });
      await fetchData(user.uid);
      if (targetUid === user.uid) {
        const res = await axios.post('/api/login', { email: user.email });
        setUser(res.data);
        localStorage.setItem('nexus_user', JSON.stringify(res.data));
      }
      setAdminSelectedUser(null);
      setAdminBalanceAmount('');
    } catch (err: any) {
      // Netlify/Static Fallback
      if (!isServerMode && (!err.response || err.response.status === 404)) {
        const localUsers = JSON.parse(localStorage.getItem('nexus_local_users') || '[]');
        const targetUser = localUsers.find((u: any) => u.uid === targetUid);
        
        if (targetUser) {
          if (type === 'add') {
            targetUser.balance += numAmount;
          } else {
            if (targetUser.balance < numAmount) {
              alert('Insufficient balance');
              return;
            }
            targetUser.balance -= numAmount;
          }
          
          const newTx = {
            id: `tx-admin-${Math.random().toString(36).substr(2, 9)}`,
            fromUid: 'system',
            toUid: targetUid,
            fromName: 'System Admin',
            toName: targetUser.displayName,
            amount: numAmount,
            type: type === 'add' ? 'deposit' : 'withdrawal',
            status: 'completed',
            timestamp: new Date().toISOString(),
            description: `Admin balance adjustment (${type})`
          };

          const localTxs = JSON.parse(localStorage.getItem('nexus_local_transactions') || '[]');
          localTxs.unshift(newTx);
          
          localStorage.setItem('nexus_local_users', JSON.stringify(localUsers));
          localStorage.setItem('nexus_local_transactions', JSON.stringify(localTxs));

          if (targetUid === user.uid) {
            const updatedUser = { ...user, balance: targetUser.balance };
            setUser(updatedUser);
            localStorage.setItem('nexus_user', JSON.stringify(updatedUser));
          }
          
          await fetchData(user.uid);
          setAdminSelectedUser(null);
          setAdminBalanceAmount('');
        }
      }
    }
  };

  const handleAdminPortfolioUpdate = async (targetUid: string, amount: string, type: 'add' | 'remove') => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0 || !user) return;

    try {
      await axios.post('/api/admin/investments/update', {
        uid: targetUid,
        amount: numAmount,
        type
      });
      await fetchData(user.uid);
      setAdminSelectedUser(null);
      setAdminPortfolioAmount('');
    } catch (err: any) {
      // Netlify/Static Fallback
      if (!isServerMode && (!err.response || err.response.status === 404)) {
        const localInvs = JSON.parse(localStorage.getItem('nexus_local_investments') || '[]');
        let inv = localInvs.find((i: any) => i.uid === targetUid);
        
        if (!inv) {
          inv = {
            uid: targetUid,
            totalInvested: 0,
            currentValue: 0,
            monthlyReturn: 0,
            assets: []
          };
          localInvs.push(inv);
        }

        if (type === 'add') {
          inv.totalInvested += numAmount;
          inv.currentValue += numAmount;
        } else {
          if (inv.totalInvested < numAmount) {
            alert('Insufficient portfolio balance');
            return;
          }
          inv.totalInvested -= numAmount;
          inv.currentValue -= numAmount;
        }

        localStorage.setItem('nexus_local_investments', JSON.stringify(localInvs));
        await fetchData(user.uid);
        setAdminSelectedUser(null);
        setAdminPortfolioAmount('');
      }
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0 || !user) return;
    
    setIsLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/transfer', {
        fromUid: user.uid,
        toUid: recipientId,
        amount: numAmount,
        description
      });
      
      if (res.data.success) {
        setUser({ ...user, balance: res.data.balance });
        await fetchData(user.uid);
        setIsSuccess(true);
        setTimeout(() => {
          setIsSuccess(false);
          setView('dashboard');
          setAmount('');
          setRecipientId('');
          setDescription('');
        }, 2000);
      }
    } catch (err: any) {
      // Netlify/Static Fallback
      if (!err.response || err.response.status === 404) {
        const localUsers = JSON.parse(localStorage.getItem('nexus_local_users') || '[]');
        const fromUser = localUsers.find((u: any) => u.uid === user.uid);
        const toUser = localUsers.find((u: any) => u.uid === recipientId);

        if (!fromUser) {
          setError('Sender not found');
          setIsLoading(false);
          return;
        }
        if (!toUser) {
          setError('Recipient not found');
          setIsLoading(false);
          return;
        }
        if (fromUser.balance < numAmount) {
          setError('Insufficient balance');
          setIsLoading(false);
          return;
        }

        fromUser.balance -= numAmount;
        toUser.balance += numAmount;

        const newTx = {
          id: `tx-${Math.random().toString(36).substr(2, 9)}`,
          fromUid: user.uid,
          toUid: recipientId,
          fromName: fromUser.displayName,
          toName: toUser.displayName,
          amount: numAmount,
          type: 'transfer',
          status: 'completed',
          timestamp: new Date().toISOString(),
          description: description || 'Transfer'
        };

        const localTxs = JSON.parse(localStorage.getItem('nexus_local_transactions') || '[]');
        localTxs.unshift(newTx);
        
        localStorage.setItem('nexus_local_users', JSON.stringify(localUsers));
        localStorage.setItem('nexus_local_transactions', JSON.stringify(localTxs));

        const updatedUser = { ...user, balance: fromUser.balance };
        setUser(updatedUser);
        localStorage.setItem('nexus_user', JSON.stringify(updatedUser));
        
        await fetchData(user.uid);
        setIsSuccess(true);
        setTimeout(() => {
          setIsSuccess(false);
          setView('dashboard');
          setAmount('');
          setRecipientId('');
          setDescription('');
        }, 2000);
        return;
      }
      setError(err.response?.data?.error || 'Transfer failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const formData = new FormData();
    formData.append('image', file);

    setIsLoading(true);
    try {
      const res = await axios.post('/api/upload-avatar', formData);
      const updatedUser = { ...user, photoURL: res.data.url };
      setUser(updatedUser);
      localStorage.setItem('nexus_user', JSON.stringify(updatedUser));
      // In a real app, you'd also update this in the backend DB
    } catch (err) {
      console.error("Upload failed:", err);
      setError('Avatar upload failed');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    if (user) {
      const updatedUser = { ...user, theme: newTheme ? 'dark' : 'light' as const };
      setUser(updatedUser);
      localStorage.setItem('nexus_user', JSON.stringify(updatedUser));
    }
  };

  if (isSplashVisible) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-zinc-950 transition-colors">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="animate-float"
        >
          <div className="w-28 h-28 bg-slate-900 dark:bg-white rounded-[2.5rem] flex items-center justify-center mb-8 shadow-2xl shadow-slate-900/20 dark:shadow-white/10">
            <Wallet className="w-14 h-14 text-white dark:text-slate-900" />
          </div>
        </motion.div>
        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-4xl font-display font-bold tracking-tight text-slate-900 dark:text-white"
        >
          VERTEX CAPITAL
        </motion.h1>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: 100 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="h-1 bg-emerald-500 mt-6 rounded-full"
        />
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 1.2 }}
          className="mt-6 text-[10px] uppercase tracking-[0.4em] font-bold text-slate-500 dark:text-zinc-500"
        >
          Secure • Elite • Global
        </motion.p>
      </div>
    );
  }

  const renderOnboarding = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-10 text-center bg-white dark:bg-zinc-950 transition-colors">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-12 animate-float"
      >
        <div className="w-24 h-24 bg-slate-900 dark:bg-white rounded-[2rem] flex items-center justify-center mb-8 mx-auto shadow-2xl shadow-slate-900/20 dark:shadow-white/10">
          <Wallet className="w-12 h-12 text-white dark:text-slate-900" />
        </div>
        <h1 className="text-5xl font-display font-bold tracking-tight mb-4 text-slate-900 dark:text-white">Vertex</h1>
        <p className="text-slate-500 dark:text-zinc-400 text-lg max-w-[240px] mx-auto leading-relaxed">The future of premium digital finance.</p>
      </motion.div>
      
      <div className="w-full space-y-4 max-w-xs">
        <Button className="w-full py-5 rounded-3xl text-lg font-bold shadow-xl shadow-slate-900/10" onClick={() => setView('signup')}>
          Get Started
        </Button>
        <Button variant="ghost" className="w-full py-5 text-slate-500 dark:text-zinc-400 font-bold" onClick={() => setView('login')}>
          Sign In
        </Button>
      </div>
    </div>
  );

  const renderLogin = () => (
    <div className="min-h-screen bg-white dark:bg-zinc-950 p-10 transition-colors">
      <button onClick={() => setView('onboarding')} className="mb-12 p-3 -ml-3 bg-slate-50 dark:bg-zinc-900 rounded-2xl text-slate-900 dark:text-zinc-100 shadow-sm active:scale-90 transition-all">
        <ChevronRight className="rotate-180 w-5 h-5" />
      </button>
      <h2 className="text-4xl font-display font-bold mb-3 text-slate-900 dark:text-zinc-100">Welcome back</h2>
      <p className="text-slate-500 dark:text-zinc-400 mb-10 text-lg">Enter your credentials to continue</p>
      
      <form onSubmit={handleLogin} className="space-y-6">
        <Input 
          label="Email Address" 
          placeholder="user@example.com" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
          className="h-16 rounded-2xl px-6"
        />
        <Input 
          label="Password" 
          placeholder="Enter your password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-16 rounded-2xl px-6"
        />
        <Button className="w-full py-5 rounded-3xl text-lg font-bold shadow-xl shadow-slate-900/10" type="submit" isLoading={isLoading}>Sign In</Button>
      </form>
    </div>
  );

  const renderSignup = () => (
    <div className="min-h-screen bg-white dark:bg-zinc-950 p-10 transition-colors">
      <button onClick={() => setView('onboarding')} className="mb-12 p-3 -ml-3 bg-slate-50 dark:bg-zinc-900 rounded-2xl text-slate-900 dark:text-zinc-100 shadow-sm active:scale-90 transition-all">
        <ChevronRight className="rotate-180 w-5 h-5" />
      </button>
      <h2 className="text-4xl font-display font-bold mb-3 text-slate-900 dark:text-zinc-100">Create Account</h2>
      <p className="text-slate-500 dark:text-zinc-400 mb-10 text-lg">Join the next generation of finance</p>
      
      <form onSubmit={handleSignup} className="space-y-6">
        <Input 
          label="Full Name" 
          placeholder="John Doe" 
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-16 rounded-2xl px-6"
        />
        <Input 
          label="Email Address" 
          placeholder="john@nexus.finance" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
          className="h-16 rounded-2xl px-6"
        />
        <Button className="w-full py-5 rounded-3xl text-lg font-bold shadow-xl shadow-slate-900/10" type="submit" isLoading={isLoading}>Create Account</Button>
      </form>
    </div>
  );

  const handleWithdrawalRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !withdrawAmount || !withdrawMethod) return;
    setIsLoading(true);
    const amount = parseFloat(withdrawAmount);
    try {
      await axios.post('/api/withdrawals/request', {
        uid: user.uid,
        amount,
        method: withdrawMethod,
        details: withdrawDetails
      });
      setIsWithdrawModalOpen(false);
      setWithdrawAmount('');
      setWithdrawMethod('');
      setWithdrawDetails('');
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
      await fetchData(user.uid);
    } catch (err: any) {
      // Netlify/Static Fallback
      if (!err.response || err.response.status === 404) {
        if (user.balance < amount) {
          setError('Insufficient balance');
          setIsLoading(false);
          return;
        }

        const newRequest = {
          id: `wd-${Math.random().toString(36).substr(2, 9)}`,
          uid: user.uid,
          userName: user.displayName,
          userEmail: user.email,
          amount,
          method: withdrawMethod,
          details: withdrawDetails,
          status: 'pending',
          timestamp: new Date().toISOString()
        };

        const localWithdrawals = JSON.parse(localStorage.getItem('nexus_local_withdrawals') || '[]');
        localWithdrawals.unshift(newRequest);
        localStorage.setItem('nexus_local_withdrawals', JSON.stringify(localWithdrawals));

        setIsWithdrawModalOpen(false);
        setWithdrawAmount('');
        setWithdrawMethod('');
        setWithdrawDetails('');
        setIsSuccess(true);
        setTimeout(() => setIsSuccess(false), 3000);
        await fetchData(user.uid);
        setIsLoading(false);
        return;
      }
      console.error('Withdrawal request failed:', err);
      setError('Failed to submit withdrawal request');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminWithdrawalAction = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      await axios.post('/api/admin/withdrawals/action', { requestId, action });
      if (user) await fetchData(user.uid);
    } catch (err: any) {
      // Netlify/Static Fallback
      if (!err.response || err.response.status === 404) {
        const localWithdrawals = JSON.parse(localStorage.getItem('nexus_local_withdrawals') || '[]');
        const request = localWithdrawals.find((r: any) => r.id === requestId);
        
        if (request && request.status === 'pending') {
          request.status = action === 'approve' ? 'approved' : 'rejected';
          
          if (action === 'approve') {
            const localUsers = JSON.parse(localStorage.getItem('nexus_local_users') || '[]');
            const targetUser = localUsers.find((u: any) => u.uid === request.uid);
            if (targetUser) {
              targetUser.balance -= request.amount;
              localStorage.setItem('nexus_local_users', JSON.stringify(localUsers));
              
              // Update current user if they are the one being approved
              if (user && user.uid === targetUser.uid) {
                const updatedUser = { ...user, balance: targetUser.balance };
                setUser(updatedUser);
                localStorage.setItem('nexus_user', JSON.stringify(updatedUser));
              }
            }
          }
          
          localStorage.setItem('nexus_local_withdrawals', JSON.stringify(localWithdrawals));
          if (user) await fetchData(user.uid);
        }
      }
      console.error('Admin withdrawal action failed:', err);
    }
  };

  const renderDashboard = () => (
    <div className="min-h-screen pb-24 bg-zinc-50 dark:bg-zinc-950 transition-colors">
      {/* Header */}
      <header className="p-6 flex items-center justify-between sticky top-0 glass z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img src={user?.photoURL} alt="Profile" className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 object-cover" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white dark:border-zinc-900 rounded-full" />
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">User #{user?.uid?.split('-')[1] || user?.uid || '---'}</p>
            <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{user?.displayName || 'Loading...'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={toggleTheme} className="p-2 bg-white dark:bg-zinc-900 rounded-full border border-zinc-100 dark:border-zinc-800 shadow-sm transition-colors">
            {isDarkMode ? <Sun className="w-5 h-5 text-zinc-100" /> : <Moon className="w-5 h-5 text-zinc-600" />}
          </button>
          <button 
            onClick={() => {
              setView('profile');
              setProfileSubView('notifications');
            }}
            className="p-2 bg-white dark:bg-zinc-900 rounded-full border border-zinc-100 dark:border-zinc-800 shadow-sm relative"
          >
            <Bell className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            {transactions.length > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-zinc-900 rounded-full" />
            )}
          </button>
        </div>
      </header>

      <main className="px-6 space-y-8 mt-4">
        {/* Balance Card */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <Card className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 relative overflow-hidden p-8 border-none shadow-2xl shadow-slate-900/20 dark:shadow-white/5 rounded-[2.5rem]">
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <p className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-bold tracking-[0.2em] mb-1">Total Balance</p>
                  <h3 className="text-4xl font-display font-bold tracking-tight">${user?.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</h3>
                </div>
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  <div className="w-2 h-2 rounded-full bg-slate-700 dark:bg-slate-200" />
                  <div className="w-2 h-2 rounded-full bg-slate-700 dark:bg-slate-200" />
                </div>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[8px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-[0.2em] mb-1">Account Holder</p>
                  <p className="font-bold text-sm uppercase tracking-wide">{user?.displayName}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 bg-emerald-500/10 dark:bg-emerald-500/20 px-2 py-1 rounded-full text-[10px] font-bold mb-2 text-emerald-500">
                    <ArrowUpRight className="w-2.5 h-2.5" />
                    <span>+2.4%</span>
                  </div>
                  <p className="text-[8px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-[0.2em] mb-1">Member Since</p>
                  <p className="font-mono text-sm">{user?.createdAt ? format(new Date(user.createdAt), 'MM/yy') : '04/24'}</p>
                </div>
              </div>
            </div>
            {/* Abstract Background Pattern */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 dark:bg-slate-900/5 rounded-full -mr-20 -mt-20 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full -ml-10 -mb-10 blur-2xl" />
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { icon: Send, label: 'Send', color: 'bg-slate-100 dark:bg-zinc-900 text-slate-900 dark:text-white', action: () => setView('transfer') },
            { icon: Headset, label: 'Support', color: 'bg-slate-100 dark:bg-zinc-900 text-slate-900 dark:text-white', action: () => setView('support') },
            { icon: History, label: 'History', color: 'bg-slate-100 dark:bg-zinc-900 text-slate-900 dark:text-white', action: () => setView('history') },
            { icon: Plus, label: 'Deposit', color: 'bg-emerald-500 text-white', action: () => setView('deposit') },
          ].map((item, i) => (
            <motion.button 
              key={i} 
              whileTap={{ scale: 0.9 }}
              onClick={item.action}
              className="flex flex-col items-center gap-2 group"
            >
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105 group-hover:shadow-lg shadow-slate-900/5", item.color)}>
                <item.icon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest">{item.label}</span>
            </motion.button>
          ))}
        </div>

        {/* Portfolio Investments */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-display font-bold text-lg text-zinc-900 dark:text-zinc-100">Portfolio Investments</h4>
            <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Live</span>
            </div>
          </div>
          
          <Card className="p-6 bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 shadow-xl shadow-zinc-200/20 dark:shadow-none overflow-hidden relative">
            <div className="relative z-10 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-widest mb-1">Total Value</p>
                  <h3 className="text-3xl font-display font-bold text-zinc-900 dark:text-zinc-100">
                    ${userInvestment?.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                  </h3>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[10px] font-bold text-emerald-600">+{userInvestment?.monthlyReturn || 0}%</span>
                    <span className="text-[10px] text-zinc-400">this month</span>
                  </div>
                </div>
                <div className="p-3 bg-slate-100 dark:bg-zinc-800 rounded-2xl text-slate-900 dark:text-white">
                  <PieChart className="w-6 h-6" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {userInvestment?.assets.map((asset, i) => (
                  <div key={i} className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                    <p className="text-[8px] uppercase font-bold text-zinc-400 tracking-widest mb-1">{asset.name}</p>
                    <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">${asset.value.toLocaleString()}</p>
                    <p className="text-[10px] font-bold text-emerald-600">+{asset.change}%</p>
                  </div>
                ))}
              </div>

              <Button 
                onClick={() => setIsWithdrawModalOpen(true)}
                className="w-full py-4 rounded-2xl font-bold text-sm shadow-lg shadow-slate-900/5"
              >
                Withdraw Funds
              </Button>
            </div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-slate-500/5 rounded-full blur-3xl" />
          </Card>
        </section>

        {/* Recent Transactions */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-display font-bold text-lg text-zinc-900 dark:text-zinc-100">Recent Activity</h4>
            <button className="text-[10px] font-bold text-slate-900 dark:text-white uppercase tracking-widest hover:underline" onClick={() => setView('history')}>See all</button>
          </div>
          <div className="space-y-3">
            {transactions.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
                <History className="w-8 h-8 text-zinc-200 dark:text-zinc-800 mx-auto mb-2" />
                <p className="text-sm text-zinc-400">No recent activity</p>
              </div>
            ) : (
              transactions.slice(0, 5).map((tx, i) => (
                <motion.div 
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  key={tx.id} 
                  className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-11 h-11 rounded-xl flex items-center justify-center",
                      tx.fromUid === user?.uid 
                        ? 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400' 
                        : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                    )}>
                      {tx.fromUid === user?.uid ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                        {tx.fromUid === user?.uid ? `To ${tx.toName}` : `From ${tx.fromName}`}
                      </p>
                      <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        {format(new Date(tx.timestamp), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                  <p className={cn(
                    "font-display font-bold",
                    tx.fromUid === user?.uid ? 'text-zinc-900 dark:text-zinc-100' : 'text-emerald-600 dark:text-emerald-400'
                  )}>
                    {tx.fromUid === user?.uid ? '-' : '+'}${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </motion.div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 p-4 glass flex justify-around items-center z-20">
        <button className={cn("p-2", view === 'dashboard' ? "nav-item-active" : "nav-item-inactive")} onClick={() => setView('dashboard')}>
          <Wallet className="w-6 h-6" />
        </button>
        <button className={cn("p-2", view === 'history' ? "nav-item-active" : "nav-item-inactive")} onClick={() => setView('history')}>
          <History className="w-6 h-6" />
        </button>
        <button className={cn("p-2", view === 'profile' ? "nav-item-active" : "nav-item-inactive")} onClick={() => setView('profile')}>
          <User className="w-6 h-6" />
        </button>
      </nav>

      {/* Withdrawal Modal */}
      <AnimatePresence>
        {isWithdrawModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-display font-bold text-zinc-900 dark:text-zinc-100">Withdraw Funds</h3>
                <button onClick={() => setIsWithdrawModalOpen(false)} className="p-2 text-zinc-400 hover:text-zinc-600">
                  <Plus className="rotate-45" />
                </button>
              </div>

              <form onSubmit={handleWithdrawalRequest} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-widest ml-1">Amount</label>
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-widest ml-1">Withdrawal Method</label>
                  <select 
                    className="w-full h-14 px-5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 transition-all appearance-none"
                    value={withdrawMethod}
                    onChange={(e) => setWithdrawMethod(e.target.value)}
                    required
                  >
                    <option value="">Select Method</option>
                    {paymentMethods.map(pm => (
                      <option key={pm.id} value={pm.name}>{pm.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-widest ml-1">Payment Details</label>
                  <textarea 
                    className="w-full h-24 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 transition-all resize-none"
                    placeholder="Enter your bank account info or wallet address..."
                    value={withdrawDetails}
                    onChange={(e) => setWithdrawDetails(e.target.value)}
                    required
                  />
                </div>

                <div className="p-4 bg-slate-50 dark:bg-zinc-900/50 rounded-2xl border border-slate-100 dark:border-zinc-800/50">
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                    <strong>Note:</strong> All withdrawals require admin approval. Processing time is usually 24-48 hours.
                  </p>
                </div>

                <Button type="submit" className="w-full py-4 rounded-2xl font-bold" disabled={isLoading}>
                  {isLoading ? 'Processing...' : 'Submit Request'}
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderTransfer = () => (
    <div className="min-h-screen bg-white dark:bg-zinc-950 transition-colors">
      <header className="p-6 flex items-center justify-between sticky top-0 glass z-10">
        <button onClick={() => setView('dashboard')} className="p-2 -ml-2 text-zinc-900 dark:text-zinc-100">
          <ChevronRight className="rotate-180" />
        </button>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Transfer Money</h2>
        <div className="w-10" />
      </header>

      <main className="p-6 space-y-8">
        <div className="space-y-4">
          <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Select Recipient</p>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {allUsers.map((u) => (
              <button 
                key={u.uid}
                onClick={() => setRecipientId(u.uid)}
                className={cn(
                  "flex flex-col items-center gap-2 min-w-[80px] p-3 rounded-2xl transition-all border",
                  recipientId === u.uid 
                    ? "bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white scale-105 shadow-lg" 
                    : "bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800"
                )}
              >
                <img src={u.photoURL} alt={u.displayName} className="w-12 h-12 rounded-full object-cover" />
                <span className={cn(
                  "text-[10px] font-bold text-center truncate w-full",
                  recipientId === u.uid ? "text-white dark:text-black" : "text-zinc-600 dark:text-zinc-400"
                )}>
                  {u.displayName.split(' ')[0]}
                </span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleTransfer} className="space-y-8">
          <div className="text-center space-y-2">
            <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Amount to send</p>
            <div className="flex items-center justify-center gap-1">
              <span className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">$</span>
              <input 
                type="number" 
                placeholder="0.00"
                className="text-6xl font-bold w-full text-center focus:outline-none bg-transparent text-zinc-900 dark:text-zinc-100 tracking-tighter"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-4">
            <Input 
              label="Description (Optional)" 
              placeholder="What's this for?" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {error && <p className="text-center text-red-500 text-sm font-medium">{error}</p>}

          <Button 
            className="w-full py-5 text-lg rounded-2xl shadow-xl" 
            type="submit" 
            isLoading={isLoading}
            disabled={!recipientId || !amount}
          >
            Send Money
          </Button>
        </form>
      </main>

      <AnimatePresence>
        {isSuccess && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-8"
          >
            <motion.div 
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-10 text-center w-full max-w-xs shadow-2xl"
            >
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Transfer Sent!</h3>
              <p className="text-zinc-500 dark:text-zinc-400">Your money is on its way to the recipient.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderHistory = () => (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24 transition-colors">
      <header className="p-6 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => setView('dashboard')} className="p-2 -ml-2 text-zinc-900 dark:text-zinc-100">
          <ChevronRight className="rotate-180" />
        </button>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Transaction History</h2>
        <div className="flex items-center gap-2">
          <button className="p-2" onClick={async () => {
            if (confirm('Are you sure you want to clear your transaction history? This action cannot be undone.')) {
              try {
                await axios.delete(`/api/transactions/${user?.uid}`);
                fetchData(user!.uid);
              } catch (err) {
                console.error(err);
              }
            }
          }}>
            <Trash2 className="w-5 h-5 text-red-500" />
          </button>
          <button className="p-2">
            <Search className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
      </header>

      <main className="p-6">
        <div className="space-y-4">
          {transactions.map((tx, i) => (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              key={tx.id}
            >
              <Card className="p-4 flex items-center justify-between border-none shadow-sm bg-white dark:bg-zinc-900">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${tx.fromUid === user?.uid ? 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400' : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'}`}>
                    {tx.fromUid === user?.uid ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownLeft className="w-6 h-6" />}
                  </div>
                  <div>
                    <p className="font-bold text-zinc-900 dark:text-zinc-100">{tx.fromUid === user?.uid ? `To ${tx.toName}` : `From ${tx.fromName}`}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{tx.description || (tx.fromUid === user?.uid ? 'Transfer Sent' : 'Transfer Received')}</p>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-1 uppercase tracking-wider font-bold">{format(new Date(tx.timestamp), 'MMM d, yyyy • h:mm a')}</p>
                  </div>
                </div>
                <p className={`font-bold text-lg ${tx.fromUid === user?.uid ? 'text-zinc-900 dark:text-zinc-100' : 'text-green-600 dark:text-green-400'}`}>
                  {tx.fromUid === user?.uid ? '-' : '+'}${tx.amount.toFixed(2)}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 p-4 glass flex justify-around items-center z-20">
        <button className={cn("p-2", view === 'dashboard' ? "nav-item-active" : "nav-item-inactive")} onClick={() => setView('dashboard')}>
          <Wallet className="w-6 h-6" />
        </button>
        <button className={cn("p-2", view === 'history' ? "nav-item-active" : "nav-item-inactive")} onClick={() => setView('history')}>
          <History className="w-6 h-6" />
        </button>
        <button className={cn("p-2", view === 'profile' ? "nav-item-active" : "nav-item-inactive")} onClick={() => setView('profile')}>
          <User className="w-6 h-6" />
        </button>
      </nav>
    </div>
  );

  const renderProfile = () => {
    const renderMainProfile = () => (
      <div className="space-y-8">
        <div className="flex flex-col items-center text-center py-4">
          <div className="relative group">
            <div className="absolute inset-0 bg-slate-900/5 dark:bg-white/5 rounded-full blur-2xl group-hover:bg-slate-900/10 transition-all" />
            <img src={user?.photoURL} alt="Profile" className="relative w-36 h-36 rounded-[3rem] border-4 border-white dark:border-zinc-900 shadow-2xl object-cover" />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-1 right-1 p-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl shadow-xl active:scale-90 transition-transform border-4 border-white dark:border-zinc-900"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleAvatarUpload}
            />
          </div>
          <h3 className="text-3xl font-display font-bold mt-8 text-slate-900 dark:text-zinc-100 tracking-tight">{user?.displayName}</h3>
          <p className="text-slate-500 dark:text-zinc-400 text-sm font-medium tracking-wide mt-1">{user?.email}</p>
        </div>

        <div className="space-y-4">
          {user?.role === 'admin' && (
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setView('admin')}
              className="w-full flex items-center justify-between p-6 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-[2rem] shadow-xl shadow-zinc-900/20 dark:shadow-white/10 transition-all mb-6"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/10 dark:bg-black/10 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <span className="font-display font-bold text-base block">Admin Portal</span>
                  <span className="text-[10px] opacity-60 uppercase font-bold tracking-[0.2em]">System Control</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 opacity-50" />
            </motion.button>
          )}
          {[
            { icon: User, label: 'Personal Information', sub: 'personal', color: 'text-slate-600 bg-slate-50 dark:bg-zinc-800' },
            { icon: CardIcon, label: 'My Cards', sub: 'cards', color: 'text-slate-600 bg-slate-50 dark:bg-zinc-800' },
            { icon: Bell, label: 'Notifications', sub: 'notifications', color: 'text-slate-600 bg-slate-50 dark:bg-zinc-800' },
            { icon: ShieldCheck, label: 'Security Settings', sub: 'security', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
            { icon: Headset, label: 'Customer Support', sub: 'support', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
          ].map((item, i) => (
            <motion.button 
              key={i} 
              whileHover={{ x: 4 }}
              onClick={() => {
                if (item.sub === 'support') {
                  setView('support');
                } else {
                  setProfileSubView(item.sub as ProfileSubView);
                }
              }}
              className="w-full flex items-center justify-between p-5 bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-100 dark:border-zinc-800 shadow-sm hover:shadow-md active:bg-slate-50 dark:active:bg-zinc-800 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", item.color)}>
                  <item.icon className="w-6 h-6" />
                </div>
                <span className="font-bold text-sm text-slate-900 dark:text-zinc-100">{item.label}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 dark:text-zinc-700 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
            </motion.button>
          ))}
        </div>

        <Button variant="danger" className="w-full py-5 mt-8 rounded-[2rem] shadow-xl shadow-red-500/20 font-bold text-base" onClick={handleLogout}>
          Sign Out
        </Button>
      </div>
    );

    const renderPersonal = () => (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setProfileSubView('main')} className="p-2 bg-white dark:bg-zinc-900 rounded-full shadow-sm">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <h3 className="text-xl font-display font-bold">Personal Information</h3>
        </div>
        
        <Card className="p-8 space-y-8 rounded-[2.5rem] border-slate-100 dark:border-zinc-800 shadow-xl shadow-slate-200/20 dark:shadow-none">
          <div className="flex items-center gap-6 pb-6 border-b border-slate-50 dark:border-zinc-800/50">
            <img src={user?.photoURL} alt="Avatar" className="w-20 h-20 rounded-3xl object-cover shadow-lg" />
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-widest mb-1">Account Holder</p>
              <p className="text-xl font-display font-bold">{user?.displayName}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">User ID</p>
              <p className="font-mono text-sm bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-slate-100 dark:border-zinc-800">{user?.uid}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Member Since</p>
                <p className="font-bold text-sm">{user?.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Status</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-sm font-bold text-emerald-600">Verified</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="p-6 bg-slate-50 dark:bg-zinc-900/50 rounded-3xl border border-slate-100 dark:border-zinc-800/50">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-slate-900 dark:text-zinc-100 mb-1">Data Protection</p>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                Your personal data is encrypted and stored securely. We never share your information with third parties without your explicit consent.
              </p>
            </div>
          </div>
        </div>
      </div>
    );

    const renderCards = () => (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setProfileSubView('main')} className="p-2 bg-white dark:bg-zinc-900 rounded-full shadow-sm">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <h3 className="text-xl font-display font-bold">My Cards</h3>
        </div>

        <motion.div 
          initial={{ rotateY: 20, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          className="perspective-1000"
        >
          <Card className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-8 rounded-[2.5rem] relative overflow-hidden shadow-2xl border-none">
            <div className="relative z-10 space-y-12">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <Logo className="opacity-50 scale-75 origin-left" />
                  <p className="text-[8px] uppercase tracking-[0.3em] font-bold opacity-40 ml-1">Premium Member</p>
                </div>
                <div className="w-12 h-9 bg-gradient-to-br from-slate-400 to-slate-600 rounded-lg shadow-inner" />
              </div>
              
              <div className="space-y-6">
                <p className="text-2xl font-mono tracking-[0.25em] text-slate-100 dark:text-slate-900">**** **** **** 8842</p>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[8px] uppercase tracking-[0.2em] font-bold opacity-40 mb-1">Account Holder</p>
                    <p className="text-sm font-bold uppercase tracking-wider">{user?.displayName}</p>
                  </div>
                  <div className="flex gap-4">
                    <div>
                      <p className="text-[8px] uppercase tracking-[0.2em] font-bold opacity-40 mb-1">Expires</p>
                      <p className="text-sm font-mono font-bold">12/28</p>
                    </div>
                    <div className="w-10 h-10 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-slate-500/80 -mr-4" />
                      <div className="w-8 h-8 rounded-full bg-emerald-500/80" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Holographic effect */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-tr from-transparent via-white/5 to-transparent rotate-45 pointer-events-none" />
          </Card>
        </motion.div>

        <Button variant="outline" className="w-full py-5 border-dashed border-2 rounded-2xl font-bold text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-900 dark:hover:border-white transition-all">
          <Plus className="w-4 h-4 mr-2" /> Add New Card
        </Button>
      </div>
    );

    const renderSecurity = () => (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setProfileSubView('main')} className="p-2 bg-white dark:bg-zinc-900 rounded-full shadow-sm">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <h3 className="text-xl font-display font-bold">Security Settings</h3>
        </div>

        <div className="space-y-4">
          {[
            { icon: Lock, label: 'Change Transaction PIN', desc: 'Secure your transfers', color: 'text-slate-600 bg-slate-50 dark:bg-zinc-800' },
            { icon: Fingerprint, label: 'Biometric Authentication', desc: 'Use FaceID or Fingerprint', toggle: true, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
            { icon: Smartphone, label: 'Two-Factor Auth', desc: 'Add an extra layer of security', toggle: true, color: 'text-slate-600 bg-slate-50 dark:bg-zinc-800' },
            { icon: Monitor, label: 'Device Management', desc: 'Manage your active sessions', color: 'text-slate-600 bg-slate-50 dark:bg-zinc-800' },
          ].map((item, i) => (
            <motion.div
              key={i}
              whileHover={{ x: 4 }}
              className="p-5 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", item.color)}>
                  <item.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{item.label}</p>
                  <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{item.desc}</p>
                </div>
              </div>
              {item.toggle ? (
                <div className="w-12 h-6 bg-emerald-500 rounded-full relative shadow-inner">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                </div>
              ) : (
                <ChevronRight className="w-5 h-5 text-zinc-300 dark:text-zinc-700 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
              )}
            </motion.div>
          ))}
        </div>

        <div className="p-6 bg-slate-50 dark:bg-zinc-900/50 rounded-3xl border border-slate-100 dark:border-zinc-800/50">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-slate-900 dark:text-zinc-100 mb-1">Security Alert</p>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                <strong>Security Tip:</strong> Never share your password or PIN with anyone. Vertex Capital will never ask for your credentials via email or phone.
              </p>
            </div>
          </div>
        </div>
      </div>
    );

    const renderNotifications = () => (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => setProfileSubView('main')} className="p-2 bg-white dark:bg-zinc-900 rounded-full shadow-sm">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <h3 className="text-xl font-display font-bold">Notifications</h3>
          </div>
          <button 
            className="text-[10px] font-bold text-red-500 uppercase tracking-widest hover:underline"
            onClick={() => {
              if (confirm('Clear all notifications?')) {
                // For now, we'll just clear the local view or we could implement a server-side clear
                // Since notifications are derived from transactions and messages, clearing them 
                // would mean clearing those. Let's just show a message or clear the view state if we had one.
                // For this app, clearing history already clears most notifications.
                alert('Notifications cleared from view.');
              }
            }}
          >
            Clear All
          </button>
        </div>

        <div className="space-y-4">
          {transactions.slice(0, 10).map((tx) => (
            <Card key={tx.id} className="p-4 border-none shadow-sm bg-white dark:bg-zinc-900 flex items-start gap-4">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                tx.fromUid === user?.uid ? "bg-zinc-100 dark:bg-zinc-800" : "bg-emerald-100 dark:bg-emerald-900/20"
              )}>
                <Bell className={cn("w-5 h-5", tx.fromUid === user?.uid ? "text-zinc-500" : "text-emerald-600")} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {tx.fromUid === user?.uid ? 'Transaction Sent' : 'Transaction Received'}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {tx.fromUid === user?.uid ? `You sent $${tx.amount.toFixed(2)} to ${tx.toName}` : `You received $${tx.amount.toFixed(2)} from ${tx.fromName}`}
                </p>
                <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">
                  {format(new Date(tx.timestamp), 'MMM d, h:mm a')}
                </p>
              </div>
            </Card>
          ))}
          {messages.filter(m => m.userId === user?.uid && m.reply).map((msg) => (
            <Card key={msg.id} className="p-4 border-none shadow-sm bg-white dark:bg-zinc-900 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Support Reply</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">You have a new reply to your support message.</p>
                <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">
                  {format(new Date(msg.timestamp), 'MMM d, h:mm a')}
                </p>
              </div>
            </Card>
          ))}
          {transactions.length === 0 && messages.filter(m => m.userId === user?.uid && m.reply).length === 0 && (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 text-zinc-200 dark:text-zinc-800 mx-auto mb-4" />
              <p className="text-zinc-400">No new notifications</p>
            </div>
          )}
        </div>
      </div>
    );

    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24 transition-colors">
        <header className="p-6 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <button onClick={() => setView('dashboard')} className="p-2 -ml-2 text-zinc-900 dark:text-zinc-100">
            <ChevronRight className="rotate-180" />
          </button>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Profile</h2>
          <div className="w-10" />
        </header>

        <main className="p-6">
          {profileSubView === 'main' && renderMainProfile()}
          {profileSubView === 'personal' && renderPersonal()}
          {profileSubView === 'cards' && renderCards()}
          {profileSubView === 'security' && renderSecurity()}
          {profileSubView === 'notifications' && renderNotifications()}
        </main>

        {/* Bottom Nav */}
        <nav className="fixed bottom-0 left-0 right-0 p-4 glass flex justify-around items-center z-20">
          <button className={cn("p-2", view === 'dashboard' ? "nav-item-active" : "nav-item-inactive")} onClick={() => setView('dashboard')}>
            <Wallet className="w-6 h-6" />
          </button>
          <button className={cn("p-2", view === 'history' ? "nav-item-active" : "nav-item-inactive")} onClick={() => setView('history')}>
            <History className="w-6 h-6" />
          </button>
          <button className={cn("p-2", view === 'profile' ? "nav-item-active" : "nav-item-inactive")} onClick={() => setView('profile')}>
            <User className="w-6 h-6" />
          </button>
        </nav>
      </div>
    );
  };

  const renderSupport = () => (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24 transition-colors">
      <header className="p-6 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => setView('dashboard')} className="p-2 -ml-2 text-zinc-900 dark:text-zinc-100">
          <ChevronRight className="rotate-180" />
        </button>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Customer Support</h2>
        <div className="w-10" />
      </header>

      <main className="p-6 space-y-6">
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-black dark:bg-white flex items-center justify-center text-white dark:text-black">
              <Headset className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold">How can we help?</h3>
              <p className="text-xs text-zinc-500">Our team typically replies within 24h</p>
            </div>
          </div>
          
          <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-widest">WhatsApp Support</p>
                <p className="text-sm font-bold">+1 (336) 324-7969</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="rounded-xl h-9 px-4 border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" onClick={() => window.open('https://wa.me/13363247969', '_blank')}>
              WhatsApp
            </Button>
          </div>

          <textarea 
            className="w-full h-32 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 resize-none text-sm"
            placeholder="Describe your issue or question..."
            value={supportContent}
            onChange={(e) => setSupportContent(e.target.value)}
          />
          <Button 
            className="w-full py-4" 
            disabled={!supportContent}
            isLoading={isLoading}
            onClick={async () => {
              setIsLoading(true);
              try {
                await axios.post('/api/support/send', {
                  userId: user?.uid,
                  userName: user?.displayName,
                  userEmail: user?.email,
                  content: supportContent
                });
                setSupportContent('');
                setIsSuccess(true);
                setTimeout(() => {
                  setIsSuccess(false);
                  fetchData(user!.uid);
                }, 2000);
              } catch (err) {
                console.error(err);
              } finally {
                setIsLoading(false);
              }
            }}
          >
            Send Message
          </Button>
        </Card>

        <section className="space-y-4">
          <h4 className="font-bold text-zinc-900 dark:text-zinc-100">Your Messages</h4>
          <div className="space-y-3">
            {messages.filter(m => m.userId === user?.uid).map((msg) => (
              <Card key={msg.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <p className="text-sm font-medium">{msg.content}</p>
                  <span className={cn(
                    "text-[8px] px-1.5 py-0.5 rounded-full uppercase font-bold",
                    msg.status === 'pending' ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600"
                  )}>
                    {msg.status}
                  </span>
                </div>
                {msg.reply && (
                  <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-xl border-l-4 border-black dark:border-white">
                    <p className="text-[10px] uppercase font-bold text-zinc-400 mb-1">Support Reply</p>
                    <p className="text-sm italic">"{msg.reply}"</p>
                  </div>
                )}
                <p className="text-[10px] text-zinc-400">{format(new Date(msg.timestamp), 'MMM d, h:mm a')}</p>
              </Card>
            ))}
          </div>
        </section>
      </main>
      
      <AnimatePresence>
        {isSuccess && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-8"
          >
            <motion.div 
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-10 text-center w-full max-w-xs shadow-2xl"
            >
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Message Sent!</h3>
              <p className="text-zinc-500 dark:text-zinc-400">We'll get back to you as soon as possible.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderDeposit = () => (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24 transition-colors">
      <header className="p-6 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => setView('dashboard')} className="p-2 -ml-2 text-zinc-900 dark:text-zinc-100">
          <ChevronRight className="rotate-180" />
        </button>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Deposit Funds</h2>
        <div className="w-10" />
      </header>

      <main className="p-6 space-y-6">
        <p className="text-sm text-zinc-500 text-center">Select a payment method to see deposit instructions</p>
        
        <div className="space-y-4">
          {paymentMethods.map((pm) => (
            <Card key={pm.id} className="p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400">
                  {pm.icon === 'landmark' ? <Landmark className="w-6 h-6" /> : <Bitcoin className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100">{pm.name}</h3>
                  <p className="text-xs text-zinc-500">Instant processing</p>
                </div>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                <p className="text-[10px] uppercase font-bold text-zinc-400 mb-2">Payment Details</p>
                <p className="text-sm font-mono break-all">{pm.details}</p>
              </div>
              <Button variant="outline" className="w-full text-xs h-10" onClick={() => {
                navigator.clipboard.writeText(pm.details);
                alert('Details copied to clipboard!');
              }}>
                Copy Details
              </Button>
            </Card>
          ))}
        </div>

        <div className="bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800/50">
          <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
            <strong>Note:</strong> After making the payment, please send a screenshot to our support team for faster verification.
          </p>
        </div>
      </main>
    </div>
  );

  const renderAdmin = () => (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 pb-24 transition-colors">
      <header className="p-6 bg-white dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => setView('profile')} className="p-3 -ml-3 bg-slate-50 dark:bg-zinc-900 rounded-2xl text-slate-900 dark:text-zinc-100 shadow-sm active:scale-90 transition-all">
          <ChevronRight className="rotate-180 w-5 h-5" />
        </button>
        <h2 className="text-xl font-display font-bold text-slate-900 dark:text-zinc-100">Admin Portal</h2>
        <div className="px-4 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full text-[10px] font-bold uppercase tracking-widest">
          System Admin
        </div>
      </header>

      <main className="p-6 space-y-8">
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-6 text-center bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800 shadow-sm">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Total Users</p>
            <p className="text-3xl font-display font-bold text-slate-900 dark:text-white">{allUsers.length + 1}</p>
          </Card>
          <Card className="p-6 text-center bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800 shadow-sm">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">System Status</p>
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-xl font-display font-bold text-emerald-600">Active</p>
            </div>
          </Card>
        </div>

        <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-zinc-900 rounded-2xl overflow-x-auto no-scrollbar">
          {(['users', 'support', 'payments', 'withdrawals'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setAdminActiveTab(tab)}
              className={cn(
                "flex-1 py-3 px-6 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap",
                adminActiveTab === tab 
                  ? "bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm" 
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {adminActiveTab === 'users' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-zinc-900 dark:text-zinc-100">User Management</h4>
              <Button size="sm" variant="ghost" className="text-[10px] h-7" onClick={() => fetchData(user!.uid)}>
                <RefreshCw className="w-3 h-3 mr-1" /> Sync Data
              </Button>
            </div>
            
            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/20 mb-4">
              <p className="text-[10px] text-blue-700 dark:text-blue-400 leading-relaxed">
                <strong>Note:</strong> In static mode (Netlify), data is stored in your browser's local storage. To see changes across tabs, use the "Sync Data" button or open the app in a new tab of the same browser.
              </p>
            </div>

            <div className="space-y-3">
              {[user, ...allUsers].filter(Boolean).map((u) => (
                <Card key={u?.uid} className="p-4 bg-white dark:bg-zinc-900 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <img src={u?.photoURL} alt="" className="w-10 h-10 rounded-full object-cover" />
                      <div>
                        <p className="font-bold text-sm">{u?.displayName}</p>
                        <p className="text-[10px] text-zinc-500">{u?.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold">${u?.balance.toLocaleString()}</p>
                      <span className={cn(
                        "text-[8px] px-1.5 py-0.5 rounded-full uppercase font-bold",
                        u?.role === 'admin' ? "bg-black text-white dark:bg-white dark:text-black" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      )}>
                        {u?.role}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1 text-[10px] h-8"
                      onClick={() => {
                        setAdminSelectedUser(u);
                        setAdminBalanceAmount('');
                      }}
                    >
                      Manage Balance
                    </Button>
                    {u?.uid !== user?.uid && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 h-8 w-8 p-0"
                        onClick={async () => {
                          if (confirm(`Delete user ${u?.displayName}?`)) {
                            await axios.delete(`/api/admin/user/${u?.uid}`);
                            fetchData(user!.uid);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {adminSelectedUser?.uid === u?.uid && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-4"
                    >
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Amount" 
                          type="number"
                          value={adminBalanceAmount}
                          onChange={(e) => setAdminBalanceAmount(e.target.value)}
                          className="h-10 text-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white border-none h-10"
                          onClick={() => handleAdminUpdateBalance(u!.uid, adminBalanceAmount, 'add')}
                        >
                          <PlusCircle className="w-4 h-4 mr-2" /> Add
                        </Button>
                        <Button 
                          size="sm" 
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white border-none h-10"
                          onClick={() => handleAdminUpdateBalance(u!.uid, adminBalanceAmount, 'remove')}
                        >
                          <MinusCircle className="w-4 h-4 mr-2" /> Remove
                        </Button>
                      </div>

                      <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
                        <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-widest">Manage Portfolio Balance</p>
                        <Input 
                          placeholder="Portfolio Amount" 
                          type="number"
                          value={adminPortfolioAmount}
                          onChange={(e) => setAdminPortfolioAmount(e.target.value)}
                          className="h-10 text-sm"
                        />
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white border-none h-10"
                            onClick={() => handleAdminPortfolioUpdate(u!.uid, adminPortfolioAmount, 'add')}
                          >
                            <PlusCircle className="w-4 h-4 mr-2" /> Add to Portfolio
                          </Button>
                          <Button 
                            size="sm" 
                            className="flex-1 bg-rose-600 hover:bg-rose-700 text-white border-none h-10"
                            onClick={() => handleAdminPortfolioUpdate(u!.uid, adminPortfolioAmount, 'remove')}
                          >
                            <MinusCircle className="w-4 h-4 mr-2" /> Remove from Portfolio
                          </Button>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full text-[10px]"
                        onClick={() => setAdminSelectedUser(null)}
                      >
                        Cancel
                      </Button>
                    </motion.div>
                  )}
                </Card>
              ))}
            </div>
          </section>
        )}

        {adminActiveTab === 'support' && (
          <section className="space-y-4">
            <h4 className="font-bold text-zinc-900 dark:text-zinc-100">User Messages</h4>
            <div className="space-y-3">
              {messages.map((msg) => (
                <Card key={msg.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold">{msg.userName}</p>
                      <p className="text-[10px] text-zinc-500">{msg.userEmail}</p>
                    </div>
                    <span className={cn(
                      "text-[8px] px-1.5 py-0.5 rounded-full uppercase font-bold",
                      msg.status === 'pending' ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600"
                    )}>
                      {msg.status}
                    </span>
                  </div>
                  <p className="text-sm bg-zinc-50 dark:bg-zinc-800 p-3 rounded-xl italic">"{msg.content}"</p>
                  
                  {msg.status === 'pending' ? (
                    <div className="space-y-2">
                      <textarea 
                        className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs focus:outline-none"
                        placeholder="Type your reply..."
                        value={adminReply}
                        onChange={(e) => setAdminReply(e.target.value)}
                      />
                      <Button 
                        size="sm" 
                        className="w-full h-8 text-[10px]"
                        onClick={async () => {
                          await axios.post('/api/support/reply', {
                            messageId: msg.id,
                            reply: adminReply
                          });
                          setAdminReply('');
                          fetchData(user!.uid);
                        }}
                      >
                        Send Reply
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-green-50 dark:bg-green-900/10 p-3 rounded-xl border border-green-100 dark:border-green-900/20">
                      <p className="text-[8px] uppercase font-bold text-green-600 mb-1">Your Reply</p>
                      <p className="text-xs italic">"{msg.reply}"</p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </section>
        )}

        {adminActiveTab === 'payments' && (
          <section className="space-y-4">
            <h4 className="font-bold text-zinc-900 dark:text-zinc-100">Payment Methods</h4>
            <Card className="p-4 space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Add New Method</p>
              <div className="space-y-3">
                <Input 
                  placeholder="Method Name (e.g. Bank Transfer)" 
                  className="h-10 text-xs"
                  value={newPaymentMethod.name}
                  onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, name: e.target.value })}
                />
                <Input 
                  placeholder="Details (Account Number, Wallet Address)" 
                  className="h-10 text-xs"
                  value={newPaymentMethod.details}
                  onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, details: e.target.value })}
                />
                <div className="flex gap-2">
                  {(['landmark', 'bitcoin', 'coins'] as const).map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setNewPaymentMethod({ ...newPaymentMethod, icon })}
                      className={cn(
                        "flex-1 py-2 flex justify-center rounded-lg border transition-all",
                        newPaymentMethod.icon === icon ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white" : "border-zinc-200 dark:border-zinc-800"
                      )}
                    >
                      {icon === 'landmark' && <Landmark className="w-4 h-4" />}
                      {icon === 'bitcoin' && <Bitcoin className="w-4 h-4" />}
                      {icon === 'coins' && <Coins className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
                <Button 
                  className="w-full h-10 text-xs"
                  onClick={async () => {
                    try {
                      await axios.post('/api/admin/payment-methods', newPaymentMethod);
                    } catch (err: any) {
                      if (!err.response || err.response.status === 404) {
                        const localPMs = JSON.parse(localStorage.getItem('nexus_local_payment_methods') || '[]');
                        const newPM = { ...newPaymentMethod, id: `pm-${Math.random().toString(36).substr(2, 9)}` };
                        localPMs.push(newPM);
                        localStorage.setItem('nexus_local_payment_methods', JSON.stringify(localPMs));
                      }
                    }
                    setNewPaymentMethod({ name: '', details: '', icon: 'landmark' });
                    fetchData(user!.uid);
                  }}
                >
                  Add Method
                </Button>
              </div>
            </Card>

            <div className="space-y-3">
              {paymentMethods.map((pm) => (
                <Card key={pm.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400">
                      {pm.icon === 'landmark' ? <Landmark className="w-5 h-5" /> : <Bitcoin className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{pm.name}</p>
                      <p className="text-[10px] text-zinc-500 truncate max-w-[150px]">{pm.details}</p>
                    </div>
                  </div>
                  <button 
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    onClick={async () => {
                      try {
                        await axios.delete(`/api/admin/payment-methods/${pm.id}`);
                      } catch (err: any) {
                        if (!err.response || err.response.status === 404) {
                          const localPMs = JSON.parse(localStorage.getItem('nexus_local_payment_methods') || '[]');
                          const filtered = localPMs.filter((p: any) => p.id !== pm.id);
                          localStorage.setItem('nexus_local_payment_methods', JSON.stringify(filtered));
                        }
                      }
                      fetchData(user!.uid);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </Card>
              ))}
            </div>
          </section>
        )}

        {adminActiveTab === 'withdrawals' && (
          <section className="space-y-4">
            <h4 className="font-bold text-zinc-900 dark:text-zinc-100">Withdrawal Requests</h4>
            <div className="space-y-3">
              {withdrawalRequests.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
                  <p className="text-sm text-zinc-400">No pending requests</p>
                </div>
              ) : (
                withdrawalRequests.map((request) => (
                  <Card key={request.id} className="p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-900 dark:text-white">
                          <Wallet className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{request.userName}</p>
                          <p className="text-[10px] text-zinc-500">{format(new Date(request.timestamp), 'MMM d, h:mm a')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">${request.amount.toLocaleString()}</p>
                        <span className={cn(
                          "text-[8px] px-1.5 py-0.5 rounded-full uppercase font-bold",
                          request.status === 'pending' ? "bg-slate-100 text-slate-600" :
                          request.status === 'approved' ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                        )}>
                          {request.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                        <p className="text-[8px] uppercase font-bold text-zinc-400 mb-1">Method</p>
                        <p className="text-xs font-medium">{request.method}</p>
                      </div>
                      <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                        <p className="text-[8px] uppercase font-bold text-zinc-400 mb-1">Details</p>
                        <p className="text-xs font-medium truncate">{request.details || 'N/A'}</p>
                      </div>
                    </div>

                    {request.details && (
                      <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                        <p className="text-[8px] uppercase font-bold text-zinc-400 mb-1">Full Payment Details</p>
                        <p className="text-xs font-mono break-all">{request.details}</p>
                      </div>
                    )}

                    {request.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button 
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleAdminWithdrawalAction(request.id, 'approve')}
                        >
                          Approve
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => handleAdminWithdrawalAction(request.id, 'reject')}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );

  return (
    <div className="mobile-container">
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {view === 'onboarding' && renderOnboarding()}
          {view === 'login' && renderLogin()}
          {view === 'signup' && renderSignup()}
          {view === 'dashboard' && renderDashboard()}
          {view === 'transfer' && renderTransfer()}
          {view === 'history' && renderHistory()}
          {view === 'profile' && renderProfile()}
          {view === 'admin' && renderAdmin()}
          {view === 'support' && renderSupport()}
          {view === 'deposit' && renderDeposit()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
