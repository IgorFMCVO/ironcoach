'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PhotoCaptureProps {
  evoMemberId: number;
  memberName: string;
  currentPhotoUrl?: string;
  onPhotoUpdated: (newPhotoUrl: string) => void;
  onClose: () => void;
}

export default function PhotoCapture({ 
  evoMemberId, 
  memberName, 
  currentPhotoUrl,
  onPhotoUpdated, 
  onClose 
}: PhotoCaptureProps) {
  const [mode, setMode] = useState<'choose' | 'camera' | 'uploading'>('choose');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Iniciar câmera
  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user', // Câmera frontal
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      setStream(mediaStream);
      setMode('camera');
      
      // Aguardar o próximo frame para o vídeo estar pronto
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (err) {
      console.error('Erro ao acessar câmera:', err);
      setError('Não foi possível acessar a câmera. Verifique as permissões.');
    }
  }, []);

  // Parar câmera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Capturar foto
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Espelhar horizontalmente (selfie)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageData);
    stopCamera();
  }, [stopCamera]);

  // Upload de arquivo
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione uma imagem.');
      return;
    }

    // Validar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  // Enviar foto para o servidor
  const uploadPhoto = useCallback(async () => {
    if (!capturedImage) return;

    setUploading(true);
    setError(null);

    try {
      // Converter base64 para blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append('photo', blob, `${evoMemberId}.jpg`);
      formData.append('evoMemberId', String(evoMemberId));
      formData.append('memberName', memberName);

      const uploadResponse = await fetch('/api/members/photo', {
        method: 'POST',
        body: formData,
      });

      const result = await uploadResponse.json();

      if (result.success) {
        setSuccess(true);
        onPhotoUpdated(result.photoUrl);
        
        // Fechar após 1.5s
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError(result.error || 'Erro ao salvar foto');
      }
    } catch (err) {
      console.error('Erro no upload:', err);
      setError('Erro ao enviar foto. Tente novamente.');
    } finally {
      setUploading(false);
    }
  }, [capturedImage, evoMemberId, memberName, onPhotoUpdated, onClose]);

  // Limpar e voltar
  const reset = useCallback(() => {
    setCapturedImage(null);
    setError(null);
    stopCamera();
    setMode('choose');
  }, [stopCamera]);

  // Cleanup ao fechar
  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90"
      onClick={handleClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-md bg-zinc-900 rounded-2xl overflow-hidden border border-white/10"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">📸 Foto do Aluno</h3>
            <p className="text-white/50 text-sm">{memberName}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/10 rounded-full"
          >
            ✕
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-4">
          {/* Sucesso */}
          {success && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-5xl">✅</span>
              </div>
              <h4 className="text-xl font-bold text-green-400">Foto Salva!</h4>
              <p className="text-white/50 mt-2">A foto foi atualizada com sucesso.</p>
            </div>
          )}

          {/* Erro */}
          {error && !success && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
              ⚠️ {error}
            </div>
          )}

          {/* Escolher modo */}
          {mode === 'choose' && !capturedImage && !success && (
            <div className="space-y-3">
              {/* Foto atual */}
              {currentPhotoUrl && (
                <div className="text-center mb-4">
                  <p className="text-white/50 text-sm mb-2">Foto atual:</p>
                  <img 
                    src={currentPhotoUrl} 
                    alt={memberName}
                    className="w-32 h-32 rounded-xl object-cover mx-auto border-2 border-white/10"
                  />
                </div>
              )}

              <button
                onClick={startCamera}
                className="w-full p-4 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-xl flex items-center gap-4 transition-colors"
              >
                <div className="w-12 h-12 bg-cyan-500/30 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">📷</span>
                </div>
                <div className="text-left">
                  <p className="font-bold text-cyan-400">Tirar Foto</p>
                  <p className="text-white/50 text-sm">Usar a câmera do dispositivo</p>
                </div>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-4 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-xl flex items-center gap-4 transition-colors"
              >
                <div className="w-12 h-12 bg-purple-500/30 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">📁</span>
                </div>
                <div className="text-left">
                  <p className="font-bold text-purple-400">Escolher Arquivo</p>
                  <p className="text-white/50 text-sm">Selecionar da galeria</p>
                </div>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          )}

          {/* Câmera */}
          {mode === 'camera' && !capturedImage && (
            <div className="space-y-4">
              <div className="relative aspect-[4/3] bg-black rounded-xl overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }} // Espelhar para selfie
                />
                
                {/* Overlay de guia */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-40 h-48 border-2 border-white/30 rounded-2xl" />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={reset}
                  className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={capturePhoto}
                  className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-400 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                >
                  📸 Capturar
                </button>
              </div>
            </div>
          )}

          {/* Preview da foto capturada */}
          {capturedImage && !success && (
            <div className="space-y-4">
              <div className="relative aspect-[4/3] bg-black rounded-xl overflow-hidden">
                <img
                  src={capturedImage}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={reset}
                  disabled={uploading}
                  className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  Tirar Outra
                </button>
                <button
                  onClick={uploadPhoto}
                  disabled={uploading}
                  className="flex-1 py-3 bg-green-500 hover:bg-green-400 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Salvando...
                    </>
                  ) : (
                    <>
                      ✅ Salvar Foto
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Canvas oculto para captura */}
        <canvas ref={canvasRef} className="hidden" />
      </motion.div>
    </motion.div>
  );
}
