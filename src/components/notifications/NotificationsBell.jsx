import React, { useState, useEffect } from 'react';
import { Bell, X, Check } from 'lucide-react';
import { Notification } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';

export default function NotificationsBell({ currentUser }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      loadNotifications();
    }
  }, [currentUser]);

  const loadNotifications = async () => {
    try {
      if (!currentUser) return;

      const isAdmin = currentUser.role === 'admin';
      
      // Load notifications based on user role
      const userNotifications = await Notification.filter({ 
        recipient_user_id: currentUser.id 
      }, '-created_date', 20);
      
      const generalNotifications = await Notification.filter({ 
        audience: 'all' 
      }, '-created_date', 10);
      
      const roleNotifications = await Notification.filter({ 
        audience: isAdmin ? 'admin' : 'user' 
      }, '-created_date', 10);

      // Combine and deduplicate notifications
      const allNotifications = [...userNotifications, ...generalNotifications, ...roleNotifications];
      const uniqueNotifications = allNotifications.filter((notification, index, self) =>
        index === self.findIndex(n => n.id === notification.id)
      );

      // Sort by creation date (newest first)
      uniqueNotifications.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

      setNotifications(uniqueNotifications.slice(0, 20));
      setUnreadCount(uniqueNotifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const formatTimeForPhilippines = (timestamp) => {
    try {
      // Create a date object, assuming the timestamp from DB is UTC.
      // Appending 'Z' tells the Date constructor to parse it as UTC.
      const eventTime = new Date(timestamp + 'Z');
      const now = new Date(); // This is in user's local time

      // getTime() returns UTC milliseconds since epoch for both, so the difference is timezone-agnostic.
      const diffInMs = now.getTime() - eventTime.getTime();
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

      if (diffInMinutes < 2) {
        return 'just now';
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes} minutes ago`;
      } else if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
      } else {
        return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
      }
    } catch (error) {
      return 'recently';
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await Notification.update(notificationId, { 
        read: true, 
        read_at: new Date().toISOString() 
      });
      loadNotifications(); // Refresh the list
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    
    if (notification.link_url) {
      navigate(createPageUrl(notification.link_url));
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      for (const notification of unreadNotifications) {
        await Notification.update(notification.id, { 
          read: true, 
          read_at: new Date().toISOString() 
        });
      }
      loadNotifications();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type) => {
    const iconClass = "w-3 h-3 mr-2";
    switch (type) {
      case 'success':
        return <div className={`${iconClass} bg-green-500 rounded-full`}></div>;
      case 'warning':
        return <div className={`${iconClass} bg-yellow-500 rounded-full`}></div>;
      case 'error':
        return <div className={`${iconClass} bg-red-500 rounded-full`}></div>;
      case 'alert':
        return <div className={`${iconClass} bg-orange-500 rounded-full`}></div>;
      default:
        return <div className={`${iconClass} bg-blue-500 rounded-full`}></div>;
    }
  };

  return (
    <DropdownMenu onOpenChange={(isOpen) => isOpen && loadNotifications()}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5 text-gray-600" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 min-w-[18px] h-[18px] p-0 flex items-center justify-center text-xs bg-red-500 text-white rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-blue-600 hover:text-blue-700 text-xs"
              >
                Mark all read
              </Button>
            )}
          </div>
        </div>
        
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No notifications yet
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                  !notification.read ? 'bg-blue-50' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-2">
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm ${!notification.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full ml-2"></div>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      {formatTimeForPhilippines(notification.created_date)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}