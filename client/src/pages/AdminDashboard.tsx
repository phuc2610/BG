import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { cn, formatDate } from '@/lib/utils';
import api from '@/lib/api';
import { ShieldCheck, Users, CheckCircle, Clock, Ban, LogOut, Trash2, UserCheck, Lock, Unlock } from 'lucide-react';
import toast from 'react-hot-toast';

interface UserItem {
  _id: string;
  username: string;
  role: string;
  status: 'PENDING' | 'ACTIVE' | 'BLOCKED';
  isActive: boolean;
  registeredAt: string;
  activatedAt?: string;
  lastLoginAt?: string;
}

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  blockedUsers: number;
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const [stats, setStats] = useState<AdminStats>({ totalUsers: 0, activeUsers: 0, pendingUsers: 0, blockedUsers: 0 });
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/users');
      if (res.data.success) {
        setStats(res.data.data.stats);
        setUsers(res.data.data.users);
      }
    } catch (err: any) {
      toast.error('Không thể tải danh sách tài khoản');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (id: string, username: string) => {
    try {
      setActionLoading(id);
      await api.patch(`/admin/users/${id}/activate`);
      toast.success(`Đã kích hoạt tài khoản ${username}`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể kích hoạt');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBlock = async (id: string, username: string) => {
    if (!confirm(`Bạn có chắc chắn muốn KHÓA tài khoản ${username}?`)) return;
    try {
      setActionLoading(id);
      await api.patch(`/admin/users/${id}/block`);
      toast.success(`Đã khóa tài khoản ${username}`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể khóa tài khoản');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnblock = async (id: string, username: string) => {
    try {
      setActionLoading(id);
      await api.patch(`/admin/users/${id}/unblock`);
      toast.success(`Đã mở khóa tài khoản ${username}`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể mở khóa');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string, username: string) => {
    if (!confirm(`⚠️ CẢNH BÁO: Xóa vĩnh viễn tài khoản ${username}?`)) return;
    try {
      setActionLoading(id);
      await api.delete(`/admin/users/${id}`);
      toast.success(`Đã xóa tài khoản ${username}`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể xóa');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wider uppercase text-purple-400">ADMIN PANEL</h1>
              <p className="text-xs text-slate-400">Quản lý tài khoản & phân quyền hệ thống Antigravity Multi-User</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right text-xs">
              <div className="font-bold text-slate-200">{user?.username}</div>
              <div className="text-purple-400 font-semibold">SUPER ADMIN</div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-smooth"
            >
              <LogOut className="w-4 h-4" />
              Đăng xuất
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Tổng tài khoản</div>
              <div className="text-2xl font-bold text-slate-100">{stats.totalUsers}</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Đang hoạt động</div>
              <div className="text-2xl font-bold text-emerald-400">{stats.activeUsers}</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Chờ kích hoạt</div>
              <div className="text-2xl font-bold text-amber-400">{stats.pendingUsers}</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <Ban className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Đã khóa</div>
              <div className="text-2xl font-bold text-rose-400">{stats.blockedUsers}</div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200">Danh sách tài khoản người dùng ({users.length})</h2>
            <button
              onClick={fetchUsers}
              className="text-xs text-purple-400 hover:underline font-semibold"
            >
              Làm mới danh sách
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Đang tải danh sách tài khoản...</div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">Chưa có tài khoản người dùng nào đăng ký.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/50 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3">STT</th>
                    <th className="px-5 py-3">Username</th>
                    <th className="px-5 py-3">Ngày đăng ký</th>
                    <th className="px-5 py-3 text-center">Trạng thái</th>
                    <th className="px-5 py-3">Lần đăng nhập cuối</th>
                    <th className="px-5 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {users.map((u, index) => (
                    <tr key={u._id} className="hover:bg-slate-850/50">
                      <td className="px-5 py-3.5 text-slate-500 font-mono">{index + 1}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-100">{u.username}</td>
                      <td className="px-5 py-3.5 text-slate-400">{formatDate(u.registeredAt)}</td>
                      <td className="px-5 py-3.5 text-center">
                        {u.status === 'ACTIVE' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            ACTIVE
                          </span>
                        )}
                        {u.status === 'PENDING' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                            PENDING
                          </span>
                        )}
                        {u.status === 'BLOCKED' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            BLOCKED
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400">
                        {u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Chưa đăng nhập'}
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        {u.status === 'PENDING' && (
                          <button
                            onClick={() => handleActivate(u._id, u.username)}
                            disabled={actionLoading === u._id}
                            className="px-3 py-1.5 rounded-lg font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-smooth disabled:opacity-50 inline-flex items-center gap-1"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            Kích hoạt
                          </button>
                        )}
                        {u.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleBlock(u._id, u.username)}
                            disabled={actionLoading === u._id}
                            className="px-3 py-1.5 rounded-lg font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-smooth disabled:opacity-50 inline-flex items-center gap-1"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            Khóa
                          </button>
                        )}
                        {u.status === 'BLOCKED' && (
                          <button
                            onClick={() => handleUnblock(u._id, u.username)}
                            disabled={actionLoading === u._id}
                            className="px-3 py-1.5 rounded-lg font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-smooth disabled:opacity-50 inline-flex items-center gap-1"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            Mở khóa
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(u._id, u.username)}
                          disabled={actionLoading === u._id}
                          className="px-2.5 py-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-smooth disabled:opacity-50"
                          title="Xóa tài khoản"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
