import authService from '../services/authService';

// Flag to prevent multiple session expiration alerts
let isHandlingSessionExpiration = false;

function isPermissionErrorMessage(message) {
  const m = (message || '').toLowerCase();
  return (
    m.includes('permission') ||
    m.includes('access denied') ||
    m.includes('yetkisiz') ||
    m.includes('yetki') ||
    m.includes('izin') ||
    m.includes('forbidden')
  );
}

/**
 * Global API error handler
 * Checks for authentication errors and handles them appropriately
 */
export const handleApiResponse = async (response) => {
  // Check for authentication errors (401 Unauthorized)
  // 401 always means the token is invalid/expired
  if (response.status === 401) {
    // If we're already handling session expiration, don't show alert again
    if (isHandlingSessionExpiration) {
      throw new Error('Oturum süresi doldu. Lütfen tekrar giriş yapın.');
    }

    isHandlingSessionExpiration = true;
    console.warn('Authentication expired - clearing auth data and redirecting to login');

    // Clear authentication data
    authService.logout();

    // Redirect to login page immediately without showing any message
    window.location.href = '/login';

    // Throw error to prevent further processing
    throw new Error('Oturum süresi doldu. Lütfen tekrar giriş yapın.');
  }

  // Check for 403 Forbidden - need to differentiate between token expiration and permission issues
  if (response.status === 403) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.message || '';

    console.log('403 Error received:', errorMessage); // Debug için

    if (isPermissionErrorMessage(errorMessage)) {
      // This is a permission error, not token expiration
      // Just throw the error without logging out
      console.log('Permission error detected - not logging out');
      throw new Error(errorMessage || 'Bu işlemi gerçekleştirmek için yetkiniz yok.');
    } else {
      // If we're already handling session expiration, don't show alert again
      if (isHandlingSessionExpiration) {
        throw new Error('Oturum süresi doldu. Lütfen tekrar giriş yapın.');
      }

      isHandlingSessionExpiration = true;

      // Either no message, or message doesn't indicate permission issue
      // Assume token is expired - logout and redirect
      console.warn('403 without permission keywords - assuming token expired');

      // Clear authentication data
      authService.logout();

      // Redirect to login page immediately without showing any message
      window.location.href = '/login';

      // Throw error to prevent further processing
      throw new Error('Oturum süresi doldu. Lütfen tekrar giriş yapın.');
    }
  }

  // Check for other errors
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = errorData.message || `İstek başarısız oldu (${response.status})`;
    const details = (errorData.validationErrors && errorData.validationErrors.length)
      ? ': ' + errorData.validationErrors.join('; ')
      : '';
    throw new Error(msg + details);
  }

  return response;
};

/**
 * 401/403 for multipart project create/update where the caller still needs to read JSON on success.
 * Matches projectService alert + redirect behavior for expired sessions.
 * @param {Response} response
 */
export async function handleProjectMultipartAuthResponse(response) {
  if (response.status === 401) {
    console.warn('Authentication expired - clearing auth data and redirecting to login');
    authService.logout();
    alert('Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın.');
    window.location.href = '/login';
    throw new Error('Oturum süresi doldu. Lütfen tekrar giriş yapın.');
  }

  if (response.status === 403) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.message || '';
    console.log('403 Error received:', errorMessage);

    if (isPermissionErrorMessage(errorMessage)) {
      console.log('Permission error detected - not logging out');
      const error = new Error(errorMessage || 'Bu işlemi gerçekleştirmek için yetkiniz yok.');
      error.response = {
        status: response.status,
        statusText: response.statusText,
        data: errorData,
      };
      throw error;
    }

    console.warn('403 without permission keywords - assuming token expired');
    authService.logout();
    alert('Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın.');
    window.location.href = '/login';
    throw new Error('Oturum süresi doldu. Lütfen tekrar giriş yapın.');
  }
}

/**
 * Wrapper for fetch that includes global error handling
 */
export const fetchWithAuth = async (url, options = {}) => {
  try {
    const response = await fetch(url, options);
    await handleApiResponse(response);
    return response;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

/**
 * Extract filename from Content-Disposition header
 * @param {Response} response - Fetch API response object
 * @param {string} fallbackFilename - Fallback filename if header is not present
 * @returns {string} - The extracted filename or fallback
 */
export const extractFilenameFromResponse = (response, fallbackFilename = 'download') => {
  const contentDisposition = response.headers.get('content-disposition');

  if (contentDisposition) {
    // Try to extract filename from content-disposition header
    // Format: attachment; filename=DMG-MORI-DATASHEET.pdf or attachment; filename="DMG-MORI-DATASHEET.pdf"
    const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);

    if (filenameMatch && filenameMatch[1]) {
      // Remove quotes if present
      let filename = filenameMatch[1].replace(/['"]/g, '').trim();

      if (filename) {
        return filename;
      }
    }
  }

  console.log('Using fallback filename:', fallbackFilename);
  return fallbackFilename;
};

