import React, { useEffect, useState, useMemo } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  collection,
  where,
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  setDoc,
  orderBy,
  getDocs,
  updateDoc,
  getDoc,
  limit,
  collectionGroup,
  deleteDoc,
  writeBatch,
  query as firestoreQuery,
  Timestamp
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, 
  Users, 
  LogOut, 
  Plus, 
  ChevronRight, 
  ArrowUpRight, 
  ArrowDownLeft,
  Calendar,
  X,
  Menu,
  UserPlus,
  LayoutDashboard,
  ReceiptText,
  Target,
  Settings as SettingsIcon,
  Download,
  ShieldCheck,
  UserCheck,
  Info,
  Languages,
  Trash2,
  AlertCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Mail,
  Lock,
  Key,
  Wifi,
  WifiOff,
  RotateCw
} from 'lucide-react';
import { auth, db, signInWithGoogle, logOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, updatePassword, deleteUser, reauthenticateWithCredential, EmailAuthProvider, sendPasswordResetEmail } from './lib/firebase';
import { cn, formatCurrency, formatNumber } from './lib/utils';
import { SavingsGroup, Transaction, GroupMember, UserProfile } from './types';
import { translations } from './translations';

// Components
const Auth = ({ lang, setLang }: { lang: 'bn' | 'en', setLang: (l: 'bn' | 'en') => void }) => {
  const t = translations[lang];
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'verify_otp' | 'reset_password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState(''); // Simulated OTP storage

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'register' && password !== confirmPassword) {
        setError(t.passwordMismatch);
        setLoading(false);
        return;
      }
      
      // Simulation: Generate 6 digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // If registering, check if user already exists in Firestore (optional demo)
      if (mode === 'register') {
         const userSnap = await getDoc(doc(db, 'users', email.replace(/[@.]/g, '_'))); // demo simplified check
         // But we should use Firestore query for real check
         const q = firestoreQuery(collection(db, 'users'), where('email', '==', email), limit(1));
         const snap = await getDocs(q);
         if (!snap.empty) {
           setError(t.accountExists);
           setLoading(false);
           return;
         }
      }

      setGeneratedOtp(code);
      // In real life, send email here. In demo, show alert.
      console.log(`[AUTH SERVICE] OTP for ${email}: ${code}`);
      alert(`${t.otpSent}: ${code}`);
      setMode('verify_otp');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp === generatedOtp) {
      if (mode === 'verify_otp' && displayName) { // We were registering
        handleFinalRegister();
      } else { // We were resetting
        setMode('reset_password');
      }
    } else {
      setError(lang === 'bn' ? 'ভুল ওটিপি!' : 'Invalid OTP!');
    }
  };

  const handleFinalRegister = async () => {
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName });
      // Create Firestore doc
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: displayName,
        appRole: 'member',
        isApproved: false,
        createdAt: serverTimestamp()
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }
    setLoading(true);
    try {
      // Note: Firebase doesn't allow direct password updates without login.
      // Usually you'd use confirmPasswordReset(auth, actionCode, newPassword).
      // Here we will use sendPasswordResetEmail as the real integration fallback.
      await sendPasswordResetEmail(auth, email);
      alert(lang === 'bn' ? 'পাসওয়ার্ড পরিবর্তনের লিংক আপনার ইমেইলে পাঠানো হয়েছে। অনুগ্রহ করে ইমেইল চেক করুন।' : 'A password reset link has been sent to your email. Please check your inbox.');
      setMode('login');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error(err);
      let msg = t.authError;
      if (err.code === 'auth/invalid-credential') {
        msg = t.invalidCredential;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error(err);
      setError(err.message || t.googleAuthError);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#065f46] to-[#043d2d]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card w-full max-w-sm p-8 shadow-2xl relative"
      >
        <button 
          onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
          className="absolute top-6 right-6 p-2 bg-slate-50 rounded-lg text-primary hover:bg-slate-100 transition-colors flex items-center gap-2 text-xs font-bold"
        >
          <Languages size={14} />
          {lang === 'bn' ? 'English' : 'বাংলা'}
        </button>

        <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl shadow-inner border border-emerald-100">
          🐂
        </div>
        <h1 className="text-xl font-bold text-[#065f46] mb-1 font-sans text-center">{t.appName}</h1>
        <p className="text-slate-500 mb-8 text-[11px] px-4 leading-relaxed text-center">{t.appDescription}</p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-[10px] font-medium flex items-center gap-2">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4 mb-6">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.email}</label>
              <div className="relative">
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@mail.com" className="input pr-10" />
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.password}</label>
                <button type="button" onClick={() => setMode('forgot')} className="text-[10px] text-primary font-bold hover:underline">{t.forgotPassword}</button>
              </div>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="input pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-primary transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary w-full py-4 shadow-lg flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : t.login}
            </button>
          </form>
        )}

        {(mode === 'register' || mode === 'forgot') && (
          <form onSubmit={handleSendOTP} className="space-y-4 mb-6">
            {mode === 'register' && (
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.name}</label>
                <input type="text" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={lang === 'bn' ? "আব্দুল করিম" : "John Doe"} className="input" />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.email}</label>
              <div className="relative">
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@mail.com" className="input pr-10" />
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              </div>
            </div>
            {mode === 'register' && (
              <>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.password}</label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="input pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-primary transition-colors text-xs font-bold">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.confirmPassword}</label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="input pr-10" />
                  </div>
                </div>
              </>
            )}
            <button type="submit" disabled={loading} className="btn btn-primary w-full py-4 shadow-lg flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : t.sendOTP}
            </button>
            <button type="button" onClick={() => setMode('login')} className="w-full text-center text-xs text-slate-400 font-bold hover:text-primary transition-colors">
               {lang === 'bn' ? 'লগইন-এ ফিরে যান' : 'Back to Login'}
            </button>
          </form>
        )}

        {mode === 'verify_otp' && (
          <form onSubmit={handleVerifyOTP} className="space-y-4 mb-6 text-center">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
               <ShieldCheck size={24} />
            </div>
            <h3 className="text-lg font-bold">{t.verifyOTP}</h3>
            <p className="text-[11px] text-slate-500">{t.otpSent}</p>
            <div className="space-y-1.5 text-left">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.enterOTP}</label>
              <input type="text" required maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="000000" className="input text-center text-xl tracking-[0.5em] font-mono" />
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary w-full py-4 shadow-lg uppercase tracking-widest text-[10px] font-bold">
              {t.verifyOTP}
            </button>
            <button type="button" onClick={() => setMode('login')} className="text-xs text-slate-400 font-bold hover:text-primary transition-colors">
               {lang === 'bn' ? 'বাতিল করুন' : 'Cancel'}
            </button>
          </form>
        )}

        {mode === 'reset_password' && (
          <form onSubmit={handleResetPassword} className="space-y-4 mb-6">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Lock size={24} />
              </div>
              <h3 className="text-lg font-bold">{lang === 'bn' ? 'নতুন পাসওয়ার্ড সেট করুন' : 'Reset Password'}</h3>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.newPassword}</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="input" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.confirmPassword}</label>
              <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="input" />
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary w-full py-4 shadow-lg uppercase tracking-widest text-[10px] font-bold">
              {lang === 'bn' ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Update Password'}
            </button>
          </form>
        )}

        {mode === 'login' && (
          <>
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
              <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-white px-2 text-slate-300 tracking-widest font-bold">{lang === 'bn' ? 'অথবা' : 'OR'}</span></div>
            </div>
            <button onClick={handleGoogleSignIn} className="btn btn-outline w-full flex items-center justify-center gap-3 py-3.5 border-slate-200 hover:bg-slate-50">
              <img src="https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png" className="w-5 h-5 object-contain" alt="Google" referrerPolicy="no-referrer" />
              <span className="text-[11px] font-bold">{t.loginWithGoogle}</span>
            </button>
          </>
        )}

        <p className="mt-8 text-center text-xs text-slate-400 font-bold uppercase tracking-widest">
          {mode === 'login' ? t.registrationTitle : t.loginTitle} 
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }} className="ml-2 text-primary hover:underline">
            {mode === 'login' ? t.toggleRegister : t.toggleLogin}
          </button>
        </p>
      </motion.div>
      <footer className="mt-8 text-white/30 text-[9px] font-bold uppercase tracking-widest">
        {t.footerText}
      </footer>
    </div>
  );
};

const GroupCard = ({ group, onClick, lang }: { group: SavingsGroup, onClick: () => void, lang: 'bn' | 'en', key?: string }) => {
  const t = translations[lang];
  const currentMonth = new Date().toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { month: 'long' });
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="card p-6 cursor-pointer hover:shadow-md transition-all group border-border-gray hover:border-primary/20"
    >
      <div className="flex justify-between items-start mb-6">
        <div className="w-10 h-10 bg-primary/5 rounded-lg flex items-center justify-center text-xl group-hover:bg-primary group-hover:text-white transition-all">
          🐄
        </div>
        <div className={cn(
          "px-2.5 py-1 rounded text-[10px] uppercase font-bold tracking-wider",
          group.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
        )}>
          {group.status === 'active' ? (lang === 'bn' ? 'চলমান' : 'Active') : (lang === 'bn' ? 'সম্পন্ন' : 'Completed')}
        </div>
      </div>
      
      <h3 className="text-lg font-bold text-text-main mb-1 truncate">{group.name}</h3>
      <p className="text-text-light text-xs mb-6 line-clamp-1">{group.description || t.groupPlanning}</p>
      
      <div className="flex items-center justify-between text-text-light text-xs pt-4 border-t border-border-gray">
        <div className="flex items-center gap-1.5">
          <Users size={14} className="opacity-60" />
          <span>{formatNumber(group.members.length, lang)} {lang === 'bn' ? 'সদস্য' : 'Members'}</span>
        </div>
        <div className="flex items-center gap-1.5 font-semibold text-primary">
          <span>{formatNumber(group.goalAmount, lang)} ৳</span>
        </div>
      </div>
    </motion.div>
  );
};

