import { useState, useEffect } from "react";
import { User } from '@supabase/supabase-js';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { LogOut, Plus, Scale } from "lucide-react";
import { TutelaForm } from "./TutelaForm";
import { TutelaList } from "./TutelaList";

interface DashboardProps {
  user: User;
  onSignOut: () => void;
}

export const Dashboard = ({ user, onSignOut }: DashboardProps) => {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "No se pudo cerrar sesión",
        variant: "destructive",
      });
    } else {
      onSignOut();
    }
  };

  const refreshTutelas = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-secondary">
      {/* Header */}
      <header className="bg-card border-b shadow-professional-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
                <Scale className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Tutela Automator Pro</h1>
                <p className="text-sm text-muted-foreground">Sistema de automatización legal</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                Bienvenido, {user.email}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSignOut}
                className="flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Sesión</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="animate-fade-in">
          {!showForm ? (
            <div className="space-y-8">
              {/* Welcome Card */}
              <Card className="shadow-professional-md border-0 bg-card/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-2xl bg-gradient-primary bg-clip-text text-transparent">
                    Dashboard Principal
                  </CardTitle>
                  <p className="text-muted-foreground">
                    Gestiona tus tutelas de manera eficiente y profesional
                  </p>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => setShowForm(true)}
                    variant="professional"
                    size="lg"
                    className="flex items-center space-x-2"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Nueva Tutela</span>
                  </Button>
                </CardContent>
              </Card>

              {/* Tutelas List */}
              <TutelaList key={refreshKey} />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold bg-gradient-primary bg-clip-text text-transparent">
                  Nueva Tutela
                </h2>
                <Button 
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Volver
                </Button>
              </div>
              
              <TutelaForm 
                onSuccess={() => {
                  setShowForm(false);
                  refreshTutelas();
                }} 
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};