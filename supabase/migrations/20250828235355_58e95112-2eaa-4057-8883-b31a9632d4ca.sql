-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create tutelas table for storing tutela cases
CREATE TABLE public.tutelas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accionantes TEXT,
  accionados TEXT,
  juzgado TEXT,
  email_juzgado TEXT,
  numero_radicado TEXT,
  informacion_estado TEXT,
  pdf_url TEXT,
  pdf_name TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on tutelas
ALTER TABLE public.tutelas ENABLE ROW LEVEL SECURITY;

-- Create policies for tutelas
CREATE POLICY "Users can view their own tutelas" 
ON public.tutelas 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tutelas" 
ON public.tutelas 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tutelas" 
ON public.tutelas 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tutelas" 
ON public.tutelas 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create attachments table for storing additional files
CREATE TABLE public.tutela_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tutela_id UUID NOT NULL REFERENCES public.tutelas(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on attachments
ALTER TABLE public.tutela_attachments ENABLE ROW LEVEL SECURITY;

-- Create policies for attachments
CREATE POLICY "Users can view attachments of their tutelas" 
ON public.tutela_attachments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.tutelas 
    WHERE tutelas.id = tutela_attachments.tutela_id 
    AND tutelas.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert attachments for their tutelas" 
ON public.tutela_attachments 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tutelas 
    WHERE tutelas.id = tutela_attachments.tutela_id 
    AND tutelas.user_id = auth.uid()
  )
);

-- Create storage buckets for files
INSERT INTO storage.buckets (id, name, public) VALUES ('tutela-pdfs', 'tutela-pdfs', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('tutela-attachments', 'tutela-attachments', false);

-- Create storage policies for PDFs
CREATE POLICY "Users can upload their own PDFs" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'tutela-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own PDFs" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'tutela-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage policies for attachments
CREATE POLICY "Users can upload their own attachments" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'tutela-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own attachments" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'tutela-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tutelas_updated_at
BEFORE UPDATE ON public.tutelas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();