

import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Heart,
  Users,
  Brain,
  Upload,
  Activity,
  Shield,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Search } from
"lucide-react";
import { User } from "@/api/entities";
import { Invitation } from "@/api/entities";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator } from
"@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import NotificationsBell from "@/components/notifications/NotificationsBell"; // Added import

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkUserAndRoute = async () => {
      setIsLoading(true);
      try {
        const currentUser = await User.me();
        let userToProcess = { ...currentUser };

        // Admin users are ALWAYS allowed access, regardless of status
        if (userToProcess.role === 'admin') {
          const isRootPage = location.pathname === createPageUrl("Home") || location.pathname === '/';
          if (isRootPage) {
            navigate(createPageUrl("AdminDashboard"), { replace: true });
          }
        }
        // For non-admin users, apply the approval system
        else {// This block handles users with role 'user' or no role (e.g., newly signed up)
          // Default-deny policy for doctors: Only 'active' users can proceed.
          if (userToProcess.status === 'active') {
            // User is approved, handle routing to dashboards
            const isRootPage = location.pathname === createPageUrl("Home") || location.pathname === '/';
            if (isRootPage) {
              navigate(createPageUrl("DoctorDashboard"), { replace: true });
            }
          } else if (userToProcess.status === 'disabled' || userToProcess.status === 'rejected') {
            // User is explicitly blocked, log them out.
            await User.logout();
            window.location.href = createPageUrl("Home"); // Force full redirect
          } else {
            // Any other status ('pending_approval', undefined, null) means they are not yet approved.
            // Handle invite data pre-fill here.
            const isPending = userToProcess.status === 'pending_approval' || userToProcess.status === undefined || userToProcess.status === null;
            if (isPending) {
              const pendingInvites = await Invitation.filter({ email: userToProcess.email, status: 'pending' });
              if (pendingInvites.length > 0) {
                const invite = pendingInvites[0];
                const updates = {
                  specialization: invite.specialization,
                  department: invite.department,
                  phone: invite.phone
                };
                if (updates.specialization || updates.department || updates.phone) {
                  await User.update(userToProcess.id, updates);
                }
                await Invitation.update(invite.id, { status: 'accepted' });
                // Re-fetch the user to get the latest pre-filled data, as their local 'userToProcess' might be outdated now.
                userToProcess = await User.me();
              }
            }

            // Now, redirect all non-active/non-blocked users to the pending page.
            if (location.pathname !== createPageUrl("PendingApproval")) {
              navigate(createPageUrl("PendingApproval"), { replace: true });
            }
          }
        }

        setUser(userToProcess);

      } catch (error) {
        // If the user is not authenticated, the platform's router will automatically
        // redirect to the built-in login page FOR PROTECTED PAGES.
        // For public pages like 'Home', this catch is expected and we do nothing.
        setUser(null);
      }
      setIsLoading(false);
    };

    checkUserAndRoute();

  }, [location.pathname, currentPageName, navigate]);

  const handleLogout = async () => {
    await User.logout();
    // After logout, redirect to the public home page with a full page reload
    // to ensure all state is cleared.
    window.location.href = createPageUrl("Home");
  };

  // --- NEW RENDER LOGIC ---

  // Highest priority: Show a loader while we determine the user's status and correct route.
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Loading...</span>
        </div>
      </div>);

  }

  // After loading, if there's no user, we are on a public page (like Home).
  // Or, if it's a protected page, the platform's router will handle the redirect
  // to login, and this component will simply render the children (e.g., login page itself).
  if (!user) {
    return <>{children}</>;
  }

  // If there IS a user, determine if they are allowed into the main app.
  const isAllowed = user.role === 'admin' || user.status === 'active';
  const isPendingPage = currentPageName === 'PendingApproval';

  // If the user is NOT allowed and is NOT already on the pending page,
  // it means a redirect is happening. Show the loader to prevent flashing content.
  if (!isAllowed && !isPendingPage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Loading...</span>
        </div>
      </div>);

  }

  // If the user is NOT allowed but IS on the pending page, show the simple pending layout.
  if (!isAllowed && isPendingPage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {children}
        </div>
      </div>);

  }

  // If we reach here, the user is authorized. Render the full application layout.
  const isAdmin = user.role === 'admin';
  const isDoctor = user.role === 'user';

  const adminNavItems = [
  { title: "Dashboard", url: createPageUrl("AdminDashboard"), icon: Activity },
  { title: "Manage Doctors", url: createPageUrl("ManageDoctors"), icon: Users },
  { title: "ML Models", url: createPageUrl("MLModels"), icon: Brain },
  { title: "System Logs", url: createPageUrl("SystemLogs"), icon: Shield }];


  const doctorNavItems = [
  { title: "Dashboard", url: createPageUrl("DoctorDashboard"), icon: Activity },
  { title: "New Diagnosis", url: createPageUrl("NewDiagnosis"), icon: Heart },
  { title: "Patient Records", url: createPageUrl("PatientRecords"), icon: Users },
  { title: "Image Analysis", url: createPageUrl("ImageAnalysis"), icon: Upload }];


  const navigationItems = isAdmin ? adminNavItems : doctorNavItems;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Top Navigation Bar */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-lg flex justify-between items-center h-16 ">
            {/* Logo and Brand */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>

                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>

              <Link to={createPageUrl(isAdmin ? "AdminDashboard" : "DoctorDashboard")} className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Heart className="w-7 h-7 text-white" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-2xl font-bold text-gray-900">MedChain</h1>
                  <p className="text-gray-500 text-base">Heart Disease Detection</p>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-1">
              {navigationItems.map((item) =>
              <Link
                key={item.title}
                to={item.url}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                location.pathname === item.url ?
                "bg-blue-100 text-blue-700 shadow-sm" :
                "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}`
                }>

                  <item.icon className="w-4 h-4" />
                  <span className="font-medium">{item.title}</span>
                </Link>
              )}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-3">
              {/* Replaced static bell with functional notifications */}
              <NotificationsBell currentUser={user} />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 pl-2">
                    <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center">
                      {user.profile_picture_url ?
                      <img
                        src={user.profile_picture_url}
                        alt="Profile"
                        className="w-full h-full object-cover" /> :


                      <div className="w-full h-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {(user.display_name || user.full_name)?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        </div>
                      }
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className="text-gray-900 text-base font-medium">
                        {user.display_name || user.full_name}
                      </p>
                      <p className="text-gray-500 text-sm">
                        {isAdmin ? 'System Administrator' : user.specialization || 'Medical Doctor'}
                      </p>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2 border-b">
                    <p className="text-base font-medium">{user.display_name || user.full_name}</p>
                    <p className="text-gray-500 text-sm">{user.email}</p>
                    <p className="text-blue-600 text-sm font-medium">
                      {isAdmin ? 'System Administrator' : user.specialization || 'Medical Doctor'}
                    </p>
                  </div>
                  <Link to={createPageUrl("ProfileSettings")}>
                    <DropdownMenuItem className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-base outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
                      <Settings className="w-4 h-4 mr-2" />
                      Profile Settings
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-base outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen &&
        <div className="lg:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-2 space-y-1">
              {navigationItems.map((item) =>
            <Link
              key={item.title}
              to={item.url}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
              location.pathname === item.url ?
              "bg-blue-100 text-blue-700" :
              "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}`
              }>

                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.title}</span>
                </Link>
            )}
            </div>
          </div>
        }
      </header>

      {/* Main Content */}
      <main className="min-h-[calc(100vh-4rem)]">
        {children}
      </main>

      {/* Custom Styles */}
      <style jsx>{`
        :root {
          --primary-blue: #1e40af;
          --primary-indigo: #3b82f6;
          --accent-mint: #10b981;
          --bg-gradient: linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%);
        }
        :global(html) {
          font-size: 20px; /* increase global size for better readability */
        }
        :global(body) {
          font-size: 20px;
        }
      `}</style>
    </div>);

}
