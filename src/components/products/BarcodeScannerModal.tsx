import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, AlertCircle, RefreshCw } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (barcode: string) => void;
  title?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  title = 'Escanear Código de Barras'
}) => {
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'html5qr-code-full-region';

  // Helper sound feedback when code scanned
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {
      // Audio context fallback ignore
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    // Get cameras
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back camera if available
          const backCamera = devices.find((d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('traseira') || d.label.toLowerCase().includes('environment'));
          const targetCam = backCamera ? backCamera.id : devices[0].id;
          setSelectedCameraId(targetCam);
          startScanner(targetCam);
        } else {
          setError('Nenhuma câmera encontrada no dispositivo.');
        }
      })
      .catch((err) => {
        console.error('Erro ao listar câmeras:', err);
        setError('Não foi possível acessar as câmeras. Verifique as permissões.');
      });

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async (cameraId: string) => {
    try {
      await stopScanner();
      setError(null);
      const html5QrCode = new Html5Qrcode(containerId);
      scannerRef.current = html5QrCode;
      setIsScanning(true);

      await html5QrCode.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 260, height: 160 },
          aspectRatio: 1.5,
        },
        (decodedText) => {
          playBeep();
          stopScanner();
          onScanSuccess(decodedText);
          onClose();
        },
        () => {
          // Frame scanner fail callback (silent)
        }
      );
    } catch (err) {
      console.error('Erro ao iniciar leitor de código de barras:', err);
      setIsScanning(false);
      setError('Falha ao iniciar a câmera. Tente outra câmera ou conceda permissão.');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        console.warn('Erro ao encerrar scanner:', e);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedCameraId(newId);
    startScanner(newId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/70 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-stone-200 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-100 bg-stone-50">
          <div className="flex items-center space-x-2 text-rose-600">
            <Camera className="w-5 h-5" />
            <h3 className="text-sm font-bold text-stone-800">{title}</h3>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {cameras.length > 1 && (
            <div className="flex items-center space-x-2 bg-stone-100 p-2 rounded-xl text-xs">
              <span className="text-stone-500 font-medium">Câmera:</span>
              <select
                value={selectedCameraId}
                onChange={handleCameraChange}
                className="bg-white border border-stone-300 rounded-lg px-2 py-1 flex-1 font-medium text-stone-700 outline-none focus:border-rose-500"
              >
                {cameras.map((cam) => (
                  <option key={cam.id} value={cam.id}>
                    {cam.label || `Câmera ${cam.id}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Scanner Viewport */}
          <div className="relative bg-stone-950 rounded-xl overflow-hidden min-h-[260px] flex flex-col items-center justify-center">
            <div id={containerId} className="w-full" />

            {!isScanning && !error && (
              <div className="absolute flex flex-col items-center justify-center text-stone-400 space-y-2">
                <RefreshCw className="w-8 h-8 animate-spin text-rose-500" />
                <p className="text-xs">Iniciando câmera...</p>
              </div>
            )}

            {error && (
              <div className="p-6 text-center text-rose-400 space-y-2">
                <AlertCircle className="w-8 h-8 mx-auto text-rose-500" />
                <p className="text-xs font-medium text-rose-200">{error}</p>
                <button
                  onClick={() => selectedCameraId && startScanner(selectedCameraId)}
                  className="mt-2 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg"
                >
                  Tentar Novamente
                </button>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-stone-500">
            Aproxime o código de barras (EAN-13, EAN-8, QR Code, etc.) da área central da câmera.
          </p>
        </div>

        {/* Footer */}
        <div className="p-3 bg-stone-50 border-t border-stone-100 flex justify-end">
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 font-semibold rounded-xl text-xs transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
