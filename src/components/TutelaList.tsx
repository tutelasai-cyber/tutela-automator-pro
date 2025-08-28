import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { FileText, Calendar, Mail, Building, Hash, Eye, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Tutela {
  id: string;
  accionantes: string;
  accionados: string;
  juzgado: string;
  email_juzgado: string;
  numero_radicado: string;
  informacion_estado: string;
  pdf_url: string;
  pdf_name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export const TutelaList = () => {
  const { toast } = useToast();
  const [tutelas, setTutelas] = useState<Tutela[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTutelas = async () => {
    try {
      const { data, error } = await supabase
        .from('tutelas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTutelas(data || []);
    } catch (error) {
      console.error('Error fetching tutelas:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las tutelas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTutelas();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta tutela?')) return;

    try {
      const { error } = await supabase
        .from('tutelas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Tutela eliminada",
        description: "La tutela ha sido eliminada exitosamente",
      });

      fetchTutelas();
    } catch (error) {
      console.error('Error deleting tutela:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la tutela",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-accent text-accent-foreground">Activa</Badge>;
      case 'draft':
        return <Badge variant="secondary">Borrador</Badge>;
      case 'completed':
        return <Badge className="bg-primary text-primary-foreground">Completada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="shadow-professional-md border-0 bg-card/90 backdrop-blur-sm">
        <CardContent className="p-8">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mx-auto mb-4"></div>
              <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tutelas.length === 0) {
    return (
      <Card className="shadow-professional-md border-0 bg-card/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-xl bg-gradient-primary bg-clip-text text-transparent">
            Mis Tutelas
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12">
          <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No tienes tutelas registradas
          </h3>
          <p className="text-muted-foreground">
            Crea tu primera tutela para comenzar a usar el sistema
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-professional-md border-0 bg-card/90 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-xl bg-gradient-primary bg-clip-text text-transparent">
          Mis Tutelas ({tutelas.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {tutelas.map((tutela) => (
          <Card key={tutela.id} className="border shadow-professional-sm hover:shadow-professional-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-lg">{tutela.pdf_name || 'Tutela'}</h3>
                      {getStatusBadge(tutela.status)}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {format(new Date(tutela.created_at), 'dd MMM yyyy', { locale: es })}
                        </span>
                      </div>
                      {tutela.numero_radicado && (
                        <div className="flex items-center space-x-1">
                          <Hash className="w-3 h-3" />
                          <span>{tutela.numero_radicado}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {tutela.pdf_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(tutela.pdf_url, '_blank')}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Ver PDF
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(tutela.id)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium text-muted-foreground">Accionantes:</span>
                    <p className="text-foreground">{tutela.accionantes || 'No especificado'}</p>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-muted-foreground">Accionados:</span>
                    <p className="text-foreground">{tutela.accionados || 'No especificado'}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm">
                    <div className="flex items-center space-x-2">
                      <Building className="w-3 h-3 text-muted-foreground" />
                      <span className="font-medium text-muted-foreground">Juzgado:</span>
                    </div>
                    <p className="text-foreground ml-5">{tutela.juzgado || 'No especificado'}</p>
                  </div>
                  {tutela.email_juzgado && (
                    <div className="text-sm">
                      <div className="flex items-center space-x-2">
                        <Mail className="w-3 h-3 text-muted-foreground" />
                        <span className="font-medium text-muted-foreground">Email:</span>
                      </div>
                      <p className="text-foreground ml-5">{tutela.email_juzgado}</p>
                    </div>
                  )}
                </div>
              </div>

              {tutela.informacion_estado && (
                <div className="mt-4 p-3 bg-accent/20 rounded-lg">
                  <span className="font-medium text-sm text-muted-foreground">Información del Estado:</span>
                  <p className="text-foreground text-sm mt-1">{tutela.informacion_estado}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
};