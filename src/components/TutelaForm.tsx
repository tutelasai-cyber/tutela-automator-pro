import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, Loader2, Eye, Paperclip } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TutelaFormProps {
  onSuccess: () => void;
}

interface ExtractedData {
  accionantes: string;
  accionados: string;
  juzgado: string;
  email_juzgado: string;
  numero_radicado: string;
}

export const TutelaForm = ({ onSuccess }: TutelaFormProps) => {
  const { toast } = useToast();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [pdfName, setPdfName] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);

  // Form data
  const [formData, setFormData] = useState<ExtractedData>({
    accionantes: '',
    accionados: '',
    juzgado: '',
    email_juzgado: '',
    numero_radicado: ''
  });
  const [informacionEstado, setInformacionEstado] = useState('');

  // Simulated OCR extraction (in real app, this would call an OCR service)
  const simulateOCRExtraction = async (): Promise<ExtractedData> => {
    setIsExtracting(true);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Return simulated extracted data
    const simulatedData = {
      accionantes: 'Juan Pérez García, María López Silva',
      accionados: 'Ministerio de Salud, EPS Salud Total',
      juzgado: 'Juzgado Tercero Civil del Circuito de Bogotá',
      email_juzgado: 'juzgado3civil@cendoj.ramajudicial.gov.co',
      numero_radicado: '11001-31-03-001-2024-00123-00'
    };
    
    setIsExtracting(false);
    return simulatedData;
  };

  const uploadPDF = async (file: File) => {
    if (!file.type.includes('pdf')) {
      toast({
        title: "Error",
        description: "Solo se permiten archivos PDF",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Usuario no autenticado');

      const fileExt = 'pdf';
      const fileName = `${user.data.user.id}/${Date.now()}.${fileExt}`;

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const { error: uploadError } = await supabase.storage
        .from('tutela-pdfs')
        .upload(fileName, file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('tutela-pdfs')
        .getPublicUrl(fileName);

      setPdfUrl(urlData.publicUrl);
      setPdfName(file.name);
      
      toast({
        title: "PDF cargado exitosamente",
        description: "Iniciando extracción de datos...",
      });

      // Extract data using OCR (simulated)
      const extractedData = await simulateOCRExtraction();
      setFormData(extractedData);

      toast({
        title: "Datos extraídos",
        description: "Los datos han sido extraídos del PDF. Verifica y edita si es necesario.",
      });

    } catch (error) {
      console.error('Error uploading PDF:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el PDF",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      uploadPDF(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: false
  });

  const handleAttachmentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newAttachments = Array.from(files);
      setAttachments(prev => [...prev, ...newAttachments]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pdfUrl) {
      toast({
        title: "Error",
        description: "Debes cargar un PDF primero",
        variant: "destructive",
      });
      return;
    }

    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Usuario no autenticado');

      // Save tutela data
      const { data: tutelaData, error: tutelaError } = await supabase
        .from('tutelas')
        .insert({
          user_id: user.data.user.id,
          ...formData,
          informacion_estado: informacionEstado,
          pdf_url: pdfUrl,
          pdf_name: pdfName,
          status: 'active'
        })
        .select()
        .single();

      if (tutelaError) throw tutelaError;

      // Upload attachments if any
      if (attachments.length > 0) {
        for (const file of attachments) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.data.user.id}/${tutelaData.id}/${Date.now()}.${fileExt}`;

          const { error: attachmentUploadError } = await supabase.storage
            .from('tutela-attachments')
            .upload(fileName, file);

          if (attachmentUploadError) throw attachmentUploadError;

          const { data: attachmentUrlData } = supabase.storage
            .from('tutela-attachments')
            .getPublicUrl(fileName);

          await supabase
            .from('tutela_attachments')
            .insert({
              tutela_id: tutelaData.id,
              file_name: file.name,
              file_url: attachmentUrlData.publicUrl,
              file_type: file.type,
              file_size: file.size
            });
        }
      }

      toast({
        title: "Tutela guardada exitosamente",
        description: "La tutela ha sido procesada y guardada en el sistema",
      });

      onSuccess();

    } catch (error) {
      console.error('Error saving tutela:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la tutela",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* PDF Upload Section */}
      <Card className="shadow-professional-lg border-0 bg-card/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="w-5 h-5 text-primary" />
            <span>Cargar PDF de la Tutela</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
              isDragActive 
                ? 'border-primary bg-primary-light' 
                : 'border-border hover:border-primary hover:bg-accent/50'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center space-y-4">
              {isUploading ? (
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
              ) : (
                <FileText className="w-12 h-12 text-muted-foreground" />
              )}
              
              <div>
                <p className="text-lg font-medium">
                  {isDragActive 
                    ? 'Suelta el archivo PDF aquí' 
                    : isUploading 
                      ? 'Cargando PDF...' 
                      : 'Arrastra un PDF aquí o haz clic para seleccionar'
                  }
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Solo archivos PDF (máximo 10MB)
                </p>
              </div>
            </div>
          </div>

          {isUploading && (
            <Progress value={uploadProgress} className="w-full" />
          )}

          {pdfName && (
            <div className="flex items-center justify-between p-4 bg-accent/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-primary" />
                <span className="font-medium">{pdfName}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="w-4 h-4 mr-2" />
                {showPreview ? 'Ocultar' : 'Ver'} PDF
              </Button>
            </div>
          )}

          {showPreview && pdfUrl && (
            <div className="border rounded-lg overflow-hidden">
              <iframe
                src={pdfUrl}
                width="100%"
                height="600px"
                className="border-0"
              />
            </div>
          )}

          {isExtracting && (
            <div className="flex items-center justify-center p-8 bg-accent/20 rounded-lg">
              <Loader2 className="w-6 h-6 text-primary animate-spin mr-3" />
              <span className="text-lg font-medium">Extrayendo datos del PDF...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Extracted Data Form */}
      {pdfUrl && (
        <Card className="shadow-professional-lg border-0 bg-card/90 backdrop-blur-sm animate-slide-up">
          <CardHeader>
            <CardTitle>Datos Extraídos</CardTitle>
            <p className="text-muted-foreground">
              Revisa y edita los datos extraídos del PDF
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="accionantes">Accionantes</Label>
                  <Input
                    id="accionantes"
                    value={formData.accionantes}
                    onChange={(e) => setFormData({...formData, accionantes: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accionados">Accionados</Label>
                  <Input
                    id="accionados"
                    value={formData.accionados}
                    onChange={(e) => setFormData({...formData, accionados: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="juzgado">Juzgado</Label>
                  <Input
                    id="juzgado"
                    value={formData.juzgado}
                    onChange={(e) => setFormData({...formData, juzgado: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email_juzgado">Email del Juzgado</Label>
                  <Input
                    id="email_juzgado"
                    type="email"
                    value={formData.email_juzgado}
                    onChange={(e) => setFormData({...formData, email_juzgado: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="numero_radicado">Número de Radicado</Label>
                  <Input
                    id="numero_radicado"
                    value={formData.numero_radicado}
                    onChange={(e) => setFormData({...formData, numero_radicado: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label htmlFor="informacion_estado">Información del Estado</Label>
                <Textarea
                  id="informacion_estado"
                  value={informacionEstado}
                  onChange={(e) => setInformacionEstado(e.target.value)}
                  placeholder="Describe la información adicional del estado de la tutela..."
                  rows={4}
                />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Archivos Adjuntos</Label>
                    <div>
                      <input
                        type="file"
                        id="attachments"
                        multiple
                        onChange={handleAttachmentUpload}
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx,.txt"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('attachments')?.click()}
                      >
                        <Paperclip className="w-4 h-4 mr-2" />
                        Adjuntar Archivos
                      </Button>
                    </div>
                  </div>

                  {attachments.length > 0 && (
                    <div className="space-y-2">
                      {attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-accent/20 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Paperclip className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{file.name}</span>
                            <Badge variant="secondary">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </Badge>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAttachment(index)}
                          >
                            Remover
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="professional"
                  size="lg"
                  className="min-w-[200px]"
                >
                  Guardar Tutela
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};