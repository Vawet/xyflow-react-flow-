import { memo, useEffect, useRef } from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  nodeId: string;
  onClose: () => void;
  onAction: (action: string, nodeId: string) => void;
}

const MENU_ITEMS = [
  { action: 'viewDetail', label: '查看详情', icon: 'M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7' },
  { action: 'download', label: '下载', icon: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3' },
  { action: 'regenerate', label: '重新生成', icon: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15' },
  { action: 'duplicate', label: '复制节点', icon: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6v4H9V2' },
  { action: 'delete', label: '删除', icon: 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' },
];

const ContextMenu = memo(({ x, y, nodeId, onClose, onAction }: ContextMenuProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const adjustedX = Math.min(x, window.innerWidth - 180);
  const adjustedY = Math.min(y, window.innerHeight - MENU_ITEMS.length * 38 - 16);

  return (
    <div
      ref={ref}
      className="context-menu"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {MENU_ITEMS.map((item) => (
        <div
          key={item.action}
          className={`context-item ${item.action === 'delete' ? 'danger' : ''}`}
          onClick={() => {
            onAction(item.action, nodeId);
            onClose();
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={item.icon} />
          </svg>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
});

ContextMenu.displayName = 'ContextMenu';
export default ContextMenu;
