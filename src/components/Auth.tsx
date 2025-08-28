import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Session } from '@supabase/supabase-js';
import { Scale, Shield } from "lucide-react";

interface AuthProps {
  onAuth: (user: User) => void;
}

export const Auth = ({ onAuth }: AuthProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          onAuth(session.user);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        onAuth(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [onAuth]);

  const signUp = async (email: string, password: string, fullName: string) => {
    setLoading(true);
    
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName
        }
      }
    });

    if (error) {
      toast({
        title: "Error de registro",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Registro exitoso",
        description: "Verifica tu correo electrónico para completar el registro.",
      });
    }
    
    setLoading(false);
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      toast({
        title: "Error de inicio de sesión",
        description: error.message,
        variant: "destructive",
      });
    }
    
    setLoading(false);
  };

  const AuthForm = ({ type }: { type: 'login' | 'register' }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (type === 'register') {
        signUp(email, password, fullName);
      } else {
        signIn(email, password);
      }
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        {type === 'register' && (
          <div className="space-y-2">
            <Label htmlFor="fullName">Nombre completo</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="transition-colors"
            />
          </div>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="transition-colors"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="transition-colors"
          />
        </div>
        
        <Button 
          type="submit" 
          className="w-full" 
          variant="professional"
          disabled={loading}
        >
          {loading 
            ? 'Cargando...' 
            : type === 'register' 
              ? 'Registrarse' 
              : 'Iniciar sesión'
          }
        </Button>
      </form>
    );
  };

  if (user) {
    return null; // User is authenticated, component will be handled by parent
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-professional-xl border-0 backdrop-blur-sm bg-card/90">
        <CardHeader className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="flex items-center justify-center w-12 h-12 bg-primary rounded-xl shadow-professional-md">
              <Scale className="w-6 h-6 text-primary-foreground" />
            </div>
            <Shield className="w-8 h-8 text-accent" />
          </div>
          <div>
            <CardTitle className="text-2xl bg-gradient-primary bg-clip-text text-transparent">
              Tutela Automator Pro
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              Sistema profesional para automatización de tutelas
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="register">Registrarse</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="mt-6">
              <AuthForm type="login" />
            </TabsContent>
            
            <TabsContent value="register" className="mt-6">
              <AuthForm type="register" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};