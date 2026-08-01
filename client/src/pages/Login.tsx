import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { LogIn, AlertCircle, Laptop } from 'lucide-react';
import toast from 'react-hot-toast';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username.trim() || !password) {
      setErrorMessage('Vui lòng nhập Tên đăng nhập và Mật khẩu');
      return;
    }

    try {
      setSubmitting(true);
      const user = await login(username.trim(), password);
      toast.success(`Xin chào, ${user.username}!`);
      navigate('/');
    } catch (err: any) {
      setErrorMessage(err.message || 'Tên đăng nhập hoặc mật khẩu không chính xác.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = cn(
    'w-full px-4 py-3 rounded-xl text-sm font-medium',
    'bg-[rgb(var(--muted))] border border-[rgb(var(--border))]',
    'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50',
    'transition-smooth'
  );

  return (
    <div className="min-h-screen bg-[rgb(var(--background))] text-[rgb(var(--foreground))] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto mb-3">
            <Laptop className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">NP Computer</h1>
          <p className="text-xs text-[rgb(var(--muted-foreground))]">
            Đăng nhập hệ thống Quản Lý Báo Giá, Kho & Công Nợ
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold mb-1.5">Tên đăng nhập</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập tên đăng nhập"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5">Mật khẩu</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90 shadow-lg shadow-blue-500/25 transition-smooth disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            {submitting ? 'Đang xác thực...' : 'Đăng Nhập'}
          </button>

          <div className="flex justify-between items-center pt-2 text-xs text-[rgb(var(--muted-foreground))]">
            <Link to="/register" className="text-blue-500 font-bold hover:underline">
              Tạo tài khoản mới
            </Link>
            <Link to="/admin/login" className="text-[rgb(var(--muted-foreground))] hover:text-blue-500 hover:underline">
              Quản trị viên (Admin)
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
