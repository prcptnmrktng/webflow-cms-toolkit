import { useState, useRef, useCallback } from 'react';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import { 
  Upload, Image as ImageIcon, Download, Trash2, RefreshCw,
  ZoomIn, ZoomOut, RotateCw, FlipHorizontal, FlipVertical,
  Check, X, Loader2, Settings, Copy
} from 'lucide-react';
import { 
  IMAGE_PRESETS, 
  QUALITY_PRESETS, 
  processCroppedImage, 
  generateFilename,
  formatFileSize,
  getImageDimensions 
} from '../utils/imageProcessing';

function ImageProcessor() {
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [preset, setPreset] = useState('main-photo');
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);
  const [quality, setQuality] = useState('balanced');
  const [outputFormat, setOutputFormat] = useState('webp');
  const [filenamePattern, setFilenamePattern] = useState('{name}-{size}');
  const [processedImages, setProcessedImages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const cropperRef = useRef(null);

  // Get current dimensions based on preset
  const getDimensions = () => {
    if (preset === 'custom') {
      return { width: customWidth, height: customHeight };
    }
    return IMAGE_PRESETS[preset];
  };

  // Handle file drop
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    handleFiles(files);
  }, []);

  // Handle file select
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
    handleFiles(files);
  };

  // Process uploaded files
  const handleFiles = async (files) => {
    const newImages = await Promise.all(
      files.map(async (file) => {
        const dimensions = await getImageDimensions(file);
        return {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          name: file.name,
          url: URL.createObjectURL(file),
          size: file.size,
          ...dimensions,
        };
      })
    );
    setImages(prev => [...prev, ...newImages]);
    if (!selectedImage && newImages.length > 0) {
      setSelectedImage(newImages[0]);
    }
  };

  // Remove image
  const removeImage = (id) => {
    const image = images.find(img => img.id === id);
    if (image) {
      URL.revokeObjectURL(image.url);
    }
    setImages(prev => prev.filter(img => img.id !== id));
    if (selectedImage?.id === id) {
      setSelectedImage(images.find(img => img.id !== id) || null);
    }
  };

  // Process single image
  const processImage = async () => {
    if (!cropperRef.current || !selectedImage) return;

    setIsProcessing(true);
    try {
      const { width, height } = getDimensions();
      const result = await processCroppedImage(cropperRef.current.cropper, {
        width,
        height,
        quality: QUALITY_PRESETS[quality].quality,
        format: outputFormat,
      });

      const filename = generateFilename(filenamePattern, selectedImage.name, {
        format: outputFormat,
        width,
        height,
      });

      setProcessedImages(prev => [...prev, {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        filename,
        ...result,
        originalName: selectedImage.name,
      }]);
    } catch (err) {
      console.error('Failed to process image:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Process all images with current settings
  const processAllImages = async () => {
    setIsProcessing(true);
    for (const image of images) {
      setSelectedImage(image);
      // Wait for cropper to update
      await new Promise(resolve => setTimeout(resolve, 100));
      await processImage();
    }
    setIsProcessing(false);
  };

  // Download processed image
  const downloadImage = (processed) => {
    const a = document.createElement('a');
    a.href = processed.url;
    a.download = processed.filename;
    a.click();
  };

  // Download all processed images
  const downloadAll = () => {
    processedImages.forEach(downloadImage);
  };

  // Clear processed images
  const clearProcessed = () => {
    processedImages.forEach(img => URL.revokeObjectURL(img.url));
    setProcessedImages([]);
  };

  // Cropper controls
  const zoomIn = () => cropperRef.current?.cropper.zoom(0.1);
  const zoomOut = () => cropperRef.current?.cropper.zoom(-0.1);
  const rotate = () => cropperRef.current?.cropper.rotate(90);
  const flipH = () => cropperRef.current?.cropper.scaleX(-cropperRef.current.cropper.getData().scaleX || -1);
  const flipV = () => cropperRef.current?.cropper.scaleY(-cropperRef.current.cropper.getData().scaleY || -1);
  const reset = () => cropperRef.current?.cropper.reset();

  return (
    <div className="animate-fadeIn">
      <div className="mb-6">
        <span className="section-label">Image Processor</span>
        <h2 className="text-2xl text-pm-text mt-2">Crop & Resize</h2>
        <p className="text-pm-text-muted text-sm mt-1">Optimize images for Webflow with preset dimensions</p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left Panel - Image Queue */}
        <div className="col-span-3">
          <div className="card">
            <h3 className="text-xs uppercase tracking-widest text-pm-accent mb-4">
              Source Images ({images.length})
            </h3>
            
            {/* Upload Zone */}
            <div 
              className={`drop-zone mb-4 ${dragActive ? 'active' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById('image-input').click()}
            >
              <input
                id="image-input"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className="w-6 h-6 text-pm-accent mx-auto mb-2" />
              <p className="text-sm text-pm-text-muted">Drop images or click</p>
            </div>

            {/* Image List */}
            <div className="space-y-2 max-h-80 overflow-auto">
              {images.map(image => (
                <div 
                  key={image.id}
                  onClick={() => setSelectedImage(image)}
                  className={`flex items-center gap-3 p-2 cursor-pointer transition-colors ${
                    selectedImage?.id === image.id 
                      ? 'bg-pm-accent/10 border-l-2 border-pm-accent' 
                      : 'hover:bg-pm-gray-light'
                  }`}
                >
                  <img 
                    src={image.url} 
                    alt={image.name}
                    className="w-12 h-12 object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-pm-text truncate">{image.name}</p>
                    <p className="text-xs text-pm-text-muted">
                      {image.width}×{image.height} • {formatFileSize(image.size)}
                    </p>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeImage(image.id); }}
                    className="p-1 text-pm-text-muted hover:text-pm-error"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center - Cropper */}
        <div className="col-span-6">
          <div className="card h-full flex flex-col">
            {selectedImage ? (
              <>
                {/* Cropper Controls */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-1">
                    <button onClick={zoomIn} className="btn btn-ghost p-2" title="Zoom In">
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button onClick={zoomOut} className="btn btn-ghost p-2" title="Zoom Out">
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <button onClick={rotate} className="btn btn-ghost p-2" title="Rotate">
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <button onClick={flipH} className="btn btn-ghost p-2" title="Flip Horizontal">
                      <FlipHorizontal className="w-4 h-4" />
                    </button>
                    <button onClick={flipV} className="btn btn-ghost p-2" title="Flip Vertical">
                      <FlipVertical className="w-4 h-4" />
                    </button>
                    <button onClick={reset} className="btn btn-ghost p-2" title="Reset">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-sm text-pm-text-muted">
                    {getDimensions().width}×{getDimensions().height}
                  </div>
                </div>

                {/* Cropper */}
                <div className="flex-1 bg-pm-dark border border-pm-border overflow-hidden">
                  <Cropper
                    ref={cropperRef}
                    src={selectedImage.url}
                    style={{ height: '100%', width: '100%' }}
                    aspectRatio={getDimensions().width / getDimensions().height}
                    guides={true}
                    viewMode={1}
                    dragMode="move"
                    autoCropArea={0.9}
                    background={false}
                  />
                </div>

                {/* Process Button */}
                <div className="mt-4 flex gap-3">
                  <button 
                    onClick={processImage} 
                    disabled={isProcessing}
                    className="btn btn-primary flex-1"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Process Image
                  </button>
                  {images.length > 1 && (
                    <button 
                      onClick={processAllImages}
                      disabled={isProcessing}
                      className="btn btn-secondary"
                    >
                      Process All ({images.length})
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <ImageIcon className="w-12 h-12 text-pm-border mx-auto mb-3" />
                  <p className="text-pm-text-muted">Upload images to begin</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Settings & Output */}
        <div className="col-span-3 space-y-6">
          {/* Settings */}
          <div className="card">
            <h3 className="text-xs uppercase tracking-widest text-pm-accent mb-4">
              <Settings className="w-4 h-4 inline mr-2" />
              Settings
            </h3>

            {/* Preset */}
            <div className="mb-4">
              <label className="text-xs text-pm-text-muted uppercase tracking-wider block mb-2">
                Size Preset
              </label>
              <select 
                value={preset} 
                onChange={(e) => setPreset(e.target.value)}
                className="w-full"
              >
                {Object.entries(IMAGE_PRESETS).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {/* Custom Size */}
            {preset === 'custom' && (
              <div className="mb-4 grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-pm-text-muted block mb-1">Width</label>
                  <input
                    type="number"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-pm-text-muted block mb-1">Height</label>
                  <input
                    type="number"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* Quality */}
            <div className="mb-4">
              <label className="text-xs text-pm-text-muted uppercase tracking-wider block mb-2">
                Quality
              </label>
              <select 
                value={quality} 
                onChange={(e) => setQuality(e.target.value)}
                className="w-full"
              >
                {Object.entries(QUALITY_PRESETS).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {/* Format */}
            <div className="mb-4">
              <label className="text-xs text-pm-text-muted uppercase tracking-wider block mb-2">
                Output Format
              </label>
              <select 
                value={outputFormat} 
                onChange={(e) => setOutputFormat(e.target.value)}
                className="w-full"
              >
                <option value="webp">WebP</option>
                <option value="jpeg">JPEG</option>
                <option value="png">PNG</option>
              </select>
            </div>

            {/* Filename Pattern */}
            <div>
              <label className="text-xs text-pm-text-muted uppercase tracking-wider block mb-2">
                Filename Pattern
              </label>
              <input
                type="text"
                value={filenamePattern}
                onChange={(e) => setFilenamePattern(e.target.value)}
                placeholder="{name}-{size}"
                className="w-full text-sm font-mono"
              />
              <p className="text-xs text-pm-text-muted/60 mt-1">
                Variables: {'{name}'}, {'{date}'}, {'{width}'}, {'{height}'}, {'{size}'}
              </p>
            </div>
          </div>

          {/* Processed Output */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs uppercase tracking-widest text-pm-accent">
                Output ({processedImages.length})
              </h3>
              {processedImages.length > 0 && (
                <div className="flex gap-1">
                  <button onClick={downloadAll} className="btn btn-ghost p-1" title="Download All">
                    <Download className="w-4 h-4" />
                  </button>
                  <button onClick={clearProcessed} className="btn btn-ghost p-1" title="Clear All">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2 max-h-64 overflow-auto">
              {processedImages.map(processed => (
                <div 
                  key={processed.id}
                  className="flex items-center gap-3 p-2 bg-pm-dark border border-pm-border"
                >
                  <img 
                    src={processed.url} 
                    alt={processed.filename}
                    className="w-12 h-12 object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-pm-text truncate">{processed.filename}</p>
                    <p className="text-xs text-pm-text-muted">
                      {processed.width}×{processed.height} • {formatFileSize(processed.size)}
                    </p>
                  </div>
                  <button 
                    onClick={() => downloadImage(processed)}
                    className="p-1 text-pm-accent hover:bg-pm-accent/10"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {processedImages.length === 0 && (
                <p className="text-pm-text-muted/60 text-sm text-center py-4">
                  No processed images yet
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImageProcessor;
