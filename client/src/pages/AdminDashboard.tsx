import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { cn, formatDate } from '@/lib/utils';
import api from '@/lib/api';
import {
  PERMISSION_GROUPS,
  SALES_CTV_PRESET_PERMISSIONS,
  MANAGER_PRESET_PERMISSIONS,
} from '@/types';
import type { UserAccount } from '@/types';
import {
  ShieldCheck,
  Users,
  CheckCircle,
  Clock,
  Ban,
  LogOut,
  Trash2,
  UserCheck,
  Lock,
  Unlock,
  KeyRound,
  SlidersHorizontal,
  X,
  Search,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';

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
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Search, Filter & Sort
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'PENDING' | 'ACTIVE' | 'BLOCKED'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'last_login'>('newest');

  // Modal States
  const [selectedUserForPerms, setSelectedUserForPerms] = useState<UserAccount | null>(null);
  const [selectedUserForReset, setSelectedUserForReset] = useState<UserAccount | null>(null);

  // Permission Form State
  const [activePermissions, setActivePermissions] = useState<string[]>([]);
  const [maxDiscountPercent, setMaxDiscountPercent] = useState<number>(0);
  const [savingPerms, setSavingPerms] = useState(false);

  // Reset Password Form State
  const [newPassword, setNewPassword] = useState('');
  const [resettingPass, setResettingPass] = useState(false);

  // Edit User Modal State
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserAccount | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editRole, setEditRole] = useState<'ADMIN' | 'USER'>('USER');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'PENDING' | 'BLOCKED'>('ACTIVE');
  const [editPassword, setEditPassword] = useState('');
  const [savingUser, setSavingUser] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [search, statusFilter, sortBy]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/users', {
        params: {
          search: search.trim() || undefined,
          status: statusFilter,
          sort: sortBy,
        },
      });
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

  const handleOpenPermissions = async (u: UserAccount) => {
    try {
      setSelectedUserForPerms(u);
      setActivePermissions(u.permissions || []);
      setMaxDiscountPercent(u.maxQuoteDiscountPercent || 0);

      // Fetch fresh permissions from server
      const res = await api.get(`/admin/users/${u._id}/permissions`);
      if (res.data.success) {
        setActivePermissions(res.data.data.permissions || []);
        setMaxDiscountPercent(res.data.data.maxQuoteDiscountPercent || 0);
      }
    } catch (err) {
      toast.error('Không thể tải quyền truy cập của User');
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedUserForPerms) return;
    try {
      setSavingPerms(true);
      await api.put(`/admin/users/${selectedUserForPerms._id}/permissions`, {
        permissions: activePermissions,
        maxQuoteDiscountPercent: Number(maxDiscountPercent) || 0,
      });
      toast.success(`Đã cập nhật quyền cho tài khoản ${selectedUserForPerms.username}`);
      setSelectedUserForPerms(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể lưu quyền');
    } finally {
      setSavingPerms(false);
    }
  };

  const handleTogglePermission = (key: string) => {
    setActivePermissions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSelectAll = () => {
    const allKeys = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));
    setActivePermissions(allKeys);
  };

  const handleDeselectAll = () => {
    setActivePermissions([]);
  };

  const handleApplySalesPreset = () => {
    setActivePermissions(SALES_CTV_PRESET_PERMISSIONS);
    setMaxDiscountPercent(5);
    toast.success('Đã áp dụng Mẫu CTV Bán Hàng (Giảm tối đa 5%)');
  };

  const handleApplyManagerPreset = () => {
    setActivePermissions(MANAGER_PRESET_PERMISSIONS);
    setMaxDiscountPercent(15);
    toast.success('Đã áp dụng Mẫu Quản Lý');
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

  const handleResetPassword = async () => {
    if (!selectedUserForReset || !newPassword) return;
    try {
      setResettingPass(true);
      await api.post(`/admin/users/${selectedUserForReset._id}/reset-password`, {
        newPassword,
      });
      toast.success(`Đã đổi mật khẩu cho ${selectedUserForReset.username}`);
      setSelectedUserForReset(null);
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể đặt lại mật khẩu');
    } finally {
      setResettingPass(false);
    }
  };

  const handleOpenEditUser = (u: UserAccount) => {
    setSelectedUserForEdit(u);
    setEditFullName(u.fullName || '');
    setEditUsername(u.username || '');
    setEditRole((u.role as any) || 'USER');
    setEditStatus(u.status || 'ACTIVE');
    setEditPassword('');
  };

  const handleSaveUser = async () => {
    if (!selectedUserForEdit) return;
    try {
      setSavingUser(true);
      await api.put(`/admin/users/${selectedUserForEdit._id}`, {
        fullName: editFullName,
        username: editUsername,
        role: editRole,
        status: editStatus,
        password: editPassword.trim() || undefined,
      });
      toast.success(`Đã cập nhật thông tin tài khoản ${editUsername} thành công!`);
      setSelectedUserForEdit(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể cập nhật tài khoản');
    } finally {
      setSavingUser(false);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-5 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wider uppercase text-purple-400">ADMIN PANEL</h1>
              <p className="text-xs text-slate-400">Phân quyền chi tiết (Granular RBAC) & Quản lý Kho chung</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition-smooth"
            >
              Vào Kho Chung
            </button>
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

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="PENDING">Chờ kích hoạt (PENDING)</option>
              <option value="ACTIVE">Đang hoạt động (ACTIVE)</option>
              <option value="BLOCKED">Đã khóa (BLOCKED)</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            >
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="last_login">Login mới nhất</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200">Danh sách tài khoản ({users.length})</h2>
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
            <div className="p-12 text-center text-xs text-slate-500">Không tìm thấy tài khoản phù hợp.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/50 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">STT</th>
                    <th className="px-4 py-3">Username</th>
                    <th className="px-4 py-3">Họ và tên người lập</th>
                    <th className="px-4 py-3 text-center">Vai trò</th>
                    <th className="px-4 py-3 text-center">Trạng thái</th>
                    <th className="px-4 py-3 text-center">Số quyền</th>
                    <th className="px-4 py-3">Ngày đăng ký</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {users.map((u, index) => {
                    const permCount = u.permissions?.length || 0;
                    return (
                      <tr key={u._id} className="hover:bg-slate-850/50">
                        <td className="px-4 py-3.5 text-slate-500 font-mono">{index + 1}</td>
                        <td className="px-4 py-3.5 font-bold text-slate-100">{u.username}</td>
                        <td className="px-4 py-3.5 font-medium text-purple-300">{u.fullName || 'Admin'}</td>
                        <td className="px-4 py-3.5 text-center font-bold">
                          <span className={cn('px-2 py-0.5 rounded text-[10px]', u.role === 'ADMIN' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-slate-800 text-slate-300')}>
                            {u.role || 'USER'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
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
                        <td className="px-4 py-3.5 text-center">
                          <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold font-mono">
                            {permCount} quyền
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-400">{u.registeredAt ? formatDate(u.registeredAt) : 'Chưa cập nhật'}</td>
                        <td className="px-4 py-3.5 text-slate-400">
                          {u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Chưa đăng nhập'}
                        </td>
                        <td className="px-4 py-3.5 text-right space-x-2">
                          <button
                            onClick={() => handleOpenEditUser(u)}
                            className="px-2.5 py-1.5 rounded-lg text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 font-semibold inline-flex items-center gap-1 transition-smooth"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            Sửa thông tin
                          </button>
                          <button
                            onClick={() => handleOpenPermissions(u)}
                            className="px-2.5 py-1.5 rounded-lg text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 font-semibold inline-flex items-center gap-1 transition-smooth"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Phân quyền
                          </button>

                          {u.status === 'PENDING' && (
                            <button
                              onClick={() => handleActivate(u._id, u.username)}
                              disabled={actionLoading === u._id}
                              className="px-2.5 py-1.5 rounded-lg font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-smooth disabled:opacity-50 inline-flex items-center gap-1"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              Kích hoạt
                            </button>
                          )}
                          {u.status === 'ACTIVE' && (
                            <button
                              onClick={() => handleBlock(u._id, u.username)}
                              disabled={actionLoading === u._id}
                              className="px-2.5 py-1.5 rounded-lg font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-smooth disabled:opacity-50 inline-flex items-center gap-1"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              Khóa
                            </button>
                          )}
                          {u.status === 'BLOCKED' && (
                            <button
                              onClick={() => handleUnblock(u._id, u.username)}
                              disabled={actionLoading === u._id}
                              className="px-2.5 py-1.5 rounded-lg font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-smooth disabled:opacity-50 inline-flex items-center gap-1"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                              Mở khóa
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedUserForReset(u)}
                            className="px-2 py-1.5 rounded-lg text-slate-300 hover:bg-slate-800 transition-smooth"
                            title="Đặt lại mật khẩu"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDelete(u._id, u.username)}
                            disabled={actionLoading === u._id}
                            className="px-2 py-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-smooth disabled:opacity-50"
                            title="Xóa tài khoản"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Permissions Modal / Drawer */}
      {selectedUserForPerms && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-100 uppercase tracking-wider">
                    PHÂN QUYỀN TÀI KHOẢN: <span className="text-purple-400">{selectedUserForPerms.username}</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Trạng thái: <span className="text-emerald-400 font-bold">{selectedUserForPerms.status}</span> — Đã chọn {activePermissions.length} quyền
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserForPerms(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-800 transition-smooth"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Quick Actions Bar */}
            <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                  Chọn tất cả
                </button>
                <button
                  onClick={handleDeselectAll}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5"
                >
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                  Bỏ chọn tất cả
                </button>
                <button
                  onClick={handleApplySalesPreset}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30 hover:brightness-110 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Mẫu CTV Bán Hàng
                </button>
                <button
                  onClick={handleApplyManagerPreset}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-400 border border-blue-500/30 hover:brightness-110 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  Mẫu Quản Lý
                </button>
              </div>

              {/* Max Discount Input */}
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-1 rounded-xl">
                <span className="text-xs text-slate-300 font-medium">Giảm tối đa:</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={maxDiscountPercent}
                  onChange={(e) => setMaxDiscountPercent(Number(e.target.value))}
                  className="w-14 bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs text-purple-400 font-bold text-center focus:outline-none focus:border-purple-500"
                />
                <span className="text-xs text-slate-400">%</span>
              </div>
            </div>

            {/* Modal Content - Permission Groups Grid */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-900">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PERMISSION_GROUPS.map((group) => {
                  const groupKeys = group.permissions.map((p) => p.key);
                  const isAllGroupSelected = groupKeys.every((k) => activePermissions.includes(k));

                  const toggleGroup = () => {
                    if (isAllGroupSelected) {
                      setActivePermissions((prev) => prev.filter((k) => !groupKeys.includes(k)));
                    } else {
                      setActivePermissions((prev) => Array.from(new Set([...prev, ...groupKeys])));
                    }
                  };

                  return (
                    <div
                      key={group.id}
                      className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400">
                          {group.title}
                        </h3>
                        <button
                          type="button"
                          onClick={toggleGroup}
                          className="text-[10px] font-semibold text-slate-400 hover:text-slate-200"
                        >
                          {isAllGroupSelected ? 'Bỏ chọn nhóm' : 'Chọn toàn nhóm'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {group.permissions.map((perm) => {
                          const isChecked = activePermissions.includes(perm.key);
                          return (
                            <label
                              key={perm.key}
                              className={cn(
                                'flex items-center gap-2.5 p-2 rounded-xl text-xs cursor-pointer transition-smooth border',
                                isChecked
                                  ? 'bg-purple-500/10 border-purple-500/30 text-purple-200 font-medium'
                                  : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200'
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleTogglePermission(perm.key)}
                                className="w-4 h-4 rounded border-slate-700 text-purple-600 focus:ring-purple-500 bg-slate-950"
                              />
                              <span>{perm.label}</span>
                              <span className="text-[9px] text-slate-500 font-mono ml-auto">{perm.key}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <div className="text-xs text-slate-400">
                Lưu ý: Thay đổi quyền sẽ có hiệu lực ngay trong lần tải trang hoặc request tiếp theo của User.
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedUserForPerms(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800 transition-smooth"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleSavePermissions}
                  disabled={savingPerms}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-smooth shadow-lg shadow-purple-900/30 disabled:opacity-50"
                >
                  {savingPerms ? 'Đang lưu...' : 'Lưu quyền truy cập'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {selectedUserForReset && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-purple-400" />
                Đặt lại mật khẩu cho {selectedUserForReset.username}
              </h3>
              <button
                onClick={() => setSelectedUserForReset(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-300 font-medium">Mật khẩu mới (Tối thiểu 6 ký tự):</label>
              <input
                type="password"
                placeholder="Nhập mật khẩu mới..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedUserForReset(null)}
                className="px-3 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-800"
              >
                Hủy
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resettingPass || !newPassword}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50"
              >
                {resettingPass ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit User Info Modal */}
      {selectedUserForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-100">Sửa Thông Tin Tài Khoản</h3>
                  <p className="text-xs text-slate-400">Cập nhật thông tin cho @{selectedUserForEdit.username}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserForEdit(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-300">Tên Đăng Nhập *</label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                  placeholder="Username"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-300">Họ Và Tên Hiển Thị (Người Lập Báo Giá / Hóa Đơn) *</label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-blue-500 font-medium"
                  placeholder="VD: Nguyễn Đình Thành, Lê Hồng Phúc,..."
                />
                <p className="text-[11px] text-slate-500 mt-1">Tên này sẽ tự động hiển thị ở mục "Người lập" trên file PDF Hóa đơn & Báo giá.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1 text-slate-300">Vai Trò</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-blue-500 font-semibold"
                  >
                    <option value="USER">USER (Nhân viên)</option>
                    <option value="ADMIN">ADMIN (Quản trị)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-300">Trạng Thái Tài Khoản</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-blue-500 font-semibold"
                  >
                    <option value="ACTIVE">ACTIVE (Hoạt động)</option>
                    <option value="PENDING">PENDING (Chờ duyệt)</option>
                    <option value="BLOCKED">BLOCKED (Bị khóa)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-300">Đổi Mật Khẩu Mới (Bỏ trống nếu giữ nguyên)</label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                  placeholder="Nhập mật khẩu mới từ 6 ký tự..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setSelectedUserForEdit(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveUser}
                disabled={savingUser || !editUsername.trim()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {savingUser ? 'Đang lưu...' : 'Lưu Thay Đổi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
