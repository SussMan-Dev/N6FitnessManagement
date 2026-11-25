import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BadgeDollarSign,
  BarChart3,
  CreditCard,
  Dumbbell,
  FileText,
  Globe,
  History,
  LayoutDashboard,
  LogOut,
  Repeat2,
  ScanLine,
  Search,
  UserPlus,
  Users,
  UserRoundCog,
  X,
} from 'lucide-react';
import { playUiPop } from './sound';

const defaultCommands = [
  { id: 'dashboard', title: 'Tổng quan hệ thống', category: 'Điều hướng', icon: LayoutDashboard, path: '/' },
  { id: 'checkin', title: 'Quầy Check-in hội viên', category: 'Nghiệp vụ', icon: ScanLine, path: '/checkins', shortcut: 'C' },
  { id: 'members', title: 'Danh sách Hội viên', category: 'Điều hướng', icon: Users, path: '/members' },
  { id: 'plans', title: 'Danh mục Gói tập', category: 'Điều hướng', icon: BadgeDollarSign, path: '/plans' },
  { id: 'subscriptions', title: 'Đăng ký tập (Subscriptions)', category: 'Điều hướng', icon: Repeat2, path: '/subscriptions' },
  { id: 'invoices', title: 'Hóa đơn học phí & phí tập', category: 'Tài chính', icon: FileText, path: '/invoices' },
  { id: 'payments', title: 'Đối soát & Xác nhận thanh toán', category: 'Tài chính', icon: CreditCard, path: '/payments' },
  { id: 'reports', title: 'Báo cáo doanh thu & hội viên', category: 'Phân tích', icon: BarChart3, path: '/reports' },
  { id: 'trainers', title: 'Đội ngũ Huấn luyện viên (PT)', category: 'Vận hành', icon: Dumbbell, path: '/trainers' },
  { id: 'audit-logs', title: 'Lịch sử thao tác hệ thống', category: 'Hệ thống', icon: History, path: '/audit-logs' },
  { id: 'portal', title: 'Mở Cổng khách hàng (Customer Portal)', category: 'Liên kết ngoài', icon: Globe, path: '/portal', external: true },
];

export function CommandPalette({ isOpen, onClose, onLogout, isAdmin }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const commands = useMemo(() => {
    let list = [...defaultCommands];
    if (isAdmin) {
      list.push({ id: 'staff', title: 'Quản lý Nhân viên & Phân quyền', category: 'Hệ thống', icon: UserRoundCog, path: '/staff' });
    }
    if (onLogout) {
      list.push({ id: 'logout', title: 'Đăng xuất tài khoản', category: 'Tài khoản', icon: LogOut, action: onLogout });
    }
    if (!query.trim()) return list;

    const q = query.toLowerCase().trim();
    return list.filter(item =>
      item.title.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  }, [isAdmin, onLogout, query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  function handleSelect(item) {
    if (!item) return;
    playUiPop();
    onClose();
    if (item.action) {
      item.action();
    } else if (item.external) {
      window.open(item.path, '_blank');
    } else if (item.path) {
      navigate(item.path);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => (i + 1) % (commands.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => (i - 1 + commands.length) % (commands.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (commands[selectedIndex]) {
        handleSelect(commands[selectedIndex]);
      }
    }
  }

  if (!isOpen) return null;

  return (
    <div className="cmd-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="cmd-modal" onKeyDown={handleKeyDown}>
        <div className="cmd-search-bar">
          <Search size={18} className="cmd-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="cmd-input"
            placeholder="Tìm nhanh trang, tính năng hoặc thao tác… (ví dụ: check-in, báo cáo)"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button type="button" className="cmd-clear-btn" onClick={() => setQuery('')}>
              <X size={15} />
            </button>
          )}
          <span className="cmd-badge">ESC để đóng</span>
        </div>

        <div className="cmd-results" role="listbox">
          {commands.length === 0 ? (
            <div className="cmd-empty">Không tìm thấy kết quả phù hợp cho "{query}"</div>
          ) : (
            commands.map((cmd, index) => {
              const Icon = cmd.icon;
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  className={`cmd-item ${isSelected ? 'cmd-item-selected' : ''}`}
                  onClick={() => handleSelect(cmd)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="cmd-item-icon">
                    <Icon size={18} />
                  </div>
                  <div className="cmd-item-details">
                    <span className="cmd-item-title">{cmd.title}</span>
                    <span className="cmd-item-category">{cmd.category}</span>
                  </div>
                  {cmd.shortcut && <kbd className="cmd-item-key">{cmd.shortcut}</kbd>}
                </div>
              );
            })
          )}
        </div>

        <div className="cmd-footer">
          <span><kbd className="cmd-key">↑</kbd> <kbd className="cmd-key">↓</kbd> Di chuyển</span>
          <span><kbd className="cmd-key">Enter</kbd> Chọn</span>
          <span><kbd className="cmd-key">Esc</kbd> Đóng</span>
        </div>
      </div>
    </div>
  );
}
