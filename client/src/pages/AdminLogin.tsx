import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { ShieldCheck, AlertCircle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export function AdminLogin() {
  const navigate = useNavigate();
  const { adminLogin } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username.trim() || !password) {
      setErrorMessage('Vui lòng nhập Tên đăng nhập và Mật khẩu Quản trị');
      return;
    }

    try {
      setSubmitting(true);
      const user = await adminLogin(username.trim(), password);
      toast.success(`Đăng nhập Admin thành công, ${user.username}!`);
      navigate('/admin');
    } catch (err: any) {
      setErrorMessage(err.message || 'Tên đăng nhập hoặc mật khẩu không chính xác.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = cn(
    'w-full px-4 py-3 rounded-xl text-sm font-medium',
    'bg-[rgb(var(--muted))] border border-[rgb(var(--border))]',
    'focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50',
    'transition-smooth'
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto mb-3 border border-purple-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold uppercase tracking-wider text-purple-400">Admin Panel Login</h1>
          <p className="text-xs text-slate-400">
            Cổng Quản Trị Viên Kích Hoạt & Quản Lý Tài Khoản Hệ Thống
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold mb-1.5 text-slate-300">Tên đăng nhập Admin</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập username Admin"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5 text-slate-300">Mật khẩu Admin</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu Admin"
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-90 shadow-lg shadow-purple-500/25 transition-smooth disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            {submitting ? 'Đang xác thực...' : 'ĐĂNG NHẬP QUẢN TRỊ'}
          </button>

          <div className="text-center pt-2">
            <Link to="/login" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-purple-400">
              <ArrowLeft className="w-3.5 h-3.5" />
              Quay lại đăng nhập người dùng
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
