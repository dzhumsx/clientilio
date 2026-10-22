import React, { useState, useRef, useEffect } from 'react';
import {
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Check,
  X,
  Crop,
  Move,
  Sparkles
} from 'lucide-react';
import { Modal } from './Modal';

interface AvatarCropperModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onCropComplete: (croppedDataUrl: string) => void;
}

const VIEWPORT_SIZE = 280; // Size of the interactive crop box
const MASK_DIAMETER = 220; // Diameter of the circle crop area
const MASK_RADIUS = MASK_DIAMETER / 2;
const MASK_CENTER = VIEWPORT_SIZE / 2;
const EXPORT_SIZE = 400; // Output canvas resolution (400x400)

export const AvatarCropperModal: React.FC<AvatarCropperModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);

  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset state when a new image is loaded or modal opens
  useEffect(() => {
    if (isOpen && imageSrc) {
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
      setIsDragging(false);

      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = imageSrc;
    }
  }, [isOpen, imageSrc]);

  // Compute base scale to cover the mask circle
  const isRotated = rotation % 180 !== 0;
  const naturalWidth = imageDimensions?.width || VIEWPORT_SIZE;
  const naturalHeight = imageDimensions?.height || VIEWPORT_SIZE;
  const effectiveW = isRotated ? naturalHeight : naturalWidth;
  const effectiveH = isRotated ? naturalWidth : naturalHeight;
  const baseScale = Math.max(MASK_DIAMETER / effectiveW, MASK_DIAMETER / effectiveH);
  const currentScale = baseScale * zoom;

  // Pointer event handlers for drag-to-pan
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    setDragStart({
      x: e.clientX - offset.x,
      y: e.clientY - offset.y,
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer capture was already lost
      }
      setIsDragging(false);
    }
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY * -0.0015;
    setZoom((prev) => Math.min(3, Math.max(1, +(prev + delta).toFixed(2))));
  };

  // Rotate 90 degrees clockwise
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Reset offset and zoom
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  // Apply crop using high-resolution offscreen canvas
  const handleApplyCrop = () => {
    if (!imageSrc || !imageDimensions) return;

    const img = imageRef.current;
    if (!img) return;

    const canvas = document.createElement('canvas');
    canvas.width = EXPORT_SIZE;
    canvas.height = EXPORT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Scale factor from viewport mask (MASK_DIAMETER) to export resolution (EXPORT_SIZE)
    const exportRatio = EXPORT_SIZE / MASK_DIAMETER;

    // Translate to center + scaled offset
    ctx.translate(
      EXPORT_SIZE / 2 + offset.x * exportRatio,
      EXPORT_SIZE / 2 + offset.y * exportRatio
    );
    ctx.rotate((rotation * Math.PI) / 180);

    const drawScale = currentScale * exportRatio;
    ctx.scale(drawScale, drawScale);

    ctx.drawImage(
      img,
      -img.naturalWidth / 2,
      -img.naturalHeight / 2,
      img.naturalWidth,
      img.naturalHeight
    );

    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.90);
    onCropComplete(croppedDataUrl);
    onClose();
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ajustar e Recortar Foto de Perfil">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Helper instruction */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            Arraste a foto para posicionar e use os controles para ampliar ou girar:
          </p>
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--accent-primary)',
              backgroundColor: 'var(--accent-subtle)',
              padding: '2px 8px',
              borderRadius: '4px',
              fontWeight: 600,
            }}
          >
            1:1 CIRCULAR
          </span>
        </div>

        {/* Cropper Container & Preview */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.5rem',
            flexWrap: 'wrap',
          }}
        >
          {/* Main Interactive Crop Box */}
          <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
            style={{
              width: `${VIEWPORT_SIZE}px`,
              height: `${VIEWPORT_SIZE}px`,
              position: 'relative',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              backgroundColor: '#0a0a0a',
              cursor: isDragging ? 'grabbing' : 'grab',
              touchAction: 'none',
              boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
            }}
          >
            {/* The Image undergoing CSS transforms */}
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${currentScale})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.08s ease-out',
                willChange: 'transform',
              }}
            >
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Recorte"
                crossOrigin="anonymous"
                style={{
                  maxWidth: 'none',
                  maxHeight: 'none',
                  display: 'block',
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
              />
            </div>

            {/* Circular Darkened Mask & Grid Overlay */}
            <svg
              viewBox={`0 0 ${VIEWPORT_SIZE} ${VIEWPORT_SIZE}`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
              }}
            >
              {/* Mask: Cutout circle inside dark viewport */}
              <defs>
                <mask id="cropMask">
                  <rect width={VIEWPORT_SIZE} height={VIEWPORT_SIZE} fill="white" />
                  <circle cx={MASK_CENTER} cy={MASK_CENTER} r={MASK_RADIUS} fill="black" />
                </mask>
              </defs>

              {/* Darkened area outside circle */}
              <rect
                width={VIEWPORT_SIZE}
                height={VIEWPORT_SIZE}
                fill="rgba(0, 0, 0, 0.72)"
                mask="url(#cropMask)"
              />

              {/* Circular border guide */}
              <circle
                cx={MASK_CENTER}
                cy={MASK_CENTER}
                r={MASK_RADIUS}
                fill="none"
                stroke="var(--accent-primary)"
                strokeWidth="2"
                strokeDasharray="4 3"
              />

              {/* Rule of thirds grid lines inside the circle */}
              <g opacity="0.25" stroke="#ffffff" strokeWidth="0.75">
                <line
                  x1={MASK_CENTER - MASK_RADIUS + (MASK_DIAMETER * 1) / 3}
                  y1={MASK_CENTER - Math.sqrt(Math.max(0, MASK_RADIUS ** 2 - (MASK_RADIUS - (MASK_DIAMETER * 1) / 3) ** 2))}
                  x2={MASK_CENTER - MASK_RADIUS + (MASK_DIAMETER * 1) / 3}
                  y2={MASK_CENTER + Math.sqrt(Math.max(0, MASK_RADIUS ** 2 - (MASK_RADIUS - (MASK_DIAMETER * 1) / 3) ** 2))}
                />
                <line
                  x1={MASK_CENTER - MASK_RADIUS + (MASK_DIAMETER * 2) / 3}
                  y1={MASK_CENTER - Math.sqrt(Math.max(0, MASK_RADIUS ** 2 - (MASK_RADIUS - (MASK_DIAMETER * 2) / 3) ** 2))}
                  x2={MASK_CENTER - MASK_RADIUS + (MASK_DIAMETER * 2) / 3}
                  y2={MASK_CENTER + Math.sqrt(Math.max(0, MASK_RADIUS ** 2 - (MASK_RADIUS - (MASK_DIAMETER * 2) / 3) ** 2))}
                />
                <line
                  y1={MASK_CENTER - MASK_RADIUS + (MASK_DIAMETER * 1) / 3}
                  x1={MASK_CENTER - Math.sqrt(Math.max(0, MASK_RADIUS ** 2 - (MASK_RADIUS - (MASK_DIAMETER * 1) / 3) ** 2))}
                  y2={MASK_CENTER - MASK_RADIUS + (MASK_DIAMETER * 1) / 3}
                  x2={MASK_CENTER + Math.sqrt(Math.max(0, MASK_RADIUS ** 2 - (MASK_RADIUS - (MASK_DIAMETER * 1) / 3) ** 2))}
                />
                <line
                  y1={MASK_CENTER - MASK_RADIUS + (MASK_DIAMETER * 2) / 3}
                  x1={MASK_CENTER - Math.sqrt(Math.max(0, MASK_RADIUS ** 2 - (MASK_RADIUS - (MASK_DIAMETER * 2) / 3) ** 2))}
                  y2={MASK_CENTER - MASK_RADIUS + (MASK_DIAMETER * 2) / 3}
                  x2={MASK_CENTER + Math.sqrt(Math.max(0, MASK_RADIUS ** 2 - (MASK_RADIUS - (MASK_DIAMETER * 2) / 3) ** 2))}
                />
              </g>
            </svg>

            {/* Subtle Pan Hint Badge */}
            <div
              style={{
                position: 'absolute',
                bottom: '8px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(4px)',
                color: '#ededed',
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                padding: '2px 8px',
                borderRadius: '12px',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Move size={10} />
              <span>ARRASTE PARA REPOSICIONAR</span>
            </div>
          </div>

          {/* Live Mini Previews (Sidebar & Header simulation) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              padding: '1rem 1.25rem',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-hairline)',
              minWidth: '150px',
            }}
          >
            <span
              className="eyebrow"
              style={{ fontSize: '9px', textAlign: 'center', color: 'var(--text-tertiary)' }}
            >
              PRÉ-VISUALIZAÇÃO
            </span>

            {/* Large Preview Circle (76px) */}
            <div
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                overflow: 'hidden',
                position: 'relative',
                border: '2px solid var(--accent-primary)',
                boxShadow: 'var(--accent-glow)',
                backgroundColor: '#0a0a0a',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: `translate(${offset.x * (76 / MASK_DIAMETER)}px, ${offset.y * (76 / MASK_DIAMETER)}px) rotate(${rotation}deg) scale(${currentScale * (76 / MASK_DIAMETER)})`,
                  transformOrigin: 'center center',
                }}
              >
                <img
                  src={imageSrc}
                  alt="Prévia"
                  style={{
                    maxWidth: 'none',
                    maxHeight: 'none',
                    display: 'block',
                    pointerEvents: 'none',
                  }}
                />
              </div>
            </div>

            {/* Small Preview Circle (36px, simulates sidebar user badge) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  position: 'relative',
                  border: '1.5px solid var(--border-hairline)',
                  backgroundColor: '#0a0a0a',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: `translate(${offset.x * (36 / MASK_DIAMETER)}px, ${offset.y * (36 / MASK_DIAMETER)}px) rotate(${rotation}deg) scale(${currentScale * (36 / MASK_DIAMETER)})`,
                    transformOrigin: 'center center',
                  }}
                >
                  <img
                    src={imageSrc}
                    alt="Prévia Pequena"
                    style={{
                      maxWidth: 'none',
                      maxHeight: 'none',
                      display: 'block',
                      pointerEvents: 'none',
                    }}
                  />
                </div>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                Barra lateral
              </span>
            </div>
          </div>
        </div>

        {/* Controls: Zoom Slider & Rotation & Reset */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            padding: '1rem',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-hairline)',
          }}
        >
          {/* Zoom Control */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', minWidth: '55px' }}>
              Zoom:
            </span>

            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(1, +(z - 0.15).toFixed(2)))}
              disabled={zoom <= 1}
              className="btn btn-ghost btn-sm"
              style={{ padding: '4px', borderRadius: '4px' }}
              title="Reduzir Zoom"
            >
              <ZoomOut size={15} />
            </button>

            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              style={{
                flex: 1,
                cursor: 'pointer',
                accentColor: 'var(--accent-primary)',
              }}
            />

            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3, +(z + 0.15).toFixed(2)))}
              disabled={zoom >= 3}
              className="btn btn-ghost btn-sm"
              style={{ padding: '4px', borderRadius: '4px' }}
              title="Aumentar Zoom"
            >
              <ZoomIn size={15} />
            </button>

            <span
              style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)',
                minWidth: '40px',
                textAlign: 'right',
              }}
            >
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Action Tools: Rotate & Reset */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '0.5rem',
              borderTop: '1px solid var(--border-hairline)',
            }}
          >
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={handleRotate}
                className="btn btn-ghost btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}
                title="Girar imagem 90 graus"
              >
                <RotateCw size={13} />
                <span>Girar 90°</span>
                {rotation > 0 && (
                  <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', opacity: 0.7 }}>
                    ({rotation}°)
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="btn btn-ghost btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}
                title="Redefinir posição e zoom"
              >
                <Maximize2 size={13} />
                <span>Centralizar</span>
              </button>
            </div>

            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
              Alta Resolução: {EXPORT_SIZE}x{EXPORT_SIZE}px
            </span>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.65rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid var(--border-hairline)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            style={{ padding: '0.55rem 1rem' }}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleApplyCrop}
            className="btn btn-primary btn-sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.55rem 1.25rem',
              fontWeight: 600,
            }}
          >
            <Check size={15} />
            <span>Aplicar Recorte</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
