import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CornerDownLeft, Search } from 'lucide-react';

// Bỏ dấu tiếng Việt để tìm "hoi vien" vẫn ra "Hội viên"
function normalize(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * Bảng lệnh tìm nhanh (Ctrl/⌘ + K).
 * commands: [{ id, label, group, icon, keywords?, hint?, run }]
 */
export function CommandPalette({ open, onClose, commands }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const results = useMemo(() => {
    const q = normalize(query);
    if (!q) return commands;
    return commands.filter(command =>
      normalize(`${command.label} ${command.group} ${command.keywords || ''}`).includes(q));
  }, [query, commands]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    // Đợi modal render xong rồi mới focus
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => { setActive(0); }, [query]);

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  function execute(command) {
    if (!command) return;
    onClose();
    command.run();
  }

  function onKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(index => (results.length ? (index + 1) % results.length : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(index => (results.length ? (index - 1 + results.length) % results.length : 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      execute(results[active]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  }

  let lastGroup = null;

  return (
    <div className="cmdk-backdrop" onMouseDown={onClose}>
      <div
        className="cmdk"
        role="dialog"
        aria-modal="true"
        aria-label="Tìm kiếm nhanh"
        onMouseDown={event => event.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="cmdk-input">
          <Search size={17} />
          <input
            ref={inputRef}
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Nhập tên trang hoặc tác vụ…"
            aria-label="Từ khóa tìm kiếm"
            aria-controls="cmdk-list"
            aria-activedescendant={results[active] ? `cmdk-${results[active].id}` : undefined}
          />
          <kbd>ESC</kbd>
        </div>

        <ul className="cmdk-list" id="cmdk-list" role="listbox" ref={listRef}>
          {results.length === 0 && (
            <li className="cmdk-empty">Không tìm thấy kết quả cho “{query}”.</li>
          )}
          {results.map((command, index) => {
            const Icon = command.icon;
            const showGroup = command.group !== lastGroup;
            lastGroup = command.group;
            return (
              <React.Fragment key={command.id}>
                {showGroup && <li className="cmdk-group" role="presentation">{command.group}</li>}
                <li
                  id={`cmdk-${command.id}`}
                  role="option"
                  aria-selected={index === active}
                  data-active={index === active}
                  className="cmdk-item"
                  onMouseMove={() => setActive(index)}
                  onClick={() => execute(command)}
                >
                  {Icon && <span className="cmdk-icon"><Icon size={16} strokeWidth={1.8} /></span>}
                  <span className="cmdk-label">{command.label}</span>
                  {command.hint && <span className="cmdk-hint">{command.hint}</span>}
                  {index === active && <CornerDownLeft size={14} className="cmdk-enter" />}
                </li>
              </React.Fragment>
            );
          })}
        </ul>

        <div className="cmdk-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> di chuyển</span>
          <span><kbd>Enter</kbd> mở</span>
          <span><kbd>Esc</kbd> đóng</span>
        </div>
      </div>
    </div>
  );
}

/** Lắng nghe Ctrl+K / ⌘+K trên toàn trang. */
export function useCommandPaletteShortcut(onToggle) {
  useEffect(() => {
    function onKeyDown(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onToggle();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onToggle]);
}
