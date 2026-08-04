import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { UserPlus, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export function Register() {
  const navigate = useNavigate();
  const { register } = useAuthStore();

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [registeredSuccess, setRegisteredSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username.trim()) {
      setErrorMessage('Vui lòng nhập Tên đăng nhập');
      return;
    }
    if (username.trim().length < 4 || username.trim().length > 30) {
      setErrorMessage('Tên đăng nhập phải từ 4 đến 30 ký tự');
      return;
    }
    if (!fullName.trim()) {
      setErrorMessage('Vui lòng nhập Họ và tên (hiển thị trên Hóa đơn / Báo giá)');
      return;
    }
    if (!password) {
      setErrorMessage('Vui lòng nhập Mật khẩu');
      return;
    }
    if (password.length < 8) {
      setErrorMessage('Mật khẩu phải có tối thiểu 8 ký tự');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Xác nhận mật khẩu không khớp');
      return;
    }

    try {
      setSubmitting(true);
      await register(username.trim(), fullName.trim(), password, confirmPassword);
      setRegisteredSuccess(true);
      toast.success('Đăng ký tài khoản thành công!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Đăng ký thất bại. Vui lòng thử lại.');
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
            <UserPlus className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Đăng Ký Tài Khoản</h1>
          <p className="text-xs text-[rgb(var(--muted-foreground))]">
            Hệ thống Quản Lý Máy Tính & Kho Linh Kiện NP Computer
          </p>
        </div>

        {registeredSuccess ? (
          <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-4 animate-fade-in">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <div className="space-y-1">
              <h2 className="text-base font-bold text-emerald-600">Đăng ký thành công!</h2>
              <p className="text-xs text-[rgb(var(--muted-foreground))] leading-relaxed">
                Tài khoản của bạn đang chờ quản trị viên kích hoạt.
              </p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại đăng nhập
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold mb-1.5">Tên đăng nhập *</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="VD: user123 (4-30 ký tự)"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5">Họ và tên người dùng (Hiển thị người lập Hóa đơn/Báo giá) *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="VD: Nguyễn Văn A"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5">Mật khẩu *</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 8 ký tự"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5">Xác nhận mật khẩu *</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu"
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90 shadow-lg shadow-blue-500/25 transition-smooth disabled:opacity-50"
            >
              {submitting ? 'Đang xử lý...' : 'Đăng Ký Tài Khoản'}
            </button>

            <div className="text-center pt-2 text-xs text-[rgb(var(--muted-foreground))]">
              Đã có tài khoản?{' '}
              <Link to="/login" className="text-blue-500 font-bold hover:underline">
                Đăng nhập ngay
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
