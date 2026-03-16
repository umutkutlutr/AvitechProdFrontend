import React, { useEffect, useState } from 'react';
import projectService from '../../services/projectService';
import ServiceDetailsModal from './ServiceDetailsModal';
import { AiOutlineUndo, AiOutlineDelete, AiOutlineInfoCircle } from 'react-icons/ai';
import './AllServicesTable.css';

const ErrorReceipts = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingIds, setProcessingIds] = useState(new Set());
  const [selectedService, setSelectedService] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchDeleted = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await projectService.getDeletedProjects();
      setProjects(data || []);
    } catch (err) {
      console.error('Deleted projects fetch error:', err);
      setError(err.message || 'Silinmiş projeler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeleted();
  }, []);

  const handleUndelete = async (projectId) => {
    if (window.confirm('Bu projeyi geri yüklemek istediğinizden emin misiniz?')) {
      try {
        setProcessingIds(prev => new Set(prev).add(projectId));
        await projectService.undeleteProject(projectId);
        await fetchDeleted();
        alert('Proje başarıyla geri yüklendi!');
      } catch (err) {
        console.error('Undelete error:', err);
        alert(`Proje geri yüklenirken bir hata oluştu: ${err.message}`);
      } finally {
        setProcessingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(projectId);
          return newSet;
        });
      }
    }
  };

  const handleHardDelete = async (projectId) => {
    if (window.confirm('Bu projeyi kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!')) {
      try {
        setProcessingIds(prev => new Set(prev).add(projectId));
        await projectService.hardDeleteProject(projectId);
        await fetchDeleted();
        alert('Proje kalıcı olarak silindi!');
      } catch (err) {
        console.error('Hard delete error:', err);
        alert(`Proje silinirken bir hata oluştu: ${err.message}`);
      } finally {
        setProcessingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(projectId);
          return newSet;
        });
      }
    }
  };

  const handleInfoClick = (service) => {
    setSelectedService(service);
    setIsModalOpen(true);
  };

  // Helper function to remove parentheses and their contents from title
  const cleanTitle = (title) => {
    if (!title || title === 'N/A') return title;
    return title.replace(/\s*\([^)]*\)\s*/g, '').trim();
  };

  return (
    <div className="all-services">
      <div className="services-header">
        <h1>İptal Edilen Projeler</h1>
        <p>İptal edilen projeler burada listelenir.</p>
      </div>

      {loading && (
        <div className="loading-state">
          <p>Projeler yükleniyor...</p>
        </div>
      )}

      {error && (
        <div className="error-state">
          <p>Hata: {error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="services-table-container">
          {projects.length === 0 ? (
            <div className="empty-state">
              <p>Kayıt bulunamadı.</p>
            </div>
          ) : (
            <table className="services-table">
              <thead>
                <tr>
                  <th>PROJE KODU</th>
                  <th>MAKİNE MARKASI</th>
                  <th>MAKİNE MODELİ</th>
                  <th>MAKİNE YILI</th>
                  <th>İŞLEMLER</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id} className="service-row">
                    <td className="form-number">{project.projectCode || '-'}</td>
                    <td className="device-name">{cleanTitle(project.title) || 'Belirtilmemiş'}</td>
                    <td className="device-name">{project.model || '-'}</td>
                    <td className="start-date">{project.year || '-'}</td>
                    <td className="operations">
                      <div className="operation-buttons">
                        <button
                          className="operation-btn info-btn-enhanced"
                          onClick={() => handleInfoClick(project)}
                          title="Bilgi"
                        >
                          <AiOutlineInfoCircle />
                        </button>
                        <button
                          className="operation-btn restore-btn-enhanced"
                          onClick={() => handleUndelete(project.id)}
                          disabled={processingIds.has(project.id)}
                          title="Geri Yükle"
                        >
                          <AiOutlineUndo />
                        </button>
                        <button
                          className="operation-btn delete-btn"
                          onClick={() => handleHardDelete(project.id)}
                          disabled={processingIds.has(project.id)}
                          title="Kalıcı Olarak Sil"
                        >
                          <AiOutlineDelete />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {isModalOpen && selectedService && (
        <ServiceDetailsModal
          service={selectedService}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};

export default ErrorReceipts;


