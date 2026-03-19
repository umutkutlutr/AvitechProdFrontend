import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AiOutlineUser, AiOutlineEdit, AiOutlineDelete, AiOutlineLoading3Quarters } from 'react-icons/ai';
import Pagination from '../shared/Pagination';
import SearchBar from '../ServiceReceipt/SearchBar';
import userService from '../../services/userService';
import './UserManagement.css';

// Phone number formatting utility - formats as +90 5XX XXX XX XX
const formatPhoneNumber = (value) => {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');

  // Remove leading 90 if user types it (since we show +90 prefix)
  let cleanDigits = digits;
  if (digits.startsWith('90') && digits.length > 2) {
    cleanDigits = digits.slice(2);
  }

  // Limit to 10 digits (Turkish mobile number length)
  const limitedDigits = cleanDigits.slice(0, 10);

  // Format with spaces: 5XX XXX XX XX
  let formatted = '';
  for (let i = 0; i < limitedDigits.length; i++) {
    if (i === 3 || i === 6 || i === 8) {
      formatted += ' ';
    }
    formatted += limitedDigits[i];
  }

  return formatted;
};

// Get display value with +90 prefix
const getPhoneDisplayValue = (value) => {
  if (!value) return '+90 ';
  const formatted = formatPhoneNumber(value);
  return '+90 ' + formatted;
};

// Extract raw digits from formatted value (without +90)
const extractPhoneDigits = (displayValue) => {
  // Remove +90 prefix and all spaces
  const withoutPrefix = displayValue.replace(/^\+90\s*/, '');
  return withoutPrefix.replace(/\s/g, '');
};

const UserManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    passwordConfirm: '',
    firstName: '',
    lastName: '',
    role: 'VIEWER',
    telNo: '',
    position: ''
  });
  const [editForm, setEditForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'VIEWER',
    telNo: '',
    position: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    try {
      return parseInt(localStorage.getItem('userManagement_pageSize') || '25', 10);
    } catch { return 25; }
  });

  // Helper function to translate role values to Turkish
  const getRoleDisplayName = (role) => {
    const roleMap = {
      'VIEWER': 'İZLEYİCİ',
      'SALES': 'SATIŞ ELEMANI',
      'ADMIN': 'ADMIN'
    };
    return roleMap[role] || role;
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await userService.getUsers();
        setUsers(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || 'Kullanıcılar yüklenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Cleanup effect to remove modal class when component unmounts
  useEffect(() => {
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  const openModal = () => {
    setIsModalOpen(true);
    document.body.classList.add('modal-open');
  };

  const closeModal = () => {
    setIsModalOpen(false);
    document.body.classList.remove('modal-open');
    setForm({ username: '', email: '', password: '', passwordConfirm: '', firstName: '', lastName: '', role: 'VIEWER', telNo: '', position: '' });
    setPasswordMismatch(false);
  };

  const openProfileModal = async () => {
    setIsProfileModalOpen(true);
    document.body.classList.add('modal-open');

    // Fetch all users to get current user's role and createdAt
    try {
      setLoadingProfile(true);
      const allUsers = await userService.getUsers();
      const usersArray = Array.isArray(allUsers) ? allUsers : [];

      // Find the current user by ID
      const currentUser = usersArray.find(u => u.id === user?.id);
      if (currentUser) {
        setCurrentUserProfile(currentUser);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setCurrentUserProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  };

  const closeProfileModal = () => {
    setIsProfileModalOpen(false);
    setCurrentUserProfile(null);
    document.body.classList.remove('modal-open');
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditForm({
      email: user.email || '',
      password: '', // Don't pre-fill password for security
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.role || 'VIEWER',
      telNo: user.telNo || '',
      position: user.position || ''
    });
    setIsEditModalOpen(true);
    document.body.classList.add('modal-open');
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedUser(null);
    setEditForm({ email: '', password: '', firstName: '', lastName: '', role: 'VIEWER', telNo: '', position: '' });
    document.body.classList.remove('modal-open');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => {
      const updated = { ...prev, [name]: value };
      // Check password match when either password field changes
      if (name === 'password' || name === 'passwordConfirm') {
        if (updated.password && updated.passwordConfirm) {
          setPasswordMismatch(updated.password !== updated.passwordConfirm);
        } else {
          setPasswordMismatch(false);
        }
      }
      return updated;
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  // Special handler for phone fields with formatting
  const handlePhoneChange = (e, formType = 'add') => {
    const { name, value } = e.target;
    // Extract just the digits (excluding +90 prefix)
    const rawDigits = extractPhoneDigits(value);

    if (formType === 'edit') {
      setEditForm(prev => ({ ...prev, [name]: rawDigits }));
    } else {
      setForm(prev => ({ ...prev, [name]: rawDigits }));
    }
  };

  // Handle cursor position to prevent jumping
  const handlePhoneKeyDown = (e) => {
    const input = e.target;
    const cursorPos = input.selectionStart;
    // Prevent deleting the +90 prefix
    if (cursorPos <= 4 && (e.key === 'Backspace' || e.key === 'Delete')) {
      e.preventDefault();
    }
    // Prevent cursor from going into the +90 prefix area
    if (e.key === 'ArrowLeft' && cursorPos <= 4) {
      e.preventDefault();
    }
  };

  // Handle focus to set cursor after +90 prefix
  const handlePhoneFocus = (e) => {
    const input = e.target;
    setTimeout(() => {
      if (input.selectionStart < 4) {
        input.setSelectionRange(4, 4);
      }
    }, 0);
  };

  // Handle click to prevent selecting the +90 prefix
  const handlePhoneClick = (e) => {
    const input = e.target;
    if (input.selectionStart < 4) {
      input.setSelectionRange(4, 4);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.firstName || !form.lastName) return;

    // Validate password match
    if (form.password !== form.passwordConfirm) {
      setPasswordMismatch(true);
      setError('Şifreler eşleşmiyor');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setPasswordMismatch(false);
      // Username: explicit field or fallback to email prefix
      const username = (form.username && form.username.trim()) || `${form.firstName} ${form.lastName}`.trim() || (form.email ? form.email.split('@')[0] : '');
      if (!username) {
        setError('Kullanıcı adı veya Ad Soyad giriniz');
        return;
      }
      // Don't send passwordConfirm to API
      const { passwordConfirm, ...userDataWithoutConfirm } = form;
      const userData = {
        ...userDataWithoutConfirm,
        username,
        role: form.role || 'VIEWER',
        // Send formatted phone number (with +90 prefix and spaces)
        telNo: form.telNo ? getPhoneDisplayValue(form.telNo).trim() : '',
        position: form.position || ''
      };
      const created = await userService.createUser(userData);
      setUsers(prev => [created, ...prev]);
      closeModal();
    } catch (err) {
      setError(err.message || 'Kullanıcı oluşturulurken bir hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.email || !editForm.firstName || !editForm.lastName) return;
    try {
      setEditSubmitting(true);
      setError(null);

      // Prepare the data for API - include original username and role
      // Only include password if it's not empty (PATCH allows partial updates)
      const userData = {
        username: selectedUser.username || `${editForm.firstName} ${editForm.lastName}`.trim(),
        email: editForm.email,
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        role: editForm.role || 'VIEWER',
        // Send formatted phone number (with +90 prefix and spaces)
        telNo: editForm.telNo ? getPhoneDisplayValue(editForm.telNo).trim() : '',
        position: editForm.position || ''
      };

      // Only include password if user provided a new one
      if (editForm.password && editForm.password.trim() !== '') {
        userData.password = editForm.password;
      }

      const updated = await userService.updateUser(selectedUser.id, userData);

      // Update the user in the local state
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? updated : u));
      closeEditModal();
      alert('Kullanıcı başarıyla güncellendi!');
    } catch (err) {
      setError(err.message || 'Kullanıcı güncellenirken bir hata oluştu.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) {
      try {
        await userService.deleteUser(userId);
        // Remove the user from the local state
        setUsers(prev => prev.filter(u => u.id !== userId));
        alert('Kullanıcı başarıyla silindi!');
      } catch (error) {
        console.error('Delete user error:', error);
        alert(`Kullanıcı silinirken bir hata oluştu: ${error.message}`);
      }
    }
  };

  return (
    <div className="user-management">
      <div className="header-row">
        <h1>Kullanıcı İşlemleri</h1>
        <div className="header-buttons">
          <button className="secondary-btn" onClick={openProfileModal}>
            <AiOutlineUser className="btn-icon" />
            Profilim
          </button>
          <button className="primary-btn" onClick={openModal}>
            <span className="btn-icon">+</span>
            Yeni Kullanıcı Ekle
          </button>
        </div>
      </div>

      {loading && (
        <div className="page-loading">
          <AiOutlineLoading3Quarters className="page-loading-spinner" />
          <p>Yükleniyor...</p>
        </div>
      )}
      {error && <div className="error">{error}</div>}

      {!loading && !error && (
        <div className="table-wrapper">
          {users.length > 0 && (
            <SearchBar
              onSearch={(q) => { setSearchTerm(q); setCurrentPage(1); }}
              placeholder="Ad, soyad, e-posta veya pozisyon ile ara..."
            />
          )}
          <table className="user-table">
            <thead>
              <tr>
                <th>Ad</th>
                <th>Soyad</th>
                <th>E-posta</th>
                <th>Telefon</th>
                <th>Pozisyon</th>
                <th>Rol</th>
                <th>Oluşturma Tarihi</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const normalizedSearch = searchTerm.trim().toLowerCase();
                const filteredUsers = normalizedSearch
                  ? users.filter((u) => {
                      const fields = [u.firstName, u.lastName, u.email, u.position, u.username].filter(Boolean);
                      return fields.some((f) => String(f).toLowerCase().includes(normalizedSearch));
                    })
                  : users;
                const startIdx = (currentPage - 1) * itemsPerPage;
                const paginatedUsers = filteredUsers.slice(startIdx, startIdx + itemsPerPage);
                return paginatedUsers.map(u => (
                <tr key={u.id}>
                  <td data-label="Ad">{u.firstName}</td>
                  <td data-label="Soyad">{u.lastName}</td>
                  <td data-label="E-posta">{u.email}</td>
                  <td data-label="Telefon">{u.telNo || '-'}</td>
                  <td data-label="Pozisyon">{u.position || '-'}</td>
                  <td data-label="Rol">{getRoleDisplayName(u.role)}</td>
                  <td data-label="Oluşturma Tarihi">{u.createdAt ? new Date(u.createdAt).toLocaleDateString('tr-TR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'N/A'}</td>
                  <td className="operations">
                    <div className="operation-buttons">
                      <button
                        className="operation-btn edit-btn"
                        onClick={() => openEditModal(u)}
                        title="Düzenle"
                      >
                        <AiOutlineEdit />
                      </button>
                      <button
                        className="operation-btn delete-btn"
                        onClick={() => handleDeleteUser(u.id)}
                        title="Sil"
                      >
                        <AiOutlineDelete />
                      </button>
                    </div>
                  </td>
                </tr>
              ));
              })()}
            </tbody>
          </table>
          {users.length === 0 && <div className="info">Gösterilecek kullanıcı bulunamadı.</div>}
          {users.length > 0 && (() => {
            const n = searchTerm.trim().toLowerCase();
            const filteredUsers = n ? users.filter((u) => [u.firstName, u.lastName, u.email, u.position, u.username].filter(Boolean).some((x) => String(x).toLowerCase().includes(n))) : users;
            return (
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filteredUsers.length / itemsPerPage)}
              totalItems={filteredUsers.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(v) => {
                setItemsPerPage(v);
                setCurrentPage(1);
                try { localStorage.setItem('userManagement_pageSize', String(v)); } catch (_) {}
              }}
              storageKey="userManagement_pageSize"
              label="kullanıcı"
            />
            );
          })()}
        </div>
      )}

      {isModalOpen && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Yeni Kullanıcı Ekle</h2>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>
            <form className="modal-body" onSubmit={handleSubmit}>
              <div className="form-row">
                <label>Kullanıcı Adı *</label>
                <input name="username" value={form.username} onChange={handleChange} placeholder="benzersiz kullanıcı adı" />
              </div>
              <div className="form-row">
                <label>Ad Soyad *</label>
                <input name="firstName" value={form.firstName} onChange={handleChange} placeholder="Ad" />
              </div>
              <div className="form-row">
                <label></label>
                <input name="lastName" value={form.lastName} onChange={handleChange} placeholder="Soyad" />
              </div>
              <div className="form-row">
                <label>Email *</label>
                <input type="email" name="email" value={form.email} onChange={handleChange} />
              </div>
              <div className="form-row">
                <label>Şifre *</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className={passwordMismatch ? 'error-input' : ''}
                />
              </div>
              <div className="form-row">
                <label>Şifre Tekrar *</label>
                <input
                  type="password"
                  name="passwordConfirm"
                  value={form.passwordConfirm}
                  onChange={handleChange}
                  placeholder="Şifreyi tekrar girin"
                  className={passwordMismatch ? 'error-input' : ''}
                />
                {passwordMismatch && (
                  <span className="error-message" style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>
                    Şifreler eşleşmiyor
                  </span>
                )}
              </div>
              <div className="form-row">
                <label>Telefon Numarası</label>
                <input
                  type="tel"
                  name="telNo"
                  value={getPhoneDisplayValue(form.telNo)}
                  onChange={(e) => handlePhoneChange(e, 'add')}
                  onKeyDown={handlePhoneKeyDown}
                  onFocus={handlePhoneFocus}
                  onClick={handlePhoneClick}
                  placeholder="+90 5XX XXX XX XX"
                />
              </div>
              <div className="form-row">
                <label>Şirketteki Pozisyonu</label>
                <input name="position" value={form.position} onChange={handleChange} placeholder="Pozisyon" />
              </div>
              <div className="form-row">
                <label>Sistemdeki Rol *</label>
                <select name="role" value={form.role} onChange={handleChange}>
                  <option value="VIEWER">İzleyici</option>
                  <option value="SALES">Satış Elemanı</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={closeModal}>İptal</button>
                <button type="submit" className="primary-btn" disabled={submitting}>
                  <span className="btn-icon">+</span>
                  {submitting ? 'Kullanıcı Ekleniyor...' : 'Kullanıcı Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isProfileModalOpen && (
        <div className="modal-backdrop" onClick={closeProfileModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Profil Bilgilerim</h2>
              <button className="close-btn" onClick={closeProfileModal}>×</button>
            </div>
            <div className="modal-body">
              {loadingProfile ? (
                <div className="page-loading">
                  <AiOutlineLoading3Quarters className="page-loading-spinner" />
                  <p>Profil bilgileri yükleniyor...</p>
                </div>
              ) : (
                <div className="profile-info">
                  <div className="profile-field">
                    <label>Kullanıcı Adı:</label>
                    <span>{user?.username || currentUserProfile?.username || 'N/A'}</span>
                  </div>
                  <div className="profile-field">
                    <label>E-posta:</label>
                    <span>{user?.email || currentUserProfile?.email || 'N/A'}</span>
                  </div>
                  <div className="profile-field">
                    <label>Rol:</label>
                    <span>{currentUserProfile?.role ? getRoleDisplayName(currentUserProfile.role) : 'N/A'}</span>
                  </div>
                  <div className="profile-field">
                    <label>Kayıt Tarihi:</label>
                    <span>
                      {currentUserProfile?.createdAt
                        ? new Date(currentUserProfile.createdAt).toLocaleDateString('tr-TR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              )}
              <div className="modal-footer">
                <button type="button" className="primary-btn" onClick={closeProfileModal}>Kapat</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && selectedUser && (
        <div className="modal-backdrop" onClick={closeEditModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Kullanıcı Düzenle</h2>
              <button className="close-btn" onClick={closeEditModal}>×</button>
            </div>
            <form className="modal-body" onSubmit={handleEditSubmit}>
              <div className="form-row">
                <label>Ad Soyad *</label>
                <input name="firstName" value={editForm.firstName} onChange={handleEditChange} placeholder="Ad" />
              </div>
              <div className="form-row">
                <label></label>
                <input name="lastName" value={editForm.lastName} onChange={handleEditChange} placeholder="Soyad" />
              </div>
              <div className="form-row">
                <label>Email *</label>
                <input type="email" name="email" value={editForm.email} onChange={handleEditChange} />
              </div>
              <div className="form-row">
                <label>Şifre</label>
                <input type="password" name="password" value={editForm.password} onChange={handleEditChange} placeholder="Yeni şifre" />
              </div>
              <div className="form-row">
                <label>Telefon Numarası</label>
                <input
                  type="tel"
                  name="telNo"
                  value={getPhoneDisplayValue(editForm.telNo)}
                  onChange={(e) => handlePhoneChange(e, 'edit')}
                  onKeyDown={handlePhoneKeyDown}
                  onFocus={handlePhoneFocus}
                  onClick={handlePhoneClick}
                  placeholder="+90 5XX XXX XX XX"
                />
              </div>
              <div className="form-row">
                <label>Şirketteki Pozisyonu</label>
                <input name="position" value={editForm.position} onChange={handleEditChange} placeholder="Pozisyon" />
              </div>
              <div className="form-row">
                <label>Rol *</label>
                <select name="role" value={editForm.role} onChange={handleEditChange}>
                  <option value="VIEWER">İzleyici</option>
                  <option value="SALES">Satış Elemanı</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={closeEditModal}>İptal</button>
                <button type="submit" className="primary-btn" disabled={editSubmitting}>
                  <span className="btn-icon">✓</span>
                  {editSubmitting ? 'Güncelleniyor...' : 'Güncelle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;


