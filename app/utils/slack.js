export const updateSlackUserData = async (token) => {
  try {
    const response = await fetch('http://localhost:3001/api/get-user-data', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const data = await response.json();
      if (response.status === 403 && data.shouldLogout) {
        // Remove token and reload the page
        if (window.electronAPI?.isElectron) {
          window.electronAPI.removeToken();
        } else {
          localStorage.removeItem('neighborhoodToken');
        }
        window.location.reload();
      }
      throw new Error('Failed to update Slack user data');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating Slack user data:', error);
    throw error;
  }
}; 