export default function App() {
  const [lang, setLang] = useState<'bn' | 'en'>('bn');
  const t = translations[lang];
  
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<SavingsGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<SavingsGroup | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'transactions' | 'members' | 'plan' | 'settings' | 'dues'>('dashboard');
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState<any>(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [transactionType, setTransactionType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [isManualAdd, setIsManualAdd] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [manualDepositAmount, setManualDepositAmount] = useState<string>('');
  const [isProfileUpdating, setIsProfileUpdating] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  // Offline Synchronization States
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [globalTransactions, setGlobalTransactions] = useState<Transaction[]>([]);
  const [txQueryFallback, setTxQueryFallback] = useState(false);
  const [usePerGroupTxFetch, setUsePerGroupTxFetch] = useState(false);

  const groupMonths = useMemo(() => {
    if (!selectedGroup) return [];
    const list = [];
    const start = selectedGroup.startDate?.toDate ? selectedGroup.startDate.toDate() : new Date();
    const end = selectedGroup.endDate?.toDate ? selectedGroup.endDate.toDate() : new Date(new Date().getFullYear() + 2, 0, 1);
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cur <= end) {
        list.push(`${cur.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', {month: 'long'})} ${cur.getFullYear()}`);
        cur.setMonth(cur.getMonth() + 1);
    }
    return list;
  }, [selectedGroup, lang]);

  const paidMonthsByUserId = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    transactions.forEach(tx => {
      if (tx.type === 'deposit' && tx.forMonths) {
        if (!map[tx.userId]) map[tx.userId] = new Set();
        tx.forMonths.forEach(m => map[tx.userId].add(m));
      }
    });
    return map;
  }, [transactions]);

  const paidMonthsForTargetUser = useMemo(() => {
    return paidMonthsByUserId[targetUserId] || new Set<string>();
  }, [targetUserId, paidMonthsByUserId]);

  const availableMonths = useMemo(() => {
    if (!selectedGroup) return [];
    let months = [...groupMonths];
    if (transactionType === 'deposit') {
      months = months.filter(m => !paidMonthsForTargetUser.has(m));
      if (selectedGroup.previousYearBalancePerPerson && !paidMonthsForTargetUser.has('PREV_BALANCE')) {
        months = ['PREV_BALANCE', ...months];
      }
      months.push('EXTRA_AMOUNT');
    }
    return months;
  }, [groupMonths, paidMonthsForTargetUser, transactionType, selectedGroup]);

  const calculatedBaseAmount = useMemo(() => {
    if (transactionType !== 'deposit') return 0;
    let total = 0;
    selectedMonths.forEach(m => {
      if (m === 'PREV_BALANCE') {
        total += selectedGroup?.previousYearBalancePerPerson || 0;
      } else if (m !== 'EXTRA_AMOUNT') {
        total += selectedGroup?.monthlyAmount || 0;
      }
    });
    return total;
  }, [selectedMonths, selectedGroup, transactionType]);

  useEffect(() => {
    if (transactionType === 'deposit' && !selectedMonths.includes('EXTRA_AMOUNT')) {
      setManualDepositAmount(calculatedBaseAmount.toString());
    }
  }, [calculatedBaseAmount, selectedMonths, transactionType]);
  
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  // Filtering states
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth());
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [showAllTime, setShowAllTime] = useState(false);

  const months = [
    { bn: 'জানুয়ারি', en: 'January', value: 0 },
    { bn: 'ফেব্রুয়ারি', en: 'February', value: 1 },
    { bn: 'মার্চ', en: 'March', value: 2 },
    { bn: 'এপ্রিল', en: 'April', value: 3 },
    { bn: 'মে', en: 'May', value: 4 },
    { bn: 'জুন', en: 'June', value: 5 },
    { bn: 'জুলাই', en: 'July', value: 6 },
    { bn: 'আগস্ট', en: 'August', value: 7 },
    { bn: 'সেপ্টেম্বর', en: 'September', value: 8 },
    { bn: 'অক্টোবর', en: 'October', value: 9 },
    { bn: 'নভেম্বর', en: 'November', value: 10 },
    { bn: 'ডিসেম্বর', en: 'December', value: 11 }
  ];

  const years = [2024, 2025, 2026, 2027];

  const changeUserRole = async (uid: string, newRole: 'admin' | 'member') => {
    if (userProfile?.appRole !== 'super_admin') return;
    try {
      await updateDoc(doc(db, 'users', uid), { appRole: newRole });
      alert(lang === 'bn' ? 'রোল পরিবর্তন করা হয়েছে' : 'Role updated successfully');
    } catch (err) {
      console.error(err);
      alert(lang === 'bn' ? 'রোল পরিবর্তন করা সম্ভব হয়নি' : 'Error updating role');
    }
  };

  const toggleApproval = async (uid: string, currentStatus: boolean) => {
    if (userProfile?.appRole !== 'admin' && userProfile?.appRole !== 'super_admin') return;
    try {
      await updateDoc(doc(db, 'users', uid), { isApproved: !currentStatus });
    } catch (err) {
      console.error(err);
      alert('অনুমোদন পরিবর্তন করা সম্ভব হয়নি');
    }
  };

  const [confirmDelete, setConfirmDelete] = useState<{ type: 'group' | 'member' | 'tx', id: string, secondaryId?: string } | null>(null);

  const deleteGroup = async (groupId: string) => {
    if (userProfile?.appRole !== 'admin' && userProfile?.appRole !== 'super_admin') {
      alert(lang === 'bn' ? 'আপনার এই কাজটি করার অনুমতি নেই' : 'You do not have permission to do this');
      return;
    }
    try {
      // 1. Delete all transactions in this group
      const txsSnap = await getDocs(collection(db, 'groups', groupId, 'transactions'));
      const membersSnap = await getDocs(collection(db, 'groups', groupId, 'members'));
      
      const batch = writeBatch(db);
      
      txsSnap.forEach((d) => {
        batch.delete(d.ref);
      });
      
      membersSnap.forEach((d) => {
        batch.delete(d.ref);
      });
      
      // 2. Delete the group itself
      batch.delete(doc(db, 'groups', groupId));
      
      await batch.commit();

      if (selectedGroup?.id === groupId) {
        setSelectedGroup(null);
      }
      alert(lang === 'bn' ? 'গ্রুপটি এবং এর সকল ডাটা মুছে ফেলা হয়েছে' : 'Group and all associated data deleted successfully');
      setConfirmDelete(null);
    } catch (err: any) {
      console.error(err);
      alert(lang === 'bn' ? `ডিলেট করতে ত্রুটি হয়েছে: ${err.message}` : `Error deleting group: ${err.message}`);
    }
  };

  const deleteMemberFromGroup = async (groupId: string, memberUid: string) => {
    if (userProfile?.appRole !== 'admin' && userProfile?.appRole !== 'super_admin') {
      alert(lang === 'bn' ? 'আপনার এই কাজটি করার অনুমতি নেই' : 'You do not have permission to do this');
      return;
    }
    try {
      // 1. Delete from subcollection
      await deleteDoc(doc(db, 'groups', groupId, 'members', memberUid));
      
      // 2. Also update the group document's members array
      const groupRef = doc(db, 'groups', groupId);
      const groupSnap = await getDoc(groupRef);
      if (groupSnap.exists()) {
        const groupData = groupSnap.data() as SavingsGroup;
        const updatedMembers = groupData.members.filter(id => id !== memberUid);
        const newGoalAmount = updatedMembers.length * (groupData.monthlyAmount || 0) * (groupData.durationMonths || 1);
        
        await updateDoc(groupRef, { 
          members: updatedMembers,
          goalAmount: newGoalAmount
        });
        
        // Update local state if it's the selected group
        if (selectedGroup?.id === groupId) {
          setSelectedGroup({ ...selectedGroup, members: updatedMembers, goalAmount: newGoalAmount });
        }
      }
      
      alert(lang === 'bn' ? 'সদস্যকে রিমুভ করা হয়েছে' : 'Member removed successfully');
      setConfirmDelete(null);
    } catch (err: any) {
      console.error(err);
      alert(lang === 'bn' ? `রিমুভ করতে ত্রুটি হয়েছে: ${err.message}` : `Error removing member: ${err.message}`);
    }
  };

  const deleteTransaction = async (groupId: string, txId: string) => {
    if (userProfile?.appRole !== 'admin' && userProfile?.appRole !== 'super_admin') {
      alert(lang === 'bn' ? 'আপনার এই কাজটি করার অনুমতি নেই' : 'You do not have permission to do this');
      return;
    }
    try {
      await deleteDoc(doc(db, 'groups', groupId, 'transactions', txId));
      alert(lang === 'bn' ? 'লেনদেন ডিলেট করা হয়েছে' : 'Transaction deleted successfully');
      setConfirmDelete(null);
    } catch (err: any) {
      console.error(err);
      alert(lang === 'bn' ? `ডিলেট করতে ত্রুটি হয়েছে: ${err.message}` : `Error deleting transaction: ${err.message}`);
    }
  };

  useEffect(() => {
    let detachProfile: (() => void) | null = null;
    let detachGroups: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      // Clear previous listeners if auth state changes
      if (detachProfile) { detachProfile(); detachProfile = null; }
      if (detachGroups) { detachGroups(); detachGroups = null; }

      setUser(u);
      
      try {
        if (u) {
          const userRef = doc(db, 'users', u.uid);
          const snap = await getDoc(userRef);
          
          let profile: UserProfile;
          
          if (!snap.exists()) {
            // Check if this is the bootstrap admin email
            const isFirstUser = u.email === 'jh6854511@gmail.com';
            
            profile = {
              uid: u.uid,
              email: u.email || '',
              displayName: u.displayName || (lang === 'bn' ? 'অজানা' : 'Unknown'),
              photoURL: u.photoURL || null,
              createdAt: serverTimestamp() as any,
              isApproved: isFirstUser, // First user is approved automatically
              appRole: isFirstUser ? 'super_admin' : 'member'
            };
            await setDoc(userRef, profile);
          } else {
            profile = { ...snap.data() } as UserProfile;
            // Ensure the bootstrap email is always super_admin even if record existed before logic
            if (u.email === 'jh6854511@gmail.com' && profile.appRole !== 'super_admin') {
              profile.appRole = 'super_admin';
              profile.isApproved = true;
              await updateDoc(userRef, { appRole: 'super_admin', isApproved: true });
            }
          }
          
          setUserProfile(profile);
          
          detachProfile = onSnapshot(userRef, (s) => {
            if (s.exists()) setUserProfile(s.data() as UserProfile);
          }, (error) => console.error("Profile Snapshot error:", error));
        } else {
          setUserProfile(null);
        }
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setLoading(false);
      }
    });
    
    return () => {
      unsubscribe();
      if (detachProfile) detachProfile();
    };
  }, [lang]);

  // Offline Sync and Network Status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen to groups based on user profile/role
  useEffect(() => {
    if (userProfile && user) {
      // If approved, see ALL groups. Otherwise, only groups where the user is a member.
      const groupsQuery = userProfile.isApproved
        ? collection(db, 'groups')
        : firestoreQuery(collection(db, 'groups'), where('members', 'array-contains', user.uid));

      const detachGroups = onSnapshot(groupsQuery, (snapshot) => {
        setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavingsGroup)));
        if (snapshot.metadata.hasPendingWrites) setIsSyncing(true);
        else if (!snapshot.metadata.hasPendingWrites) setIsSyncing(false);
      }, (error) => console.error("Groups Snapshot error:", error));

      return () => detachGroups();
    }
  }, [userProfile, user]);

  // Listen to all users for member list and admin management
  useEffect(() => {
    if (userProfile) {
      // Admins see everyone, members only see approved users
      const q = (userProfile.appRole === 'admin' || userProfile.appRole === 'super_admin') 
        ? collection(db, 'users')
        : firestoreQuery(collection(db, 'users'), where('isApproved', '==', true));

      const detachAllUsers = onSnapshot(q, (snapshot) => {
        const users = snapshot.docs.map(doc => doc.data() as UserProfile);
        // Sort admins up, then by name
        const sorted = [...users].sort((a, b) => {
          if (a.appRole === 'super_admin') return -1;
          if (b.appRole === 'super_admin') return 1;
          if (a.appRole === 'admin') return -1;
          if (b.appRole === 'admin') return 1;
          return a.displayName.localeCompare(b.displayName);
        });
        setAllUsers(sorted);
      }, (error) => console.error("All Users Snapshot error:", error));
      return () => detachAllUsers();
    }
  }, [userProfile]);

  const [rawGlobalTransactions, setRawGlobalTransactions] = useState<(Transaction & { groupId: string })[]>([]);
  
  // Listen to all user's transactions for global records
  useEffect(() => {
    // If we've switched to per-group fetch for a non-admin/non-approved user, don't use this effect
    if (usePerGroupTxFetch && userProfile && !userProfile.isApproved) {
      return;
    }

    if (userProfile) {
      let q;
      if (txQueryFallback) {
         // Fallback query without orderBy to avoid composite index requirement
         q = userProfile.isApproved
           ? collectionGroup(db, 'transactions')
           : firestoreQuery(collectionGroup(db, 'transactions'), where('userId', '==', userProfile.uid));
      } else {
         // Primary query with server-side ordering
         q = userProfile.isApproved
           ? firestoreQuery(collectionGroup(db, 'transactions'), orderBy('date', 'desc'))
           : firestoreQuery(collectionGroup(db, 'transactions'), where('userId', '==', userProfile.uid), orderBy('date', 'desc'));
      }

      const detachGlobalTx = onSnapshot(q, (snapshot) => {
        let txs = snapshot.docs.map(doc => {
          const pathParts = doc.ref.path.split('/');
          return { 
            id: doc.id, 
            groupId: pathParts[1], 
            ...doc.data() 
          } as Transaction & { groupId: string };
        });

        // If in fallback mode, we must sort in memory
        if (txQueryFallback) {
          txs.sort((a, b) => {
            const dateA = a.date && (a.date as any).toDate ? (a.date as any).toDate() : new Date((a.date as any) || 0);
            const dateB = b.date && (b.date as any).toDate ? (b.date as any).toDate() : new Date((b.date as any) || 0);
            return dateB.getTime() - dateA.getTime();
          });
        }

        setRawGlobalTransactions(txs);
      }, (error) => {
        console.error("Global Transactions Snapshot error:", error);
        if (error.code === 'failed-precondition' && error.message.includes('index')) {
          const isSingleFieldIndex = error.message.includes('userId') || error.message.includes('COLLECTION_GROUP_ASC');
          
          if (isSingleFieldIndex && userProfile.appRole !== 'admin' && userProfile.appRole !== 'super_admin') {
             console.warn("Collection Group index for userId missing. Switching to per-group fetch strategy...");
             setUsePerGroupTxFetch(true);
          } else {
             console.warn("Missing composite index detected. Switching to client-side sorting fallback...");
             setTxQueryFallback(true);
          }
        }
      });
      return () => detachGlobalTx();
    }
  }, [userProfile, txQueryFallback, usePerGroupTxFetch]);

  // Per-group fetch fallback for when collectionGroup index for userId is missing
  useEffect(() => {
    if (usePerGroupTxFetch && userProfile && !userProfile.isApproved && groups.length > 0) {
      const unsubscribers: (() => void)[] = [];
      const groupDataMap: Record<string, (Transaction & { groupId: string })[]> = {};

      groups.forEach(group => {
        const q = firestoreQuery(
          collection(db, 'groups', group.id, 'transactions'),
          where('userId', '==', userProfile.uid)
        );
        
        const unsub = onSnapshot(q, (snapshot) => {
          groupDataMap[group.id] = snapshot.docs.map(doc => ({
            id: doc.id,
            groupId: group.id,
            ...doc.data()
          } as Transaction & { groupId: string }));
          
          const combined = Object.values(groupDataMap).flat().sort((a, b) => {
            const dateA = a.date && (a.date as any).toDate ? (a.date as any).toDate() : new Date((a.date as any) || 0);
            const dateB = b.date && (b.date as any).toDate ? (b.date as any).toDate() : new Date((b.date as any) || 0);
            return dateB.getTime() - dateA.getTime();
          });
          
          setRawGlobalTransactions(combined);
        }, (err) => {
           console.error(`Per-group fallback fetch error for ${group.id}:`, err);
        });
        unsubscribers.push(unsub);
      });

      return () => unsubscribers.forEach(unsub => unsub());
    }
  }, [userProfile, usePerGroupTxFetch, groups]);

  // Derive filtered global transactions based on active groups
  useEffect(() => {
    const activeGroupIds = new Set(groups.map(g => g.id));
    const filtered = rawGlobalTransactions.filter(tx => activeGroupIds.has(tx.groupId));
    setGlobalTransactions(filtered);
  }, [rawGlobalTransactions, groups]);

  useEffect(() => {
    if (groups.length > 0 && !selectedGroup) {
      setSelectedGroup(groups[0]);
    } else if (selectedGroup) {
      const fresh = groups.find(g => g.id === selectedGroup.id);
      if (fresh) setSelectedGroup(fresh);
    }
  }, [groups]);

  useEffect(() => {
    if (selectedGroup) {
      const txQ = firestoreQuery(
        collection(db, 'groups', selectedGroup.id, 'transactions'),
        orderBy('date', 'desc')
      );
      const detachTx = onSnapshot(txQ, (snapshot) => {
        setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
        setIsSyncing(snapshot.metadata.hasPendingWrites);
      }, (error) => console.error("Group Transactions Snapshot error:", error));

      const memberQ = collection(db, 'groups', selectedGroup.id, 'members');
      const detachMem = onSnapshot(memberQ, (snapshot) => {
        setMembers(snapshot.docs.map(doc => ({ ...doc.data() } as GroupMember)));
        if (snapshot.metadata.hasPendingWrites) setIsSyncing(true);
      }, (error) => console.error("Group Members Snapshot error:", error));

      return () => {
        detachTx();
        detachMem();
      };
    }
  }, [selectedGroup]);

  const createGroup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const monthlyAmount = Number(formData.get('monthlyAmount'));
    const durationMonths = Number(formData.get('durationMonths'));
    const description = formData.get('description') as string;
    const previousYearBalance = Number(formData.get('previousYearBalance') || 0);
    
    // Calculate initial goal amount (1 member * monthly * duration)
    const goalAmount = (1 * monthlyAmount * durationMonths) + previousYearBalance;
    
    // Construct start date
    const startDate = new Date(
      Number(formData.get('startYear')),
      Number(formData.get('startMonth')),
      Number(formData.get('startDay'))
    );

    // Construct end date
    const endDate = new Date(
      Number(formData.get('endYear')),
      Number(formData.get('endMonth')),
      Number(formData.get('endDay'))
    );

    try {
      const groupRef = await addDoc(collection(db, 'groups'), {
        name,
        goalAmount,
        monthlyAmount,
        durationMonths,
        previousYearBalancePerPerson: previousYearBalance,
        description,
        startDate: Timestamp.fromDate(startDate),
        endDate: Timestamp.fromDate(endDate),
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        members: [user.uid],
        status: 'active'
      });

      await setDoc(doc(db, 'groups', groupRef.id, 'members', user.uid), {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        role: 'owner',
        joinedAt: serverTimestamp()
      });

      setShowCreateModal(false);
    } catch (err) {
      console.error(err);
      alert('গ্রুপ তৈরি করতে সমস্যা হয়েছে।');
    }
  };

  // Export helper
  const printToPDF = (title: string) => {
    // This uses the browser's native print-to-PDF functionality,
    // which handles Unicode/Bengali fonts automatically.
    window.print();
  };
 
  const addTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !selectedGroup) return;

    const formData = new FormData(e.currentTarget);
    const type = formData.get('type') as 'deposit' | 'withdrawal';
    const description = formData.get('description') as string;
    const userId = formData.get('userId') as string;
    
    // Amount calculation
    let amount = Number(formData.get('amount'));

    const selectedUser = members.find(m => m.uid === userId);

    try {
      await addDoc(collection(db, 'groups', selectedGroup.id, 'transactions'), {
        amount,
        type,
        description,
        userId,
        userName: selectedUser?.displayName || 'অজানা',
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        date: serverTimestamp(), // Auto-set date to now
        forMonths: type === 'deposit' ? selectedMonths : null
      });
      setShowAddTxModal(false);
      setSelectedMonths([]); // Clear selected months
      setManualDepositAmount('');
    } catch (err) {
      console.error(err);
      alert('লেনদেন যোগ করতে সমস্যা হয়েছে।');
    }
  };

  const addMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !selectedGroup) return;

    const formData = new FormData(e.currentTarget);
    
    try {
      if (isManualAdd) {
        const name = formData.get('name') as string;
        const phone = formData.get('phone') as string;
        const manualUid = `manual-${Date.now()}`;
        
        const updatedMembers = [...selectedGroup.members, manualUid];
        const newGoalAmount = updatedMembers.length * ((selectedGroup.monthlyAmount || 0) * (selectedGroup.durationMonths || 1) + (selectedGroup.previousYearBalancePerPerson || 0));
        
        await updateDoc(doc(db, 'groups', selectedGroup.id), {
          members: updatedMembers,
          goalAmount: newGoalAmount
        });

        await setDoc(doc(db, 'groups', selectedGroup.id, 'members', manualUid), {
          uid: manualUid,
          displayName: name,
          phone: phone || '',
          isManual: true,
          role: 'member',
          joinedAt: serverTimestamp()
        });
      } else {
        const email = formData.get('email') as string;
        const usersQ = firestoreQuery(collection(db, 'users'), where('email', '==', email));
        const userSnap = await getDocs(usersQ);
        
        if (userSnap.empty) {
          alert('এই ইমেইলে কোনো ইউজার পাওয়া যায়নি।');
          return;
        }

        const newUser = userSnap.docs[0].data() as UserProfile;
        
        const updatedMembers = [...selectedGroup.members, newUser.uid];
        const newGoalAmount = updatedMembers.length * ((selectedGroup.monthlyAmount || 0) * (selectedGroup.durationMonths || 1) + (selectedGroup.previousYearBalancePerPerson || 0));
        
        await updateDoc(doc(db, 'groups', selectedGroup.id), {
          members: updatedMembers,
          goalAmount: newGoalAmount
        });

        await setDoc(doc(db, 'groups', selectedGroup.id, 'members', newUser.uid), {
          uid: newUser.uid,
          displayName: newUser.displayName,
          email: newUser.email,
          role: 'member',
          joinedAt: serverTimestamp()
        });
      }

      setShowAddMemberModal(false);
    } catch (err: any) {
      console.error(err);
      alert(`মেম্বার যোগ করতে সমস্যা হয়েছে: ${err.message || err}`);
    }
  };

  const updateProfileInfo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!auth.currentUser || !userProfile || isProfileUpdating) return;
    
    const formData = new FormData(e.currentTarget);
    const displayName = formData.get('displayName') as string;
    const photoFile = (e.currentTarget.elements.namedItem('photo') as HTMLInputElement).files?.[0];
    const oldPassword = formData.get('oldPassword') as string;
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    
    // File size check (max 500KB for base64 in Firestore to stay under 1MB limit comfortably)
    if (photoFile && photoFile.size > 500 * 1024) {
      alert(lang === 'bn' ? 'ছবির সাইজ ৫০০ কেবির কম হতে হবে।' : 'Photo size must be less than 500KB.');
      return;
    }

    setIsProfileUpdating(true);
    
    try {
      // If changing password, validation
      if (newPassword) {
        if (newPassword !== confirmPassword) {
            alert(t.passwordMismatch);
            setIsProfileUpdating(false);
            return;
        }
        if (newPassword.length < 6) {
            alert(t.weakPassword);
            setIsProfileUpdating(false);
            return;
        }
        if (!oldPassword) {
            alert(lang === 'bn' ? 'পাসওয়ার্ড পরিবর্তনের জন্য পুরানো পাসওয়ার্ড আবশ্যক।' : 'Old password is required to change password.');
            setIsProfileUpdating(false);
            return;
        }

        // Re-authenticate
        try {
          const credential = EmailAuthProvider.credential(auth.currentUser.email!, oldPassword);
          await reauthenticateWithCredential(auth.currentUser, credential);
        } catch (reauthErr: any) {
          console.error("Re-auth error:", reauthErr);
          setIsProfileUpdating(false);
          if (reauthErr.code === 'auth/invalid-credential' || reauthErr.code === 'auth/wrong-password') {
            alert(lang === 'bn' ? 'আপনার বর্তমান পাসওয়ার্ডটি সঠিক নয়।' : 'Your current password is incorrect.');
          } else {
            alert(lang === 'bn' ? 'পাসওয়ার্ড ভেরিফিকেশনে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।' : 'Failed to verify password. Please try again.');
          }
          return;
        }
      }

      let photoURL = userProfile.photoURL;
      
      if (photoFile) {
        const reader = new FileReader();
        const base64: string = await new Promise((resolve, reject) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = (e) => reject(e);
          reader.readAsDataURL(photoFile);
        });
        photoURL = base64;
      }

      // Update Firebase Auth display name only (Base64 is too long for Auth photoURL)
      await updateProfile(auth.currentUser, { displayName });
      
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        displayName,
        photoURL: photoURL || null
      });

      if (newPassword) {
        await updatePassword(auth.currentUser, newPassword);
      }

      let successMsg = lang === 'bn' ? 'প্রোফাইল আপডেট সফল হয়েছে!' : 'Profile updated successfully!';
      if (newPassword) {
        successMsg = lang === 'bn' ? 'পাসওয়ার্ড এবং প্রোফাইল সফলভাবে পরিবর্তন করা হয়েছে!' : 'Password and profile updated successfully!';
      }
      
      alert(successMsg);
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      setIsProfileUpdating(false);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        alert(lang === 'bn' ? 'পুরানো পাসওয়ার্ডটি সঠিক নয়।' : 'Old password is incorrect.');
      } else {
        alert(`Error: ${err.message}`);
      }
    }
  };

  const deleteAccount = async () => {
    if (!auth.currentUser) return;
    const confirmed = window.confirm(lang === 'bn' ? 'আপনি কি নিশ্চিত যে আপনি আপনার অ্যাকাউন্টটি চিরস্থায়ীভাবে ডিলিট করতে চান?' : 'Are you sure you want to delete your account permanently?');
    if (!confirmed) return;
    
    try {
      const uid = auth.currentUser.uid;
      // Also cleanup Firestore
      await deleteDoc(doc(db, 'users', uid));
      await deleteUser(auth.currentUser);
      alert(lang === 'bn' ? 'অ্যাকাউন্ট ডিলিট করা হয়েছে।' : 'Account deleted successfully.');
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/requires-recent-login') {
        alert(lang === 'bn' ? 'নিরাপত্তার স্বার্থে এই কাজটি করার জন্য আপনাকে পুনরায় লগইন করে আসতে হবে।' : 'For security, please re-login before deleting your account.');
      } else {
        alert(`Error: ${err.message}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-gray">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full"
        />
      </div>
    );
  }

  if (!user) return <Auth lang={lang} setLang={setLang} />;

  const currentMonthName = months.find(m => m.value === filterMonth)?.[lang] || '';
  
  const filteredTransactions = transactions.filter(tx => {
    if (showAllTime) return true;
    const date = tx.date && tx.date.toDate ? tx.date.toDate() : new Date(tx.date);
    return date.getMonth() === filterMonth && date.getFullYear() === filterYear;
  });

  const totalSavedFiltered = filteredTransactions.reduce((acc, tx) => acc + (tx.type === 'deposit' ? tx.amount : -tx.amount), 0);
  const totalSavedAllTime = transactions.reduce((acc, tx) => acc + (tx.type === 'deposit' ? tx.amount : -tx.amount), 0);

  const dueMembers = members.map(member => {
    const unpaidMonths: string[] = [];
    const now = new Date();
    
    if (!selectedGroup) return { ...member, unpaidMonths };

    const userPaid = paidMonthsByUserId[member.uid] || new Set();

    // Check Previous Year Balance
    if (selectedGroup.previousYearBalancePerPerson && !userPaid.has('PREV_BALANCE')) {
      unpaidMonths.push(t.previousYearBalance);
    }

    const startDate = selectedGroup.startDate?.toDate ? selectedGroup.startDate.toDate() : new Date();
    const endDate = selectedGroup.endDate?.toDate ? selectedGroup.endDate.toDate() : new Date(now.getFullYear() + 10, 0, 1);
    
    const limitDate = now < endDate ? now : endDate;
    
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    
    while (current <= limitDate) {
      const label = `${current.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', {month: 'long'})} ${current.getFullYear()}`;
      if (!userPaid.has(label)) {
        unpaidMonths.push(label);
      }
      current.setMonth(current.getMonth() + 1);
    }
    
    return { ...member, unpaidMonths };
  }).filter(member => member.unpaidMonths.length > 0);

  const t_common = {
    groupLabel: lang === 'bn' ? 'আপনার গ্রুপ সমূহ' : 'Your Groups',
    newGroup: lang === 'bn' ? '+ নতুন গ্রুপ যোগ করুন' : '+ Add New Group',
    noGroups: lang === 'bn' ? 'আপনার কোনো সঞ্চয় গ্রুপ নেই' : 'You have no savings groups',
    createFirst: lang === 'bn' ? 'প্রথম গ্রুপ তৈরি করুন' : 'Create First Group',
    userManagement: lang === 'bn' ? 'ইউজার ম্যানেজমেন্ট' : 'User Management',
    userManagementDesc: lang === 'bn' ? 'নতুন মেম্বারদের এপ্রুভ করুন এবং রোল প্রদান করুন' : 'Approve new members and assign roles',
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-bg-gray">
      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={cn(
        "bg-primary flex flex-col h-auto md:h-screen md:flex-shrink-0 z-40 shadow-xl", 
        isSidebarOpen ? "fixed inset-y-0 left-0 w-[260px] h-full" : "hidden md:flex md:w-[220px]"
      )}>
        <div className="p-4">
          <h2 className="text-lg font-bold flex items-center gap-2 text-white border-b border-white/10 pb-4 mb-4">
            <span className="text-xl">🐂</span>
            {lang === 'bn' ? 'রোজার গরুর জন্য সঞ্চয়' : 'Ramadan Cow Savings'}
          </h2>
          
          <nav className="space-y-1">
            <div 
              onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
              className={cn("sidebar-item", activeTab === 'dashboard' && "active")}
            >
              <LayoutDashboard size={18} />
              {t.dashboard}
            </div>
            
            {(userProfile?.appRole === 'admin' || userProfile?.appRole === 'super_admin') && (
              <div 
                onClick={() => { setActiveTab('users'); setIsSidebarOpen(false); }}
                className={cn("sidebar-item", activeTab === 'users' && "active")}
              >
                <ShieldCheck size={18} />
                {t.userManagement}
              </div>
            )}

            <div 
              onClick={() => { setActiveTab('members'); setIsSidebarOpen(false); }}
              className={cn("sidebar-item", activeTab === 'members' && "active")}
            >
              <Users size={18} />
              {t.membersList}
            </div>
            <div 
              onClick={() => { setActiveTab('transactions'); setIsSidebarOpen(false); }}
              className={cn("sidebar-item", activeTab === 'transactions' && "active")}
            >
              <ReceiptText size={18} />
              {lang === 'bn' ? 'লেনদেন রেকর্ড' : 'Transaction Records'}
            </div>
            <div 
              onClick={() => { setActiveTab('dues'); setIsSidebarOpen(false); }}
              className={cn("sidebar-item", activeTab === 'dues' && "active")}
            >
              <AlertCircle size={18} />
              {t.dueRecord}
            </div>
            <div 
              onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }}
              className={cn("sidebar-item", activeTab === 'settings' && "active")}
            >
              <SettingsIcon size={18} />
              {t.settings}
            </div>
          </nav>
        </div>
        
        <div className="mt-auto p-6 hidden md:block">
          <div className="text-[10px] text-white/40 uppercase tracking-widest mb-4">
            {lang === 'bn' ? 'ক্লাউড সিনক্রোনাইজড: অ্যাক্টিভ' : 'Cloud Synchronized: Active'}
          </div>
          <button onClick={logOut} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-xs font-semibold mb-6">
            <LogOut size={14} />
            {lang === 'bn' ? 'লগআউট করুন' : 'Logout'}
          </button>
          
          <div className="pt-6 border-t border-white/10">
            <p className="text-[10px] text-white/40 leading-relaxed italic">
              {lang === 'bn' ? 'সাইট তৈরি করেছেন মোঃ জাহিদ হাসান' : 'Site created by Md. Zahid Hasan'}
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 md:h-screen md:overflow-y-auto">
        {/* Header */}
        <header className="bg-white border-b border-border-gray px-6 py-3 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <button className="md:hidden p-2 text-primary" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              <Menu size={20} />
            </button>
            {activeTab === 'dashboard' && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full lg:w-auto">
                <div>
                  <h1 className="text-lg font-bold text-primary">
                    {activeTab === 'dashboard' && selectedGroup ? selectedGroup.name : (currentMonthName + " " + t.monthlyDashboard)}
                  </h1>
                  <p className="text-text-light text-[10px] uppercase font-bold tracking-widest">{t.savingsGoalDate}</p>
                </div>
              </div>
            )}

            {activeTab === 'dashboard' && groups.length > 0 && (
              <div className="flex items-center gap-1 bg-primary/5 p-1 rounded-lg border border-primary/10 max-w-[120px]">
                <LayoutDashboard size={12} className="text-primary ml-1 shrink-0" />
                <select 
                  value={selectedGroup?.id || ''} 
                  onChange={(e) => {
                    const group = groups.find(g => g.id === e.target.value);
                    if (group) setSelectedGroup(group);
                  }}
                  className="bg-transparent px-1 py-0.5 text-[10px] font-bold text-primary outline-none cursor-pointer pr-3 truncate"
                >
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
            )}

            {activeTab === 'dashboard' && (
              <div className="flex flex-wrap items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100 max-w-full">
                <select 
                  value={filterMonth} 
                  onChange={(e) => { setFilterMonth(parseInt(e.target.value)); setShowAllTime(false); }}
                  className="bg-transparent px-0.5 py-0.5 text-[9px] font-bold text-slate-600 outline-none cursor-pointer hover:text-primary transition-colors max-w-[65px]"
                >
                  {months.map(m => (
                    <option key={m.value} value={m.value}>{lang === 'bn' ? m.bn : m.en}</option>
                  ))}
                </select>
                <div className="w-px h-3 bg-slate-200" />
                <select 
                  value={filterYear} 
                  onChange={(e) => { setFilterYear(parseInt(e.target.value)); setShowAllTime(false); }}
                  className="bg-transparent px-0.5 py-0.5 text-[9px] font-bold text-slate-600 outline-none cursor-pointer hover:text-primary transition-colors max-w-[50px]"
                >
                  {years.map(y => (
                    <option key={y} value={y}>{formatNumber(y, lang)}</option>
                  ))}
                </select>
                <div className="w-px h-3 bg-slate-200" />
                <button 
                  onClick={() => setShowAllTime(!showAllTime)}
                  className={cn(
                    "px-1.5 py-0.5 rounded-md text-[8px] uppercase tracking-wider font-bold transition-all",
                    showAllTime ? "bg-primary text-white" : "text-slate-500 hover:text-primary"
                  )}
                >
                  {t.allMonths}
                </button>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4 ml-auto lg:ml-0">
            {/* Sync & Offline Status */}
            <div className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-full bg-slate-50 border border-slate-100">
              {isSyncing ? (
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-amber-600 uppercase tracking-tight">
                  <RotateCw size={10} className="animate-spin" />
                  {lang === 'bn' ? 'সিঙ্ক হচ্ছে' : 'Syncing'}
                </div>
              ) : isOnline ? (
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-600 uppercase tracking-tight">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {lang === 'bn' ? 'অনলাইন' : 'Online'}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-rose-600 uppercase tracking-tight">
                  <WifiOff size={10} />
                  {lang === 'bn' ? 'অফলাইন' : 'Offline'}
                </div>
              )}
            </div>

            <button 
              onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
              className="p-2 border border-border-gray rounded-lg text-primary hover:bg-slate-50 transition-colors flex items-center gap-2 text-xs font-bold"
            >
              <Languages size={14} />
              {lang === 'bn' ? 'EN' : 'BN'}
            </button>
            <div className="text-right hidden sm:block">
              <p className="text-sm">{t.welcome}, <strong>{user?.displayName}</strong></p>
            </div>
            {userProfile?.photoURL ? (
              <img src={userProfile.photoURL} className="w-9 h-9 rounded-full border border-border-gray" alt="" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-9 h-9 bg-accent rounded-full flex items-center justify-center text-white font-bold text-sm">
                {user?.displayName?.charAt(0)}
              </div>
            )}
            <button onClick={logOut} className="md:hidden p-2 text-primary">
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <div className="p-8 space-y-6 max-w-[1200px] w-full mx-auto">
          {userProfile && !userProfile.isApproved && (
            <div className="card bg-amber-50 border-amber-200 p-6 flex items-start gap-4 shadow-sm">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shrink-0">
                <Info size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-amber-900 mb-1">{t.pendingApproval}</h3>
                <p className="text-sm text-amber-700 leading-relaxed">
                  {t.pendingApprovalDesc}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'dashboard' ? (
             selectedGroup ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-8 pb-10"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 text-text-light text-xs font-semibold uppercase tracking-wider">
                      <span className="text-primary truncate">{selectedGroup.name}</span>
                    </div>
                    {(userProfile?.appRole === 'admin' || userProfile?.appRole === 'super_admin') && (
                      <button 
                        onClick={() => setConfirmDelete({ type: 'group', id: selectedGroup.id })}
                        className="flex items-center gap-1.5 text-rose-500 hover:text-rose-700 font-bold transition-colors"
                      >
                        <Trash2 size={14} />
                        <span className="text-[10px] uppercase tracking-wider">{lang === 'bn' ? 'গ্রুপটি ডিলিট করুন' : 'Delete Group'}</span>
                      </button>
                    )}
                  </div>

                  {/* Stats Overview */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
                      <div className="card p-3 md:p-4">
                        <div className="text-[9px] md:text-[10px] font-bold text-text-light uppercase tracking-wider mb-1">
                          {lang === 'bn' ? 'মোট জমা' : 'Collected'}
                        </div>
                        <div className="text-sm font-bold text-emerald-600 truncate">
                           {formatCurrency(transactions.filter(tx => tx.type === 'deposit').reduce((acc, tx) => acc + tx.amount, 0), lang)}
                        </div>
                      </div>
                      
                      <div className="card p-3 md:p-4">
                        <div className="text-[9px] md:text-[10px] font-bold text-text-light uppercase tracking-wider mb-1">
                          {lang === 'bn' ? 'বাকি' : 'Remaining'}
                        </div>
                        <div className="text-sm font-bold text-rose-600 truncate">
                           {formatCurrency(Math.max(0, selectedGroup.goalAmount - transactions.filter(tx => tx.type === 'deposit').reduce((acc, tx) => acc + tx.amount, 0)), lang)}
                        </div>
                      </div>

                      <div className="card p-3 md:p-4">
                        <div className="text-[9px] md:text-[10px] font-bold text-text-light uppercase tracking-wider mb-1 truncate">
                          {lang === 'bn' ? 'মোট লক্ষ্যমাত্রা' : 'Target Goal'}
                        </div>
                        <div className="text-sm font-bold text-primary truncate">
                          {formatCurrency(selectedGroup.goalAmount, lang)}
                        </div>
                        <div className="text-[8px] text-slate-400 font-medium leading-tight whitespace-pre-wrap">
                          {formatNumber(selectedGroup.members.length, lang)} × ({formatCurrency(selectedGroup.monthlyAmount || 0, lang)} × {formatNumber(selectedGroup.durationMonths || 1, lang)}
                          {selectedGroup.previousYearBalancePerPerson ? ` + ${formatCurrency(selectedGroup.previousYearBalancePerPerson, lang)}` : ''})
                        </div>
                      </div>

                      <div className="card p-3 md:p-4">
                        <div className="text-[9px] md:text-[10px] font-bold text-text-light uppercase tracking-wider mb-1 truncate">
                          {lang === 'bn' ? 'মোট সদস্য' : 'Total Members'}
                        </div>
                        <div className="text-sm font-bold text-primary truncate">
                          {formatNumber(members.filter(m => {
                            const joinedAt = m.joinedAt && m.joinedAt.toDate ? m.joinedAt.toDate() : new Date(m.joinedAt || 0);
                            const startDate = selectedGroup.startDate && selectedGroup.startDate.toDate ? selectedGroup.startDate.toDate() : new Date(selectedGroup.startDate);
                            const endDate = selectedGroup.endDate && selectedGroup.endDate.toDate ? selectedGroup.endDate.toDate() : new Date(selectedGroup.endDate);
                            return joinedAt >= startDate && joinedAt <= endDate;
                          }).length, lang)}
                        </div>
                      </div>

                      <div className="card p-3 md:p-4">
                        <div className="text-[9px] md:text-[10px] font-bold text-text-light uppercase tracking-wider mb-1 truncate">
                           {showAllTime ? t.allTimeTotal : `${months.find(m => m.value === filterMonth)?.[lang]} ${formatNumber(filterYear, lang)}`}
                        </div>
                        <div className="text-sm font-bold text-primary truncate">
                          {formatCurrency(totalSavedFiltered, lang)}
                        </div>
                        <div className="text-[8px] text-text-light font-bold mt-1 uppercase">
                          {lang === 'bn' ? 'টার্গেট: ' : 'Goal: '} {formatCurrency(selectedGroup.goalAmount, lang)}
                        </div>
                      </div>
                      
                      <div className="card p-3 md:p-4">
                        <div className="text-[9px] md:text-[10px] font-bold text-text-light uppercase tracking-wider mb-1">{lang === 'bn' ? 'টার্গেট ফিলাপ' : 'Target'}</div>
                        <div className="text-xs font-bold text-primary truncate mt-1">
                          {formatNumber(Math.round((transactions.filter(tx => {
                             const txDate = tx.date && tx.date.toDate ? tx.date.toDate() : new Date(tx.date);
                             const startDate = selectedGroup.startDate && selectedGroup.startDate.toDate ? selectedGroup.startDate.toDate() : new Date(selectedGroup.startDate);
                             const endDate = selectedGroup.endDate && selectedGroup.endDate.toDate ? selectedGroup.endDate.toDate() : new Date(selectedGroup.endDate);
                             return tx.type === 'deposit' && txDate >= startDate && txDate <= endDate;
                           }).reduce((acc, tx) => acc + tx.amount, 0) / selectedGroup.goalAmount) * 100), lang)}%
                        </div>
                        <div className="h-1 bg-slate-100 rounded-full mt-2 overflow-hidden">
                          <div 
                            className="bg-primary h-full transition-all duration-500" 
                            style={{ width: `${Math.min(100, (transactions.filter(tx => {
                               const txDate = tx.date && tx.date.toDate ? tx.date.toDate() : new Date(tx.date);
                               const startDate = selectedGroup.startDate && selectedGroup.startDate.toDate ? selectedGroup.startDate.toDate() : new Date(selectedGroup.startDate);
                               const endDate = selectedGroup.endDate && selectedGroup.endDate.toDate ? selectedGroup.endDate.toDate() : new Date(selectedGroup.endDate);
                               return tx.type === 'deposit' && txDate >= startDate && txDate <= endDate;
                             }).reduce((acc, tx) => acc + tx.amount, 0) / selectedGroup.goalAmount) * 100)}%` }} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                    {/* Main Action Area / Content Card */}
                    <div className="lg:col-span-3 flex flex-col space-y-6">
                      <div className="card">
                        <div className="card-header">
                          <h3 className="text-lg font-bold">{t.transactionHistory}</h3>
                          <button 
                            onClick={() => {
                              setShowAddTxModal(true);
                              if (members.length > 0) setTargetUserId(members[0].uid);
                            }}
                            disabled={!userProfile?.isApproved || (userProfile.appRole !== 'admin' && userProfile.appRole !== 'super_admin')}
                            className="btn btn-primary disabled:bg-slate-300 disabled:shadow-none"
                          >
                            + {t.newTransaction}
                          </button>
                        </div>
                        
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr>
                                <th className="data-table-th">{lang === 'bn' ? 'তারিখ' : 'Date'}</th>
                                <th className="data-table-th">{lang === 'bn' ? 'সদস্যের নাম' : 'Member Name'}</th>
                                <th className="data-table-th">{t.description}</th>
                                <th className="data-table-th">{lang === 'bn' ? 'পরিমাণ' : 'Amount'}</th>
                                <th className="data-table-th text-center">{t.action}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredTransactions.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="data-table-td text-center text-text-light py-10 italic">{t.noTransactions}</td>
                                </tr>
                              ) : (
                                filteredTransactions.map(tx => (
                                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="data-table-td text-[11px] text-text-light font-medium">
                                      {tx.date && (tx.date.toDate ? tx.date.toDate() : new Date(tx.date)).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="data-table-td font-semibold">
                                      {tx.userName}
                                      {tx.forMonths && tx.forMonths.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {tx.forMonths.map(m => (
                                            <span key={m} className="px-1.5 py-0.5 bg-primary/10 text-primary text-[8px] font-bold rounded uppercase">
                                              {m}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </td>
                                    <td className="data-table-td text-text-light truncate max-w-[120px]">{tx.description}</td>
                                    <td className={cn(
                                      "data-table-td font-bold",
                                      tx.type === 'deposit' ? "text-primary" : "text-red-700"
                                    )}>
                                      {tx.type === 'deposit' ? '+' : '-'}{formatNumber(tx.amount, lang)} ৳
                                    </td>
                                    <td className="data-table-td">
                                      <div className="flex items-center justify-center gap-2">
                                        <span className={cn(
                                          "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                                          tx.type === 'deposit' ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
                                        )}>
                                          {tx.type === 'deposit' ? t.deposit : t.withdrawal}
                                        </span>
                                        {(userProfile?.appRole === 'admin' || userProfile?.appRole === 'super_admin') && (
                                           <button 
                                             onClick={() => setConfirmDelete({ type: 'tx', id: selectedGroup.id, secondaryId: tx.id })}
                                             className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                                           >
                                             <Trash2 size={12} />
                                           </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Sidebar Column: Members */}
                    <div className="lg:col-span-2 space-y-6">
                      <div className="card printable-area">
                        <div className="card-header flex justify-between items-center">
                          <h3 className="text-lg font-bold">{t.members}</h3>
                          <div className="flex gap-2 no-print">
                            {(userProfile?.appRole === 'admin' || userProfile?.appRole === 'super_admin') && (
                               <button 
                                  onClick={() => setShowAddMemberModal(true)}
                                  disabled={!userProfile?.isApproved}
                                  className="p-2 text-primary hover:bg-slate-50 rounded-lg transition-colors disabled:text-slate-300 no-print"
                                >
                                  <UserPlus size={20} />
                                </button>
                            )}
                          </div>
                        </div>
                        <div className="p-4 space-y-4">
                          {members.map(member => {
                            const memberTransactions = transactions.filter(t => t.userId === member.uid);
                            const memberTotal = memberTransactions.reduce((acc, t) => acc + (t.type === 'deposit' ? t.amount : -t.amount), 0);
                            
                            return (
                              <div key={member.uid} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center font-bold text-primary group-hover:bg-primary group-hover:text-white transition-all">
                                    {member.displayName.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-bold truncate max-w-[100px]">{member.displayName}</p>
                                      {(userProfile?.appRole === 'admin' || userProfile?.appRole === 'super_admin') && member.role !== 'owner' && (
                                        <button 
                                          onClick={() => setConfirmDelete({ type: 'member', id: selectedGroup.id, secondaryId: member.uid })}
                                          className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all"
                                        >
                                          <X size={12} />
                                        </button>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-text-light uppercase tracking-wider font-bold">
                                      {member.role === 'owner' ? t.owner : member.role === 'admin' ? t.admin : t.member}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-bold text-primary">{formatNumber(memberTotal, lang)} ৳</p>
                                  <p className="text-[10px] text-text-light">{lang === 'bn' ? 'মোট সঞ্চয়' : 'Total Savings'}</p>
                                </div>
                              </div>
                            )})}
                          {(userProfile?.appRole === 'admin' || userProfile?.appRole === 'super_admin') && (
                            <button 
                               onClick={() => setShowAddMemberModal(true)}
                               disabled={!userProfile?.isApproved}
                              className="w-full py-3 border border-dashed border-border-gray rounded-lg text-primary text-[11px] uppercase tracking-widest font-bold hover:bg-primary/5 transition-all disabled:text-slate-300 disabled:bg-transparent"
                            >
                              {t.inviteMember}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
             ) : (
                <div className="space-y-10">
                  <div className="card p-20 text-center bg-white border-dashed border-2">
                    <div className="text-5xl mb-6">🏝️</div>
                    <h3 className="text-lg font-bold mb-2">{t_common.noGroups}</h3>
                    <p className="text-sm text-text-light mb-6">
                      {userProfile?.appRole === 'member' 
                        ? (lang === 'bn' ? 'অ্যাডমিন আপনাকে কোনো গ্রুপে যোগ করলেই এখানে তালিকা দেখতে পাবেন।' : 'Once an admin adds you to a group, you will see it here.')
                        : (lang === 'bn' ? 'শুরু করতে সেটিংস থেকে একটি গ্রুপ তৈরি করুন।' : 'Create a group from settings to get started.')}
                    </p>
                    {(userProfile?.appRole === 'admin' || userProfile?.appRole === 'super_admin') && (
                      <button 
                        onClick={() => { setActiveTab('settings'); setShowCreateModal(true); }}
                        className="btn btn-primary"
                      >
                        {t_common.newGroup}
                      </button>
                    )}
                  </div>
                </div>
             )
          ) : activeTab === 'users' ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold">{t_common.userManagement}</h2>
                  <p className="text-sm text-text-light">{t_common.userManagementDesc}</p>
                </div>
              </div>

              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="data-table-th">{t.user}</th>
                        <th className="data-table-th">{t.role}</th>
                        <th className="data-table-th">{t.status}</th>
                        <th className="data-table-th">{t.action}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allUsers.map(u => (
                        <tr key={u.uid} className={cn("hover:bg-slate-50 transition-colors", u.uid === userProfile?.uid && "bg-emerald-50/30")}>
                          <td className="data-table-td">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-500 overflow-hidden">
                                {u.photoURL ? <img src={u.photoURL} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" /> : u.displayName.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-text-main leading-tight">{u.displayName}</p>
                                <p className="text-[11px] text-text-light">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="data-table-td">
                            <div className="flex items-center gap-2">
                              {u.appRole === 'super_admin' ? (
                                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-[10px] font-bold uppercase tracking-tight">{t.superAdmin}</span>
                              ) : (
                                <select 
                                  value={u.appRole} 
                                  onChange={(e) => changeUserRole(u.uid, e.target.value as any)}
                                  disabled={userProfile?.appRole !== 'super_admin'}
                                  className="text-xs bg-slate-100 border-none rounded py-1 px-2 focus:ring-1 focus:ring-primary outline-none disabled:opacity-70"
                                >
                                  <option value="member">{t.member}</option>
                                  <option value="admin">{t.admin}</option>
                                </select>
                              )}
                            </div>
                          </td>
                          <td className="data-table-td">
                            <div className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                              u.isApproved ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                            )}>
                              {u.isApproved ? <UserCheck size={10} /> : <Info size={10} />}
                              {u.isApproved ? t.approved : t.pending}
                            </div>
                          </td>
                          <td className="data-table-td">
                            {u.appRole !== 'super_admin' && (
                              <button 
                                onClick={() => toggleApproval(u.uid, u.isApproved)}
                                className={cn(
                                  "btn py-1.5 px-3 text-[11px] font-bold",
                                  u.isApproved ? t.cancelApproval : t.approve
                                )}
                              >
                                {u.isApproved ? t.cancelApproval : t.approve}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : activeTab === 'members' ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold">{t.membersList}</h2>
                  <p className="text-sm text-text-light">{lang === 'bn' ? 'সিস্টেমের সকল অনুমোদিত সদস্য' : 'All approved members in the system'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {allUsers.filter(u => u.isApproved).map(u => (
                  <div key={u.uid} className="card p-5 flex items-center gap-4 hover:shadow-md transition-all border-l-4 border-l-primary/20">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-xl font-bold text-slate-400 overflow-hidden shadow-inner shrink-0">
                      {u.photoURL ? <img src={u.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : u.displayName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-800 truncate">{u.displayName}</h4>
                      <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight",
                          u.appRole === 'super_admin' ? "bg-purple-100 text-purple-700" : 
                          u.appRole === 'admin' ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"
                        )}>
                          {u.appRole === 'super_admin' ? t.superAdmin : u.appRole === 'admin' ? t.admin : t.member}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {allUsers.filter(u => u.isApproved).length === 0 && (
                  <div className="col-span-full card p-20 text-center text-slate-400 italic">
                    {lang === 'bn' ? 'কোনো অনুমোদিত সদস্য পাওয়া যায়নি।' : 'No approved members found.'}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'transactions' ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold">{lang === 'bn' ? 'লেনদেন রেকর্ড' : 'Transaction Records'}</h2>
                  <p className="text-sm text-text-light">
                    {userProfile?.appRole === 'member' 
                      ? (lang === 'bn' ? 'আপনার সকল জমা ও উত্তোলনের হিসাব' : 'All your deposit and withdrawal records')
                      : (lang === 'bn' ? 'সিস্টেমের সকল লেনদেনের হিসাব' : 'All transaction records in the system')}
                  </p>
                </div>
              </div>

              {(txQueryFallback || usePerGroupTxFetch) && (
                <div className="card bg-amber-50 border-amber-200 p-4 mb-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-900">
                      {lang === 'bn' ? 'ইনডেক্স আপডেট হচ্ছে' : 'Index is Updating'}
                    </h4>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      {lang === 'bn' 
                        ? 'আপনার ডাটাবেজ ইনডেক্স বর্তমানে তৈরি হচ্ছে। আমরা বিকল্প পদ্ধতিতে ডেটা লোড করছি যাতে আপনি কাজ চালিয়ে যেতে পারেন। কিছু রেকর্ড লোড হতে সামান্য দেরি হতে পারে।' 
                        : 'Database indexes are currently building. We are using a fallback system to load your data so you can continue working. Some records might take a moment to appear.'}
                    </p>
                  </div>
                </div>
              )}

              <div className="card overflow-hidden printable-area">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="data-table-th">{lang === 'bn' ? 'তারিখ' : 'Date'}</th>
                        <th className="data-table-th">{lang === 'bn' ? 'সদস্যের নাম' : 'Member Name'}</th>
                        <th className="data-table-th">{t.description}</th>
                        <th className="data-table-th">{lang === 'bn' ? 'পরিমাণ' : 'Amount'}</th>
                        <th className="data-table-th">{t.status}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {globalTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="data-table-td text-center text-text-light py-10 italic">
                            {lang === 'bn' ? 'কোনো লেনদেন রেকর্ড পাওয়া যায়নি।' : 'No transaction records found.'}
                          </td>
                        </tr>
                      ) : (
                        globalTransactions.map(tx => (
                          <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                            <td className="data-table-td text-[11px] text-text-light font-medium">
                              {tx.date && (tx.date.toDate ? tx.date.toDate() : new Date(tx.date)).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="data-table-td font-semibold">
                              {tx.userName}
                              {tx.forMonths && tx.forMonths.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {tx.forMonths.map(m => (
                                    <span key={m} className="px-1.5 py-0.5 bg-primary/10 text-primary text-[8px] font-bold rounded uppercase">
                                      {m}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="data-table-td text-text-light truncate max-w-[150px]">{tx.description}</td>
                            <td className={cn(
                              "data-table-td font-bold",
                              tx.type === 'deposit' ? "text-primary" : "text-red-700"
                            )}>
                              {tx.type === 'deposit' ? '+' : '-'}{formatNumber(tx.amount, lang)} ৳
                            </td>
                            <td className="data-table-td">
                              <span className={cn(
                                "px-2.5 py-1 rounded-full text-[10px] font-bold",
                                tx.type === 'deposit' ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
                              )}>
                                {tx.type === 'deposit' ? t.deposit : t.withdrawal}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : activeTab === 'settings' ? (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">{t.settings}</h2>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                <div className="card p-8">
                  <h3 className="text-lg font-bold mb-6">{lang === 'bn' ? 'প্রোফাইল সেটিংস' : 'Profile Settings'}</h3>
                  <form onSubmit={updateProfileInfo} className="space-y-6">
                    <div className="flex flex-col items-center gap-4 mb-6">
                      <div className="relative group">
                        <div className="w-24 h-24 rounded-2xl bg-slate-100 flex items-center justify-center text-3xl font-bold text-slate-400 overflow-hidden shadow-inner border-2 border-slate-50">
                          {photoPreview ? (
                            <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                          ) : userProfile?.photoURL ? (
                            <img src={userProfile.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            userProfile?.displayName?.charAt(0)
                          )}
                        </div>
                        <label className="absolute inset-0 bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-2xl border-2 border-dashed border-white/40">
                          <Plus size={20} />
                          <span className="text-[10px] font-bold uppercase mt-1">Upload</span>
                          <input 
                            type="file" 
                            name="photo" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (e) => setPhotoPreview(e.target?.result as string);
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest leading-none">{lang === 'bn' ? 'প্রোফাইল ছবি' : 'Profile Picture'}</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-text-light uppercase tracking-widest">{t.name}</label>
                        <input name="displayName" type="text" defaultValue={userProfile?.displayName} required className="input" />
                      </div>

                      <div className="space-y-4 pt-4 border-t border-slate-50">
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Key size={12} />
                          {lang === 'bn' ? 'পাসওয়ার্ড পরিবর্তন করুন' : 'Change Password'}
                        </h4>
                        
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-text-light uppercase tracking-widest">{t.oldPassword}</label>
                          <div className="relative">
                            <input name="oldPassword" type={showOldPass ? "text" : "password"} placeholder="••••••••" className="input pr-10" />
                            <button type="button" onClick={() => setShowOldPass(!showOldPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-primary transition-colors">
                              {showOldPass ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-text-light uppercase tracking-widest">{t.newPassword}</label>
                            <div className="relative">
                              <input name="newPassword" type={showNewPass ? "text" : "password"} placeholder="••••••••" className="input pr-10" />
                              <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-primary transition-colors">
                                {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                            <p className="text-[8px] text-slate-400 italic">*{t.weakPassword}</p>
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-text-light uppercase tracking-widest">{t.confirmPassword}</label>
                            <div className="relative">
                              <input name="confirmPassword" type={showConfirmPass ? "text" : "password"} placeholder="••••••••" className="input pr-10" />
                              <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-primary transition-colors">
                                {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={isProfileUpdating}
                      className="btn btn-primary w-full py-4 uppercase tracking-widest font-bold text-xs disabled:bg-slate-300 flex items-center justify-center gap-2"
                    >
                      {isProfileUpdating && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      {isProfileUpdating 
                        ? (lang === 'bn' ? 'তথ্য সেভ হচ্ছে...' : 'Saving Changes...') 
                        : (lang === 'bn' ? 'তথ্য সেভ করুন' : 'Save Changes')}
                    </button>
                  </form>
                  
                  <div className="mt-12 pt-8 border-t border-slate-100 space-y-3">
                    <button onClick={logOut} className="w-full py-3 rounded-xl border border-border-gray text-slate-600 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                      <LogOut size={14} />
                      {lang === 'bn' ? 'লগআউট করুন' : 'Logout'}
                    </button>
                    
                    <button onClick={deleteAccount} className="w-full py-3 rounded-xl text-rose-500 font-bold text-[10px] uppercase tracking-widest hover:bg-rose-50 transition-all flex items-center justify-center gap-2">
                      <Trash2 size={14} />
                      {lang === 'bn' ? 'অ্যাকাউন্ট ডিলিট করুন' : 'Delete Account Early'}
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold">{t_common.groupLabel} ({formatNumber(groups.length, lang)})</h3>
                    {(userProfile?.appRole === 'admin' || userProfile?.appRole === 'super_admin') && (
                      <button 
                        onClick={() => setShowCreateModal(true)}
                        disabled={!userProfile?.isApproved}
                        className="btn btn-primary py-1.5 px-3 text-xs"
                      >
                        {t_common.newGroup}
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {groups.map(group => (
                       <div key={group.id} className={cn(
                         "p-4 rounded-xl border bg-white flex items-center justify-between group-hover:border-primary transition-all shadow-sm",
                         selectedGroup?.id === group.id ? "border-primary bg-primary/5 shadow-primary/10" : "border-slate-100"
                       )}>
                         <div>
                           <p className="font-bold text-slate-900">{group.name}</p>
                           <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{formatNumber(group.members.length, lang)} {lang === 'bn' ? 'সদস্য' : 'Members'}</p>
                         </div>
                         <div className="flex items-center gap-3">
                            <button 
                              onClick={() => { setSelectedGroup(group); setActiveTab('dashboard'); }}
                              className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg text-[10px] font-bold transition-all uppercase tracking-wider"
                            >
                              {lang === 'bn' ? 'ড্যাশবোর্ড দেখুন' : 'View Dashboard'}
                            </button>
                            {(userProfile?.appRole === 'admin' || userProfile?.appRole === 'super_admin') && (
                              <button 
                                onClick={() => setConfirmDelete({ type: 'group', id: group.id })}
                                className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                         </div>
                       </div>
                    ))}
                    {groups.length === 0 && (
                      <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                        <p className="text-xs text-slate-400 italic">{t_common.noGroups}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'dues' ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-border-gray shadow-sm">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <AlertCircle className="text-accent" />
                    {t.dueRecord}
                  </h2>
                  <p className="text-xs text-text-light mt-1">
                    {lang === 'bn' ? 'গ্রুপের সক্রিয় সময়কালের বকেয়া তালিকা' : 'Dues list for the groups active period'}
                  </p>
                </div>
                <div className="bg-accent/10 text-accent px-4 py-2 rounded-xl text-sm font-bold">
                  {formatNumber(dueMembers.length, lang)} {lang === 'bn' ? 'জন বকেয়া' : 'People Due'}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dueMembers.length === 0 ? (
                  <div className="col-span-full py-20 bg-white rounded-2xl border border-dashed border-border-gray flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4 text-2xl">🎉</div>
                    <p className="font-bold text-slate-900">{lang === 'bn' ? 'সবাই সব মাসের টাকা পরিশোধ করেছেন!' : 'Everyone has paid for all months!'}</p>
                  </div>
                ) : (
                  dueMembers.map(member => (
                    <motion.div 
                      key={member.uid}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="card p-5 border-l-4 border-l-rose-500 flex items-center justify-between group"
                    >
                        <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center font-bold text-rose-600">
                          {member.displayName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{member.displayName}</p>
                          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{member.isManual ? t.manualMember : t.registeredMember}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {member.unpaidMonths.map((m, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded text-[9px] font-bold">
                                {m}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded-full text-[9px] font-black uppercase tracking-widest">{t.due}</span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="card p-20 text-center">
              <p>{lang === 'bn' ? 'শীঘ্রই আসছে...' : 'Coming Soon...'}</p>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Footer */}
      <footer className="md:hidden bg-white border-t border-border-gray py-4 px-8 text-center">
        <p className="text-[10px] text-text-light italic">
          {lang === 'bn' ? 'সাইট তৈরি করেছেন মোঃ জাহিদ হাসান' : 'Site created by Md. Zahid Hasan'}
        </p>
      </footer>

      {/* Modals */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreateModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative card w-full max-w-md p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-primary">{t.createGroupTitle}</h3>
                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
              </div>
              <form onSubmit={createGroup} className="space-y-4">
                <div><label className="block text-xs font-bold text-text-light uppercase tracking-widest mb-1.5">{t.groupName}</label><input name="name" required placeholder={t.groupPlaceholder} className="input" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-text-light uppercase tracking-widest mb-1.5">{t.monthlyAmountPerPerson}</label><input name="monthlyAmount" type="number" required placeholder={lang === 'bn' ? 'টাকা' : 'Amount'} className="input" /></div>
                  <div><label className="block text-xs font-bold text-text-light uppercase tracking-widest mb-1.5">{t.durationMonths}</label><input name="durationMonths" type="number" required placeholder="12" className="input" /></div>
                </div>
                <div><label className="block text-xs font-bold text-text-light uppercase tracking-widest mb-1.5">{t.description}</label><textarea name="description" rows={3} placeholder={t.groupDescPlaceholder} className="input resize-none" /></div>
                <div><label className="block text-xs font-bold text-text-light uppercase tracking-widest mb-1.5">{t.previousYearBalance} <span className="text-slate-400 font-normal">{t.optional}</span></label><input name="previousYearBalance" type="number" placeholder="0" className="input" /></div>

                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-text-light uppercase tracking-widest mb-1.5">{lang === 'bn' ? 'শুরুর তারিখ' : 'Start Date'}</label>
                    <div className="grid grid-cols-3 gap-2">
                      <select name="startDay" className="input" defaultValue={new Date().getDate()}>
                        {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{formatNumber(i + 1, lang)}</option>)}
                      </select>
                      <select name="startMonth" className="input" defaultValue={new Date().getMonth()}>
                        {Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{new Date(2024, i, 1).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { month: 'long' })}</option>)}
                      </select>
                      <select name="startYear" className="input" defaultValue={new Date().getFullYear()}>
                        {Array.from({ length: 5 }, (_, i) => { const yr = new Date().getFullYear(); return <option key={yr + i} value={yr + i}>{formatNumber(yr + i, lang)}</option>; })}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-text-light uppercase tracking-widest mb-1.5">{lang === 'bn' ? 'শেষের তারিখ' : 'End Date'}</label>
                    <div className="grid grid-cols-3 gap-2">
                       <select name="endDay" className="input" defaultValue={new Date().getDate()}>
                        {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{formatNumber(i + 1, lang)}</option>)}
                      </select>
                      <select name="endMonth" className="input" defaultValue={new Date().getMonth()}>
                        {Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{new Date(2024, i, 1).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { month: 'long' })}</option>)}
                      </select>
                      <select name="endYear" className="input" defaultValue={new Date().getFullYear() + 1}>
                        {Array.from({ length: 5 }, (_, i) => { const yr = new Date().getFullYear(); return <option key={yr + i} value={yr + i}>{formatNumber(yr + i, lang)}</option>; })}
                      </select>
                    </div>
                  </div>
                </div>

                <button type="submit" disabled={!userProfile?.isApproved} className="btn btn-primary w-full py-4 mt-4 disabled:bg-slate-300">{t.startGroup}</button>
              </form>
            </motion.div>
          </div>
        )}

        {showAddTxModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddTxModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative card w-full max-w-md p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-primary">{t.newTransaction}</h3>
                <button onClick={() => setShowAddTxModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
              </div>
              <form onSubmit={addTransaction} className="space-y-4">
                <div className="flex p-1 bg-slate-100 rounded-lg">
                  <label className="flex-1 cursor-pointer">
                    <input type="radio" name="type" value="deposit" checked={transactionType === 'deposit'} onChange={(e) => {setTransactionType('deposit'); setSelectedMonths([]);}} className="sr-only peer" />
                    <div className="py-2.5 text-center text-xs font-bold rounded peer-checked:bg-white peer-checked:text-primary peer-checked:shadow-sm transition-all uppercase tracking-widest">{t.deposit}</div>
                  </label>
                  <label className="flex-1 cursor-pointer">
                    <input type="radio" name="type" value="withdrawal" checked={transactionType === 'withdrawal'} onChange={(e) => {setTransactionType('withdrawal'); setSelectedMonths([]);}} className="sr-only peer" />
                    <div className="py-2.5 text-center text-xs font-bold rounded peer-checked:bg-white peer-checked:text-red-700 peer-checked:shadow-sm transition-all uppercase tracking-widest">{t.withdrawal}</div>
                  </label>
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-light uppercase tracking-widest mb-1.5">{t.selectMember}</label>
                  <select 
                    name="userId" 
                    required 
                    className="input"
                    value={targetUserId}
                    onChange={(e) => {
                      setTargetUserId(e.target.value);
                      setSelectedMonths([]);
                    }}
                  >
                    {members.map(m => (
                      <option key={m.uid} value={m.uid}>{m.displayName}</option>
                    ))}
                  </select>
                </div>
                <div><label className="block text-xs font-bold text-text-light uppercase tracking-widest mb-1.5">{t.amount}</label><input name="amount" type="number" required value={transactionType === 'deposit' ? manualDepositAmount : ''} onChange={(e) => setManualDepositAmount(e.target.value)} readOnly={transactionType === 'deposit' && !selectedMonths.includes('EXTRA_AMOUNT')} className={cn("input", transactionType === 'deposit' && !selectedMonths.includes('EXTRA_AMOUNT') ? "bg-slate-50" : "")} /></div>
                
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-text-light uppercase tracking-widest mb-1.5">{lang === 'bn' ? 'মাসের তালিকা' : 'Select Months'}</label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-slate-200 rounded-lg">
                    {availableMonths.map(month => (
                      <label key={month} className={cn(
                        "flex items-center gap-2 text-[10px] p-2 rounded-lg border transition-all cursor-pointer",
                        selectedMonths.includes(month) ? "bg-primary/5 border-primary text-primary" : "border-slate-100 text-slate-600 hover:bg-slate-50"
                      )}>
                        <input 
                          type="checkbox" 
                          className="sr-only"
                          checked={selectedMonths.includes(month)}
                          onChange={(e) => {
                             if(e.target.checked) setSelectedMonths([...selectedMonths, month]);
                             else setSelectedMonths(selectedMonths.filter(m => m !== month));
                          }}
                        />
                        <div className="flex-1 overflow-hidden truncate">
                          {month === 'PREV_BALANCE' ? t.payPreviousBalance : 
                           month === 'EXTRA_AMOUNT' ? t.extraAmount : 
                           month}
                        </div>
                      </label>
                    ))}
                    {availableMonths.length === 0 && (
                      <p className="col-span-2 text-[10px] text-slate-400 italic p-2">
                        {lang === 'bn' ? 'সব মাসের পেমেন্ট পরিশোধিত' : 'All months paid'}
                      </p>
                    )}
                  </div>
                </div>

                <div><label className="block text-xs font-bold text-text-light uppercase tracking-widest mb-1.5">{t.description}</label><input name="description" placeholder={t.groupPlaceholder} className="input" /></div>
                <button type="submit" disabled={!userProfile?.isApproved} className="btn btn-primary w-full py-4 mt-4 disabled:bg-slate-300">{t.confirmTransaction}</button>
              </form>
            </motion.div>
          </div>
        )}

        {showEditGroupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEditGroupModal(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative card w-full max-w-md p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-primary">{lang === 'bn' ? 'গ্রুপ আপডেট করুন' : 'Update Group'}</h3>
                <button onClick={() => setShowEditGroupModal(null)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
              </div>
              <form onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const monthlyAmount = Number(formData.get('monthlyAmount'));
                  const durationMonths = Number(formData.get('durationMonths'));
                  const memberCount = showEditGroupModal.members?.length || 1;
                  const newGoalAmount = memberCount * monthlyAmount * durationMonths;

                  await updateDoc(doc(db, 'groups', showEditGroupModal.id), {
                    name: formData.get('name'),
                    monthlyAmount,
                    durationMonths,
                    goalAmount: newGoalAmount,
                    description: formData.get('description'),
                  });
                  setShowEditGroupModal(null);
              }} className="space-y-4">
                <div><label className="block text-xs font-bold text-text-light uppercase tracking-widest mb-1.5">{t.groupName}</label><input name="name" defaultValue={showEditGroupModal.name} required className="input" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-text-light uppercase tracking-widest mb-1.5">{t.monthlyAmountPerPerson}</label><input name="monthlyAmount" defaultValue={showEditGroupModal.monthlyAmount} type="number" required className="input" /></div>
                  <div><label className="block text-xs font-bold text-text-light uppercase tracking-widest mb-1.5">{t.durationMonths}</label><input name="durationMonths" defaultValue={showEditGroupModal.durationMonths || 12} type="number" required className="input" /></div>
                </div>
                <div><label className="block text-xs font-bold text-text-light uppercase tracking-widest mb-1.5">{t.description}</label><textarea name="description" defaultValue={showEditGroupModal.description} rows={3} className="input resize-none" /></div>
                <button type="submit" className="btn btn-primary w-full py-4 mt-4">{lang === 'bn' ? 'আপডেট করুন' : 'Update'}</button>
              </form>
            </motion.div>
          </div>
        )}
        {showAddMemberModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddMemberModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative card w-full max-w-md p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-primary">{t.addMemberTitle}</h3>
                <button onClick={() => setShowAddMemberModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
              </div>

              <div className="flex p-1 bg-slate-100 rounded-lg mb-6">
                <button 
                  onClick={() => setIsManualAdd(false)}
                  className={cn(
                    "flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded transition-all",
                    !isManualAdd ? "bg-white text-primary shadow-sm" : "text-slate-500"
                  )}
                >
                  {t.registeredMember}
                </button>
                <button 
                  onClick={() => setIsManualAdd(true)}
                  className={cn(
                    "flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded transition-all",
                    isManualAdd ? "bg-white text-primary shadow-sm" : "text-slate-500"
                  )}
                >
                  {t.manualMember}
                </button>
              </div>

              <p className="text-[11px] text-text-light mb-6">
                {isManualAdd ? t.addManualMemberDesc : t.addMemberDesc}
              </p>

              <form onSubmit={addMember} className="space-y-4">
                {!isManualAdd ? (
                  <div>
                    <label className="block text-xs font-bold text-text-light uppercase tracking-widest mb-1.5">{t.emailAddress}</label>
                    <input name="email" type="email" required placeholder="member@example.com" className="input" />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-text-light uppercase tracking-widest mb-1.5">{t.name}</label>
                      <input name="name" type="text" required placeholder={lang === 'bn' ? "আব্দুর রহমান" : "e.g. Abdur Rahman"} className="input" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-text-light uppercase tracking-widest mb-1.5">
                        {t.phone} <span className="lowercase font-normal text-[10px] italic">{t.optional}</span>
                      </label>
                      <input name="phone" type="tel" placeholder="017XXXXXXXX" className="input" />
                    </div>
                  </>
                )}
                <button type="submit" disabled={!userProfile?.isApproved} className="btn btn-primary w-full py-4 mt-4 disabled:bg-slate-300">
                  {t.addMemberTitle}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {confirmDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setConfirmDelete(null)} 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }} 
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  {lang === 'bn' ? 'আপনি কি নিশ্চিত?' : 'Are you sure?'}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {confirmDelete.type === 'group' 
                    ? (lang === 'bn' ? 'এই গ্রুপটি এবং এর সকল ডাটা চিরতরে মুছে যাবে।' : 'This group and all its data will be permanently deleted.')
                    : confirmDelete.type === 'member'
                      ? (lang === 'bn' ? 'এই সদস্যকে গ্রুপ থেকে রিমুভ করা হবে।' : 'This member will be removed from the group.')
                      : (lang === 'bn' ? 'এই লেনদেনটি চিরতরে মুছে যাবে।' : 'This transaction will be permanently deleted.')
                  }
                </p>
              </div>
              <div className="flex border-t border-slate-100">
                <button 
                  onClick={() => setConfirmDelete(null)} 
                  className="flex-1 px-6 py-4 text-sm font-bold text-slate-400 hover:bg-slate-50 transition-colors border-r border-slate-100"
                >
                  {lang === 'bn' ? 'বাতিল করুন' : 'Cancel'}
                </button>
                <button 
                  onClick={() => {
                    if (confirmDelete.type === 'group') deleteGroup(confirmDelete.id);
                    else if (confirmDelete.type === 'member') deleteMemberFromGroup(confirmDelete.id, confirmDelete.secondaryId!);
                    else if (confirmDelete.type === 'tx') deleteTransaction(confirmDelete.id, confirmDelete.secondaryId!);
                  }} 
                  className="flex-1 px-6 py-4 text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  {lang === 'bn' ? 'ডিলেট করুন' : 'Confirm Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

