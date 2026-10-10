import { useEffect, useState } from 'react';
import { HiCheckCircle, HiExclamationTriangle, HiInformationCircle, HiXMark } from 'react-icons/hi2';
import { NOTIFICATION_EVENT } from './notifications';

function Notification({ item, onClose }) {
  useEffect(() => {
    const duration = item.duration ?? (item.type === 'error' ? 7000 : 4500);
    if (!duration) return undefined;
    const timer = window.setTimeout(() => onClose(item.id), duration);
    return () => window.clearTimeout(timer);
  }, [item, onClose]);

  const Icon = item.type === 'success' ? HiCheckCircle : item.type === 'error' ? HiExclamationTriangle : HiInformationCircle;
  return <div className={`notification-toast ${item.type}`} role={item.type === 'error' ? 'alert' : 'status'}>
    <Icon className="notification-icon" aria-hidden="true" />
    <p>{item.message}</p>
    {item.actionLabel && <button className="notification-action" type="button" onClick={() => { item.onAction?.(); onClose(item.id); }}>{item.actionLabel}</button>}
    <button className="notification-close" type="button" onClick={() => onClose(item.id)} aria-label="Dismiss notification"><HiXMark /></button>
  </div>;
}

export default function NotificationCenter() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const receive = event => setItems(current => [...current.slice(-2), event.detail]);
    window.addEventListener(NOTIFICATION_EVENT, receive);
    return () => window.removeEventListener(NOTIFICATION_EVENT, receive);
  }, []);
  const close = id => setItems(current => current.filter(item => item.id !== id));
  return <aside className="notification-center" aria-label="Notifications">{items.map(item => <Notification key={item.id} item={item} onClose={close} />)}</aside>;
}
