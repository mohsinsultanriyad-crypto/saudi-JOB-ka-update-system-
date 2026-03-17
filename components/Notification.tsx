
import React, { useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Info, WifiOff } from 'lucide-react';

export type NotificationType = 'error' | 'success' | 'info' | 'warning' | 'network';

interface NotificationProps {
  message: string;
  type: NotificationType;
  onClose: () => void;
  duration?: number;
}

const Notification: React.FC<NotificationProps> = ({ message, type, onClose, duration = 5000 }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [onClose, duration]);

  const getIcon = () => {
    switch (type) {
      case 'error': return <AlertCircle className="text-red-500" size={20} />;
      case 'success': return <CheckCircle className="text-green-500" size={20} />;
      case 'network': return <WifiOff className="text-amber-500" size={20} />;
      default: return <Info className="text-blue-500" size={20} />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'error': return 'bg-red-50 border-red-100';
      case 'success': return 'bg-green-50 border-green-100';
      case 'network': return 'bg-amber-50 border-amber-100';
      default: return 'bg-blue-50 border-blue-100';
    }
  };

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm p-4 rounded-2xl border shadow-lg flex items-start gap-3 animate-in slide-in-from-top-10 duration-300 ${getBgColor()}`}>
      <div className="shrink-0 mt-0.5">
        {getIcon()}
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-gray-900 leading-tight">
          {type === 'network' ? 'Connection Issue' : type.charAt(0).toUpperCase() + type.slice(1)}
        </p>
        <p className="text-xs text-gray-600 mt-1 leading-relaxed">{message}</p>
      </div>
      <button onClick={onClose} className="shrink-0 text-gray-400 hover:text-gray-600 p-1">
        <X size={16} />
      </button>
    </div>
  );
};

export default Notification;
