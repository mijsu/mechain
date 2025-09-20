
import React, { useState, useEffect, useRef } from 'react';
import { User } from '@/api/entities';
import { UploadFile } from '@/api/integrations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User as UserIcon, Shield, Building, Award, Phone, Save, Loader2, CheckCircle, Mail, Camera, Lock, Key, LogOut } from 'lucide-react';
import FullScreenLoader from '@/components/FullScreenLoader';

const specializations = [
    "Cardiology", "Internal Medicine", "Emergency Medicine", "Family Medicine", 
    "Pulmonology", "Nephrology", "Endocrinology", "Geriatrics"
];

export default function ProfileSettings() {
    const [user, setUser] = useState(null);
    const [formData, setFormData] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [isUploadingPicture, setIsUploadingPicture] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const fetchUser = async () => {
            setIsLoading(true);
            try {
                const currentUser = await User.me();
                setUser(currentUser);
                setFormData({
                    display_name: currentUser.display_name || currentUser.full_name || '',
                    phone: currentUser.phone || '',
                    specialization: currentUser.specialization || '',
                    department: currentUser.department || '',
                    license_number: currentUser.license_number || '',
                    profile_picture_url: currentUser.profile_picture_url || ''
                });
            } catch (error) {
                console.error("Failed to fetch user data:", error);
            }
            setIsLoading(false);
        };
        fetchUser();
    }, []);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSelectChange = (id, value) => {
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        setSaveSuccess(false);
        try {
            await User.updateMyUserData(formData);
            setSaveSuccess(true);
            const updatedUser = await User.me();
            setUser(updatedUser);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            console.error("Failed to update user data:", error);
        }
        setIsSaving(false);
    };

    const handleProfilePictureUpload = async (event) => {
        const file = event.target.files[0];
        if (file) {
            setIsUploadingPicture(true);
            try {
                const { file_url } = await UploadFile({ file });
                setFormData(prev => ({ ...prev, profile_picture_url: file_url }));
                await User.updateMyUserData({ profile_picture_url: file_url });
                const updatedUser = await User.me();
                setUser(updatedUser);
            } catch (error) {
                console.error("Failed to upload profile picture:", error);
            }
            setIsUploadingPicture(false);
        }
    };

    const handleChangePassword = async () => {
        // Log out the user, which will redirect them to the built-in login page.
        // From there, they can use the "Forgot Password?" link.
        await User.logout();
    };

    if (isLoading) {
        return <FullScreenLoader isLoading={true} text="Loading Profile..." />;
    }

    const isDoctor = user.role === 'user';
    // The platform manages how a user signed in. The `has_password` field indicates
    // if their account was created via the Sign Up form on the login page.
    const hasPassword = user.has_password;
    const isGoogleOnly = user.auth_method === 'google_only';

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
                <p className="text-gray-600 mt-1">Manage your personal information and account security.</p>
            </div>

            <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="profile">
                        <UserIcon className="w-4 h-4 mr-2" />
                        Profile Information
                    </TabsTrigger>
                    <TabsTrigger value="security">
                        <Shield className="w-4 h-4 mr-2" />
                        Account Security
                    </TabsTrigger>
                </TabsList>

                {/* Profile Information Tab */}
                <TabsContent value="profile">
                    <Card className="border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-xl">Personal & Professional Details</CardTitle>
                            <CardDescription>
                                {isDoctor 
                                    ? "Update your professional information. This will be visible to administrators."
                                    : "Update your personal information."
                                }
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Profile Picture */}
                            <div className="flex items-center space-x-6">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                                        {formData.profile_picture_url ? (
                                            <img 
                                                src={formData.profile_picture_url} 
                                                alt="Profile" 
                                                className="w-24 h-24 rounded-full object-cover"
                                            />
                                        ) : (
                                            (formData.display_name || user.full_name || 'U').charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploadingPicture}
                                        className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg transition-colors disabled:opacity-50"
                                    >
                                        {isUploadingPicture ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Camera className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900">Profile Picture</h3>
                                    <p className="text-sm text-gray-600">Upload a professional photo. JPG, PNG up to 5MB.</p>
                                </div>
                            </div>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleProfilePictureUpload}
                                className="hidden"
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="display_name" className="flex items-center gap-2 font-medium">
                                        <UserIcon className="w-4 h-4" /> Display Name
                                    </Label>
                                    <Input 
                                        id="display_name" 
                                        value={formData.display_name} 
                                        onChange={handleInputChange}
                                        placeholder="How you want to be addressed"
                                        className="h-11"
                                    />
                                    <p className="text-xs text-gray-500">This name will be displayed throughout the system.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone" className="flex items-center gap-2 font-medium">
                                        <Phone className="w-4 h-4" /> Phone Number
                                    </Label>
                                    <Input 
                                        id="phone" 
                                        type="tel"
                                        value={formData.phone} 
                                        onChange={handleInputChange}
                                        placeholder="+63 917 123 4567"
                                        className="h-11"
                                    />
                                </div>
                            </div>

                            {isDoctor && (
                                <div className="space-y-6 pt-6 border-t">
                                    <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                                        <Award className="w-5 h-5" />
                                        Professional Information
                                    </h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="specialization" className="font-medium">Medical Specialization</Label>
                                            <Select value={formData.specialization || ''} onValueChange={(value) => handleSelectChange('specialization', value)}>
                                                <SelectTrigger className="h-11">
                                                    <SelectValue placeholder="Select your specialization" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {specializations.map(spec => (
                                                        <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <Label htmlFor="department" className="flex items-center gap-2 font-medium">
                                                <Building className="w-4 h-4" /> Department
                                            </Label>
                                            <Input 
                                                id="department" 
                                                value={formData.department || ''} 
                                                onChange={handleInputChange}
                                                placeholder="e.g., Emergency Medicine"
                                                className="h-11"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="license_number" className="font-medium">Medical License Number</Label>
                                        <Input 
                                            id="license_number" 
                                            value={formData.license_number || ''} 
                                            onChange={handleInputChange}
                                            placeholder="Enter your medical license number"
                                            className="h-11"
                                        />
                                    </div>
                                </div>
                            )}

                            {saveSuccess && (
                                <Alert className="border-green-200 bg-green-50">
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                    <AlertDescription className="text-green-700">
                                        Profile updated successfully!
                                    </AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                        <CardFooter>
                            <Button 
                                onClick={handleSaveChanges} 
                                disabled={isSaving}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Saving Changes...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Save Changes
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

                {/* Account Security Tab */}
                <TabsContent value="security">
                    <Card className="border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-xl">Account Security</CardTitle>
                            <CardDescription>
                                Manage your authentication methods and account security settings.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Authentication Methods */}
                            <div className="space-y-4">
                                <h3 className="font-medium text-gray-900">Sign-In Methods</h3>
                                <div className="p-4 border rounded-lg bg-gray-50 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="font-medium">Google Sign-In</p>
                                            <p className="text-xs text-gray-500">Sign in with your Google account ({user.email})</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-green-600">
                                        <CheckCircle className="w-4 h-4" />
                                        <span className="text-sm font-medium">Active</span>
                                    </div>
                                </div>
                                
                                {hasPassword && (
                                    <div className="p-4 border rounded-lg bg-gray-50 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                                <Mail className="w-4 h-4 text-gray-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium">Email & Password</p>
                                                <p className="text-xs text-gray-500">Sign in with email and password enabled</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-green-600">
                                            <CheckCircle className="w-4 h-4" />
                                            <span className="text-sm font-medium">Enabled</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Password Management */}
                            <div className="border-t pt-6">
                                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                                    <Lock className="w-5 h-5" />
                                    Password Management
                                </h3>
                                {!hasPassword && isGoogleOnly && (
                                    <>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Your account was created with Google Sign-In. To add a password, please sign up again using the same email on the login page.
                                        </p>
                                        <Button 
                                            variant="outline" 
                                            onClick={handleChangePassword}
                                            className="mt-4 flex items-center gap-2"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            Sign Out to Add a Password
                                        </Button>
                                    </>
                                )}
                                {hasPassword && (
                                    <>
                                        <p className="text-sm text-gray-600 mt-1">
                                            To change your password, sign out and use the "Forgot password?" link on the login page.
                                        </p>
                                        <Button 
                                            variant="outline" 
                                            onClick={handleChangePassword}
                                            className="mt-4 flex items-center gap-2"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            Sign Out to Change Password
                                        </Button>
                                    </>
                                )}
                            </div>

                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
