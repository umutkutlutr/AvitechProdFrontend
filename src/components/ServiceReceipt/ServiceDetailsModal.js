import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AiOutlineClose, AiOutlineEdit, AiOutlineDownload, AiOutlineZoomIn, AiOutlineZoomOut, AiOutlineExpand } from 'react-icons/ai';
import API_BASE_URL from '../../config';
import projectService from '../../services/projectService';
import authService from '../../services/authService';
import { normalizeProjectDetail } from '../../utils/projectNormalizer';
import { extractFilenameFromResponse } from '../../utils/apiUtils';
import EditProjectModal from './EditProjectModal';
import './ServiceDetailsModal.css';

const ServiceDetailsModal = ({ service, onClose, isCompletedProject = false }) => {
  const [projectDetails, setProjectDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const imagePositionRef = useRef({ x: 0, y: 0 });

  // Photo loading optimization states
  const [loadedImages, setLoadedImages] = useState(new Set());
  const [loadingImages, setLoadingImages] = useState(new Set());
  const [preloadedImages, setPreloadedImages] = useState(new Set());
  const imageCache = useRef(new Map());
  const preloadQueue = useRef([]);

  useEffect(() => {
    const fetchProjectDetails = async () => {
      if (!service?.id) {
        setError('Proje ID bulunamadı');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await projectService.getProjectById(service.id);
        setProjectDetails(normalizeProjectDetail(data) || data);
      } catch (err) {
        console.error('Error fetching project details:', err);
        setError(err.message || 'Proje detayları yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchProjectDetails();
  }, [service?.id]);

  // Update ref when imagePosition changes
  useEffect(() => {
    imagePositionRef.current = imagePosition;
  }, [imagePosition]);

  // Image preloading optimization
  const preloadImage = useCallback((url) => {
    return new Promise((resolve, reject) => {
      // Check if already in cache
      if (imageCache.current.has(url)) {
        resolve(url);
        return;
      }

      // Check if already loaded
      if (loadedImages.has(url) || loadingImages.has(url)) {
        resolve(url);
        return;
      }

      setLoadingImages(prev => new Set([...prev, url]));

      const img = new Image();
      img.onload = () => {
        imageCache.current.set(url, img);
        setLoadedImages(prev => new Set([...prev, url]));
        setLoadingImages(prev => {
          const newSet = new Set(prev);
          newSet.delete(url);
          return newSet;
        });
        resolve(url);
      };
      img.onerror = () => {
        setLoadingImages(prev => {
          const newSet = new Set(prev);
          newSet.delete(url);
          return newSet;
        });
        reject(new Error(`Failed to load image: ${url}`));
      };
      img.src = url;
    });
  }, [loadedImages, loadingImages]);

  // Preload adjacent photos for smooth navigation
  const preloadAdjacentPhotos = useCallback((currentIndex, photos) => {
    if (!photos || photos.length === 0) return;

    // Preload current, next, and previous photos
    const indicesToPreload = [
      currentIndex,
      currentIndex + 1 < photos.length ? currentIndex + 1 : 0,
      currentIndex - 1 >= 0 ? currentIndex - 1 : photos.length - 1,
    ];

    // Also preload 2 photos ahead and behind for even smoother experience
    if (photos.length > 3) {
      indicesToPreload.push(
        currentIndex + 2 < photos.length ? currentIndex + 2 : (currentIndex + 2) % photos.length,
        currentIndex - 2 >= 0 ? currentIndex - 2 : photos.length + (currentIndex - 2)
      );
    }

    // Preload in priority order
    indicesToPreload.forEach((index, priority) => {
      const url = photos[index];
      if (url && !preloadedImages.has(url)) {
        setTimeout(() => {
          preloadImage(url).then(() => {
            setPreloadedImages(prev => new Set([...prev, url]));
          }).catch(err => {
            console.warn('Failed to preload image:', err);
          });
        }, priority * 100); // Stagger preloading slightly
      }
    });
  }, [preloadImage, preloadedImages]);

  // Normalize photos to URL strings (API may return string[] or {id, url}[])
  const photoUrls = React.useMemo(() => {
    const raw = projectDetails?.photos || [];
    return raw.map(p => typeof p === 'string' ? p : (p?.url || p));
  }, [projectDetails?.photos]);

  // Preload adjacent photos when selected photo changes
  useEffect(() => {
    if (showPhotoGallery && photoUrls.length > 0) {
      preloadAdjacentPhotos(selectedPhotoIndex, photoUrls);
    }
  }, [showPhotoGallery, selectedPhotoIndex, photoUrls, preloadAdjacentPhotos]);

  // Image drag functionality handlers
  const handleMouseDown = useCallback((e) => {
    if (zoomLevel > 1) {
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX - imagePositionRef.current.x,
        y: e.clientY - imagePositionRef.current.y,
      };
    }
  }, [zoomLevel]);

  const handleMouseMove = useCallback((e) => {
    if (isDragging && zoomLevel > 1) {
      e.preventDefault();
      setImagePosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    }
  }, [isDragging, zoomLevel]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Drag event listeners
  useEffect(() => {
    if (showPhotoGallery && isDragging && zoomLevel > 1) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'grabbing';
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
      };
    }
  }, [showPhotoGallery, isDragging, zoomLevel, handleMouseMove, handleMouseUp]);

  // Keyboard navigation
  useEffect(() => {
    if (!showPhotoGallery) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSelectedPhotoIndex((prev) => {
          const newIndex = prev > 0 ? prev - 1 : photoUrls.length - 1;
          setZoomLevel(1);
          setImagePosition({ x: 0, y: 0 });
          return newIndex;
        });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setSelectedPhotoIndex((prev) => {
          const newIndex = prev < photoUrls.length - 1 ? prev + 1 : 0;
          setZoomLevel(1);
          setImagePosition({ x: 0, y: 0 });
          return newIndex;
        });
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowPhotoGallery(false);
        setZoomLevel(1);
        setImagePosition({ x: 0, y: 0 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showPhotoGallery, photoUrls.length]);

  if (!service) return null;

  // Format number with dots as thousand separators
  const formatNumberWithDots = (number) => {
    if (number === null || number === undefined || number === '' || isNaN(number)) {
      return null;
    }
    const num = typeof number === 'number' ? number : parseFloat(number);
    if (isNaN(num)) return null;

    const numStr = Math.round(num).toString();
    return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Format hours with unit
  const formatHours = (value) => {
    if (!value && value !== 0) return '-';
    const formatted = formatNumberWithDots(value);
    return formatted ? `${formatted} saat` : '-';
  };

  // Format RPM with unit
  const formatRpm = (value) => {
    if (!value && value !== 0) return '-';
    const formatted = formatNumberWithDots(value);
    return formatted ? `${formatted} Max 1/min` : '-';
  };

  // Format weight with unit
  const formatWeight = (value) => {
    if (!value && value !== 0) return '-';
    const formatted = formatNumberWithDots(value);
    return formatted ? `${formatted} kg` : '-';
  };

  // Format dimension with unit
  const formatDimension = (value) => {
    if (!value && value !== 0) return '-';
    const formatted = formatNumberWithDots(value);
    return formatted ? `${formatted} cm` : '-';
  };

  // Format condition enum to Turkish labels
  const formatCondition = (value) => {
    if (!value) return '-';
    const conditionMap = {
      'NEW': 'Sıfır',
      'USED': '2. El',
      'VERY_GOOD': '2. El',
      'GOOD': '2. El',
      'POOR': '2. El'
    };
    return conditionMap[value] || value;
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleEditClick = () => {
    setShowEditModal(true);
  };

  const handleEditModalClose = () => {
    setShowEditModal(false);
  };

  const handleEditSaveComplete = (updatedProject) => {
    // Refresh the project details after successful edit
    if (service?.id) {
      const fetchUpdatedDetails = async () => {
        try {
          const data = await projectService.getProjectById(service.id);
          setProjectDetails(data);
        } catch (err) {
          console.error('Error refreshing project details:', err);
        }
      };
      fetchUpdatedDetails();
    }
    setShowEditModal(false);
  };

  const handleDownload = async () => {
    if (!service?.id) {
      alert('Proje ID bulunamadı');
      return;
    }

    try {
      setDownloading(true);
      const response = await fetch(`${API_BASE_URL}/api/projects/${service.id}/pdf`, {
        method: 'GET',
        headers: authService.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'PDF indirilirken bir hata oluştu');
      }

      // Get the PDF blob
      const blob = await response.blob();

      // Extract filename from response header
      const filename = extractFilenameFromResponse(response, `makine-bilgi-${service.id}.pdf`);

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      alert(err.message || 'PDF indirilirken bir hata oluştu');
    } finally {
      setDownloading(false);
    }
  };

  const handlePhotoClick = (index = 0) => {
    setSelectedPhotoIndex(index);
    setZoomLevel(1);
    setImagePosition({ x: 0, y: 0 });
    setShowPhotoGallery(true);
  };

  const handleClosePhotoGallery = () => {
    setShowPhotoGallery(false);
    setZoomLevel(1);
    setImagePosition({ x: 0, y: 0 });
  };

  const handlePhotoGalleryOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClosePhotoGallery();
    }
  };

  const handlePreviousPhoto = () => {
    setSelectedPhotoIndex((prev) => {
      const newIndex = prev > 0 ? prev - 1 : photoUrls.length - 1;
      setZoomLevel(1);
      setImagePosition({ x: 0, y: 0 });
      return newIndex;
    });
  };

  const handleNextPhoto = () => {
    setSelectedPhotoIndex((prev) => {
      const newIndex = prev < photoUrls.length - 1 ? prev + 1 : 0;
      setZoomLevel(1);
      setImagePosition({ x: 0, y: 0 });
      return newIndex;
    });
  };

  // Zoom functions
  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.15, 2.5));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => {
      const newZoom = Math.max(prev - 0.15, 1);
      if (newZoom === 1) {
        setImagePosition({ x: 0, y: 0 });
      }
      return newZoom;
    });
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setImagePosition({ x: 0, y: 0 });
  };

  // Mouse wheel zoom
  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoomLevel((prev) => {
        const newZoom = Math.max(1, Math.min(2.5, prev + delta));
        if (newZoom === 1) {
          setImagePosition({ x: 0, y: 0 });
        }
        return newZoom;
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>MAKİNE BİLGİ FORMU</h2>
          <button className="close-button" onClick={onClose}>
            <AiOutlineClose />
          </button>
        </div>

        <div className="edit-button-container">
          {!isCompletedProject && (
            <button className="edit-button" onClick={handleEditClick}>
              <AiOutlineEdit className="button-icon" />
              Düzenle
            </button>
          )}
          <button
            className="download-button"
            onClick={handleDownload}
            disabled={downloading}
          >
            <AiOutlineDownload className="button-icon" />
            {downloading ? 'İndiriliyor...' : 'İndir'}
          </button>
        </div>

        <div className="modal-body">
          {loading && (
            <div className="loading-state">
              <p>Proje detayları yükleniyor...</p>
            </div>
          )}

          {error && (
            <div className="error-state">
              <p>Hata: {error}</p>
            </div>
          )}

          {!loading && !error && projectDetails && (
            <div className="machine-info-container">
              {/* Left side - Machine specifications */}
              <div className="machine-specifications">
                <div className="machine-identification">
                  <h3 className="machine-title">Makine Bilgileri</h3>

                  <div className="spec-row">
                    <span className="spec-label">Proje Kodu:</span>
                    <span className="spec-value">{projectDetails.projectCode || '-'}</span>
                  </div>

                  <div className="spec-row">
                    <span className="spec-label">Marka:</span>
                    <span className="spec-value">{projectDetails.machineName || projectDetails.make || '-'}</span>
                  </div>

                  <div className="spec-row">
                    <span className="spec-label">Model:</span>
                    <span className="spec-value">{projectDetails.model || '-'}</span>
                  </div>

                  <div className="spec-row">
                    <span className="spec-label">Üretim Yılı:</span>
                    <span className="spec-value">{projectDetails.year || '-'}</span>
                  </div>

                  <div className="spec-row">
                    <span className="spec-label">Seri Numarası:</span>
                    <span className="spec-value">{projectDetails.serialNumber || '-'}</span>
                  </div>

                  <div className="spec-row">
                    <span className="spec-label">Ticari Tanımı:</span>
                    <span className="spec-value">{projectDetails.type || '-'}</span>
                  </div>

                  <div className="spec-row">
                    <span className="spec-label">Makine Durumu:</span>
                    <span className="spec-value">{formatCondition(projectDetails.condition)}</span>
                  </div>

                  <div className="spec-row">
                    <span className="spec-label">Makine Menşei:</span>
                    <span className="spec-value">{projectDetails.machineOrigin || '-'}</span>
                  </div>

                  <div className="spec-row">
                    <span className="spec-label">İşletim Sistemi:</span>
                    <span className="spec-value">{projectDetails.operatingSystem || '-'}</span>
                  </div>
                </div>

                <div className="technical-details">
                  <h4>Teknik Detaylar</h4>

                  <div className="spec-row">
                    <span className="spec-label">Çalışma Saati:</span>
                    <span className="spec-value">{formatHours(projectDetails.hoursOperated)}</span>
                  </div>

                  <div className="spec-row">
                    <span className="spec-label">Devir:</span>
                    <span className="spec-value">{formatRpm(projectDetails.rpm)}</span>
                  </div>

                  <div className="spec-row">
                    <span className="spec-label">Makinenin Çektiği Güç:</span>
                    <span className="spec-value">{projectDetails.machinePower || '-'}</span>
                  </div>

                  <div className="spec-row">
                    <span className="spec-label">Takım Sayısı:</span>
                    <span className="spec-value">{projectDetails.takimSayisi || '-'}</span>
                  </div>

                  <div className="spec-row">
                    <span className="spec-label">Net Ağırlık:</span>
                    <span className="spec-value">{formatWeight(projectDetails.netWeight)}</span>
                  </div>

                  <div className="spec-row">
                    <span className="spec-label">Ek Ağırlık:</span>
                    <span className="spec-value">{formatWeight(projectDetails.additionalWeight)}</span>
                  </div>

                  <div className="spec-row">
                    <span className="spec-label">Anahtar Bilgisi:</span>
                    <span className="spec-value">{projectDetails.anahtarBilgisi || '-'}</span>
                  </div>

                  <div className="spec-row">
                    <span className="spec-label">Takım Ölçme Probu:</span>
                    <span className="spec-value">{projectDetails.takimOlcmeProbu ? 'Var' : 'Yok'}</span>
                  </div>

                  <div className="spec-row">
                    <span className="spec-label">Parça Ölçme Probu:</span>
                    <span className="spec-value">{projectDetails.parcaOlcmeProbu ? 'Var' : 'Yok'}</span>
                  </div>

                  <div className="spec-row">
                    <span className="spec-label">İçten Su Verme:</span>
                    <span className="spec-value">{projectDetails.ictenSuVerme ? 'Var' : 'Yok'}</span>
                  </div>

                  <div className="spec-row">
                    <span className="spec-label">Konveyör:</span>
                    <span className="spec-value">{projectDetails.konveyor ? 'Var' : 'Yok'}</span>
                  </div>

                  <div className="spec-row">
                    <span className="spec-label">Kağıt Filtre:</span>
                    <span className="spec-value">{projectDetails.kagitFiltre ? 'Var' : 'Yok'}</span>
                  </div>

                  <div className="spec-row">
                    <span className="spec-label">El Çarkı:</span>
                    <span className="spec-value">{projectDetails.elCarki ? 'Var' : 'Yok'}</span>
                  </div>

                  <div className="spec-row">
                    <span className="spec-label">X Hareketi:</span>
                    <span className="spec-value">{projectDetails.xmovement || '-'}</span>
                  </div>

                  <div className="spec-row">
                    <span className="spec-label">Y Hareketi:</span>
                    <span className="spec-value">{projectDetails.ymovement || '-'}</span>
                  </div>

                  <div className="spec-row">
                    <span className="spec-label">Z Hareketi:</span>
                    <span className="spec-value">{projectDetails.zmovement || '-'}</span>
                  </div>

                  <div className="spec-row">
                    <span className="spec-label">A Hareketi:</span>
                    <span className="spec-value">{projectDetails.amovement || projectDetails.aMovement || '-'}</span>
                  </div>

                  <div className="spec-row">
                    <span className="spec-label">B Hareketi:</span>
                    <span className="spec-value">{projectDetails.bmovement || '-'}</span>
                  </div>

                  <div className="spec-row">
                    <span className="spec-label">C Hareketi:</span>
                    <span className="spec-value">{projectDetails.cmovement || '-'}</span>
                  </div>

                  <div className="spec-row">
                    <span className="spec-label">Tutucu Türü:</span>
                    <span className="spec-value">{projectDetails.holderType || '-'}</span>
                  </div>

                  <div className="spec-row">
                    <span className="spec-label">Makine Genişliği:</span>
                    <span className="spec-value">{formatDimension(projectDetails.machineWidth)}</span>
                  </div>

                  <div className="spec-row">
                    <span className="spec-label">Makine Uzunluğu:</span>
                    <span className="spec-value">{formatDimension(projectDetails.machineLength)}</span>
                  </div>

                  <div className="spec-row">
                    <span className="spec-label">Makine Yüksekliği:</span>
                    <span className="spec-value">{formatDimension(projectDetails.machineHeight)}</span>
                  </div>

                  <div className="spec-row">
                    <span className="spec-label">Maksimum Malzeme Ağırlığı:</span>
                    <span className="spec-value">{formatWeight(projectDetails.maxMaterialWeight)}</span>
                  </div>

                  <div className="spec-row">
                    <span className="spec-label">Ek Ekipman:</span>
                    <span className="spec-value">{projectDetails.additionalEquipment || '-'}</span>
                  </div>


                </div>
              </div>

              {/* Right side - Machine image */}
              <div className="machine-image-section">
                {photoUrls.length > 0 ? (
                  <div
                    className="machine-image-container"
                    onClick={() => handlePhotoClick(0)}
                  >
                    <img
                      src={photoUrls[0]}
                      alt={projectDetails.machineName || 'Makine Görseli'}
                      className="machine-image"
                      loading="eager"
                    />
                    {photoUrls.length > 1 && (
                      <div className="photo-count-badge">
                        +{photoUrls.length - 1}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="machine-image-placeholder">
                    <div className="image-placeholder-text">
                      <span>Makine Görseli</span>
                      <small>{projectDetails.machineName}</small>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Project Modal */}
      {showEditModal && projectDetails && (
        <EditProjectModal
          project={projectDetails}
          onClose={handleEditModalClose}
          onSaveComplete={handleEditSaveComplete}
        />
      )}

      {/* Photo Gallery Modal */}
      {showPhotoGallery && photoUrls.length > 0 && (
        <div className="photo-gallery-overlay" onClick={handlePhotoGalleryOverlayClick}>
          <div className="photo-gallery-content" onClick={(e) => e.stopPropagation()}>
            <div className="photo-gallery-header">
              <h3>Makine Fotoğrafları</h3>
              <div className="photo-gallery-header-controls">
                <div className="photo-gallery-zoom-controls">
                  <button
                    className="photo-gallery-zoom-btn"
                    onClick={handleZoomOut}
                    disabled={zoomLevel <= 1}
                    title="Uzaklaştır"
                  >
                    <AiOutlineZoomOut />
                  </button>
                  <span className="photo-gallery-zoom-level">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    className="photo-gallery-zoom-btn"
                    onClick={handleZoomIn}
                    disabled={zoomLevel >= 2.5}
                    title="Yakınlaştır"
                  >
                    <AiOutlineZoomIn />
                  </button>
                </div>
                <button className="photo-gallery-close" onClick={handleClosePhotoGallery}>
                  <AiOutlineClose />
                </button>
              </div>
            </div>
            <div
              className="photo-gallery-body"
              onWheel={handleWheel}
            >
              {zoomLevel > 1 && (
                <button
                  className="photo-gallery-reset-zoom"
                  onClick={handleResetZoom}
                  title="Sıfırla"
                >
                  <AiOutlineExpand />
                </button>
              )}
              <button
                className="photo-gallery-nav photo-gallery-prev"
                onClick={handlePreviousPhoto}
                disabled={photoUrls.length <= 1}
                aria-label="Önceki fotoğraf"
              >
                ‹
              </button>
              <div className="photo-gallery-main-image-container">
                {loadingImages.has(photoUrls[selectedPhotoIndex]) && (
                  <div className="photo-loading-skeleton">
                    <div className="loading-spinner"></div>
                    <p>Fotoğraf yükleniyor...</p>
                  </div>
                )}
                <div
                  className="photo-gallery-main-image"
                  style={{
                    cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                    overflow: 'visible',
                    opacity: loadingImages.has(photoUrls[selectedPhotoIndex]) ? 0.3 : 1,
                    transition: 'opacity 0.3s ease',
                  }}
                  onMouseDown={handleMouseDown}
                >
                  <img
                    src={photoUrls[selectedPhotoIndex]}
                    alt={`Makine Fotoğrafı ${selectedPhotoIndex + 1}`}
                    style={{
                      transform: `scale(${zoomLevel}) translate(${imagePosition.x / zoomLevel}px, ${imagePosition.y / zoomLevel}px)`,
                      transformOrigin: 'center center',
                      transition: isDragging ? 'none' : 'transform 0.3s ease',
                      width: 'auto',
                      height: 'auto',
                      maxWidth: zoomLevel === 1 ? '90vw' : '150vw',
                      maxHeight: zoomLevel === 1 ? '70vh' : '120vh',
                      objectFit: 'contain',
                      userSelect: 'none',
                    }}
                    draggable={false}
                    loading="eager"
                    onLoad={() => {
                      setLoadedImages(prev => new Set([...prev, photoUrls[selectedPhotoIndex]]));
                      setLoadingImages(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(photoUrls[selectedPhotoIndex]);
                        return newSet;
                      });
                    }}
                  />
                </div>
              </div>
              <button
                className="photo-gallery-nav photo-gallery-next"
                onClick={handleNextPhoto}
                disabled={photoUrls.length <= 1}
                aria-label="Sonraki fotoğraf"
              >
                ›
              </button>
            </div>
            {photoUrls.length > 1 && (
              <div className="photo-gallery-footer">
                <span className="photo-gallery-counter">
                  {selectedPhotoIndex + 1} / {photoUrls.length}
                </span>
                <div className="photo-gallery-thumbnails">
                  {photoUrls.map((photo, index) => (
                    <div
                      key={index}
                      className={`photo-thumbnail-wrapper ${selectedPhotoIndex === index ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedPhotoIndex(index);
                        setZoomLevel(1);
                        setImagePosition({ x: 0, y: 0 });
                      }}
                    >
                      {!loadedImages.has(photo) && loadingImages.has(photo) && (
                        <div className="thumbnail-loading">
                          <div className="thumbnail-spinner"></div>
                        </div>
                      )}
                      <img
                        src={photo}
                        alt={`Thumbnail ${index + 1}`}
                        className={`photo-thumbnail ${selectedPhotoIndex === index ? 'active' : ''}`}
                        loading="lazy"
                        onLoad={() => {
                          setLoadedImages(prev => new Set([...prev, photo]));
                          setLoadingImages(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(photo);
                            return newSet;
                          });
                        }}
                        onError={() => {
                          setLoadingImages(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(photo);
                            return newSet;
                          });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceDetailsModal;
