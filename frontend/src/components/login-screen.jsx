import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Mail,
  Phone,
  Eye,
  EyeOff,
  GraduationCap,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export function LoginScreen() {
  const { login, register, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [authMethod, setAuthMethod] = useState("email");

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginRole, setLoginRole] = useState("student");

  // Register form state
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerRole, setRegisterRole] = useState("student");

  useEffect(() => {
    if (user) {
      const displayName = (user.first_name || user.username || user.email || 'user').toString();
      const slug = displayName.toLowerCase().replace(/\s+/g, '_');
      const from = location.state?.from?.pathname || `/${user.role}/${slug}/dashboard`;
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const handleLogin = (e) => {
    e.preventDefault();
    login(loginEmail, loginPassword).catch(() => {});
  };

  const handleRegister = (e) => {
    e.preventDefault();
    register({ name: registerName, email: registerEmail, password: registerPassword, role: registerRole }).catch(() => {});
  };

  const handleGoogleAuth = () => {
    login("user@gmail.com", "").catch(() => {});
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <GraduationCap className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Saras Edu Hub
          </h1>
          <p className="text-gray-600">
            Your gateway to quality education
          </p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="register">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Welcome Back</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleAuth}
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or
                      </span>
                    </div>
                  </div>
                </div>

                <form
                  onSubmit={handleLogin}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label>Authentication Method</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={
                          authMethod === "email"
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => setAuthMethod("email")}
                      >
                        <Mail className="h-4 w-4 mr-1" />
                        Email
                      </Button>
                      <Button
                        type="button"
                        variant={
                          authMethod === "phone"
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => setAuthMethod("phone")}
                      >
                        <Phone className="h-4 w-4 mr-1" />
                        Phone
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>
                      {authMethod === "email"
                        ? "Email"
                        : "Phone Number"}
                    </Label>
                    <Input
                      type={
                        authMethod === "email" ? "email" : "tel"
                      }
                      placeholder={
                        authMethod === "email"
                          ? "Enter your email"
                          : "Enter your phone number"
                      }
                      value={loginEmail}
                      onChange={(e) =>
                        setLoginEmail(e.target.value)
                      }
                      required
                    />
                  </div>

                  {authMethod === "email" && (
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <div className="relative">
                        <Input
                          type={
                            showPassword ? "text" : "password"
                          }
                          placeholder="Enter your password"
                          value={loginPassword}
                          onChange={(e) =>
                            setLoginPassword(e.target.value)
                          }
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() =>
                            setShowPassword(!showPassword)
                          }
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select
                      value={loginRole}
                      onValueChange={setLoginRole}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">
                          Student
                        </SelectItem>
                        <SelectItem value="teacher">
                          Teacher
                        </SelectItem>
                        <SelectItem value="admin">
                          Admin
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button type="submit" className="w-full">
                    {authMethod === "phone"
                      ? "Send OTP"
                      : "Sign In"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>Create Account</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={handleRegister}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input
                      placeholder="Enter your full name"
                      value={registerName}
                      onChange={(e) =>
                        setRegisterName(e.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={registerEmail}
                      onChange={(e) =>
                        setRegisterEmail(e.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Password</Label>
                    <div className="relative">
                      <Input
                        type={
                          showPassword ? "text" : "password"
                        }
                        placeholder="Create a password"
                        value={registerPassword}
                        onChange={(e) =>
                          setRegisterPassword(e.target.value)
                        }
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() =>
                          setShowPassword(!showPassword)
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select
                      value={registerRole}
                      onValueChange={setRegisterRole}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">
                          Student
                        </SelectItem>
                        <SelectItem value="teacher">
                          Teacher
                        </SelectItem>
                        <SelectItem value="admin">
                          Admin
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button type="submit" className="w-full">
                    Create Account
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}