import React from 'react';
import { User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogOut } from 'lucide-react';

export default function PendingApproval() {

  const handleLogout = async () => {
    await User.logout();
    // Force a full page redirect to the root to ensure clean state
    window.location.href = '/';
  };

  return (
    <Card className="max-w-md w-full shadow-2xl border-0">
      <CardHeader>
        <CardTitle className="flex flex-col items-center text-center gap-4">
          <div className="p-3 bg-yellow-100 rounded-full">
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
          <span className="text-2xl text-gray-800">Account Pending Approval</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-6">
        <p className="text-gray-600">
          Thank you for registering. Your account has been created and is now awaiting review from a system administrator.
        </p>
        <p className="text-gray-600">
          You will be notified via email once your account has been approved. You will not be able to access your dashboard until then.
        </p>
        <Button onClick={handleLogout} className="w-full bg-blue-600 hover:bg-blue-700">
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </CardContent>
    </Card>
  );
}