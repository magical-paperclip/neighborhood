export const getToken = () => {
  if (window.electronAPI?.isElectron) {
    return window.electronAPI.getToken();
  }
  return localStorage.getItem('neighborhoodToken');
};

export const setToken = (token) => {
  if (window.electronAPI?.isElectron) {
    window.electronAPI.setToken(token);
  } else {
    localStorage.setItem('neighborhoodToken', token);
  }
};

export const removeToken = () => {
  if (window.electronAPI?.isElectron) {
    window.electronAPI.removeToken();
  } else {
    localStorage.removeItem('neighborhoodToken');
  }
}; 